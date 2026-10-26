"""
test_bypass_engine.py — Focused Unit and Integration Tests for DenKi Bypass Engine
Covers:
  - Turnstile challenge detection (selectors, titles, status codes).
  - Browser launch failure handling.
  - Timeout handling and verified cleanup in finally block.
  - Successful extraction and missing destination scenarios.
  - Frontend-compatible response schema validation.
  - serve.py execute_bypass parameter extraction and Rekonise resolution.
"""
import unittest
from unittest.mock import MagicMock, patch
import json
import urllib.parse

from bypass_engine import (
    detect_turnstile_challenge,
    is_valid_destination_url,
    solve_bypass_city,
    resolve_ad_flow,
    is_lootlabs_url,
    LOOTLABS_APPROVED_DOMAINS,
    INTERMEDIATE_AD_DOMAINS,
    KEY_GATEWAY_DOMAINS,
    BaseProviderAdapter,
    PROVIDER_ADAPTERS,
    DirectKeyGatewayAdapter,
    LootLabsAdapter,
    QueryParamExtractorAdapter,
    RekoniseAdapter,
    BypassCityHandoffAdapter,
    GenericRedirectAdapter,
    BYPASS_CITY_SUPPORTED_DOMAINS,
)
import urllib.error
from serve import DevHTTPRequestHandler


class MockLocator:
    def __init__(self, count_val=0, visible=True):
        self._count = count_val
        self._visible = visible

    def count(self):
        return self._count

    def is_visible(self):
        return self._visible


class TestTurnstileDetection(unittest.TestCase):
    def test_detection_by_turnstile_iframe_selector(self):
        page = MagicMock()
        page.url = "https://bypass.city/bypass?bypass=https%3A%2F%2Fexample.com"
        page.title.return_value = "Bypass City"

        def mock_locator(sel):
            if "challenges.cloudflare.com" in sel:
                return MockLocator(count_val=1)
            return MockLocator(count_val=0)

        page.locator.side_effect = mock_locator
        result = detect_turnstile_challenge(page, status_code=200, page_html="")
        self.assertIsNotNone(result)
        self.assertIn("Cloudflare Turnstile verification challenge detected", result)

    def test_detection_by_challenge_title(self):
        page = MagicMock()
        page.url = "https://bypass.city/bypass"
        page.title.return_value = "Just a moment..."
        page.locator.return_value = MockLocator(count_val=0)

        result = detect_turnstile_challenge(page, status_code=200, page_html="")
        self.assertIsNotNone(result)
        self.assertIn("Cloudflare interstitial challenge active", result)

    def test_detection_by_status_code_and_text(self):
        page = MagicMock()
        page.url = "https://cloudflare.com/challenge"
        page.title.return_value = "Access Denied"
        page.locator.return_value = MockLocator(count_val=0)

        result = detect_turnstile_challenge(page, status_code=403, page_html="Security challenge")
        self.assertIsNotNone(result)
        self.assertIn("Cloudflare security challenge active", result)

    def test_no_detection_on_clean_page(self):
        page = MagicMock()
        page.url = "https://bypass.city/bypass"
        page.title.return_value = "Clean Destination Page"
        page.locator.return_value = MockLocator(count_val=0)

        result = detect_turnstile_challenge(page, status_code=200, page_html="<html>Normal Page</html>")
        self.assertIsNone(result)


class TestSolveBypassCity(unittest.TestCase):
    def test_turnstile_detected_returns_structured_captcha_required(self):
        mock_p = MagicMock()
        mock_b = MagicMock()
        mock_ctx = MagicMock()
        mock_page = MagicMock()

        mock_page.url = "https://bypass.city/bypass"
        mock_page.title.return_value = "Bypass City"
        mock_page.locator.side_effect = lambda sel: MockLocator(count_val=1 if "turnstile" in sel else 0)

        def mock_launcher(url, timeout):
            return mock_p, mock_b, mock_ctx, mock_page

        result = solve_bypass_city("https://linkvertise.com/123/test", playwright_launcher=mock_launcher)

        # Assert structured response schema
        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "CAPTCHA_REQUIRED")
        self.assertEqual(result["error_code"], "CAPTCHA_REQUIRED")
        self.assertEqual(result["captcha_type"], "cloudflare_turnstile")
        self.assertEqual(result["error"], "Please complete Turnstile verification directly on the source website.")
        self.assertIn("bypass.city/bypass?bypass=", result["bypassUrl"])
        self.assertTrue(result["manual_verification_supported"])

        # Verify resource cleanup
        mock_page.close.assert_called_once()
        mock_ctx.close.assert_called_once()
        mock_b.close.assert_called_once()
        mock_p.stop.assert_called_once()

    def test_successful_destination_extraction(self):
        mock_p = MagicMock()
        mock_b = MagicMock()
        mock_ctx = MagicMock()
        mock_page = MagicMock()

        mock_page.url = "https://bypass.city/bypass"
        mock_page.title.return_value = "Unlocked"
        mock_page.locator.return_value = MockLocator(count_val=0)
        # Evaluate returns valid destination link
        mock_page.evaluate.side_effect = ["https://target-destination.org/final", None]

        def mock_launcher(url, timeout):
            return mock_p, mock_b, mock_ctx, mock_page

        result = solve_bypass_city("https://linkvertise.com/123/test", playwright_launcher=mock_launcher)

        self.assertTrue(result["success"])
        self.assertEqual(result["key"], "https://target-destination.org/final")
        self.assertIn("bypass.city", result["source"])

        # Verify resource cleanup
        mock_page.close.assert_called_once()
        mock_ctx.close.assert_called_once()
        mock_b.close.assert_called_once()
        mock_p.stop.assert_called_once()

    def test_missing_destination_returns_no_result(self):
        mock_p = MagicMock()
        mock_b = MagicMock()
        mock_ctx = MagicMock()
        mock_page = MagicMock()

        mock_page.url = "https://bypass.city/bypass"
        mock_page.title.return_value = "Page Title"
        mock_page.locator.return_value = MockLocator(count_val=0)
        mock_page.evaluate.return_value = None

        def mock_launcher(url, timeout):
            return mock_p, mock_b, mock_ctx, mock_page

        result = solve_bypass_city("https://linkvertise.com/123/test", playwright_launcher=mock_launcher)

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "NO_RESULT")
        self.assertIn("No destination found", result["error"])

        # Verify resource cleanup
        mock_page.close.assert_called_once()
        mock_ctx.close.assert_called_once()
        mock_b.close.assert_called_once()
        mock_p.stop.assert_called_once()

    def test_browser_launch_failure_handled_gracefully(self):
        def failing_launcher(url, timeout):
            raise RuntimeError("Chromium binary not found or execution failed")

        result = solve_bypass_city("https://linkvertise.com/123/test", playwright_launcher=failing_launcher)

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "BROWSER_ERROR")
        self.assertIn("Browser inspection failed: RuntimeError", result["error"])
        self.assertIn("bypass.city/bypass?bypass=", result["bypassUrl"])

    def test_timeout_and_guaranteed_cleanup(self):
        mock_p = MagicMock()
        mock_b = MagicMock()
        mock_ctx = MagicMock()
        mock_page = MagicMock()

        # Simulate timeout during goto
        mock_page.goto.side_effect = TimeoutError("Navigation timeout of 10000ms exceeded")

        def mock_launcher(url, timeout):
            return mock_p, mock_b, mock_ctx, mock_page

        result = solve_bypass_city("https://linkvertise.com/123/test", playwright_launcher=mock_launcher)

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "TIMEOUT")
        self.assertEqual(result["error"], "Page inspection timed out.")

        # Guaranteed cleanup must execute even after exception
        mock_page.close.assert_called_once()
        mock_ctx.close.assert_called_once()
        mock_b.close.assert_called_once()
        mock_p.stop.assert_called_once()


class TestServeExecuteBypass(unittest.TestCase):
    def setUp(self):
        # Create a dummy handler instance to test execute_bypass
        self.handler = DevHTTPRequestHandler.__new__(DevHTTPRequestHandler)

    def test_direct_parameter_extraction_plain_url(self):
        target = "https://gateway.net/redirect?url=https%3A%2F%2Ffinaldestination.com%2Fsecret"
        result = self.handler.execute_bypass(target)
        self.assertTrue(result["success"])
        self.assertEqual(result["key"], "https://finaldestination.com/secret")
        self.assertIn("parameter extraction", result["source"])

    def test_direct_parameter_extraction_base64_url(self):
        # aHR0cHM6Ly9leGFtcGxlLmNvbS9kb3dubG9hZA== is base64 for https://example.com/download
        target = "https://gateway.net/jump?target=aHR0cHM6Ly9leGFtcGxlLmNvbS9kb3dubG9hZA=="
        result = self.handler.execute_bypass(target)
        self.assertTrue(result["success"])
        self.assertEqual(result["key"], "https://example.com/download")
        self.assertIn("parameter extraction", result["source"])

    @patch("urllib.request.urlopen")
    def test_rekonise_social_unlock_resolver(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps({"url": "https://pastebin.com/raw/xyz"}).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        target = "https://rekonise.com/sample-unlock-slug"
        result = self.handler.execute_bypass(target)
        self.assertTrue(result["success"])
        self.assertEqual(result["key"], "https://pastebin.com/raw/xyz")
        self.assertIn("rekonise", result["source"])

    @patch("urllib.request.urlopen")
    def test_public_json_api_extraction(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps({
            "status": "success",
            "destination": "https://auth.platorelay.com/token/key_abc123"
        }).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        target = "https://generic-shortener.io/123/protected-link"
        result = self.handler.execute_bypass(target)
        self.assertTrue(result["success"])
        self.assertEqual(result["key"], "https://auth.platorelay.com/token/key_abc123")
        self.assertEqual(result["destination"], "https://auth.platorelay.com/token/key_abc123")
        self.assertEqual(result["source"], "public_json_api")

    def test_direct_auth_platorelay_url_resolution(self):
        target = "https://auth.platorelay.com/target?key=abcdef"
        result = self.handler.execute_bypass(target)
        self.assertTrue(result["success"])
        self.assertEqual(result["key"], target)
        self.assertEqual(result["destination"], target)
        self.assertIn("direct", result["source"])

    def test_unresolvable_url_returns_clean_failure(self):
        target = "https://unknownsite.org/nonexistent"
        result = self.handler.execute_bypass(target)
        self.assertFalse(result["success"])
        self.assertIn(result["status"], ("FAILED", "PROVIDER_UNAVAILABLE"))
        self.assertIn("error", result)


class TestURLValidationAndSafety(unittest.TestCase):
    def test_destination_url_validation_rules(self):
        # Valid external URLs
        self.assertTrue(is_valid_destination_url("https://mediafire.com/file/123"))
        self.assertTrue(is_valid_destination_url("http://example.com/download"))

        # Blocked / Internal hosts
        self.assertFalse(is_valid_destination_url("https://bypass.city/bypass?bypass=test"))
        self.assertFalse(is_valid_destination_url("https://api2.bypass.city/bypass"))
        self.assertFalse(is_valid_destination_url("https://challenges.cloudflare.com/turnstile"))

        # Invalid schemes
        self.assertFalse(is_valid_destination_url("javascript:alert(1)"))
        self.assertFalse(is_valid_destination_url("data:text/html,<b>xss</b>"))
        self.assertFalse(is_valid_destination_url(""))
        self.assertFalse(is_valid_destination_url(None))

        # Same as initial URL
        self.assertFalse(is_valid_destination_url("https://linkvertise.com/123", initial_url="https://linkvertise.com/123"))

    def test_solve_bypass_city_empty_url(self):
        result = solve_bypass_city("")
        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "INVALID_URL")
        self.assertEqual(result["error_code"], "INVALID_URL")

    def test_handle_bypass_api_input_validation(self):
        handler = DevHTTPRequestHandler.__new__(DevHTTPRequestHandler)
        responses = []

        def mock_send_json(status_code, data):
            responses.append((status_code, data))

        handler.send_json_response = mock_send_json
        handler.command = "GET"

        # 1. Empty URL
        handler.path = "/api/bypass?url="
        handler.handle_bypass_api()
        self.assertEqual(responses[-1][0], 400)
        self.assertEqual(responses[-1][1]["status"], "INVALID_URL")

        # 2. Unsafe scheme (javascript:)
        handler.path = "/api/bypass?url=javascript:alert(1)"
        handler.handle_bypass_api()
        self.assertEqual(responses[-1][0], 400)
        self.assertEqual(responses[-1][1]["error_code"], "UNSAFE_SCHEME")

        # 3. Invalid host (no dot in domain)
        handler.path = "/api/bypass?url=https://localhost_nodot/path"
        handler.handle_bypass_api()
        self.assertEqual(responses[-1][0], 400)
        self.assertEqual(responses[-1][1]["error_code"], "INVALID_HOST")


class TestCaptchaModalIntegration(unittest.TestCase):
    def setUp(self):
        self.handler = DevHTTPRequestHandler.__new__(DevHTTPRequestHandler)

    def test_failed_bypass_does_not_redirect_or_require_turnstile(self):
        target = "https://unsupported-site-xyz.com/123/key"
        res = self.handler.execute_bypass(target)
        self.assertFalse(res["success"])
        self.assertIn(res["status"], ("FAILED", "PROVIDER_UNAVAILABLE"))
        self.assertNotIn("bypass.city", res.get("bypassUrl", ""))

    def test_fake_or_missing_token_never_produces_success(self):
        # Fake tokens or invalid non-URLs must never pass destination validation
        self.assertFalse(is_valid_destination_url("fake_turnstile_token_xyz"))
        self.assertFalse(is_valid_destination_url("0.xxxx.yyyy.zzzz"))
        self.assertFalse(is_valid_destination_url("https://bypass.city/api/fake"))

        # solve_bypass_city with a fake event detail must reject it
        mock_p = MagicMock()
        mock_b = MagicMock()
        mock_ctx = MagicMock()
        mock_page = MagicMock()

        mock_page.url = "https://bypass.city/bypass"
        mock_page.title.return_value = "Bypass City"
        mock_page.locator.return_value = MockLocator(count_val=0)
        mock_page.evaluate.return_value = "fake_token_not_a_valid_destination"

        def mock_launcher(url, timeout):
            return mock_p, mock_b, mock_ctx, mock_page

        result = solve_bypass_city("https://linkvertise.com/123/test", playwright_launcher=mock_launcher)
        self.assertFalse(result["success"])
        self.assertNotEqual(result.get("status"), "SUCCESS")

    def test_index_html_contains_accessible_captcha_modal_and_bypass_link(self):
        with open("d:/DenKi/index.html", "r", encoding="utf-8") as f:
            html = f.read()

        self.assertIn('id="captchaModal"', html)
        self.assertIn('role="dialog"', html)
        self.assertIn('aria-modal="true"', html)
        self.assertIn('id="closeCaptchaModal"', html)
        self.assertIn('id="captchaOpenExtBtn"', html)
        self.assertIn('id="captchaModalRetryBtn"', html)
        self.assertIn('id="captchaStateUnavailable"', html)
        self.assertIn('id="dismissCaptchaModal"', html)
        self.assertIn('id="bypassKeyLink"', html)
        self.assertIn('id="bypassKeyLinkLabel"', html)
        self.assertIn('id="bypassKeyLinkUrl"', html)
        self.assertIn('id="bypassCopyKeyBtn"', html)
        self.assertIn('id="captchaModalRetryBtn"', html)
        self.assertIn('id="captchaStateUnavailable"', html)
        self.assertIn('id="dismissCaptchaModal"', html)

    def test_app_js_modal_functions_and_listeners(self):
        with open("d:/DenKi/app.js", "r", encoding="utf-8") as f:
            js = f.read()

        self.assertIn("function openCaptchaModal", js)
        self.assertIn("function closeCaptchaModal", js)
        self.assertIn("dom.closeCaptchaModal", js)
        self.assertIn("dom.captchaModalRetryBtn", js)
        self.assertIn("Escape", js)

    def test_playwright_mocked_captcha_required_opens_modal_and_actions_work(self):
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True)
            page = b.new_page()

            # Mock /api/bypass endpoint to return CAPTCHA_REQUIRED
            fetch_count = [0]
            def handle_route(route):
                fetch_count[0] += 1
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps({
                        "success": False,
                        "status": "CAPTCHA_REQUIRED",
                        "error_code": "CAPTCHA_REQUIRED",
                        "captcha_type": "cloudflare_turnstile",
                        "error": "Please complete Turnstile verification directly on the source website.",
                        "bypassUrl": "https://bypass.city/bypass?bypass=https%3A%2F%2Flinkvertise.com%2F123%2Fsample",
                        "manual_verification_supported": True,
                        "url": "https://linkvertise.com/123/sample"
                    })
                )

            page.route("**/api/bypass*", handle_route)
            page.goto("http://127.0.0.1:3000/")

            # Fill target link and submit
            page.fill("#bypassInput", "https://linkvertise.com/123/sample")
            page.click("#bypassSubmitBtn")

            # 1. Verify modal becomes visible
            modal = page.wait_for_selector("#captchaModal:not(.hidden)", timeout=5000)
            self.assertIsNotNone(modal)

            # 2. Verify user remains strictly on DenKi (NO automatic redirect/navigation)
            self.assertIn("127.0.0.1:3000", page.url)
            self.assertNotIn("bypass.city", page.url)
            self.assertEqual(len(page.context.pages), 1)

            # 3. Verify target URL in modal
            target_text = page.inner_text("#captchaTargetUrl")
            self.assertIn("linkvertise.com/123/sample", target_text)

            # 4. Verify Open bypass.city button is secondary/optional with correct external URL
            ext_btn = page.query_selector("#captchaOpenExtBtn")
            self.assertIsNotNone(ext_btn)
            ext_classes = ext_btn.get_attribute("class") or ""
            self.assertIn("captcha-secondary-btn", ext_classes)
            ext_href = ext_btn.get_attribute("href")
            self.assertIn("bypass.city/bypass?bypass=", ext_href)

            # 5. Verify Retry button is primary in-page action
            retry_btn = page.query_selector("#captchaModalRetryBtn")
            self.assertIsNotNone(retry_btn)
            retry_classes = retry_btn.get_attribute("class") or ""
            self.assertIn("captcha-primary-btn", retry_classes)

            # 6. Verify no duplicate inline error card is shown behind the modal
            is_result_box_hidden = "hidden" in (page.get_attribute("#bypassResultBox", "class") or "")
            self.assertTrue(is_result_box_hidden)

            # 7. Verify Close button hides modal
            page.click("#closeCaptchaModal")
            page.wait_for_selector("#captchaModal", state="hidden", timeout=3000)
            is_modal_hidden = "hidden" in (page.get_attribute("#captchaModal", "class") or "")
            self.assertTrue(is_modal_hidden)
            self.assertIn("127.0.0.1:3000", page.url)

            # 8. Re-open and verify Retry triggers in-page extraction without navigating away
            page.click("#bypassSubmitBtn")
            page.wait_for_selector("#captchaModal:not(.hidden)", timeout=5000)
            curr_fetches = fetch_count[0]

            # Click retry button inside modal
            page.click("#captchaModalRetryBtn")
            page.wait_for_selector("#captchaModal:not(.hidden)", timeout=5000)
            self.assertGreater(fetch_count[0], curr_fetches)
            self.assertIn("127.0.0.1:3000", page.url)
            self.assertEqual(len(page.context.pages), 1)

            # 9. Verify ESC key closes modal
            page.keyboard.press("Escape")
            page.wait_for_selector("#captchaModal", state="hidden", timeout=3000)
            self.assertTrue("hidden" in (page.get_attribute("#captchaModal", "class") or ""))

            # 10. Re-open modal and verify ONLY explicit click on optional external button opens new tab
            page.click("#bypassSubmitBtn")
            page.wait_for_selector("#captchaModal:not(.hidden)", timeout=5000)
            with page.context.expect_page() as new_page_info:
                page.click("#captchaOpenExtBtn")
            new_tab = new_page_info.value
            self.assertIn("bypass.city/bypass", new_tab.url)
            self.assertIn("127.0.0.1:3000", page.url)
            new_tab.close()

            b.close()

    def test_lootlabs_khmer_message_and_button(self):
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True)
            page = b.new_page()

            loot_url = "https://links.lootlabs.gg/s?QXdKuPBJ&data=khmer_test_123"
            page.goto("http://127.0.0.1:3000/")
            # Switch language to Khmer via UI
            page.click("#langBtn")
            page.click("button.lang-item[data-lang='km']")

            page.fill("#bypassInput", loot_url)
            page.click("#bypassSubmitBtn")

            page.wait_for_selector("#bypassResultBox:not(.hidden)", timeout=5000)
            msg_text = page.inner_text("#bypassErrorMsg")
            self.assertIn("ដំណើរការរួចរាល់", msg_text)

            ext_btn = page.query_selector("#bypassExtBtn")
            self.assertIsNotNone(ext_btn)
            btn_text = page.inner_text("#bypassExtBtn")
            self.assertIn("ចុចទីនេះដើម្បីយក Key", btn_text)
            self.assertIn("https://bypass.city/bypass?bypass=", ext_btn.get_attribute("href"))

            b.close()



class MockHTTPResponse:
    def __init__(self, body=b"", status=200, headers=None):
        self._body = body if isinstance(body, bytes) else body.encode("utf-8")
        self.status = status
        self.headers = headers or {}

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


class TestAutomatedAdFlowResolver(unittest.TestCase):
    def test_multi_step_redirect_resolves_to_validated_key_url(self):
        # 302 hop1 -> hop2 -> final validated key url (auth.platorelay.com)
        mock_opener = MagicMock()

        def mock_open(req, timeout=4.0):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            if "step1" in url:
                return MockHTTPResponse(status=302, headers={"Location": "https://gateway.com/step2"})
            elif "step2" in url:
                return MockHTTPResponse(status=302, headers={"Location": "https://auth.platorelay.com/target?key=validated123"})
            elif "auth.platorelay.com" in url:
                return MockHTTPResponse(b"OK", status=200)
            return MockHTTPResponse(status=404)

        mock_opener.open.side_effect = mock_open
        res = resolve_ad_flow("https://gateway.com/step1", http_opener=mock_opener)
        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["key"], "https://auth.platorelay.com/target?key=validated123")
        self.assertEqual(res["source"], "redirect chain")
        self.assertGreaterEqual(res["steps"], 1)

    def test_intermediate_ad_domain_not_treated_as_final_key(self):
        # Redirect chain stops at an intermediate ad domain (linkvertise.com)
        mock_opener = MagicMock()
        mock_opener.open.return_value = MockHTTPResponse(b"<html>Linkvertise ad page</html>", status=200)

        # linkvertise is in INTERMEDIATE_AD_DOMAINS and routes to Bypass.city handoff
        res = resolve_ad_flow("https://linkvertise.com/download/123", http_opener=mock_opener)
        # Must NOT report success or treat linkvertise as key
        self.assertFalse(res["success"])
        self.assertIsNone(res.get("key"))
        self.assertNotEqual(res.get("destination"), "https://linkvertise.com/download/123")
        self.assertEqual(res["status"], "MANUAL_INTERACTION_REQUIRED")
        self.assertEqual(res["error_code"], "EXTERNAL_RESOLVER_HANDOFF")

    def test_provider_shutdown_detection(self):
        # api.bypass.vip returns free api shutdown text for generic ad link
        mock_opener = MagicMock()
        shutdown_payload = json.dumps({
            "status": "success",
            "result": "FREE API SHUT DOWN THANKS TO LEECHERS, JOIN HERE FOR WORKING BYPASSES: https://bypass.vip/discord"
        }).encode("utf-8")
        mock_opener.open.return_value = MockHTTPResponse(shutdown_payload, status=200)

        res = resolve_ad_flow("https://generic-ad-network.org/123/ad", http_opener=mock_opener)
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "PROVIDER_UNAVAILABLE")
        self.assertEqual(res["error_code"], "API_SHUTDOWN")
        self.assertIn("shut down", res["error"].lower())
        self.assertNotIn("discord", res.get("key", ""))

    def test_provider_http_429_rate_limit(self):
        # Provider returns HTTP 429 for generic ad link
        mock_opener = MagicMock()
        err = urllib.error.HTTPError("https://api.bypass.vip/bypass", 429, "Too Many Requests", {}, None)
        mock_opener.open.side_effect = err

        res = resolve_ad_flow("https://generic-ad-network.org/123/ad", http_opener=mock_opener)
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "PROVIDER_RATE_LIMITED")
        self.assertEqual(res["error_code"], "RATE_LIMITED")
        self.assertIn("429", res["error"])

    def test_invalid_urls_and_api_error_payloads(self):
        # 1. Empty URL
        res_empty = resolve_ad_flow("")
        self.assertFalse(res_empty["success"])
        self.assertEqual(res_empty["status"], "INVALID_URL")
        self.assertEqual(res_empty["error_code"], "EMPTY_URL")

        # 2. Invalid host / missing domain dot
        res_nodot = resolve_ad_flow("https://localhost_test/path")
        self.assertFalse(res_nodot["success"])
        self.assertEqual(res_nodot["status"], "INVALID_URL")
        self.assertEqual(res_nodot["error_code"], "INVALID_HOST")

        # 3. API returns error JSON payload
        mock_opener = MagicMock()
        mock_opener.open.return_value = MockHTTPResponse(
            json.dumps({"status": "error", "message": "Link not found"}).encode("utf-8"),
            status=200
        )
        res_api_err = resolve_ad_flow("https://some-unsupported-link.com/page", http_opener=mock_opener)
        self.assertFalse(res_api_err["success"])
        self.assertIn(res_api_err["status"], ("FAILED", "PROVIDER_UNAVAILABLE"))

    def test_captcha_manual_interaction_required_responses(self):
        # 1. HTTP 403 challenge
        mock_opener = MagicMock()
        err_403 = urllib.error.HTTPError("https://ad-site.com/gate", 403, "Forbidden", {}, None)
        mock_opener.open.side_effect = err_403

        res_403 = resolve_ad_flow("https://ad-site.com/gate", http_opener=mock_opener)
        self.assertFalse(res_403["success"])
        self.assertEqual(res_403["status"], "MANUAL_INTERACTION_REQUIRED")
        self.assertEqual(res_403["error_code"], "CAPTCHA_REQUIRED")

        # 2. Body containing Turnstile challenge
        mock_opener2 = MagicMock()
        mock_opener2.open.return_value = MockHTTPResponse(
            b"<html><div class='cf-turnstile' data-sitekey='abc'></div></html>",
            status=200
        )
        res_cf = resolve_ad_flow("https://ad-site.com/challenge", http_opener=mock_opener2)
        self.assertFalse(res_cf["success"])
        self.assertEqual(res_cf["status"], "MANUAL_INTERACTION_REQUIRED")
        self.assertEqual(res_cf["error_code"], "CAPTCHA_REQUIRED")

    def test_redirect_loop_detection(self):
        mock_opener = MagicMock()

        def mock_open(req, timeout=4.0):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            if "hop_a" in url:
                return MockHTTPResponse(status=302, headers={"Location": "https://gateway.com/hop_b"})
            elif "hop_b" in url:
                return MockHTTPResponse(status=302, headers={"Location": "https://gateway.com/hop_a"})
            return MockHTTPResponse(status=404)

        mock_opener.open.side_effect = mock_open
        res = resolve_ad_flow("https://gateway.com/hop_a", http_opener=mock_opener)
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "REDIRECT_LOOP")
        self.assertEqual(res["error_code"], "REDIRECT_LOOP")

    def test_timeout_handling(self):
        mock_opener = MagicMock()
        mock_opener.open.side_effect = TimeoutError("Connection timed out")
        res = resolve_ad_flow("https://gateway.com/slow", http_opener=mock_opener)
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "TIMEOUT")
        self.assertEqual(res["error_code"], "TIMEOUT")

    def test_lootlabs_interaction_required_response(self):
        loot_url = "https://links.lootlabs.gg/s?QXdKuPBJ&data=sample_encrypted_data_xyz"
        res = resolve_ad_flow(loot_url)
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "MANUAL_INTERACTION_REQUIRED")
        self.assertEqual(res["error_code"], "AD_INTERACTION_REQUIRED")
        self.assertEqual(res["provider"], "lootlabs")
        self.assertEqual(res["bypassUrl"], loot_url)
        self.assertTrue(res["manual_verification_supported"])
        self.assertIn("LootLabs", res["error"])

    def test_lootlabs_never_treated_as_resolved_key(self):
        loot_url = "https://links.lootlabs.gg/s?QXdKuPBJ&data=sample_encrypted_data_xyz"
        res = resolve_ad_flow(loot_url)
        self.assertFalse(res["success"])
        self.assertIsNone(res.get("key"))
        self.assertNotEqual(res.get("destination"), loot_url)

    def test_lootlabs_data_parameter_not_decoded_as_destination(self):
        # Even if data parameter looks like base64, LootLabs link must halt without treating data as destination
        import base64
        fake_b64 = base64.b64encode(b"https://evil.com/fake-dest").decode("utf-8")
        loot_url = f"https://links.lootlabs.gg/s?id=123&data={fake_b64}"
        res = resolve_ad_flow(loot_url)
        self.assertFalse(res["success"])
        self.assertNotEqual(res.get("key"), "https://evil.com/fake-dest")
        self.assertEqual(res["error_code"], "AD_INTERACTION_REQUIRED")


class TestFrontendStates(unittest.TestCase):
    def test_frontend_loading_success_and_failure_states(self):
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True)
            page = b.new_page()

            # 1. Test Success State: Key resolved, displayed as clickable link, copy button works
            page.route("**/api/bypass*", lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "success": True,
                    "status": "SUCCESS",
                    "key": "https://auth.platorelay.com/target?key=final_verified_key_789",
                    "destination": "https://auth.platorelay.com/target?key=final_verified_key_789",
                    "source": "redirect chain",
                    "steps": 2,
                    "url": "https://gateway.com/step1"
                })
            ))
            page.goto("http://127.0.0.1:3000/")

            # Fill and submit
            page.fill("#bypassInput", "https://gateway.com/step1")
            page.click("#bypassSubmitBtn")

            # Result box should become visible
            page.wait_for_selector("#bypassResultBox:not(.hidden)", timeout=5000)
            key_link = page.query_selector("#bypassKeyLink")
            self.assertIsNotNone(key_link)
            self.assertEqual(key_link.get_attribute("href"), "https://auth.platorelay.com/target?key=final_verified_key_789")

            # URL text
            link_url_text = page.inner_text("#bypassKeyLinkUrl")
            self.assertIn("auth.platorelay.com", link_url_text)

            # Copy button
            copy_btn = page.query_selector("#bypassCopyKeyBtn")
            self.assertIsNotNone(copy_btn)

            # 2. Test Failure State: Error message shown, form re-enabled
            page.route("**/api/bypass*", lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "success": False,
                    "status": "PROVIDER_UNAVAILABLE",
                    "error_code": "API_SHUTDOWN",
                    "error": "Public resolver API has shut down its free tier.",
                    "url": "https://linkvertise.com/123/ad"
                })
            ))
            page.fill("#bypassInput", "https://linkvertise.com/123/ad")
            page.click("#bypassSubmitBtn")

            # Error state rendered
            page.wait_for_selector("#bypassResultBox:not(.hidden)", timeout=5000)
            result_text = page.inner_text("#bypassResultBox")
            self.assertIn("Public resolver API is unavailable", result_text)

            # Submit button re-enabled
            is_disabled = page.get_attribute("#bypassSubmitBtn", "disabled")
            self.assertIsNone(is_disabled)

            b.close()

    def test_frontend_lootlabs_and_provider_unavailable_states(self):
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True)
            page = b.new_page()

            # 1. Test LootLabs response: Interaction Required badge, Open LootLabs button
            loot_url = "https://links.lootlabs.gg/s?QXdKuPBJ&data=test1234"
            page.route("**/api/bypass*", lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "success": False,
                    "status": "MANUAL_INTERACTION_REQUIRED",
                    "error_code": "AD_INTERACTION_REQUIRED",
                    "provider": "lootlabs",
                    "error": "LootLabs requires completing interactive ad tasks directly on their site.",
                    "bypassUrl": loot_url,
                    "manual_verification_supported": True,
                    "url": loot_url
                })
            ))
            page.goto("http://127.0.0.1:3000/")
            page.fill("#bypassInput", loot_url)
            page.click("#bypassSubmitBtn")

            page.wait_for_selector("#bypassResultBox:not(.hidden)", timeout=5000)
            
            # Badge should be hidden for LootLabs success state
            badge_el = page.query_selector("#bypassStatusBadge")
            self.assertTrue("hidden" in (badge_el.get_attribute("class") or ""))

            # Result box should have success green class
            err_box = page.query_selector("#bypassResultError")
            self.assertTrue("success" in (err_box.get_attribute("class") or ""))

            ext_btn = page.query_selector("#bypassExtBtn")
            self.assertIsNotNone(ext_btn)
            self.assertIn("bypass.city", ext_btn.get_attribute("href"))
            self.assertIn("links.lootlabs.gg", ext_btn.get_attribute("href"))
            btn_text = page.inner_text("#bypassExtBtn")
            self.assertIn("Get Key Now", btn_text)

            # Ensure direct key result card is NOT shown
            self.assertTrue("hidden" in (page.get_attribute("#bypassResultSuccess", "class") or ""))

            # 2. Test Provider Offline response: Provider Offline badge
            page.route("**/api/bypass*", lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "success": False,
                    "status": "PROVIDER_UNAVAILABLE",
                    "error_code": "API_SHUTDOWN",
                    "error": "Public resolver API has shut down its free tier.",
                    "url": "https://linkvertise.com/123/ad"
                })
            ))
            page.fill("#bypassInput", "https://linkvertise.com/123/ad")
            page.click("#bypassSubmitBtn")

            page.wait_for_selector("#bypassResultBox:not(.hidden)", timeout=5000)
            badge_text2 = page.inner_text("#bypassStatusBadge")
            self.assertIn("PROVIDER OFFLINE", badge_text2.upper())

            b.close()



class TestProviderAdapters(unittest.TestCase):
    def test_provider_adapter_registry_order_and_interfaces(self):
        adapter_names = [a.name for a in PROVIDER_ADAPTERS]
        self.assertIn("direct_key_gateway", adapter_names)
        self.assertIn("lootlabs", adapter_names)
        self.assertIn("query_param_extractor", adapter_names)
        self.assertIn("rekonise", adapter_names)
        self.assertIn("bypass_city_handoff", adapter_names)
        self.assertIn("generic_redirect", adapter_names)
        for a in PROVIDER_ADAPTERS:
            self.assertIsInstance(a, BaseProviderAdapter)
        # Direct key, LootLabs, and BypassCityHandoff must precede generic redirect
        self.assertLess(adapter_names.index("direct_key_gateway"), adapter_names.index("generic_redirect"))
        self.assertLess(adapter_names.index("lootlabs"), adapter_names.index("generic_redirect"))
        self.assertLess(adapter_names.index("bypass_city_handoff"), adapter_names.index("generic_redirect"))

    def test_direct_key_adapter_dispatch(self):
        url = "https://auth.platorelay.com/token/key_xyz"
        parsed = urllib.parse.urlparse(url)
        adapter = next(a for a in PROVIDER_ADAPTERS if a.name == "direct_key_gateway")
        self.assertTrue(adapter.can_handle(url, parsed))
        res = adapter.resolve(url, parsed)
        self.assertTrue(res["success"])
        self.assertEqual(res["key"], url)

    def test_lootlabs_adapter_dispatch_interaction_required(self):
        url = "https://links.lootlabs.gg/s?QXdKuPBJ&data=encrypted_token"
        parsed = urllib.parse.urlparse(url)
        adapter = next(a for a in PROVIDER_ADAPTERS if a.name == "lootlabs")
        self.assertTrue(adapter.can_handle(url, parsed))
        res = adapter.resolve(url, parsed)
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "MANUAL_INTERACTION_REQUIRED")
        self.assertEqual(res["error_code"], "AD_INTERACTION_REQUIRED")
        self.assertEqual(res["bypassUrl"], url)
        self.assertEqual(res["url"], url)

    def test_rekonise_adapter_dispatch(self):
        url = "https://rekonise.com/sample-slug"
        parsed = urllib.parse.urlparse(url)
        adapter = next(a for a in PROVIDER_ADAPTERS if a.name == "rekonise")
        self.assertTrue(adapter.can_handle(url, parsed))
        other_url = "https://example.com/other"
        self.assertFalse(adapter.can_handle(other_url, urllib.parse.urlparse(other_url)))

    def test_generic_redirect_adapter_dispatch(self):
        url = "https://example.com/redirect"
        parsed = urllib.parse.urlparse(url)
        adapter = next(a for a in PROVIDER_ADAPTERS if a.name == "generic_redirect")
        self.assertTrue(adapter.can_handle(url, parsed))

    def test_invalid_destination_rejection_in_adapters(self):
        adapter = next(a for a in PROVIDER_ADAPTERS if a.name == "query_param_extractor")
        bad_url = "https://gateway.com/jump?target=javascript:alert(1)"
        parsed = urllib.parse.urlparse(bad_url)
        res = adapter.resolve(bad_url, parsed)
        self.assertIsNone(res)

    def test_bypass_city_handoff_adapter_dispatch(self):
        url = "https://linkvertise.com/12345/ad-test"
        parsed = urllib.parse.urlparse(url)
        adapter = next(a for a in PROVIDER_ADAPTERS if a.name == "bypass_city_handoff")
        self.assertTrue(adapter.can_handle(url, parsed))
        res = adapter.resolve(url, parsed)
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "MANUAL_INTERACTION_REQUIRED")
        self.assertEqual(res["error_code"], "EXTERNAL_RESOLVER_HANDOFF")
        self.assertEqual(res["provider"], "bypass_city")
        self.assertEqual(res["bypassUrl"], "https://bypass.city/bypass?bypass=https%3A%2F%2Flinkvertise.com%2F12345%2Fad-test")
        self.assertTrue(res["manual_verification_supported"])
        self.assertEqual(res["url"], url)
        self.assertIsNone(res.get("key"))


class TestBypassCityHandoffIntegration(unittest.TestCase):
    def test_url_encoding_with_multiple_query_parameters(self):
        # 1. Target URL with complex query parameters
        target = "https://linkvertise.com/98765/flow?token=abc%20123&ref=denki_test&session=xyz#step2"
        res = resolve_ad_flow(target)
        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "MANUAL_INTERACTION_REQUIRED")
        self.assertEqual(res["error_code"], "EXTERNAL_RESOLVER_HANDOFF")
        self.assertEqual(res["provider"], "bypass_city")
        self.assertTrue(res["manual_verification_supported"])

        # Validate that bypass parameter in bypassUrl decodes cleanly to original URL
        parsed_handoff = urllib.parse.urlparse(res["bypassUrl"])
        self.assertEqual(parsed_handoff.netloc, "bypass.city")
        self.assertEqual(parsed_handoff.path, "/bypass")
        qs = urllib.parse.parse_qs(parsed_handoff.query)
        self.assertIn("bypass", qs)
        self.assertEqual(qs["bypass"][0], target)

    def test_handoff_results_never_have_key_or_claim_success(self):
        target = "https://work.ink/555/sample"
        res = resolve_ad_flow(target)
        self.assertFalse(res["success"])
        self.assertIsNone(res.get("key"))
        self.assertNotIn("destination", res)
        self.assertEqual(res["status"], "MANUAL_INTERACTION_REQUIRED")
        self.assertEqual(res["error_code"], "EXTERNAL_RESOLVER_HANDOFF")

    def test_unsupported_target_domains_do_not_trigger_handoff(self):
        unsupported = "https://arbitrary-unregistered-site.com/gate/123"
        res = resolve_ad_flow(unsupported)
        # Must NOT return EXTERNAL_RESOLVER_HANDOFF or claim success
        self.assertFalse(res["success"])
        self.assertNotEqual(res.get("error_code"), "EXTERNAL_RESOLVER_HANDOFF")
        self.assertNotIn("bypass.city", res.get("bypassUrl", ""))
        self.assertIn(res["status"], ("FAILED", "PROVIDER_UNAVAILABLE"))

    def test_existing_direct_key_and_lootlabs_and_rekonise_unchanged(self):
        # Direct key
        direct_key = "https://auth.platorelay.com/auth/key_abc"
        res_direct = resolve_ad_flow(direct_key)
        self.assertTrue(res_direct["success"])
        self.assertEqual(res_direct["status"], "SUCCESS")
        self.assertEqual(res_direct["key"], direct_key)

        # LootLabs
        loot = "https://links.lootlabs.gg/s?QXdKuPBJ&data=some_token"
        res_loot = resolve_ad_flow(loot)
        self.assertFalse(res_loot["success"])
        self.assertEqual(res_loot["error_code"], "AD_INTERACTION_REQUIRED")
        self.assertEqual(res_loot["provider"], "lootlabs")

        # Rekonise
        rekonise = "https://rekonise.com/sample-slug"
        adapter = next(a for a in PROVIDER_ADAPTERS if a.name == "rekonise")
        parsed = urllib.parse.urlparse(rekonise)
        self.assertTrue(adapter.can_handle(rekonise, parsed))

    def test_frontend_renders_open_on_bypass_city_button_and_no_key_card(self):
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True)
            page = b.new_page()

            handoff_url = "https://bypass.city/bypass?bypass=https%3A%2F%2Flinkvertise.com%2F1234%2Ftest"
            target_url = "https://linkvertise.com/1234/test"

            page.route("**/api/bypass*", lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "success": False,
                    "status": "MANUAL_INTERACTION_REQUIRED",
                    "error_code": "EXTERNAL_RESOLVER_HANDOFF",
                    "provider": "bypass_city",
                    "bypassUrl": handoff_url,
                    "manual_verification_supported": True,
                    "url": target_url,
                    "error": "This link requires external resolution via Bypass.city in your browser."
                })
            ))

            page.goto("http://127.0.0.1:3000/")
            page.fill("#bypassInput", target_url)
            page.click("#bypassSubmitBtn")

            # 1. Result box shown
            page.wait_for_selector("#bypassResultBox:not(.hidden)", timeout=5000)

            # 2. SUCCESS Card must NEVER be visible
            success_card = page.query_selector("#bypassResultSuccess")
            self.assertIn("hidden", success_card.get_attribute("class"))

            # 3. ERROR / Interaction Card must be visible
            error_card = page.query_selector("#bypassResultError")
            self.assertNotIn("hidden", error_card.get_attribute("class"))

            # 4. Open on Bypass.city button must be visible, target=_blank, rel=noopener noreferrer
            ext_btn = page.query_selector("#bypassExtBtn")
            self.assertIsNotNone(ext_btn)
            self.assertNotIn("hidden", ext_btn.get_attribute("class"))
            self.assertEqual(ext_btn.get_attribute("target"), "_blank")
            rel_attr = ext_btn.get_attribute("rel") or ""
            self.assertIn("noopener", rel_attr)
            self.assertIn("noreferrer", rel_attr)
            self.assertEqual(ext_btn.get_attribute("href"), handoff_url)

            # 5. Button text should show Open on Bypass.city
            btn_text = page.inner_text("#bypassExtBtn")
            self.assertTrue(
                "Bypass.city" in btn_text,
                f"Expected 'Bypass.city' in button text, got: {btn_text}"
            )

            # 6. Status badge text
            badge_text = page.inner_text("#bypassStatusBadge")
            self.assertTrue(len(badge_text.strip()) > 0)

            # 7. Error/disclaimer message
            msg_text = page.inner_text("#bypassErrorMsg")
            self.assertIn("Bypass.city", msg_text)

            b.close()


class TestLootLabsHostnameValidation(unittest.TestCase):
    def test_approved_lootlabs_domains_and_subdomains_recognized(self):
        approved_urls = [
            "https://links.lootlabs.gg/s?x=1",
            "https://lootlabs.gg/",
            "https://sub.lootlabs.gg/test",
            "https://loot-link.com/s?abc=1",
            "https://sub.loot-link.com/",
            "https://lootlinks.co/s?q=1",
            "https://links.lootlinks.co/",
            "https://lootlabs.gg:8443/s?x=1",
            "https://lootlabs.gg./s?x=1",
        ]
        adapter = next(a for a in PROVIDER_ADAPTERS if a.name == "lootlabs")
        for u in approved_urls:
            with self.subTest(url=u):
                self.assertTrue(is_lootlabs_url(u), f"Expected {u} to be recognized by is_lootlabs_url")
                parsed = urllib.parse.urlparse(u)
                self.assertTrue(adapter.can_handle(u, parsed), f"Expected {u} to be handled by LootLabsAdapter")
                res = resolve_ad_flow(u)
                self.assertEqual(res["provider"], "lootlabs")
                self.assertEqual(res["status"], "MANUAL_INTERACTION_REQUIRED")
                self.assertEqual(res["error_code"], "AD_INTERACTION_REQUIRED")

    def test_spoofed_and_unrelated_domains_rejected(self):
        spoofed_and_unrelated = [
            "https://lootlabs.gg.example.com/fake",
            "https://attacker-lootlabs.gg/",
            "https://example.com/search?q=lootlabs.gg",
            "https://lootlabs.gg@evil.example/",
            "https://evil.com/lootlabs.gg",
            "https://notlootlabs.gg/",
            "https://example.com/loot-link.com",
            "https://lootlinks.co.attacker.org/",
            "https://user:lootlabs.gg@phishing.site/login",
            "javascript:alert('lootlabs.gg')",
            "",
            "   ",
        ]
        adapter = next(a for a in PROVIDER_ADAPTERS if a.name == "lootlabs")
        for u in spoofed_and_unrelated:
            with self.subTest(url=u):
                self.assertFalse(is_lootlabs_url(u), f"Expected {u} to be rejected by is_lootlabs_url")
                parsed = urllib.parse.urlparse(u)
                self.assertFalse(adapter.can_handle(u, parsed), f"Expected {u} to be rejected by LootLabsAdapter")

    def test_serve_execute_bypass_rejects_spoofed_lootlabs(self):
        handler = DevHTTPRequestHandler.__new__(DevHTTPRequestHandler)
        spoofed = [
            "https://lootlabs.gg.example.com/fake",
            "https://attacker-lootlabs.gg/",
            "https://example.com/search?q=lootlabs.gg",
            "https://lootlabs.gg@evil.example/",
        ]
        for u in spoofed:
            with self.subTest(url=u):
                res = handler.execute_bypass(u)
                self.assertNotEqual(res.get("provider"), "lootlabs", f"Provider should not be lootlabs for {u}")
                self.assertNotIn("ចុចទីនេះដើម្បីយក Key", res.get("button_text", ""))
                self.assertNotIn("ដំណើរការរួចរាល់", res.get("explanation", ""))

    def test_bypass_city_handoff_behavior_intact_and_skips_lootlabs(self):
        # 1. Legitimate Bypass.city supported domain works
        linkvertise_url = "https://linkvertise.com/12345/ad-test"
        res_linkvertise = resolve_ad_flow(linkvertise_url)
        self.assertEqual(res_linkvertise["provider"], "bypass_city")
        self.assertEqual(res_linkvertise["status"], "MANUAL_INTERACTION_REQUIRED")
        self.assertEqual(res_linkvertise["error_code"], "EXTERNAL_RESOLVER_HANDOFF")
        self.assertIn("bypass.city", res_linkvertise["bypassUrl"])

        # 2. Legitimate LootLabs URL is handled by LootLabsAdapter, NOT by BypassCityHandoffAdapter
        loot_url = "https://links.lootlabs.gg/s?QXdKuPBJ&data=xyz"
        bypass_city_adapter = next(a for a in PROVIDER_ADAPTERS if a.name == "bypass_city_handoff")
        self.assertFalse(bypass_city_adapter.can_handle(loot_url, urllib.parse.urlparse(loot_url)))
        res_loot = resolve_ad_flow(loot_url)
        self.assertEqual(res_loot["provider"], "lootlabs")

    def test_frontend_spoofed_and_credential_urls_rejected(self):
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True)
            page = b.new_page()
            page.goto("http://127.0.0.1:3000/")

            # 1. Verify window.isLootLabsUrl helper directly in frontend
            self.assertTrue(page.evaluate("() => window.isLootLabsUrl('https://links.lootlabs.gg/s?x=1')"))
            self.assertTrue(page.evaluate("() => window.isLootLabsUrl('https://lootlabs.gg/')"))
            self.assertTrue(page.evaluate("() => window.isLootLabsUrl('https://sub.lootlabs.gg/')"))
            self.assertFalse(page.evaluate("() => window.isLootLabsUrl('https://lootlabs.gg.example.com/fake')"))
            self.assertFalse(page.evaluate("() => window.isLootLabsUrl('https://attacker-lootlabs.gg/')"))
            self.assertFalse(page.evaluate("() => window.isLootLabsUrl('https://example.com/search?q=lootlabs.gg')"))
            self.assertFalse(page.evaluate("() => window.isLootLabsUrl('https://lootlabs.gg@evil.example/')"))

            # 2. Test submitting spoofed URL: https://lootlabs.gg.example.com/fake
            page.fill("#bypassInput", "https://lootlabs.gg.example.com/fake")
            page.click("#bypassSubmitBtn")
            page.wait_for_selector("#bypassResultBox:not(.hidden)", timeout=5000)
            badge_text = page.inner_text("#bypassStatusBadge")
            self.assertNotIn("LootLabs", badge_text)
            msg_text = page.inner_text("#bypassErrorMsg")
            self.assertNotIn("លីងប្រភេទ LootLabs", msg_text)
            self.assertNotIn("LootLabs links require", msg_text)
            self.assertNotIn("ដំណើរការរួចរាល់", msg_text)

            # Ensure button does NOT say "ចុចទីនេះដើម្បីយក Key" or "Get Key Now"
            ext_btn = page.query_selector("#bypassExtBtn")
            if ext_btn and not ("hidden" in (ext_btn.get_attribute("class") or "")):
                btn_text = page.inner_text("#bypassExtBtn")
                self.assertNotIn("ចុចទីនេះដើម្បីយក Key", btn_text)
                self.assertNotIn("Get Key Now", btn_text)
                self.assertNotIn("LootLabs", btn_text)

            b.close()


if __name__ == "__main__":
    unittest.main()
