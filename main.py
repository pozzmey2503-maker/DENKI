"""
FastAPI Backend for DenKi — Instant Local JSON Database API
Reads parsed script data directly from data/database.json for sub-millisecond responses.
No live external scraping on requests.
"""

import os
import json
import math
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("denki-api")

BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
ICONS_DIR = ASSETS_DIR / "icons"
DATA_DIR = BASE_DIR / "data"
DATABASE_FILE = DATA_DIR / "database.json"

# Ensure directories exist
ICONS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="DenKi Script API",
    description="High-performance instant local JSON database API for Roblox scripts",
    version="2.0.0",
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local assets directory for static serving
app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

# In-memory database cache with mtime validation
_db_cache: List[Dict[str, Any]] = []
_db_last_mtime: float = 0.0


def load_database() -> List[Dict[str, Any]]:
    """
    Loads scripts from data/database.json.
    Automatically reloads whenever the file's modification timestamp changes.
    """
    global _db_cache, _db_last_mtime

    if not DATABASE_FILE.exists():
        logger.warning(f"Database file {DATABASE_FILE} does not exist. Initializing empty.")
        return []

    try:
        current_mtime = DATABASE_FILE.stat().st_mtime
        if current_mtime != _db_last_mtime or not _db_cache:
            with open(DATABASE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    _db_cache = data
                elif isinstance(data, dict):
                    _db_cache = data.get("scripts", [])
                else:
                    _db_cache = []
            _db_last_mtime = current_mtime
            logger.info(f"Loaded {len(_db_cache)} scripts from {DATABASE_FILE.name}")
    except Exception as e:
        logger.error(f"Error reading {DATABASE_FILE}: {e}")

    return _db_cache


@app.get("/api/scripts")
async def get_scripts(
    request: Request,
    search: Optional[str] = Query(None, description="Search term across title, game, hubName, features"),
    game: Optional[str] = Query(None, description="Game category filter"),
    page: int = Query(1, ge=1, description="Page number, starts at 1"),
    per_page: int = Query(12, ge=1, le=100, description="Scripts per page"),
):
    """
    GET /api/scripts?search=query&game=game_name&page=1&per_page=12
    Instantly returns scripts filtered and paginated from the local JSON database.
    """
    all_scripts = load_database()
    filtered: List[Dict[str, Any]] = all_scripts

    # 1. Filter by Game Category if specified
    if game and game.strip().lower() not in ["all", ""]:
        g_clean = game.strip().lower()
        filtered = [
            s for s in filtered
            if g_clean in s.get("game", "").lower()
            or g_clean in s.get("title", "").lower()
        ]

    # 2. Search across title, game, hubName, features, author, and link
    if search and search.strip():
        terms = [t.lower() for t in search.strip().split() if len(t) > 0]
        if terms:
            filtered = [
                s for s in filtered
                if all(
                    term in f"{s.get('title', '')} {s.get('game', '')} {s.get('hubName', '')} {s.get('features', '')} {s.get('author', '')} {s.get('link', '')} {s.get('loadstring', '')}".lower()
                    for term in terms
                )
            ]

    total_items = len(filtered)
    total_pages = max(1, math.ceil(total_items / per_page))

    # 3. Apply pagination slice
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paged_scripts = filtered[start_idx:end_idx]
    has_more = page < total_pages

    return {
        "success": True,
        "count": len(paged_scripts),
        "total": total_items,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "has_more": has_more,
        "search": search or "",
        "game": game or "",
        "scripts": paged_scripts,
    }


@app.get("/api/database/reload")
async def reload_database():
    """Forces an immediate reload of the local database into memory."""
    global _db_last_mtime
    _db_last_mtime = 0.0
    scripts = load_database()
    return {
        "status": "ok",
        "message": f"Successfully reloaded {len(scripts)} scripts from database.json",
        "total_scripts": len(scripts),
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    scripts = load_database()
    return {
        "status": "ok",
        "service": "DenKi Instant Local Database API",
        "total_scripts": len(scripts),
    }

@app.api_route("/api/bypass", methods=["GET", "POST"])
async def bypass_api(request: Request):
    """
    In-page Key Bypass API proxy for FastAPI.
    Supports GET /api/bypass?url=... and POST /api/bypass {"url": "..."}
    """
    import urllib.parse
    import urllib.request
    import base64
    import re

    target_url = None

    if request.method == "GET":
        target_url = request.query_params.get("url")
    else:
        try:
            body = await request.json()
            if isinstance(body, dict):
                target_url = body.get("url")
        except Exception:
            pass

    if not target_url or not target_url.strip():
        return {
            "success": False,
            "error": "សូមបញ្ចូលតំណភ្ជាប់ (Link) ជាមុនសិន!"
        }

    from bypass_engine import resolve_ad_flow
    return resolve_ad_flow(target_url)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
