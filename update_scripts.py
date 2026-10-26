"""
Standalone Offline Scraper for DenKi
Scrapes Roblox script listings from cheater.fun, extracts multi-script blocks,
downloads authentic icons into assets/icons/, and saves into data/database.json.
Run manually by administrator: python update_scripts.py [--pages 5]
"""

import os
import re
import json
import uuid
import time
import logging
import argparse
from pathlib import Path
from typing import Optional, List, Dict, Any
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor

import requests
import cloudscraper
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("denki-updater")

BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
ICONS_DIR = ASSETS_DIR / "icons"
ICONS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_FILE = DATA_DIR / "database.json"

BASE_URL = "https://cheater.fun"
ROBLOX_URL = "https://cheater.fun/hacks_roblox/"
SEARCH_URL = "https://cheater.fun/index.php?do=search"
DEFAULT_TIMEOUT = 15

# Initialize cloudscraper session
scraper = cloudscraper.create_scraper(
    browser={
        "browser": "chrome",
        "platform": "windows",
        "desktop": True,
    }
)


def slugify(text: str) -> str:
    """Creates a clean, safe filename slug from text."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return slug[:60] if slug else "script"


def download_authentic_icon(
    image_url: str,
    script_title: str,
    script_id: str,
    base_url: str = "http://127.0.0.1:8000",
) -> Optional[str]:
    """
    Downloads an authentic script hub icon from cheater.fun via active cloudscraper session.
    Saves it locally into assets/icons/{slug}.ext and returns the static server URL.
    STRICT AUTHENTICITY RULE: Only authentic images scraped from source website are downloaded.
    Avoids redundant downloads if the file already exists on disk.
    """
    if not image_url:
        return None

    # Already a local asset path
    if image_url.startswith("/assets/") or "/assets/icons/" in image_url:
        return image_url
    if not image_url.startswith("http"):
        return None

    try:
        parsed_path = urlparse(image_url).path
        ext = os.path.splitext(parsed_path)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            if "webp" in image_url.lower():
                ext = ".webp"
            elif "jpg" in image_url.lower() or "jpeg" in image_url.lower():
                ext = ".jpg"
            else:
                ext = ".png"

        safe_slug = slugify(script_title)
        if not safe_slug:
            safe_slug = slugify(script_id) or "script-icon"

        filename = f"{safe_slug}{ext}"
        local_filepath = ICONS_DIR / filename

        # Reuse local file if already downloaded and valid (> 500 bytes)
        if local_filepath.exists() and local_filepath.stat().st_size > 500:
            return f"{base_url}/assets/icons/{filename}"

        logger.info(f"Downloading authentic icon: {image_url} -> {filename}")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        }
        res = scraper.get(image_url, headers=headers, timeout=DEFAULT_TIMEOUT)
        if res.status_code == 200 and len(res.content) > 100:
            content_type = res.headers.get("content-type", "").lower()
            if "image" in content_type or len(res.content) > 500:
                local_filepath.write_bytes(res.content)
                logger.info(f"Successfully saved authentic icon: {filename} ({len(res.content)} bytes)")
                return f"{base_url}/assets/icons/{filename}"
            else:
                logger.warning(f"Response for {image_url} is not an image (content-type: {content_type})")
        else:
            logger.warning(f"Failed to download icon from {image_url}, status code: {res.status_code}")

    except Exception as e:
        logger.warning(f"Error downloading icon from {image_url}: {e}")

    return None


# ─── 1. Smart Hub Icon Mapper (Local Dictionary) ─────────────
HUB_OFFICIAL_LOGOS: Dict[str, str] = {
    "Stencil X": "https://avatars.githubusercontent.com/u/105423851?v=4",
    "Stencil": "https://avatars.githubusercontent.com/u/105423851?v=4",
    "Chilli Hub": "/assets/icons/chilli-logo.png",
    "Chilli": "/assets/icons/chilli-logo.png",
    "Chili Hub": "/assets/icons/chilli-logo.png",
    "FyyCommunity": "/assets/icons/script2-logo.png",
    "Fyy": "/assets/icons/script2-logo.png",
    "Ouroboros": "https://avatars.githubusercontent.com/u/84379326?v=4",
    "Ouroboros Hub": "https://avatars.githubusercontent.com/u/84379326?v=4",
    "Hoho Hub": "https://avatars.githubusercontent.com/u/74635848?v=4",
    "Hoho": "https://avatars.githubusercontent.com/u/74635848?v=4",
    "Mukuro Hub": "https://avatars.githubusercontent.com/u/84687002?v=4",
    "Mukuro": "https://avatars.githubusercontent.com/u/84687002?v=4",
    "Redz Hub": "https://avatars.githubusercontent.com/u/108990150?v=4",
    "Redz": "https://avatars.githubusercontent.com/u/108990150?v=4",
    "Infinite Yield": "https://avatars.githubusercontent.com/u/52251034?v=4",
    "W-Azure": "https://avatars.githubusercontent.com/u/95662700?v=4",
    "ZapHub": "https://avatars.githubusercontent.com/u/111099684?v=4",
    "Banana Hub": "https://avatars.githubusercontent.com/u/115598284?v=4",
    "Speed Hub": "https://avatars.githubusercontent.com/u/129994273?v=4",
    "Ripper Hub": "https://avatars.githubusercontent.com/u/118320476?v=4",
    "Zen Hub": "https://avatars.githubusercontent.com/u/121102927?v=4",
    "Ice Hub": "https://avatars.githubusercontent.com/u/102948281?v=4",
}


def match_hub_official_logo(title: str, hub_name: str = "") -> Optional[str]:
    """Checks if a script title or hub name contains a known Hub from HUB_OFFICIAL_LOGOS."""
    combined = f" {title} {hub_name} ".lower()
    for hub_key, logo_url in HUB_OFFICIAL_LOGOS.items():
        pattern = r"\b" + re.escape(hub_key.lower()) + r"\b"
        if re.search(pattern, combined):
            return logo_url
    return None


# ─── 2. Live Roblox API Game Icon Fetcher ─────────────────────
_roblox_game_icon_cache: Dict[str, Optional[str]] = {}
_roblox_session_id = str(uuid.uuid4())


def fetch_live_roblox_game_icon(game_name: str) -> Optional[str]:
    """
    Dynamically fetches the CURRENT, up-to-date live game icon directly from Roblox:
    a) Searches the game name via Roblox's search API (omni-search) to get the placeId/universeId.
    b) Fetches the live 256x256 game icon thumbnail from Roblox's official CDN.
    """
    if not game_name or game_name.lower() in ["roblox", "universal", "unknown", ""]:
        return None

    clean_game = re.sub(
        r"^(?:roblox|best|new|updated|keyless|undetected)\s+", "", game_name, flags=re.I
    ).strip(" -:|")
    if not clean_game or len(clean_game) < 2:
        return None

    clean_key = clean_game.lower()
    if clean_key in _roblox_game_icon_cache:
        return _roblox_game_icon_cache[clean_key]

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
        }
        search_url = (
            f"https://apis.roblox.com/search-api/omni-search?"
            f"searchQuery={requests.utils.quote(clean_game)}&sessionId={_roblox_session_id}&pageType=all"
        )
        res = requests.get(search_url, headers=headers, timeout=DEFAULT_TIMEOUT)
        if res.status_code == 200:
            data = res.json()
            search_results = data.get("searchResults", [])
            for item in search_results:
                contents = item.get("contents", [])
                if contents:
                    first = contents[0]
                    place_id = first.get("rootPlaceId")
                    universe_id = first.get("universeId")

                    # 1. Fetch live icon via placeId
                    if place_id:
                        thumb_url = (
                            f"https://thumbnails.roblox.com/v1/places/gameicons?"
                            f"placeIds={place_id}&returnPolicy=PlaceHolder&size=256x256&format=Png&isCircular=false"
                        )
                        tr = requests.get(thumb_url, headers=headers, timeout=DEFAULT_TIMEOUT)
                        if tr.status_code == 200:
                            items = tr.json().get("data", [])
                            if items and items[0].get("imageUrl"):
                                live_url = items[0]["imageUrl"]
                                logger.info(f"Resolved live Roblox game icon for '{clean_game}' (placeId {place_id})")
                                _roblox_game_icon_cache[clean_key] = live_url
                                return live_url

                    # 2. Fallback to universeId
                    if universe_id:
                        thumb_url = (
                            f"https://thumbnails.roblox.com/v1/games/icons?"
                            f"universeIds={universe_id}&returnPolicy=PlaceHolder&size=256x256&format=Png&isCircular=false"
                        )
                        tr = requests.get(thumb_url, headers=headers, timeout=DEFAULT_TIMEOUT)
                        if tr.status_code == 200:
                            items = tr.json().get("data", [])
                            if items and items[0].get("imageUrl"):
                                live_url = items[0]["imageUrl"]
                                logger.info(f"Resolved live Roblox game icon for '{clean_game}' (universeId {universe_id})")
                                _roblox_game_icon_cache[clean_key] = live_url
                                return live_url

    except Exception as e:
        logger.warning(f"Error querying Roblox live icon for '{clean_game}': {e}")

    _roblox_game_icon_cache[clean_key] = None
    return None


# ─── 3. Multi-Tier Smart Icon Resolver ───────────────────────
def resolve_and_download_script_icon(
    title: str,
    hub_name: str,
    game_name: str,
    script_id: str,
    fallback_image_url: str = "",
    base_url: str = "http://127.0.0.1:8000",
) -> Optional[str]:
    """
    Resolves script icon using the multi-tier hierarchy:
    1. Smart Hub Icon Mapper: checks if title/hub matches known Hubs.
    2. Live Roblox API Game Icon Fetcher: queries live Roblox API for current 256x256 game icon thumbnail.
    3. Fallback: uses authentic scraped image from cheater.fun.
    Downloads the resolved icon into assets/icons/ and serves locally.
    """
    # 1. Prioritize official Hub Logo if known
    hub_logo_url = match_hub_official_logo(title, hub_name)
    if hub_logo_url:
        if hub_logo_url.startswith("/"):
            return hub_logo_url
        clean_hub_slug = slugify(hub_name or title)
        local_url = download_authentic_icon(
            image_url=hub_logo_url,
            script_title=f"hub-{clean_hub_slug}",
            script_id=f"hub_{clean_hub_slug}",
            base_url=base_url,
        )
        if local_url:
            return local_url

    # 2. Prioritize Live Roblox Game Icon from official Roblox CDN
    live_roblox_url = fetch_live_roblox_game_icon(game_name)
    if live_roblox_url:
        clean_game_slug = slugify(game_name)
        local_url = download_authentic_icon(
            image_url=live_roblox_url,
            script_title=f"roblox-{clean_game_slug}",
            script_id=f"roblox_{clean_game_slug}",
            base_url=base_url,
        )
        if local_url:
            return local_url

    # 3. Graceful fallback: original authentic scraped image from cheater.fun
    if fallback_image_url:
        if fallback_image_url.startswith("/assets/") or "/assets/icons/" in fallback_image_url:
            return fallback_image_url
        local_url = download_authentic_icon(
            image_url=fallback_image_url,
            script_title=title,
            script_id=script_id,
            base_url=base_url,
        )
        if local_url:
            return local_url

    return fallback_image_url or None


def parse_title_details(raw_title: str) -> Dict[str, str]:
    """Parses raw script titles into clean scriptName, gameName, and features."""
    if not raw_title:
        return {
            "scriptName": "Roblox Script",
            "game": "Roblox",
            "features": "Auto Farm, Keyless GUI, Undetected",
        }

    cleaned = re.sub(
        r"^(?:UNDETECTED|KEYLESS|UPDATED|PATCHED|\?|\s)+", "", raw_title, flags=re.I
    ).strip()

    parts = re.split(r"\s*[-–—]\s*", cleaned, maxsplit=1)
    script_part = parts[0].strip()
    features_part = parts[1].strip() if len(parts) > 1 else ""

    game_name = script_part
    for suffix in [" Script", " Hub", " Hack", " Cheat"]:
        if suffix.lower() in game_name.lower():
            idx = game_name.lower().find(suffix.lower())
            game_name = game_name[:idx].strip()
            break

    game_name = game_name.strip("- :|") or "Roblox"
    if not features_part:
        features_part = "Auto Farm, Keyless GUI, Undetected"

    return {
        "scriptName": script_part or "Roblox Script",
        "game": game_name,
        "features": features_part,
    }


def clean_hub_name(raw: Optional[str]) -> str:
    """Cleans a developer/hub name string, taking the short primary name."""
    if not raw:
        return "Unknown Hub"
    cleaned = re.sub(
        r"^(?:developer|author|dev|creator)\s*[:\-]?\s*",
        "",
        raw.strip(),
        flags=re.I,
    ).strip()
    cleaned = re.split(r"[\n\r|]", cleaned)[0].strip()
    if "," in cleaned:
        cleaned = cleaned.split(",")[0].strip()
    elif "/" in cleaned and not cleaned.startswith("http"):
        cleaned = cleaned.split("/")[0].strip()
    return cleaned if cleaned else "Unknown Hub"


KNOWN_HUBS_LIST = [
    "Chilli Hub", "Redz Hub", "Hoho Hub", "Infinity Hub", "ZapHub",
    "W-Azure", "Banana Hub", "Mukuro Hub", "Speed Hub", "Ice Hub",
    "Ripper Hub", "Zen Hub", "Infinite Yield", "BigFroot", "No-Lag Hub",
    "Pulse Hub", "PulseHub", "Nox SAE Hub", "CloutHub", "ClouthHub",
    "Polluted Hub", "SourceHub", "Limbo Hub", "DryNyx Hub", "Kira Hub",
    "CM Hub", "Yokudo Hub", "Nevahub", "Jane Hub", "Tsuo Hub", "UB Hub",
    "Sena Hub", "Zeroin Hub", "BlyxoHu Hub", "Oxide Hub", "Axon Hub",
    "Miranda Hub", "Lennon Hub", "OMG Hub", "FoxName Hub", "ZeroPoint Hub",
    "Rift Hub", "CloverHub", "ToolBox Hub", "Pig Hub", "Ovei Hub",
    "SolixHub", "ChronixHub", "AJJANS Hub", "Speed X Hub", "Ouroboros Hub",
    "SoftKillz", "ToraIsMe", "LegendHandles", "Venyx", "Kavo UI",
    "Solaris Hub", "Atomic Hub", "Hydrogen", "Fluxus", "Delta", "Arceus X",
]


def extract_hub_name(title: str, fallback: str = "Unknown Hub") -> str:
    """Detects popular hub names from script titles."""
    if not title:
        return fallback
    lower = title.lower()
    for h in KNOWN_HUBS_LIST:
        if h.lower() in lower:
            return h
    m = re.search(r"\b([A-Za-z0-9\-_]+(?:\s+[A-Za-z0-9\-_]+)?\s+Hub)\b", title, flags=re.I)
    if m:
        cand = re.sub(r"^(?:roblox|script|game|the|best|new)\s+", "", m.group(1).strip(), flags=re.I).strip()
        if len(cand) >= 3:
            return cand
    m_hub = re.search(r"\b([A-Za-z0-9\-_]+Hub)\b", title, flags=re.I)
    if m_hub:
        cand = m_hub.group(1).strip()
        if len(cand) >= 4:
            return cand
    return fallback if fallback and fallback != "Unknown Hub" else "Roblox Hub"


def extract_heading_for_code(code_tag, default_title: str = "Roblox Script") -> str:
    """Traverses backwards from a <pre>/<code> tag to locate the nearest preceding heading."""
    curr = code_tag
    for _ in range(40):
        curr = curr.previous_element
        if not curr:
            break
        tag_name = getattr(curr, "name", None)
        if tag_name in ["h3", "h2", "h4", "b", "strong", "div", "p"]:
            txt = curr.get_text(strip=True)
            if not txt or len(txt) < 5:
                continue
            lower = txt.lower()
            if (
                lower.startswith("loadstring")
                or lower.startswith("http")
                or lower.startswith("game:")
                or lower.startswith("getgenv")
                or lower.startswith("--")
            ):
                continue
            if lower in ["code", "script", "description", "download", "copy", "features", "instructions"]:
                continue
            if any(w in lower for w in [
                "script", "hub", "gui", "hack", "auto", "farm", "pastebin",
                "steal", "egg", "blox", "blade", "arsenal", "battlegrounds",
                "key", "keyless", "bot", "speed", "jump", "fly", "teleport",
                "kill", "godmode", "esp", "aimbot", "race", "event", "op", "|", " - "
            ]):
                return txt
    return default_title


def extract_features_from_title(title: str, fallback: str = "Auto Farm, Keyless GUI, Undetected") -> str:
    """Extracts features string from title after '|' or ' - ' delimiter."""
    if not title:
        return fallback or "Auto Farm, Keyless GUI, Undetected"
    if "|" in title:
        parts = title.split("|", 1)
        feat = parts[1].strip()
        if len(feat) > 3:
            return feat
    if " - " in title:
        parts = title.split(" - ", 1)
        feat = parts[1].strip()
        if len(feat) > 3:
            return feat
    return fallback or "Auto Farm, Keyless GUI, Undetected"


def deep_extract_article_scripts(
    article: Dict[str, Any],
    base_url: str = "http://127.0.0.1:8000",
) -> List[Dict[str, Any]]:
    """
    Visits the detail page of an article on cheater.fun and extracts EVERY individual script block
    inside the post content (e.g. Chilli Hub, No-Lag Hub, etc.).
    """
    source_link = article.get("sourceLink", "")

    raw_img = article.get("rawImageUrl") or article.get("imageUrl") or ""
    parent_icon_url = resolve_and_download_script_icon(
        title=article.get("title", ""),
        hub_name=article.get("hubName", ""),
        game_name=article.get("game", ""),
        script_id=article.get("id", ""),
        fallback_image_url=raw_img,
        base_url=base_url,
    )
    if parent_icon_url:
        article["imageUrl"] = parent_icon_url
        article["logoUrl"] = parent_icon_url

    if not source_link or not source_link.startswith("http"):
        fallback_code = f'-- {article.get("title", "Roblox Script")}\nloadstring(game:HttpGet("{source_link}"))()'
        article["code"] = fallback_code
        article["loadstring"] = fallback_code
        return [article]

    try:
        res = scraper.get(source_link, timeout=DEFAULT_TIMEOUT)
        if res.status_code != 200:
            logger.warning(f"Failed to fetch article detail {source_link}, status: {res.status_code}")
            fallback_code = f'-- {article.get("title", "Roblox Script")}\nloadstring(game:HttpGet("{source_link}"))()'
            article["code"] = fallback_code
            article["loadstring"] = fallback_code
            return [article]

        soup = BeautifulSoup(res.text, "html.parser")

        raw_code_elements = []
        for tag in soup.find_all(["pre", "code"]):
            if tag.name == "code" and tag.find_parent("pre"):
                continue
            txt = tag.get_text(strip=True)
            if not txt or len(txt) < 10:
                continue
            if (
                "loadstring" in txt
                or "game:HttpGet" in txt
                or "httpget" in txt.lower()
                or "getgenv()" in txt
                or len(txt) > 25
            ):
                raw_code_elements.append((tag, txt))

        if not raw_code_elements:
            fallback_code = f'-- {article.get("title", "Roblox Script")}\nloadstring(game:HttpGet("{source_link}"))()'
            article["code"] = fallback_code
            article["loadstring"] = fallback_code
            return [article]

        extracted_scripts = []
        for idx, (tag, code_text) in enumerate(raw_code_elements):
            spec_title = extract_heading_for_code(tag, article.get("title", "Roblox Script"))
            spec_hub = extract_hub_name(spec_title, article.get("hubName", "Roblox Hub"))
            spec_features = extract_features_from_title(spec_title, article.get("features", ""))

            title_lower = spec_title.lower()
            key_required = ("key" in title_lower and "no key" not in title_lower and "keyless" not in title_lower)

            child = dict(article)
            child["id"] = f"{article.get('id', 'script')}_s{idx+1}"
            child["title"] = spec_title
            child["scriptName"] = spec_title
            child["hubName"] = spec_hub
            child["author"] = spec_hub
            child["features"] = spec_features
            child["code"] = code_text
            child["loadstring"] = code_text
            child["keyRequired"] = key_required

            child_icon_url = resolve_and_download_script_icon(
                title=spec_title,
                hub_name=spec_hub,
                game_name=article.get("game", ""),
                script_id=child["id"],
                fallback_image_url=article.get("imageUrl") or raw_img,
                base_url=base_url,
            )
            if child_icon_url:
                child["imageUrl"] = child_icon_url
                child["logoUrl"] = child_icon_url

            extracted_scripts.append(child)

        logger.info(f"Extracted {len(extracted_scripts)} scripts from: {source_link}")
        return extracted_scripts

    except Exception as e:
        logger.warning(f"Error scraping detail page {source_link}: {e}")
        fallback_code = f'-- {article.get("title", "Roblox Script")}\nloadstring(game:HttpGet("{source_link}"))()'
        article["code"] = fallback_code
        article["loadstring"] = fallback_code
        return [article]


def parse_article(article_el) -> Optional[Dict[str, Any]]:
    """Parses a single HTML article element into a structured script object."""
    try:
        title_el = (
            article_el.select_one(".rs-title")
            or article_el.find(["h2", "h3"])
        )
        link_el = article_el.find("a", href=True)
        if not link_el and title_el:
            link_el = title_el.find("a", href=True)

        title_link = (
            article_el.select_one("a.rs-titlelink")
            or article_el.select_one("a.card-title-link")
            or article_el.select_one("a.popular-title")
            or link_el
        )

        title = ""
        if title_el:
            title = title_el.get_text(strip=True)
        elif title_link:
            title = title_link.get_text(strip=True)

        if not title and link_el and link_el.has_attr("aria-label"):
            title = link_el["aria-label"].strip()

        if not title:
            return None

        source_link = ""
        if title_link and title_link.has_attr("href"):
            source_link = title_link["href"].strip()
        elif link_el and link_el.has_attr("href"):
            source_link = link_el["href"].strip()

        if source_link.startswith("/"):
            source_link = urljoin(BASE_URL, source_link)

        raw_image_url = ""
        img_el = article_el.find("img")
        if img_el:
            candidates = [
                img_el.get("data-src"),
                img_el.get("data-lazy-src"),
                img_el.get("data-original"),
                img_el.get("data-lazy"),
                img_el.get("src"),
            ]
            for cand in candidates:
                if cand and isinstance(cand, str):
                    c = cand.strip()
                    if c and not c.startswith("data:"):
                        raw_image_url = c
                        break

        if not raw_image_url:
            for el_with_style in article_el.select("[style*='background']"):
                style_str = el_with_style.get("style", "")
                bg_match = re.search(r"url\(['\"]?([^'\")]+)['\"]?\)", style_str)
                if bg_match:
                    c = bg_match.group(1).strip()
                    if c and not c.startswith("data:"):
                        raw_image_url = c
                        break

        if raw_image_url:
            if raw_image_url.startswith("//"):
                raw_image_url = "https:" + raw_image_url
            elif not raw_image_url.startswith("http"):
                raw_image_url = urljoin(BASE_URL, raw_image_url)

        card_text = article_el.get_text(" ", strip=True).lower()
        key_required = "key required" in card_text or (
            "key" in card_text and "keyless" not in card_text
        )
        is_verified = True

        match_id = re.search(r"/(\d+-[^/]+)\.html", source_link)
        script_id = (
            match_id.group(1)
            if match_id
            else f"script_{abs(hash(source_link)) % 1000000}"
        )

        title_meta = parse_title_details(title)

        game_name = None
        game_meta_el = article_el.select_one(".rs-sub__item .rs-muted, .game-badge, .card-game-name")
        if game_meta_el:
            game_name = game_meta_el.get_text(strip=True)
        if not game_name:
            game_name = title_meta.get("game") or "Roblox"

        raw_hub_name = None
        for item in article_el.select(".rs-meta__item"):
            k = item.select_one(".rs-k")
            v = item.select_one(".rs-v")
            if k and v and any(w in k.get_text().lower() for w in ["developer", "author", "dev"]):
                val = v.get_text(strip=True)
                if val:
                    raw_hub_name = val
                    break

        if not raw_hub_name:
            for el in article_el.find_all(["div", "span", "p", "li"]):
                txt = el.get_text(" ", strip=True)
                m = re.search(r"(?:developer|author|dev|creator)\s*:\s*([^,\n|<]+)", txt, flags=re.I)
                if m:
                    raw_hub_name = m.group(1).strip()
                    break

        if not raw_hub_name:
            detected_from_title = extract_hub_name(title)
            if detected_from_title and detected_from_title != "Unknown Hub":
                raw_hub_name = detected_from_title

        hub_name = clean_hub_name(raw_hub_name)

        return {
            "id": script_id,
            "title": title,
            "scriptName": title,
            "game": game_name,
            "features": title_meta["features"],
            "hubName": hub_name,
            "author": hub_name,
            "sourceLink": source_link,
            "rawImageUrl": raw_image_url,
            "imageUrl": raw_image_url,
            "logoUrl": raw_image_url,
            "code": "",
            "loadstring": "",
            "verified": is_verified,
            "keyRequired": key_required,
            "updatedDate": "Recent",
            "views": 1500,
            "likes": 95,
        }
    except Exception as e:
        logger.error(f"Error parsing article element: {e}")
        return None


def scrape_page_articles(page: int = 1, query: Optional[str] = None) -> List[Dict[str, Any]]:
    """Scrapes raw article list for a given page from cheater.fun."""
    scripts = []
    try:
        if query and query.strip():
            clean_query = query.strip()
            result_from = (max(1, page) - 1) * 10 + 1
            payload = {
                "do": "search",
                "subaction": "search",
                "story": clean_query,
                "full_search": "0",
                "result_from": str(result_from),
                "search_start": str(page),
            }
            res = scraper.post(SEARCH_URL, data=payload, timeout=DEFAULT_TIMEOUT)
        else:
            if page <= 1:
                target_url = ROBLOX_URL
            else:
                target_url = f"{ROBLOX_URL.rstrip('/')}/page/{page}/"
            res = scraper.get(target_url, timeout=DEFAULT_TIMEOUT)

        if res.status_code != 200:
            logger.warning(f"Unexpected status code {res.status_code} on page {page}")
            return []

        soup = BeautifulSoup(res.text, "html.parser")
        article_elements = soup.select("article, .custom-card-light, .rs-card, .short-story")

        seen_links = set()
        for el in article_elements:
            parsed = parse_article(el)
            if parsed and parsed.get("sourceLink") and parsed["sourceLink"] not in seen_links:
                seen_links.add(parsed["sourceLink"])
                scripts.append(parsed)

    except Exception as e:
        logger.error(f"Error fetching page {page}: {e}")

    return scripts


def update_database(
    pages: int = 5,
    query: Optional[str] = None,
    output_path: Path = DATABASE_FILE,
    base_url: str = "http://127.0.0.1:8000",
) -> int:
    """
    Scrapes the specified number of pages, deep-extracts all script items,
    downloads icons, and merges into the local JSON database file.
    """
    logger.info(f"=== Starting Offline Scrape: pages={pages}, query='{query or ''}' ===")

    # Load existing database if available
    existing_dict: Dict[str, Dict[str, Any]] = {}
    if output_path.exists():
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                items = data.get("scripts", data) if isinstance(data, dict) else data
                for s in items:
                    if isinstance(s, dict) and s.get("id"):
                        existing_dict[s["id"]] = s
            logger.info(f"Loaded {len(existing_dict)} existing scripts from {output_path.name}")
        except Exception as e:
            logger.warning(f"Could not load existing {output_path}: {e}")

    new_count = 0
    updated_count = 0

    for p in range(1, pages + 1):
        logger.info(f"[Page {p}/{pages}] Scraping article listings...")
        articles = scrape_page_articles(page=p, query=query)
        if not articles:
            logger.info(f"[Page {p}/{pages}] No more articles found. Ending pagination.")
            break

        logger.info(f"[Page {p}/{pages}] Found {len(articles)} articles. Deep-extracting scripts...")

        def process_parent(article: Dict[str, Any]) -> List[Dict[str, Any]]:
            return deep_extract_article_scripts(article, base_url=base_url)

        with ThreadPoolExecutor(max_workers=5) as executor:
            batch_results = list(executor.map(process_parent, articles))

        flat_batch: List[Dict[str, Any]] = []
        for batch in batch_results:
            flat_batch.extend(batch)

        logger.info(f"[Page {p}/{pages}] Extracted {len(flat_batch)} individual scripts from {len(articles)} articles.")

        for item in flat_batch:
            sid = item.get("id")
            if not sid:
                continue
            if sid in existing_dict:
                # Update existing script entry
                existing_dict[sid].update(item)
                updated_count += 1
            else:
                existing_dict[sid] = item
                new_count += 1

        # Friendly interval
        time.sleep(1)

    all_scripts = list(existing_dict.values())

    # Write out cleanly formatted JSON
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_file = output_path.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(all_scripts, f, indent=2, ensure_ascii=False)
    temp_file.replace(output_path)

    logger.info("=" * 60)
    logger.info(f"SUCCESS! Database saved to {output_path}")
    logger.info(f"Total scripts in database: {len(all_scripts)}")
    logger.info(f"New scripts added: {new_count}")
    logger.info(f"Scripts updated: {updated_count}")
    logger.info("=" * 60)

    return len(all_scripts)


def main():
    parser = argparse.ArgumentParser(description="DenKi Standalone Offline Scraper")
    parser.add_argument("--pages", type=int, default=5, help="Number of pages to scrape (default: 5)")
    parser.add_argument("--query", type=str, default=None, help="Optional search query or direct URL")
    parser.add_argument("--output", type=str, default=str(DATABASE_FILE), help="Output JSON database path")
    parser.add_argument("--base-url", type=str, default="http://127.0.0.1:8000", help="Base URL for assets")

    args = parser.parse_args()
    update_database(
        pages=args.pages,
        query=args.query,
        output_path=Path(args.output),
        base_url=args.base_url,
    )


if __name__ == "__main__":
    main()
