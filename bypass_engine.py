"""
bypass_engine.py — Turnstile Detection and Browser-Assisted Resolver
Isolates Playwright execution per-thread with strict lifecycle management.
Detects Cloudflare Turnstile challenges and returns structured CAPTCHA_REQUIRED
responses instead of attempting automated circumvention.
"""
import re
import json
import logging
import socket
import base64
import urllib.parse
import urllib.request
import urllib.error
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List

logger = logging.getLogger("bypass_engine")

# Turnstile and Cloudflare challenge selectors
TURNSTILE_SELECTORS = [
    "iframe[src*='challenges.cloudflare.com']",
    "iframe[src*='turnstile']",
    "#cf-turnstile-response",
    ".cf-turnstile",
    "div#challenge-running",
    "div#challenge-stage",
]

CHALLENGE_TITLES = [
    "just a moment...",
    "attention required! | cloudflare",
]


def detect_turnstile_challenge(page, status_code: Optional[int] = None, page_html: str = "") -> Optional[str]:
    """
    Inspects page elements, title, and response for Cloudflare Turnstile challenges.
    Returns a description string if a challenge is detected, otherwise None.
    """
    # 1. Check HTTP status code
    if status_code in (403, 503) and ("cloudflare" in page.url.lower() or "challenge" in page_html.lower()):
        return f"Cloudflare security challenge active (HTTP {status_code})"

    # 2. Check Turnstile DOM selectors
    for sel in TURNSTILE_SELECTORS:
        try:
            loc = page.locator(sel)
            if loc.count() > 0:
                return f"Cloudflare Turnstile verification challenge detected ({sel})"
        except Exception:
            pass

    # 3. Check page title
    try:
        title = page.title().lower()
        if any(term in title for term in CHALLENGE_TITLES):
            return f"Cloudflare interstitial challenge active (Title: '{page.title()}')"
    except Exception:
        pass

    # 4. Check HTML content
    page_text_lower = page_html.lower() if page_html else ""
    if "turnstile verification" in page_text_lower or "cf-turnstile" in page_text_lower:
        return "Turnstile verification container detected in page content"

    return None


def is_valid_destination_url(url: str, initial_url: str = "") -> bool:
    """Validates that extracted destination is a real external HTTP/HTTPS URL."""
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        return False
    parsed = urllib.parse.urlparse(url)
    if not parsed.netloc:
        return False
    blocked_hosts = {
        "bypass.city",
        "api2.bypass.city",
        "adbypass.org",
        "api2.adbypass.org",
        "challenges.cloudflare.com",
        "discord.gg",
        "discord.com",
        "t.me",
        "telegram.me",
        "chrome.google.com",
    }
    netloc_lower = parsed.netloc.lower()
    if any(blocked in netloc_lower for blocked in blocked_hosts):
        return False
    if initial_url:
        init_parsed = urllib.parse.urlparse(initial_url)
        if init_parsed.netloc and init_parsed.netloc.lower() == netloc_lower and parsed.path == init_parsed.path:
            return False
    return True


INTERMEDIATE_AD_DOMAINS = {
    "linkvertise.com",
    "link-to.net",
    "up-to-down.net",
    "direct-link.net",
    "file-link.net",
    "loot-link.com",
    "loot-links.com",
    "lootlink.org",
    "lootlinks.co",
    "lootlabs.gg",
    "links.lootlabs.gg",
    "lootdest.info",
    "lootdest.org",
    "lootdest.com",
    "work.ink",
    "workink.net",
    "cpm10.com",
    "cuty.io",
    "shrinkme.io",
    "adfly.com",
    "adf.ly",
    "doubleclick.net",
    "googleadservices.com",
    "adservice.google.com",
    "admitad.com",
}

KEY_GATEWAY_DOMAINS = {
    "auth.platorelay.com",
    "auth.platoboost.com",
    "gateway.platoboost.com",
    "platoboost.com",
    "spdmteam.com",
    "key.fluxteam.net",
    "keysystem.net",
    "pandadevelopment.net",
}

BYPASS_CITY_SUPPORTED_DOMAINS = {
    "linkvertise.com",
    "link-to.net",
    "up-to-down.net",
    "direct-link.net",
    "file-link.net",
    "linkvertise.download",
    "work.ink",
    "workink.net",
    "boost.ink",
    "mboost.me",
    "sub2get.com",
    "sub2unlock.com",
    "sub2unlock.net",
    "social-unlock.com",
    "socialunlock.com",
    "cuty.io",
    "shrinkme.io",
    "pastebin.com",
    "paster.so",
}


def is_key_acquisition_url(url: str) -> bool:
    """Checks if a URL is a confirmed key-acquisition gateway or destination."""
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        return False
    try:
        parsed = urllib.parse.urlparse(url)
        netloc = (parsed.netloc or "").lower().split(":")[0]
        if any(gateway in netloc for gateway in KEY_GATEWAY_DOMAINS):
            return True
        path = (parsed.path or "").lower()
        if any(p in path for p in ["/key-system", "/getkey", "/get-key", "/key/"]):
            return True
    except Exception:
        pass
    return False


class BaseProviderAdapter(ABC):
    """Abstract base class for link resolution provider adapters."""
    name: str = "base"

    @abstractmethod
    def can_handle(self, clean_url: str, parsed_url: urllib.parse.ParseResult) -> bool:
        """Determines if this adapter is designated to handle the target link."""
        pass

    @abstractmethod
    def resolve(
        self,
        clean_url: str,
        parsed_url: urllib.parse.ParseResult,
        http_opener=None,
        max_hops: int = 6,
        timeout: float = 4.0,
    ) -> Optional[Dict[str, Any]]:
        """
        Attempts resolution via this provider.
        Returns a structured dictionary if handled, or None to fall through.
        """
        pass


class DirectKeyGatewayAdapter(BaseProviderAdapter):
    name = "direct_key_gateway"

    def can_handle(self, clean_url: str, parsed_url: urllib.parse.ParseResult) -> bool:
        return is_key_acquisition_url(clean_url)

    def resolve(
        self,
        clean_url: str,
        parsed_url: urllib.parse.ParseResult,
        http_opener=None,
        max_hops: int = 6,
        timeout: float = 4.0,
    ) -> Optional[Dict[str, Any]]:
        return {
            "success": True,
            "status": "SUCCESS",
            "key": clean_url,
            "destination": clean_url,
            "source": "direct key gateway",
            "steps": 0,
            "url": clean_url,
        }


LOOTLABS_APPROVED_DOMAINS = (
    "lootlabs.gg",
    "loot-link.com",
    "lootlinks.co",
)


def is_lootlabs_url(url: str) -> bool:
    """
    Validates whether the given URL belongs to an approved LootLabs domain
    or its authentic subdomains (e.g. links.lootlabs.gg).
    Uses urllib.parse.urlsplit, extracts parsed.hostname (safely ignoring ports/userinfo),
    and strictly enforces hostname == domain or hostname.endswith('.' + domain).
    """
    if not url or not isinstance(url, str):
        return False
    try:
        parsed = urllib.parse.urlsplit(url.strip())
        hostname = (parsed.hostname or "").lower().rstrip(".")
        if not hostname:
            return False
        return any(
            hostname == domain or hostname.endswith("." + domain)
            for domain in LOOTLABS_APPROVED_DOMAINS
        )
    except Exception:
        return False


class LootLabsAdapter(BaseProviderAdapter):
    name = "lootlabs"

    def can_handle(self, clean_url: str, parsed_url: urllib.parse.ParseResult) -> bool:
        return is_lootlabs_url(clean_url)

    def resolve(
        self,
        clean_url: str,
        parsed_url: urllib.parse.ParseResult,
        http_opener=None,
        max_hops: int = 6,
        timeout: float = 4.0,
    ) -> Optional[Dict[str, Any]]:
        # LootLabs uses client-side bot detection (WrappedBotd) and dynamic ad tasks.
        # The 'data' parameter contains encrypted session data, not a plain destination URL.
        # Arbitrary unauthenticated links require direct user interaction.
        encoded_clean = urllib.parse.quote(clean_url, safe="")
        bypass_city_url = f"https://bypass.city/bypass?bypass={encoded_clean}"
        return {
            "success": False,
            "status": "MANUAL_INTERACTION_REQUIRED",
            "error_code": "AD_INTERACTION_REQUIRED",
            "provider": "lootlabs",
            "error": "LootLabs: ដំណើរការរួចរាល់! ✓ សូមចុចប៊ូតុងខាងក្រោមដើម្បីទទួលយក Key របស់អ្នក។",
            "explanation": "ដំណើរការរួចរាល់! ✓ សូមចុចប៊ូតុងខាងក្រោមដើម្បីទទួលយក Key របស់អ្នក។",
            "bypassUrl": clean_url,
            "bypassCityUrl": bypass_city_url,
            "button_text": "ចុចទីនេះដើម្បីយក Key",
            "manual_verification_supported": True,
            "url": clean_url,
        }


class QueryParamExtractorAdapter(BaseProviderAdapter):
    name = "query_param_extractor"

    def can_handle(self, clean_url: str, parsed_url: urllib.parse.ParseResult) -> bool:
        try:
            qs = urllib.parse.parse_qs(parsed_url.query)
            return any(param in qs and qs[param] for param in ["url", "r", "dest", "destination", "target", "link", "redirect", "to"])
        except Exception:
            return False

    def resolve(
        self,
        clean_url: str,
        parsed_url: urllib.parse.ParseResult,
        http_opener=None,
        max_hops: int = 6,
        timeout: float = 4.0,
    ) -> Optional[Dict[str, Any]]:
        try:
            qs = urllib.parse.parse_qs(parsed_url.query)
            for param in ["url", "r", "dest", "destination", "target", "link", "redirect", "to"]:
                if param in qs and qs[param]:
                    val = qs[param][0].strip()
                    candidates = [val]
                    try:
                        decoded = base64.b64decode(val).decode("utf-8").strip()
                        if decoded.startswith("http"):
                            candidates.append(decoded)
                    except Exception:
                        pass

                    for cand in candidates:
                        if is_valid_destination_url(cand, initial_url=clean_url):
                            cand_netloc = urllib.parse.urlparse(cand).netloc.lower()
                            if is_key_acquisition_url(cand):
                                return {
                                    "success": True,
                                    "status": "SUCCESS",
                                    "key": cand,
                                    "destination": cand,
                                    "source": "parameter extraction (direct key)",
                                    "steps": 1,
                                    "url": clean_url,
                                }
                            elif not any(ad in cand_netloc for ad in INTERMEDIATE_AD_DOMAINS):
                                return {
                                    "success": True,
                                    "status": "SUCCESS",
                                    "key": cand,
                                    "destination": cand,
                                    "source": "parameter extraction",
                                    "steps": 1,
                                    "url": clean_url,
                                }
        except Exception:
            pass
        return None


class RekoniseAdapter(BaseProviderAdapter):
    name = "rekonise"

    def can_handle(self, clean_url: str, parsed_url: urllib.parse.ParseResult) -> bool:
        return bool(re.search(r"rekonise\.com/([^/?#]+)", clean_url))

    def resolve(
        self,
        clean_url: str,
        parsed_url: urllib.parse.ParseResult,
        http_opener=None,
        max_hops: int = 6,
        timeout: float = 4.0,
    ) -> Optional[Dict[str, Any]]:
        m = re.search(r"rekonise\.com/([^/?#]+)", clean_url)
        if not m:
            return None
        slug = m.group(1)
        api_url = f"https://api.rekonise.com/social-unlocks/{slug}"
        try:
            req = urllib.request.Request(
                api_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            open_fn = http_opener.open if http_opener else urllib.request.urlopen
            with open_fn(req, timeout=timeout) as resp:
                status = getattr(resp, "status", 200)
                if not isinstance(status, int):
                    status = 200
                if status == 200:
                    raw_content = resp.read()
                    data = json.loads(raw_content.decode("utf-8") if isinstance(raw_content, bytes) else raw_content)
                    cand = data.get("url")
                    if cand and is_valid_destination_url(cand, initial_url=clean_url):
                        return {
                            "success": True,
                            "status": "SUCCESS",
                            "key": cand,
                            "destination": cand,
                            "source": "rekonise",
                            "steps": 1,
                            "url": clean_url,
                        }
        except Exception:
            pass
        return None


class BypassCityHandoffAdapter(BaseProviderAdapter):
    name = "bypass_city_handoff"

    def can_handle(self, clean_url: str, parsed_url: urllib.parse.ParseResult) -> bool:
        if not (clean_url.startswith("http://") or clean_url.startswith("https://")):
            return False
        if is_key_acquisition_url(clean_url):
            return False
        target_netloc = (parsed_url.netloc or "").lower().split(":")[0]
        if is_lootlabs_url(clean_url):
            return False
        return any(d in target_netloc for d in BYPASS_CITY_SUPPORTED_DOMAINS)

    def resolve(
        self,
        clean_url: str,
        parsed_url: urllib.parse.ParseResult,
        http_opener=None,
        max_hops: int = 6,
        timeout: float = 4.0,
    ) -> Optional[Dict[str, Any]]:
        # Validate that clean_url is an HTTP/HTTPS URL with a valid domain
        if not (clean_url.startswith("http://") or clean_url.startswith("https://")):
            return None
        target_netloc = (parsed_url.netloc or "").lower().split(":")[0]
        if not target_netloc or "." not in target_netloc:
            return None
        if not any(d in target_netloc for d in BYPASS_CITY_SUPPORTED_DOMAINS):
            return None

        handoff_url = f"https://bypass.city/bypass?{urllib.parse.urlencode({'bypass': clean_url})}"
        return {
            "success": False,
            "status": "MANUAL_INTERACTION_REQUIRED",
            "error_code": "EXTERNAL_RESOLVER_HANDOFF",
            "provider": "bypass_city",
            "error": "This link requires external resolution via Bypass.city in your browser.",
            "bypassUrl": handoff_url,
            "manual_verification_supported": True,
            "url": clean_url,
        }


class GenericRedirectAdapter(BaseProviderAdapter):
    name = "generic_redirect"

    def can_handle(self, clean_url: str, parsed_url: urllib.parse.ParseResult) -> bool:
        return True

    def resolve(
        self,
        clean_url: str,
        parsed_url: urllib.parse.ParseResult,
        http_opener=None,
        max_hops: int = 6,
        timeout: float = 4.0,
    ) -> Optional[Dict[str, Any]]:
        visited = set()
        current_url = clean_url
        step = 0

        class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None

        chain_opener = http_opener or urllib.request.build_opener(NoRedirectHandler())

        while step < max_hops:
            if current_url in visited:
                return {
                    "success": False,
                    "status": "REDIRECT_LOOP",
                    "error_code": "REDIRECT_LOOP",
                    "error": "Redirect loop detected during ad-flow navigation.",
                    "url": current_url,
                    "steps": step,
                }
            visited.add(current_url)

            if is_key_acquisition_url(current_url):
                return {
                    "success": True,
                    "status": "SUCCESS",
                    "key": current_url,
                    "destination": current_url,
                    "source": "redirect chain",
                    "steps": step,
                    "url": clean_url,
                }

            try:
                req = urllib.request.Request(
                    current_url,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    }
                )
                resp = chain_opener.open(req, timeout=timeout)
                status_code = getattr(resp, "status", 200)
                if not isinstance(status_code, int):
                    status_code = 200
                raw_headers = getattr(resp, "headers", {})
                headers = dict(raw_headers) if hasattr(raw_headers, "items") else {}
                raw_body = resp.read()
                body = raw_body.decode("utf-8", errors="ignore") if isinstance(raw_body, bytes) else str(raw_body)

                # Check for Cloudflare Turnstile / CAPTCHA challenge
                if status_code in (403, 503) or "challenges.cloudflare.com" in body or "cf-mitigated" in headers or "cf-turnstile" in body:
                    return {
                        "success": False,
                        "status": "MANUAL_INTERACTION_REQUIRED",
                        "error_code": "CAPTCHA_REQUIRED",
                        "captcha_type": "cloudflare_turnstile",
                        "error": "Provider requires manual verification / CAPTCHA on its site.",
                        "bypassUrl": current_url,
                        "manual_verification_supported": True,
                        "url": clean_url,
                        "steps": step,
                    }

                # If 30x redirect
                if status_code in (301, 302, 303, 307, 308) or "Location" in headers or "location" in headers:
                    location = headers.get("Location") or headers.get("location")
                    if location:
                        next_url = urllib.parse.urljoin(current_url, location)
                        step += 1
                        current_url = next_url
                        continue

                # Check meta refresh in HTML
                meta_m = re.search(r'<meta[^>]*http-equiv=["\']?refresh["\']?[^>]*content=["\']?\d+;\s*url=([^"\'\s>]+)', body, re.IGNORECASE)
                if meta_m:
                    meta_url = urllib.parse.urljoin(current_url, meta_m.group(1))
                    if meta_url != current_url:
                        step += 1
                        current_url = meta_url
                        continue

                # If 200 OK and not an intermediate ad domain
                cand_netloc = urllib.parse.urlparse(current_url).netloc.lower()
                if is_valid_destination_url(current_url, initial_url=clean_url) and not any(ad in cand_netloc for ad in INTERMEDIATE_AD_DOMAINS):
                    return {
                        "success": True,
                        "status": "SUCCESS",
                        "key": current_url,
                        "destination": current_url,
                        "source": "redirect chain",
                        "steps": step,
                        "url": clean_url,
                    }

                break
            except urllib.error.HTTPError as e:
                if e.code in (301, 302, 303, 307, 308):
                    location = e.headers.get("Location") or e.headers.get("location")
                    if location:
                        next_url = urllib.parse.urljoin(current_url, location)
                        step += 1
                        current_url = next_url
                        continue
                elif e.code in (403, 503):
                    return {
                        "success": False,
                        "status": "MANUAL_INTERACTION_REQUIRED",
                        "error_code": "CAPTCHA_REQUIRED",
                        "captcha_type": "cloudflare_turnstile",
                        "error": "Provider requires manual verification / CAPTCHA on its site.",
                        "bypassUrl": current_url,
                        "manual_verification_supported": True,
                        "url": clean_url,
                        "steps": step,
                    }
                elif e.code == 429:
                    return {
                        "success": False,
                        "status": "PROVIDER_RATE_LIMITED",
                        "error_code": "RATE_LIMITED",
                        "error": "Provider rate limit reached (HTTP 429).",
                        "url": clean_url,
                        "steps": step,
                    }
                break
            except (TimeoutError, socket.timeout):
                return {
                    "success": False,
                    "status": "TIMEOUT",
                    "error_code": "TIMEOUT",
                    "error": "Request timed out during ad-flow navigation.",
                    "url": clean_url,
                    "steps": step,
                }
            except Exception:
                break

        # Fallback: Public API checking with shutdown and rate-limit detection
        encoded_url = urllib.parse.quote(clean_url, safe="")
        public_api_url = f"https://api.bypass.vip/bypass?url={encoded_url}"
        try:
            req = urllib.request.Request(
                public_api_url,
                headers={
                    "Accept": "application/json, text/plain, */*",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                }
            )
            open_fn = http_opener.open if http_opener else urllib.request.urlopen
            with open_fn(req, timeout=timeout) as resp:
                raw_content = resp.read()
                raw_data = raw_content.decode("utf-8") if isinstance(raw_content, bytes) else str(raw_content)
                # Detect shutdown text
                if "FREE API SHUT DOWN" in raw_data or "SHUT DOWN THANKS TO LEECHERS" in raw_data:
                    return {
                        "success": False,
                        "status": "PROVIDER_UNAVAILABLE",
                        "error_code": "API_SHUTDOWN",
                        "error": "Public resolver API (api.bypass.vip) has shut down its free tier. Please navigate provider directly.",
                        "url": clean_url,
                    }
                data = json.loads(raw_data)
                api_status = str(data.get("status", "")).lower()
                if api_status in ("success", "ok", "true"):
                    dest = data.get("destination") or data.get("result") or data.get("key") or data.get("url")
                    if dest and isinstance(dest, str):
                        dest_clean = dest.strip()
                        is_promo = any(bad in dest_clean.lower() for bad in ["shut down", "leechers", "bypass.vip/discord", "discord.gg", "t.me"])
                        if is_valid_destination_url(dest_clean, initial_url=clean_url) and not is_promo:
                            return {
                                "success": True,
                                "status": "SUCCESS",
                                "key": dest_clean,
                                "destination": dest_clean,
                                "source": "public_json_api",
                                "steps": step + 1,
                                "url": clean_url,
                            }
        except urllib.error.HTTPError as e:
            if e.code == 429:
                return {
                    "success": False,
                    "status": "PROVIDER_RATE_LIMITED",
                    "error_code": "RATE_LIMITED",
                    "error": "Public bypass API rate limit reached (HTTP 429).",
                    "url": clean_url,
                }
        except Exception:
            pass

        return {
            "success": False,
            "status": "FAILED",
            "error_code": "BYPASS_FAILED",
            "error": "Unable to resolve key-acquisition URL for this link. Provider requires direct user navigation.",
            "url": clean_url,
            "steps": step,
        }


PROVIDER_ADAPTERS: List[BaseProviderAdapter] = [
    DirectKeyGatewayAdapter(),
    LootLabsAdapter(),
    QueryParamExtractorAdapter(),
    RekoniseAdapter(),
    BypassCityHandoffAdapter(),
    GenericRedirectAdapter(),
]


def resolve_ad_flow(
    target_url: str,
    http_opener=None,
    max_hops: int = 6,
    timeout: float = 4.0,
) -> Dict[str, Any]:
    """
    Automated Ad-Flow Link Resolver.
    Dispatches across registered provider adapters to resolve supported link flows,
    detect completion conditions, loops, timeouts, and required manual interaction.
    """
    clean_url = (target_url or "").strip()
    if not clean_url:
        return {
            "success": False,
            "status": "INVALID_URL",
            "error_code": "EMPTY_URL",
            "error": "URL cannot be empty.",
            "url": target_url,
        }

    # Scheme normalization
    if not re.match(r"^https?://", clean_url, re.IGNORECASE):
        clean_url = "https://" + clean_url

    try:
        parsed_target = urllib.parse.urlparse(clean_url)
        if not parsed_target.netloc or "." not in parsed_target.netloc:
            return {
                "success": False,
                "status": "INVALID_URL",
                "error_code": "INVALID_HOST",
                "error": "Invalid URL format. Please provide a valid domain link.",
                "url": clean_url,
            }
    except Exception:
        return {
            "success": False,
            "status": "INVALID_URL",
            "error_code": "PARSE_ERROR",
            "error": "Failed to parse URL.",
            "url": clean_url,
        }

    for adapter in PROVIDER_ADAPTERS:
        if adapter.can_handle(clean_url, parsed_target):
            res = adapter.resolve(
                clean_url,
                parsed_target,
                http_opener=http_opener,
                max_hops=max_hops,
                timeout=timeout,
            )
            if res is not None:
                return res

    return {
        "success": False,
        "status": "FAILED",
        "error_code": "BYPASS_FAILED",
        "error": "Unable to resolve key-acquisition URL for this link. Provider requires direct user navigation.",
        "url": clean_url,
        "steps": 0,
    }


def solve_bypass_city(
    target_url: str,
    timeout_ms: int = 12000,
    playwright_launcher=None,
) -> Dict[str, Any]:
    """
    Safely inspects bypass.city for a given target URL using an isolated Playwright
    session within the calling thread.

    Lifecycle:
      - Creates Playwright, Browser, Context, and Page within the active thread.
      - Never shares Playwright Sync API objects across threads.
      - Detects Turnstile challenges immediately and returns a structured CAPTCHA_REQUIRED result.
      - Guarantees full cleanup of all allocated browser resources in finally block.
    """
    clean_url = target_url.strip() if target_url else ""
    if not clean_url:
        return {
            "success": False,
            "status": "INVALID_URL",
            "error_code": "INVALID_URL",
            "error": "URL cannot be empty.",
            "url": target_url,
        }

    encoded_url = urllib.parse.quote(clean_url, safe="")
    bypass_page_url = f"https://bypass.city/bypass?bypass={encoded_url}"

    p = None
    browser = None
    context = None
    page = None

    try:
        if playwright_launcher is not None:
            # Dependency injection hook for testing
            p, browser, context, page = playwright_launcher(bypass_page_url, timeout_ms)
        else:
            from playwright.sync_api import sync_playwright

            p = sync_playwright().start()
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1280, "height": 720},
                locale="en-US",
                java_script_enabled=True,
            )
            page = context.new_page()

        # Listen for client-side custom event if fired
        page.add_init_script("""
            window.__bypassResult = null;
            window.addEventListener('bypassComplete', (e) => {
                window.__bypassResult = e.detail;
            });
        """)

        # Navigate to page
        response = page.goto(bypass_page_url, wait_until="domcontentloaded", timeout=timeout_ms)
        status_code = response.status if response else None

        # Give brief settlement window for client-side scripts/Turnstile container to render
        try:
            page.wait_for_timeout(1000)
        except Exception:
            pass

        html_content = ""
        try:
            html_content = page.content()
        except Exception:
            pass

        # 1. Turnstile & Access Control Check
        challenge_reason = detect_turnstile_challenge(page, status_code=status_code, page_html=html_content)
        if challenge_reason:
            logger.info("Turnstile challenge identified: %s", challenge_reason)
            return {
                "success": False,
                "status": "CAPTCHA_REQUIRED",
                "error_code": "CAPTCHA_REQUIRED",
                "captcha_type": "cloudflare_turnstile",
                "error": "Please complete Turnstile verification directly on the source website.",
                "bypassUrl": bypass_page_url,
                "manual_verification_supported": True,
                "url": clean_url,
                "details": challenge_reason,
            }

        # 2. Check if bypassComplete custom event resolved
        event_result = None
        try:
            event_result = page.evaluate("() => window.__bypassResult")
        except Exception:
            pass

        if event_result:
            dest = None
            if isinstance(event_result, dict):
                dest = event_result.get("bypassData") or event_result.get("destination") or event_result.get("url")
            elif isinstance(event_result, str):
                dest = event_result
            if dest and is_valid_destination_url(dest, clean_url):
                return {
                    "success": True,
                    "key": dest,
                    "source": "bypass.city (event)",
                }

        # 3. Check for destination rendered in Next.js data or DOM anchors
        dest_candidate = None
        try:
            dest_candidate = page.evaluate("""() => {
                const nextData = document.getElementById('__NEXT_DATA__');
                if (nextData) {
                    try {
                        const parsed = JSON.parse(nextData.textContent);
                        const props = parsed?.props?.pageProps;
                        if (props?.destination) return props.destination;
                        if (props?.url) return props.url;
                        if (props?.result) return props.result;
                    } catch(e) {}
                }
                const links = document.querySelectorAll('a[href]');
                for (const a of links) {
                    const href = a.href;
                    if (href && !href.includes('bypass.city') && !href.includes('adbypass.org')
                        && !href.includes('discord.gg') && !href.includes('chrome.google.com')
                        && href.startsWith('http')) {
                        const text = (a.textContent || '').toLowerCase();
                        if (text.includes('destination') || text.includes('redirect')
                            || text.includes('continue') || text.includes('go to')
                            || a.closest('[class*="result"]') || a.closest('[class*="destination"]')) {
                            return href;
                        }
                    }
                }
                return null;
            }""")
        except Exception:
            pass

        if dest_candidate and is_valid_destination_url(dest_candidate, clean_url):
            return {
                "success": True,
                "key": dest_candidate,
                "source": "bypass.city (dom)",
            }

        # 4. Check if page redirected to a valid external destination
        current_url = page.url
        if is_valid_destination_url(current_url, clean_url):
            return {
                "success": True,
                "key": current_url,
                "source": "bypass.city (redirect)",
            }

        # No destination found and no Turnstile challenge detected
        return {
            "success": False,
            "status": "NO_RESULT",
            "error_code": "NO_RESULT",
            "error": "No destination found or extraction unsupported.",
            "bypassUrl": bypass_page_url,
            "url": clean_url,
        }

    except Exception as e:
        err_msg = str(e)
        logger.warning("Browser inspection error: %s", err_msg)
        is_timeout = "timeout" in err_msg.lower()
        return {
            "success": False,
            "status": "TIMEOUT" if is_timeout else "BROWSER_ERROR",
            "error_code": "TIMEOUT" if is_timeout else "BROWSER_ERROR",
            "error": "Page inspection timed out." if is_timeout else f"Browser inspection failed: {type(e).__name__}",
            "bypassUrl": bypass_page_url,
            "url": clean_url,
        }
    finally:
        # Strict thread-local resource cleanup in reverse dependency order
        if page is not None:
            try:
                page.close()
            except Exception:
                pass
        if context is not None:
            try:
                context.close()
            except Exception:
                pass
        if browser is not None:
            try:
                browser.close()
            except Exception:
                pass
        if p is not None:
            try:
                p.stop()
            except Exception:
                pass
