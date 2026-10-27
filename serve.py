"""
DenKi Local Development Server
Automatically detects your Wi-Fi/LAN IPv4 address, displays clear
local/network access URLs and a terminal ASCII QR code, and serves the site.
"""
import os
import sys
import re
import time
import json
import socket
import argparse
import subprocess
from typing import Optional, List, Dict, Any
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import mimetypes
mimetypes.init()
mimetypes.add_type("text/xml", ".plist")
mimetypes.add_type("application/x-apple-aspen-config", ".mobileconfig")
mimetypes.add_type("application/octet-stream", ".ipa")

# Reconfigure stdout for UTF-8 so block characters/QR codes render cleanly on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure .venv packages (like qrcode and colorama) are discoverable even if run with global python
_script_dir = os.path.dirname(os.path.abspath(__file__))
_venv_site = os.path.join(_script_dir, ".venv", "Lib", "site-packages")
if os.path.exists(_venv_site) and _venv_site not in sys.path:
    sys.path.insert(0, _venv_site)

try:
    import qrcode
    import qrcode.image.svg
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False

_active_tunnel_url: Optional[str] = None
_tunnel_proc: Optional[subprocess.Popen] = None


def get_local_ip() -> str:
    """Detects the computer's primary LAN/Wi-Fi IPv4 address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Connect to public DNS (no actual packet is transmitted)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        try:
            ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def get_all_ips():
    """Returns all IPv4 addresses on this machine."""
    ips = set()
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127."):
                ips.add(ip)
    except Exception:
        pass
    primary = get_local_ip()
    if primary != "127.0.0.1":
        ips.add(primary)
    return list(ips) or [primary]


def save_dev_assets(local_ip: str, port: int, tunnel_url: Optional[str] = None):
    """Saves network info and QR code image for the frontend helper display."""
    url = f"http://{local_ip}:{port}"
    target_qr_url = tunnel_url or url
    
    # 1. Save data/network_info.json
    data_dir = os.path.join(_script_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    info_path = os.path.join(data_dir, "network_info.json")
    with open(info_path, "w", encoding="utf-8") as f:
        json.dump({
            "local_ip": local_ip,
            "port": port,
            "local_url": f"http://localhost:{port}",
            "network_url": url,
            "tunnel_url": tunnel_url,
            "https_url": tunnel_url,
            "active_url": target_qr_url,
            "timestamp": int(os.path.getmtime(info_path) if os.path.exists(info_path) else 0)
        }, f, indent=2)

    # 2. Save assets/qr_code.svg
    if HAS_QRCODE:
        try:
            assets_dir = os.path.join(_script_dir, "assets")
            os.makedirs(assets_dir, exist_ok=True)
            svg_path = os.path.join(assets_dir, "qr_code.svg")
            img = qrcode.make(target_qr_url, image_factory=qrcode.image.svg.SvgPathImage)
            with open(svg_path, "wb") as f:
                img.save(f)
        except Exception:
            pass


class DevHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=_script_dir, **kwargs)

    def do_OPTIONS(self):
        # Handle CORS preflight for mobile browsers
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()

    def do_GET(self):
        # Dev API endpoint to get network info dynamically
        if self.path.startswith("/__dev/network"):
            local_ip = get_local_ip()
            port = self.server.server_port
            payload = json.dumps({
                "local_ip": local_ip,
                "port": port,
                "local_url": f"http://localhost:{port}",
                "network_url": f"http://{local_ip}:{port}",
                "tunnel_url": _active_tunnel_url,
                "https_url": _active_tunnel_url,
                "active_url": _active_tunnel_url or f"http://{local_ip}:{port}",
                "all_ips": get_all_ips()
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            self.end_headers()
            self.wfile.write(payload)
            return

        # In-page Key Bypass API proxy
        if self.path.startswith("/api/bypass"):
            self.handle_bypass_api()
            return

        # Reverse-proxy /api/* requests to FastAPI backend on port 8000 with resilient local database fallback
        if self.path.startswith("/api/"):
            backend_url = f"http://127.0.0.1:8000{self.path}"
            proxied = False
            try:
                import urllib.request
                req = urllib.request.Request(backend_url)
                for header, value in self.headers.items():
                    if header.lower() not in ["host", "content-length"]:
                        req.add_header(header, value)
                with urllib.request.urlopen(req, timeout=1.2) as resp:
                    data = resp.read()
                    self.send_response(resp.status)
                    for k, v in resp.headers.items():
                        if k.lower() not in ["content-length", "transfer-encoding", "access-control-allow-origin", "cache-control"]:
                            self.send_header(k, v)
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
                    self.send_header("Pragma", "no-cache")
                    self.send_header("Expires", "0")
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    proxied = True
                    return
            except Exception:
                proxied = False

            # Fallback: serve /api/scripts directly from local data/database.json if port 8000 is not active
            if not proxied and "/api/scripts" in self.path:
                self.handle_local_scripts_api()
                return

            err_payload = json.dumps({"error": "Backend API proxy unreachable and no fallback available", "scripts": []}).encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Content-Length", str(len(err_payload)))
            self.end_headers()
            self.wfile.write(err_payload)
            return

        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/bypass"):
            self.handle_bypass_api()
            return

        # Reverse-proxy other /api/* requests to FastAPI backend on port 8000
        if self.path.startswith("/api/"):
            backend_url = f"http://127.0.0.1:8000{self.path}"
            try:
                import urllib.request
                content_len = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_len) if content_len > 0 else b""
                req = urllib.request.Request(backend_url, data=body, method="POST")
                for header, value in self.headers.items():
                    if header.lower() not in ["host", "content-length"]:
                        req.add_header(header, value)
                with urllib.request.urlopen(req, timeout=3.0) as resp:
                    data = resp.read()
                    self.send_response(resp.status)
                    for k, v in resp.headers.items():
                        if k.lower() not in ["content-length", "transfer-encoding", "access-control-allow-origin", "cache-control"]:
                            self.send_header(k, v)
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    return
            except Exception:
                pass

        self.send_error(501, "Unsupported method (POST)")

    def handle_bypass_api(self):
        """
        In-page Key Bypass API proxy.
        Extracts link from GET query or POST JSON body, calls bypass.city or resolving logic,
        and returns JSON results with full CORS headers.
        """
        import urllib.parse
        import urllib.request
        import base64

        target_url = None

        if self.command == "GET":
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            if "url" in qs and qs["url"]:
                target_url = qs["url"][0].strip()
        elif self.command == "POST":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else ""
                post_data = json.loads(body) if body else {}
                target_url = post_data.get("url", "").strip()
            except Exception:
                pass

        if not target_url:
            self.send_json_response(400, {
                "success": False,
                "status": "INVALID_URL",
                "error_code": "EMPTY_URL",
                "error": "សូមបញ្ចូលតំណភ្ជាប់ (Link) ជាមុនសិន!"
            })
            return

        # Safe URL scheme validation
        lowered = target_url.lower().strip()
        if lowered.startswith(("javascript:", "data:", "file:", "vbscript:", "about:")):
            self.send_json_response(400, {
                "success": False,
                "status": "INVALID_URL",
                "error_code": "UNSAFE_SCHEME",
                "error": "Unsafe or unsupported link scheme."
            })
            return

        # Ensure scheme
        if not re.match(r"^https?://", target_url, re.IGNORECASE):
            target_url = "https://" + target_url

        try:
            parsed_target = urllib.parse.urlparse(target_url)
            if not parsed_target.netloc or "." not in parsed_target.netloc:
                self.send_json_response(400, {
                    "success": False,
                    "status": "INVALID_URL",
                    "error_code": "INVALID_HOST",
                    "error": "Invalid URL format. Please provide a valid domain link."
                })
                return
        except Exception:
            self.send_json_response(400, {
                "success": False,
                "status": "INVALID_URL",
                "error_code": "PARSE_ERROR",
                "error": "Failed to parse URL."
            })
            return

        result = self.execute_bypass(target_url)
        self.send_json_response(200, result)

    def send_json_response(self, status_code: int, data: dict):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def execute_bypass(self, target_url: str) -> dict:
        import urllib.parse
        from bypass_engine import resolve_ad_flow, is_lootlabs_url
        result = resolve_ad_flow(target_url)

        # Enrich LootLabs interaction error response only for authentic LootLabs links
        is_loot = (
            result.get("provider") == "lootlabs"
            or (result.get("status") == "MANUAL_INTERACTION_REQUIRED" and is_lootlabs_url(target_url))
        )
        if is_loot and result.get("status") == "MANUAL_INTERACTION_REQUIRED":
            encoded_target = urllib.parse.quote(target_url, safe="")
            bypass_city_url = f"https://bypass.city/bypass?bypass={encoded_target}"
            result["bypassCityUrl"] = bypass_city_url
            result["explanation"] = "ដំណើរការរួចរាល់! ✓ សូមចុចប៊ូតុងខាងក្រោមដើម្បីទទួលយក Key របស់អ្នក។"
            result["button_text"] = "ចុចទីនេះដើម្បីយក Key"
            result["button_url"] = bypass_city_url
            result["error"] = "LootLabs: ដំណើរការរួចរាល់! ✓ សូមចុចប៊ូតុងខាងក្រោមដើម្បីទទួលយក Key របស់អ្នក។"

        return result

    def handle_local_scripts_api(self):
        """Serves /api/scripts queries directly from data/database.json for sub-millisecond responses."""
        import urllib.parse
        import math

        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)

        search = qs.get("search", [""])[0].strip()
        game = qs.get("game", [""])[0].strip()
        try:
            page = max(1, int(qs.get("page", ["1"])[0]))
        except (ValueError, TypeError):
            page = 1
        try:
            per_page = min(100, max(1, int(qs.get("per_page", ["12"])[0])))
        except (ValueError, TypeError):
            per_page = 12

        db_path = os.path.join(_script_dir, "data", "database.json")
        scripts = []
        if os.path.exists(db_path):
            try:
                with open(db_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        scripts = data
                    elif isinstance(data, dict):
                        scripts = data.get("scripts", [])
            except Exception as e:
                sys.stderr.write(f"  [ERROR] Failed to read database.json: {e}\n")

        filtered = scripts

        # Filter by game
        if game and game.lower() not in ["all", ""]:
            g_clean = game.lower()
            filtered = [
                s for s in filtered
                if g_clean in s.get("game", "").lower() or g_clean in s.get("title", "").lower()
            ]

        # Search across title, game, hubName, features, author, and link
        if search:
            terms = [t.lower() for t in search.split() if t]
            if terms:
                filtered = [
                    s for s in filtered
                    if all(
                        term in f"{s.get('title', '')} {s.get('game', '')} {s.get('hubName', '')} {s.get('features', '')} {s.get('author', '')} {s.get('link', '')} {s.get('loadstring', '')}".lower()
                        for term in terms
                    )
                ]

        # Prioritize Chilli and FyyCommunity to top index
        def script_priority_weight(s):
            text = f"{s.get('title', '')} {s.get('game', '')} {s.get('author', '')} {s.get('hubName', '')}".lower()
            return 1000 if ('chilli' in text or 'chili' in text or 'fyycommunity' in text) else 0

        filtered.sort(key=script_priority_weight, reverse=True)

        total_items = len(filtered)
        total_pages = max(1, math.ceil(total_items / per_page))
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paged = filtered[start_idx:end_idx]
        has_more = page < total_pages

        payload = json.dumps({
            "success": True,
            "count": len(paged),
            "total": total_items,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "has_more": has_more,
            "search": search,
            "game": game,
            "scripts": paged,
        }).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def end_headers(self):
        # Disable caching completely for html, js, css, and json so mobile browsers always fetch latest code
        clean_path = self.path.split("?")[0].split("#")[0].lower()
        if (
            clean_path.endswith((".html", ".htm", ".js", ".mjs", ".css", ".json"))
            or clean_path in ["/", ""]
            or clean_path.startswith(("/api/", "/__dev/"))
        ):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, format, *args):
        # Clean request logging for dev
        sys.stderr.write(f"  [{self.log_date_time_string()}] {args[0]} {args[1]}\n")


def start_cloudflare_tunnel(port: int) -> Optional[str]:
    """
    Spawns Cloudflare Quick Tunnel (cloudflared) to generate a public HTTPS URL.
    100% free, zero account required, trusted by iOS Safari for OTA app installs.
    """
    global _tunnel_proc
    cloudflared_bin = os.path.join(_script_dir, "bin", "cloudflared.exe")

    if not os.path.exists(cloudflared_bin):
        import shutil
        in_path = shutil.which("cloudflared")
        if in_path:
            cloudflared_bin = in_path
        else:
            print("  ⚡ Downloading Cloudflare Tunnel binary (free, zero-config)...")
            os.makedirs(os.path.join(_script_dir, "bin"), exist_ok=True)
            import urllib.request
            dl_url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
            try:
                urllib.request.urlretrieve(dl_url, cloudflared_bin)
                print("  ✅ Cloudflare Tunnel binary downloaded successfully.")
            except Exception as e:
                print(f"  ❌ Cloudflare download failed: {e}")
                return None

    cmd = [cloudflared_bin, "tunnel", "--url", f"http://127.0.0.1:{port}"]
    try:
        creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        _tunnel_proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            creationflags=creationflags
        )
    except Exception as e:
        print(f"  ❌ Failed to launch cloudflared: {e}")
        return None

    pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")
    found_url = None
    start_time = time.time()

    while time.time() - start_time < 15:
        if _tunnel_proc.poll() is not None:
            break
        line = _tunnel_proc.stdout.readline()
        if not line:
            time.sleep(0.1)
            continue
        match = pattern.search(line)
        if match:
            found_url = match.group(0)
            break

    return found_url


def start_ngrok_tunnel(port: int) -> Optional[str]:
    """Starts an ngrok tunnel via pyngrok."""
    try:
        from pyngrok import ngrok
        tunnel = ngrok.connect(port)
        return tunnel.public_url
    except Exception as e:
        print(f"  ❌ ngrok tunnel error: {e}")
        return None


def start_https_tunnel(port: int, provider: str = "auto") -> Optional[str]:
    """Starts the requested HTTPS tunnel provider."""
    global _active_tunnel_url
    url = None
    provider_clean = (provider or "auto").lower()

    if provider_clean in ["ngrok", "pyngrok"]:
        print("  ⏳ Initializing pyngrok HTTPS tunnel...")
        url = start_ngrok_tunnel(port)
    else:
        print("  ⏳ Initializing Cloudflare HTTPS Quick Tunnel (iOS Safari OTA Compatible)...")
        url = start_cloudflare_tunnel(port)
        if not url and provider_clean == "auto":
            print("  ⏳ Cloudflare failed, trying pyngrok fallback...")
            url = start_ngrok_tunnel(port)

    if url:
        _active_tunnel_url = url
    return url


def stop_https_tunnel():
    """Cleanly terminates any active tunnel processes on server shutdown."""
    global _tunnel_proc
    if _tunnel_proc and _tunnel_proc.poll() is None:
        try:
            _tunnel_proc.terminate()
            _tunnel_proc.wait(timeout=2)
        except Exception:
            try:
                _tunnel_proc.kill()
            except Exception:
                pass
    try:
        from pyngrok import ngrok
        ngrok.kill()
    except Exception:
        pass


def print_banner(local_ip: str, port: int, tunnel_url: Optional[str] = None):
    local_url = f"http://localhost:{port}/"
    network_url = f"http://{local_ip}:{port}/"
    active_target_url = tunnel_url or network_url

    # Terminal colors
    C_CYAN = "\033[96m"
    C_PURPLE = "\033[95m"
    C_GREEN = "\033[92m"
    C_YELLOW = "\033[93m"
    C_WHITE = "\033[97m"
    C_BOLD = "\033[1m"
    C_DIM = "\033[2m"
    C_RESET = "\033[0m"

    print()
    print(f"{C_PURPLE}{C_BOLD}  ╔═════════════════════════════════════════════════════════════════════╗{C_RESET}")
    print(f"{C_PURPLE}{C_BOLD}  ║                   ⚡  DENKI LOCAL DEV SERVER  ⚡                     ║{C_RESET}")
    print(f"{C_PURPLE}{C_BOLD}  ╠═════════════════════════════════════════════════════════════════════╣{C_RESET}")
    print(f"{C_PURPLE}{C_BOLD}  ║                                                                     ║{C_RESET}")
    print(f"{C_PURPLE}{C_BOLD}  ║  {C_WHITE}{C_BOLD}➜  Local Access:{C_RESET}     {C_CYAN}{C_BOLD}{local_url:<43}{C_PURPLE}{C_BOLD}║{C_RESET}")
    print(f"{C_PURPLE}{C_BOLD}  ║  {C_WHITE}{C_BOLD}➜  Network (Wi-Fi):{C_RESET}  {C_GREEN}{C_BOLD}{network_url:<43}{C_PURPLE}{C_BOLD}║{C_RESET}")
    if tunnel_url:
        print(f"{C_PURPLE}{C_BOLD}  ║  {C_WHITE}{C_BOLD}➜  Public HTTPS:{C_RESET}     {C_CYAN}{C_BOLD}{tunnel_url:<43}{C_PURPLE}{C_BOLD}║{C_RESET}")
        print(f"{C_PURPLE}{C_BOLD}  ║                                                                     ║{C_RESET}")
        print(f"{C_PURPLE}{C_BOLD}  ║  {C_YELLOW}🍏 iOS OTA E-Sign:{C_RESET} Open HTTPS link on iPhone to install E-Sign:    {C_PURPLE}{C_BOLD}║{C_RESET}")
        print(f"{C_PURPLE}{C_BOLD}  ║     {C_CYAN}{C_BOLD}{tunnel_url:<62}{C_PURPLE}{C_BOLD}║{C_RESET}")
    else:
        print(f"{C_PURPLE}{C_BOLD}  ║                                                                     ║{C_RESET}")
        print(f"{C_PURPLE}{C_BOLD}  ║  {C_YELLOW}📱 Phone Access:{C_RESET} Connect phone to same Wi-Fi & scan or open:      {C_PURPLE}{C_BOLD}║{C_RESET}")
        print(f"{C_PURPLE}{C_BOLD}  ║     {C_GREEN}{network_url:<62}{C_PURPLE}{C_BOLD}║{C_RESET}")
    print(f"{C_PURPLE}{C_BOLD}  ╚═════════════════════════════════════════════════════════════════════╝{C_RESET}")
    print()

    if HAS_QRCODE:
        try:
            qr_label = "📱 Scan QR with iPhone / mobile camera to open instantly:"
            if tunnel_url:
                qr_label += " (HTTPS Public Tunnel)"
            print(f"  {C_BOLD}{qr_label}{C_RESET}\n")
            qr = qrcode.QRCode(border=1)
            qr.add_data(active_target_url)
            qr.make(fit=True)
            qr.print_ascii(invert=True)
            print()
        except Exception:
            pass

    print(f"  {C_DIM}Press Ctrl+C to stop the server.{C_RESET}\n")


def main():
    # Read host and port from environment or default (ideal for Render, Hugging Face, Docker, etc.)
    default_host = os.environ.get("HOST", "0.0.0.0")
    try:
        default_port = int(os.environ.get("PORT", 3000))
    except (ValueError, TypeError):
        default_port = 3000

    parser = argparse.ArgumentParser(description="DenKi Server with optional HTTPS tunnel and Cloud Hosting support")
    parser.add_argument("port", nargs="?", type=int, default=default_port, help=f"Port to listen on (default: {default_port} or $PORT)")
    parser.add_argument("--host", default=default_host, help="Host to bind to (default: 0.0.0.0 or $HOST)")
    parser.add_argument("--tunnel", "-t", nargs="?", const="auto", default=None, help="Start public HTTPS tunnel (auto, cloudflare, ngrok)")
    parser.add_argument("--https", action="store_true", help="Alias to start HTTPS public tunnel")
    parser.add_argument("--ngrok", action="store_true", help="Use ngrok for HTTPS public tunnel")
    parser.add_argument("--cloudflare", action="store_true", help="Use Cloudflare for HTTPS public tunnel")

    args = parser.parse_args()
    port = args.port
    host = args.host

    tunnel_mode = args.tunnel
    if args.https or args.cloudflare or os.environ.get("DENKI_TUNNEL") or os.environ.get("DENKI_HTTPS"):
        tunnel_mode = "cloudflare"
    elif args.ngrok:
        tunnel_mode = "ngrok"

    local_ip = get_local_ip()
    tunnel_url = None

    if tunnel_mode:
        tunnel_url = start_https_tunnel(port, provider=tunnel_mode)

    save_dev_assets(local_ip, port, tunnel_url=tunnel_url)

    server = ThreadingHTTPServer((host, port), DevHTTPRequestHandler)
    print_banner(local_ip, port, tunnel_url=tunnel_url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nStopping server and tunnels...")
        stop_https_tunnel()
        server.server_close()
        print("Server stopped cleanly.")


if __name__ == "__main__":
    main()
