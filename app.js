/* ============================================
   DenKi Platform — Application Logic
   DenKi Script Roblox & UI Controllers
   Multi-language Support (English / ភាសាខ្មែរ)
   Script Hub Brand Avatar & Executor Card System
   Offline / Curated Fallback Mechanism
   ============================================ */

;(function () {
  'use strict';

  // ─── Configuration ───────────────────────────────────────
  const API_BASE = 'https://scriptblox.com/api/script';
  const CORS_PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
  ];
  const PER_PAGE = 12;

  // ─── Translations (i18n) ──────────────────────────────────
  const i18n = {
    en: {
      'nav.home': 'Home',
      'nav.scripts': 'Scripts',
      'nav.downloads': 'Downloads',
      'nav.terminal': 'Terminal',
      'hero.badge': 'DenKi Script Roblox',
      'hero.title_pre': 'Your Ultimate',
      'hero.title_grad': 'Roblox Script Hub',
      'hero.desc': 'Browse, search, and copy curated Roblox scripts instantly. One-click clipboard, auto platform detection, and a beautiful terminal experience.',
      'hero.browse_btn': 'Browse Scripts',
      'hero.download_btn': 'Download Executor',
      'stats.scripts': 'Scripts',
      'stats.free': 'Free',
      'stats.forever': 'Forever',
      'stats.platforms': 'Platforms',
      'stats.uptime': 'Uptime',
      'scripts.title': 'Script Library',
      'scripts.subtitle': 'Search and browse thousands of Roblox scripts from the community',
      'scripts.search_placeholder': "Search scripts (e.g., 'admin', 'arsenal', 'infinite yield')...",
      'scripts.search_btn': 'Search',
      'scripts.load_more': 'Load More',
      'bypass.badge': 'Key Bypass Tool',
      'bypass.desc': 'Paste key link to bypass Linkvertise, Lootlabs, Work.ink instantly',
      'bypass.placeholder': "Paste key link here (Linkvertise, Lootlabs, Work.ink, etc.)...",
      'bypass.paste': 'Paste',
      'bypass.paste_title': 'Paste from clipboard',
      'bypass.submit': 'Bypass Key',
      'bypass.submit_title': 'Unlock and bypass key',
      'bypass.empty_warn': 'Please enter a link first!',
      'bypass.pasted': 'Pasted link from clipboard!',
      'bypass.clip_empty': 'Clipboard is empty!',
      'bypass.clip_denied': 'Cannot read clipboard. Please paste manually.',
      'bypass.opening': 'Opening bypass.city...',
      'bypass.loading': 'Bypassing key, please wait...',
      'bypass.processing': 'Processing...',
      'bypass.progress_validating': 'Validating link format...',
      'bypass.progress_analyzing': 'Analyzing link & checking unlocks...',
      'bypass.progress_extracting': 'Extracting key / destination...',
      'bypass.unlocked_title': 'Unlocked Key / Link',
      'bypass.copy_key': 'Copy Link',
      'bypass.click_get_key': 'Click here to get Key',
      'bypass.open_key': 'Open Link',
      'bypass.open_title': 'Open destination link in new tab',
      'bypass.retry': 'Retry',
      'bypass.retry_title': 'Retry extraction',
      'bypass.status_verification': 'Verification Required',
      'bypass.status_interaction': 'Interaction Required',
      'bypass.status_unavailable': 'Provider Offline',
      'bypass.status_failed': 'Extraction Failed',
      'bypass.timeout': 'Request timed out. Please try again.',
      'bypass.key_copied': 'Link copied to clipboard!',
      'bypass.open_external': 'Open on bypass.city directly',
      'bypass.open_lootlabs': 'Get Key Now',
      'bypass.open_provider': 'Open Direct Site',
      'bypass.lootlabs_desc': 'Process complete! ✓ Click the button below to get your key.',
      'bypass.provider_offline': 'Public resolver API is unavailable. Please navigate provider directly.',
      'bypass.status_handoff': 'External Resolver Required',
      'bypass.open_bypass_city': 'Open on Bypass.city',
      'bypass.handoff_desc': 'This link requires external resolution on Bypass.city. You must finish any required steps on Bypass.city; DenKi cannot automatically retrieve the final result.',
      'bypass.failed': 'Failed to bypass link. Try direct site below.',
      'captcha.modal_title': 'Verification Required',
      'captcha.modal_subtitle': 'Cloudflare Turnstile verification required by bypass.city',
      'captcha.target_label': 'Target Link:',
      'captcha.notice_heading': 'External Verification Required',
      'captcha.explanation': 'bypass.city requires Cloudflare Turnstile verification. Direct third-party embedding is not supported by the provider. Please complete verification directly on bypass.city.',
      'captcha.open_button': 'Open bypass.city (Optional)',
      'captcha.retry': 'Retry Extraction',
      'captcha.close': 'Back to DenKi',
      'captcha.status_checking': 'Checking verification options...',
      'platform.title': 'Download Executor',
      'platform.subtitle': 'Auto-detected your platform — get the right executor for your device',
      'platform.android': 'Android',
      'platform.ios': 'iOS',
      'platform.download_android': 'ដោនឡូតសម្រាប់ Android',
      'platform.download_ios': 'ដោនឡូតសម្រាប់ iOS',
      'platform.android_desc': 'Executor លេខ 1 សម្រាប់ Android លឿន ស្រួលប្រើ និងដំណើរការស្ទើរគ្រប់ Script។',
      'platform.ios_desc': 'Executor គុណភាពខ្ពស់សម្រាប់ iOS គាំទ្រការតម្លើងតាម Sideload និងដំណើរការ Script បានល្អ។',
      'platform.download_android': 'Download for Android',
      'platform.download_ios': 'Download for iOS',
      'platform.android_desc': 'The #1 Android Roblox executor. Fast, stable, and supports most scripts with a clean UI.',
      'platform.ios_desc': 'Premium iOS Roblox executor. Supports direct sideloading and top-tier script execution.',
      'terminal.title': 'Script Terminal',
      'terminal.subtitle': 'Select any script above and view it here — one-click copy to clipboard',
      'terminal.copy': 'Copy',
      'terminal.copied': 'Copied!',
      'terminal.copy_title': 'Copy to clipboard',
      'terminal.clear': 'Clear',
      'terminal.clear_title': 'Clear terminal',
      'terminal.welcome_line1': '-- Welcome to DenKi Terminal',
      'terminal.welcome_line2': '-- Select a script from the library above',
      'terminal.welcome_line3': '-- or search for one and click to load it here.',
      'terminal.cleared_line1': '-- Terminal cleared',
      'terminal.cleared_line2': '-- Select a script from the library to begin.',
      'footer.brand_desc': 'A modern Roblox script hub. Browse, search, and execute scripts across all platforms.',
      'footer.col_platform': 'Platform',
      'footer.col_resources': 'Resources',
      'footer.col_community': 'Community',
      'footer.link_scripts': 'Script Library',
      'footer.link_terminal': 'Terminal',
      'footer.link_downloads': 'Downloads',
      'footer.link_api': 'API Docs',
      'footer.link_status': 'Status',
      'footer.link_changelog': 'Changelog',
      'footer.copyright': '© 2026 DenKi. All rights reserved.',
      'footer.powered': 'Powered by DenKi Platform',
      'modal.title': 'Script Details',
      'modal.copy': 'Copy Script',
      'modal.load': 'Load in Terminal',
      'card.game_label': 'Game: ',
      'card.features_label': 'Features: ',
      'card.copy_script': 'Copy Script',
      'card.copied': 'Copied!',
      'card.key': 'Key',
      'card.no_key': 'No Key',
      'card.views': 'views',
      'card.likes': 'likes',
      'hub.verified': 'Verified Hub',
      'hub.keyless': 'Keyless',
      'hub.key_required': 'Key Required',
      'hub.by': 'by',
      'empty.title': 'No scripts available yet',
      'empty.desc': 'No scripts have been added to the library yet. Check back soon for new updates.',
      'empty.badge': '0 Scripts Available',
      'loading.title': 'Loading Scripts...',
      'loading.desc': 'Fetching data...',
      'error.title': 'Connection Error',
      'error.desc': 'Unable to reach the API. Check your connection and try again.',
      'error.fetch_failed': 'Failed to fetch data, please try again.',
      'error.retry': 'Retry',
      'pagination.prev': '‹ Prev',
      'pagination.next': 'Next ›',
      'toast.script_loaded': 'Script loaded in terminal!',
      'toast.terminal_cleared': 'Terminal cleared',
      'toast.copied': 'Script copied to clipboard!',
      'toast.no_script': 'No script loaded. Select one first!',
      'toast.copy_failed': 'Copy failed. Please copy manually.',
      'toast.fetch_error': 'Failed to fetch scripts. Check your connection.',
      'toast.fallback_loaded': 'Loaded offline/curated scripts (API currently unreachable)',
      'detected.android': 'Detected: Android — showing relevant downloads',
      'detected.ios': 'Detected: iOS — showing relevant downloads',
    },
    km: {
      'nav.home': 'ទំព័រដើម',
      'nav.scripts': 'បញ្ជី Script',
      'nav.downloads': 'ដោនឡូត',
      'nav.terminal': 'Terminal',
      'hero.badge': 'DenKi Script Roblox',
      'hero.title_pre': 'កន្លែងប្រមូលផ្ដុំ',
      'hero.title_grad': 'Script Roblox ធំបំផុត',
      'hero.desc': 'ស្វែងរក និងកូពី (Copy) Script យកទៅប្រើបានភ្លាមៗ។ ចុចតែមួយ Click ជាប់ភ្លែត ស្គាល់ទូរស័ព្ទ Android/iOS ស្រាប់ ស្រួលប្រើមែនទែន!',
      'hero.browse_btn': 'មើល Script ទាំងអស់',
      'hero.download_btn': 'ដោនឡូត Executor',
      'stats.scripts': 'Script សរុប',
      'stats.free': 'ឥតគិតថ្លៃ',
      'stats.forever': 'រហូត',
      'stats.platforms': 'ប្រព័ន្ធគាំទ្រ',
      'stats.uptime': 'ដំណើរការ',
      'scripts.title': 'បណ្ណាល័យ Script',
      'scripts.subtitle': 'ស្វែងរក និងមើល Script Roblox រាប់ពាន់ពី Community',
      'scripts.search_placeholder': "ស្វែងរក Script (ឧ. 'admin', 'arsenal', 'infinite yield')...",
      'scripts.search_btn': 'ស្វែងរក',
      'scripts.load_more': 'ទាញយកបន្ថែម',
      'bypass.badge': 'ឧបករណ៍ Bypass Key',
      'bypass.desc': 'ដាក់តំណភ្ជាប់ (Link) ដើម្បីដោះសោ Linkvertise, Lootlabs, Work.ink ភ្លាមៗ',
      'bypass.placeholder': 'បញ្ចូលតំណភ្ជាប់ (Linkvertise, Lootlabs, Work.ink...)...',
      'bypass.paste': 'Paste',
      'bypass.paste_title': 'បិទភ្ជាប់ពី Clipboard',
      'bypass.submit': 'Bypass Key',
      'bypass.submit_title': 'ចុចដើម្បីដោះសោ Key',
      'bypass.empty_warn': 'សូមបញ្ចូលតំណភ្ជាប់ (Link) ជាមុនសិន!',
      'bypass.pasted': 'បានបញ្ចូលតំណភ្ជាប់ពី Clipboard រួចរាល់!',
      'bypass.clip_empty': 'Clipboard របស់អ្នកគ្មានទិន្នន័យទេ!',
      'bypass.clip_denied': 'មិនអាចអាន Clipboard បានទេ សូម Paste ដោយផ្ទាល់។',
      'bypass.opening': 'កំពុងបញ្ជូនទៅកាន់ bypass.city...',
      'bypass.loading': 'កំពុងដោះសោ Key សូមរង់ចាំបន្តិច...',
      'bypass.processing': 'កំពុងដំណើរការ...',
      'bypass.progress_validating': 'កំពុងផ្ទៀងផ្ទាត់តំណភ្ជាប់...',
      'bypass.progress_analyzing': 'កំពុងវិភាគតំណភ្ជាប់ និងដោះសោ...',
      'bypass.progress_extracting': 'កំពុងស្រង់យក Key / គោលដៅ...',
      'bypass.unlocked_title': 'ដោះសោជោគជ័យ (Bypassed Key / Link)',
      'bypass.copy_key': 'Copy Link',
      'bypass.click_get_key': 'ចុចទីនេះដើម្បីយក Key',
      'bypass.open_key': 'បើក Link',
      'bypass.open_title': 'បើកតំណភ្ជាប់គោលដៅក្នុងផ្ទាំងថ្មី',
      'bypass.retry': 'សាកល្បងម្តងទៀត',
      'bypass.retry_title': 'សាកល្បងដោះសោម្តងទៀត',
      'bypass.status_verification': 'តម្រូវឱ្យផ្ទៀងផ្ទាត់ Turnstile',
      'bypass.status_interaction': 'តម្រូវឱ្យបំពេញកិច្ចការ',
      'bypass.status_unavailable': 'សេវាកម្មមិនដំណើរការ',
      'bypass.status_failed': 'ការដោះសោមិនជោគជ័យ',
      'bypass.timeout': 'សំណើលើសកំណត់ពេល។ សូមព្យាយាមម្តងទៀត។',
      'bypass.key_copied': 'បានកូពី Link ទុកក្នុង Clipboard ហើយ!',
      'bypass.open_external': 'ដោះសោលើ bypass.city ដោយផ្ទាល់',
      'bypass.open_lootlabs': 'ចុចទីនេះដើម្បីយក Key',
      'bypass.open_provider': 'បើកតំណភ្ជាប់ផ្ទាល់',
      'bypass.lootlabs_desc': 'ដំណើរការរួចរាល់! ✓ សូមចុចប៊ូតុងខាងក្រោមដើម្បីទទួលយក Key របស់អ្នក។',
      'bypass.provider_offline': 'ប្រព័ន្ធដោះសោសាធារណៈត្រូវបានបិទ។ សូមចូលទៅកាន់តំណភ្ជាប់ដោយផ្ទាល់។',
      'bypass.status_handoff': 'តម្រូវឱ្យដោះសោលើ Bypass.city',
      'bypass.open_bypass_city': 'បើកលើ Bypass.city',
      'bypass.handoff_desc': 'តំណភ្ជាប់នេះតម្រូវឱ្យដោះសោលើ Bypass.city ក្នុង Browser របស់អ្នក។ អ្នកត្រូវតែបញ្ចប់ជំហាននៅលើ Bypass.city ដោយខ្លួនឯង ព្រោះ DenKi មិនអាចទាញយក Key ដោយស្វ័យប្រវត្តិពីប្រព័ន្ធខាងក្រៅបានទេ។',
      'bypass.failed': 'មិនអាចដោះសោបានទេ។ សូមសាកល្បងតំណភ្ជាប់ផ្ទាល់ខាងក្រោម។',
      'captcha.modal_title': 'តម្រូវឱ្យផ្ទៀងផ្ទាត់',
      'captcha.modal_subtitle': 'bypass.city តម្រូវឱ្យផ្ទៀងផ្ទាត់ Cloudflare Turnstile',
      'captcha.target_label': 'តំណភ្ជាប់គោលដៅ៖',
      'captcha.notice_heading': 'តម្រូវឱ្យផ្ទៀងផ្ទាត់ដោយផ្ទាល់',
      'captcha.explanation': 'bypass.city តម្រូវឱ្យផ្ទៀងផ្ទាត់ Turnstile ដោយផ្ទាល់។ ប្រព័ន្ធ bypass.city មិនអនុញ្ញាតឱ្យ Embed ក្នុងវេបសាយផ្សេងបានទេ។ សូមបើក bypass.city ដើម្បីផ្ទៀងផ្ទាត់។',
      'captcha.open_button': 'បើក bypass.city (ស្រេចចិត្ត)',
      'captcha.retry': 'សាកល្បងដោះសោម្តងទៀត',
      'captcha.close': 'ត្រឡប់មក DenKi',
      'captcha.status_checking': 'កំពុងពិនិត្យជម្រើសផ្ទៀងផ្ទាត់...',
      'platform.title': 'ដោនឡូត Executor',
      'platform.subtitle': 'ប្រព័ន្ធស្គាល់ឧបករណ៍អ្នកដោយស្វ័យប្រវត្តិ — ជ្រើសរើស Executor ត្រូវម៉ូឌែល',
      'platform.android': 'Android',
      'platform.ios': 'iOS',
      'terminal.title': 'កន្លែង Terminal',
      'terminal.subtitle': 'ជ្រើសរើស Script ខាងលើមកមើលនៅទីនេះ — ចុចតែមួយ Click កូពីបានភ្លាម',
      'terminal.copy': 'កូពី',
      'terminal.copied': 'កូពីបានហើយ!',
      'terminal.copy_title': 'កូពីទុកក្នុង Clipboard',
      'terminal.clear': 'សម្អាត',
      'terminal.clear_title': 'សម្អាត Terminal',
      'terminal.welcome_line1': '-- សូមស្វាគមន៍មកកាន់ DenKi Terminal',
      'terminal.welcome_line2': '-- ជ្រើសរើស Script ពីបណ្ណាល័យខាងលើ',
      'terminal.welcome_line3': '-- ឬស្វែងរក រួចចុចដើម្បីដាក់ចូលទីនេះ',
      'terminal.cleared_line1': '-- បានសម្អាត Terminal',
      'terminal.cleared_line2': '-- ជ្រើសរើស Script ពីបណ្ណាល័យដើម្បីចាប់ផ្តើម។',
      'footer.brand_desc': 'កន្លែងប្រមូលផ្ដុំ Script Roblox ទំនើប។ រក កូពី និងដំណើរការ Script លើគ្រប់ឧបករណ៍។',
      'footer.col_platform': 'ប្រព័ន្ធ',
      'footer.col_resources': 'ធនធាន',
      'footer.col_community': 'សហគមន៍',
      'footer.link_scripts': 'បណ្ណាល័យ Script',
      'footer.link_terminal': 'Terminal',
      'footer.link_downloads': 'ដោនឡូត',
      'footer.link_api': 'ឯកសារ API',
      'footer.link_status': 'ស្ថានភាព',
      'footer.link_changelog': 'កំណែអាប់ដេត',
      'footer.copyright': '© 2026 DenKi. រក្សាសិទ្ធិគ្រប់យ៉ាង។',
      'footer.powered': 'ដំណើរការដោយ DenKi Platform',
      'modal.title': 'ព័ត៌មានលម្អិត Script',
      'modal.copy': 'កូពី Script',
      'modal.load': 'ដាក់ចូល Terminal',
      'card.game_label': 'ហ្គេម៖ ',
      'card.features_label': 'មុខងារ៖ ',
      'card.copy_script': 'កូពី Script',
      'card.copied': 'កូពីបានហើយ!',
      'card.key': 'ត្រូវមាន Key',
      'card.no_key': 'អត់ Key',
      'card.views': 'ដង',
      'card.likes': 'ចូលចិត្ត',
      'hub.verified': 'Hub ផ្ទៀងផ្ទាត់',
      'hub.keyless': 'អត់ Key',
      'hub.key_required': 'ត្រូវមាន Key',
      'hub.by': 'ដោយ',
      'empty.title': 'មិនទាន់មាន Script នៅឡើយទេ',
      'empty.desc': 'មិនទាន់មាន Script ណាមួយត្រូវបានបន្ថែមនៅក្នុងបណ្ណាល័យនៅឡើយទេ។ សូមរង់ចាំការ Update បន្ថែមឆាប់ៗ!',
      'empty.badge': 'មិនទាន់មាន Script ទេ',
      'loading.title': 'កំពុងទាញយក Script...',
      'loading.desc': 'កំពុងទាញយកទិន្នន័យ...',
      'error.title': 'បញ្ហាភ្ជាប់អ៊ីនធឺណិត',
      'error.desc': 'មិនអាចទាក់ទងទៅកាន់ API បានទេ។ សូមពិនិត្យអ៊ីនធឺណិតរបស់អ្នកឡើងវិញ។',
      'error.fetch_failed': 'បរាជ័យក្នុងការទាញយកទិន្នន័យ សូមសាកល្បងម្ដងទៀត។',
      'error.retry': 'ព្យាយាមម្តងទៀត',
      'pagination.prev': '‹ ថយក្រោយ',
      'pagination.next': 'ទៅមុខ ›',
      'toast.script_loaded': 'បានដាក់ Script ចូល Terminal ហើយ!',
      'toast.terminal_cleared': 'បានសម្អាត Terminal រួចរាល់',
      'toast.copied': 'បានកូពី Script ទុកក្នុង Clipboard ហើយ!',
      'toast.no_script': 'មិនទាន់មាន Script ទេ។ សូមជ្រើសរើសមួយសិន!',
      'toast.copy_failed': 'មិនអាចកូពីបានទេ។ សូមកូពីដោយផ្ទាល់។',
      'toast.fetch_error': 'មិនអាចទាញយក Script បានទេ។ សូមពិនិត្យអ៊ីនធឺណិតរបស់អ្នក។',
      'toast.fallback_loaded': 'បានផ្ទុក Script គំរូដែលរៀបចំទុកស្រាប់ (API មិនទាន់អាចភ្ជាប់បាន)',
      'detected.android': 'ស្គាល់ហើយ: Android — បង្ហាញកន្លែងដោនឡូតត្រូវចិត្ត',
      'detected.ios': 'ស្គាល់ហើយ: iOS — បង្ហាញកន្លែងដោនឡូតត្រូវចិត្ត',
    }
  };

  /** Helper to fetch translated string */
  function t(key) {
    return (i18n[state.currentLang] && i18n[state.currentLang][key]) ||
           (i18n.en && i18n.en[key]) ||
           key;
  }

  // ─── Authentic Verified Fallback Emblem (Roblox Platform Brand) ────
  const ROBLOX_VERIFIED_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%230F172A'/%3E%3Cstop offset='100%25' stop-color='%231E293B'/%3E%3C/linearGradient%3E%3ClinearGradient id='glow' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%2338BDF8'/%3E%3Cstop offset='100%25' stop-color='%236366F1'/%3E%3C/linearGradient%3E%3Cdefs%3E%3Crect width='100' height='100' rx='20' fill='url(%23bg)'/%3E%3Crect x='1' y='1' width='98' height='98' rx='19' fill='none' stroke='rgba(99,102,241,0.25)' stroke-width='1.5'/%3E%3Cg transform='translate(50, 50) rotate(-15)'%3E%3Crect x='-22' y='-22' width='44' height='44' rx='6' fill='url(%23glow)'/%3E%3Crect x='-8' y='-8' width='16' height='16' rx='2.5' fill='%230F172A'/%3E%3C/g%3E%3C/svg%3E";

  /**
   * Normalizes raw API image URLs:
   * - Strips hardcoded http://127.0.0.1:8000 or http://localhost:8000 prefixes so local /assets/ load through current host
   * - Handles relative /assets/ paths
   * - Prefixes relative ScriptBlox paths with https://scriptblox.com
   * - Handles protocol-relative URLs (//)
   */
  function cleanIconUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    let trimmed = rawUrl.trim();
    if (!trimmed) return '';

    // Strip hardcoded localhost / 127.0.0.1 backend URLs (e.g. http://127.0.0.1:8000/assets/icons/...)
    trimmed = trimmed.replace(/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(\/assets\/.*)$/i, '$1');

    if (trimmed.startsWith('//')) {
      return 'https:' + trimmed;
    }
    if (trimmed.startsWith('/assets/')) {
      return trimmed;
    }
    if (trimmed.startsWith('assets/')) {
      return '/' + trimmed;
    }
    if (trimmed.startsWith('/') && !trimmed.startsWith('/api/')) {
      return trimmed;
    }
    return trimmed;
  }

  function resolveScriptImageUrl(rawUrl) {
    return cleanIconUrl(rawUrl);
  }

  function formatApiImageUrl(rawUrl) {
    return cleanIconUrl(rawUrl);
  }

  /**
   * Extracts the specific image or icon URL defined for an individual script entry.
   * Checks all common field variants: script.scriptIcon, script.image, script.icon, script.imageUrl, script.logoUrl, etc.
   */
  function extractScriptImage(raw) {
    if (!raw || typeof raw !== 'object') return '';

    const candidates = [
      raw.scriptIcon,
      raw.image,
      raw.icon,
      raw.imageUrl,
      raw.iconUrl,
      raw.logoUrl,
      raw.hubLogo,
      raw.thumbnail,
      raw.thumbnailUrl,
      raw.img,
      raw.picture,
    ];

    for (const val of candidates) {
      if (typeof val === 'string' && val.trim().length > 0) {
        const resolved = cleanIconUrl(val);
        if (resolved) return resolved;
      }
    }

    if (typeof raw.rawImageUrl === 'string' && raw.rawImageUrl.trim().length > 0) {
      const resolved = cleanIconUrl(raw.rawImageUrl);
      if (resolved) return resolved;
    }

    return '';
  }

  // ─── Official Hub Brand Logo Mapping Dictionary ───────────
  // Verified Script Hub logos using high-quality authentic local assets
  const DEFAULT_HUB_LOGO = '/assets/logo.jpg';

  const HUB_OFFICIAL_LOGOS = [
    {
      keywords: ['stencil x', 'stencil'],
      name: 'Stencil X',
      logoUrl: '/assets/icons/hub-stencil-x.png',
      neonColor: '#00F0FF',
      glowColor: 'rgba(0, 240, 255, 0.45)',
    },
    {
      keywords: ['ouroboros', 'ouroboros hub'],
      name: 'Ouroboros',
      logoUrl: '/assets/icons/hub-ouroboros-hub.png',
      neonColor: '#10B981',
      glowColor: 'rgba(168, 85, 247, 0.45)',
    },
    {
      keywords: ['chilli', 'chili', 'chillihub'],
      name: 'Chilli Hub',
      logoUrl: '/assets/icons/hub-chilli-hub.png',
      neonColor: '#FF3366',
      glowColor: 'rgba(255, 51, 102, 0.45)',
    },
    {
      keywords: ['fyy', 'fyycommunity'],
      name: 'FyyCommunity',
      logoUrl: '/assets/icons/script2-logo.png',
      neonColor: '#6366F1',
      glowColor: 'rgba(99, 102, 241, 0.45)',
    },
    {
      keywords: ['redz', 'realredz', 'red z'],
      name: 'Redz Hub',
      logoUrl: '/assets/icons/hub-redz-hub.png',
      neonColor: '#EF4444',
      glowColor: 'rgba(239, 68, 68, 0.45)',
    },
    {
      keywords: ['hoho', 'ho ho', 'acsu123'],
      name: 'Hoho Hub',
      logoUrl: '/assets/icons/hub-hoho-hub.png',
      neonColor: '#00F0FF',
      glowColor: 'rgba(0, 240, 255, 0.45)',
    },
    {
      keywords: ['zap', 'zaphub', 'zapdeveloper', 'zap hub', 'zap project'],
      name: 'ZapHub',
      logoUrl: '/assets/icons/hub-zaphub.png',
      neonColor: '#F59E0B',
      glowColor: 'rgba(245, 158, 11, 0.45)',
    },
    {
      keywords: ['banana', 'banana hub', 'bananateam'],
      name: 'Banana Hub',
      logoUrl: '/assets/icons/hub-banana-hub.png',
      neonColor: '#EAB308',
      glowColor: 'rgba(234, 179, 8, 0.45)',
    },
    {
      keywords: ['mukuro', 'mukuro hub', 'xquartyx'],
      name: 'Mukuro Hub',
      logoUrl: '/assets/icons/hub-mukuro-hub.png',
      neonColor: '#A855F7',
      glowColor: 'rgba(168, 85, 247, 0.45)',
    },
    {
      keywords: ['speed hub', 'speedhub', 'speedexec'],
      name: 'Speed Hub',
      logoUrl: '/assets/icons/hub-speed-hub.png',
      neonColor: '#22C55E',
      glowColor: 'rgba(34, 197, 94, 0.45)',
    },
    {
      keywords: ['zen hub', 'zenhub', 'kaizeno'],
      name: 'Zen Hub',
      logoUrl: '/assets/icons/hub-zen-hub.png',
      neonColor: '#14B8A6',
      glowColor: 'rgba(20, 184, 166, 0.45)',
    },
  ];

  // ─── Roblox Game Icons Map ─────────────────────────────────
  const GAME_ICON_MAP = [
    { keywords: ['blox fruits', 'bloxfruits', 'blox fruit'], icon: '/assets/icons/roblox-blox-fruits.png' },
    { keywords: ['blade ball', 'bladeball'], icon: '/assets/icons/roblox-blade-ball.png' },
    { keywords: ['king legacy', 'kinglegacy'], icon: '/assets/icons/roblox-king-legacy.png' },
    { keywords: ['doors', 'door floor'], icon: '/assets/icons/roblox-doors.png' },
    { keywords: ['arsenal'], icon: '/assets/icons/roblox-arsenal.png' },
    { keywords: ['murder mystery 2', 'murder mystery', 'mm2'], icon: '/assets/icons/roblox-murder-mystery-2.png' },
    { keywords: ['steal an egg', 'steal egg', 'break and steal an egg'], icon: '/assets/icons/roblox-steal-an-egg.png' },
    { keywords: ['car dealership tycoon', 'car dealership'], icon: '/assets/icons/roblox-car-dealership-tycoon.png' },
    { keywords: ['dungeon quest'], icon: '/assets/icons/roblox-dungeon-quest-reborn.png' },
    { keywords: ['flee the facility'], icon: '/assets/icons/roblox-flee-the-facility.png' },
    { keywords: ['anime piece'], icon: '/assets/icons/roblox-anime-piece.png' },
    { keywords: ['build a zoo', 'build zoo'], icon: '/assets/icons/roblox-build-a-zoo.png' },
    { keywords: ['elemental powers tycoon', 'elemental powers'], icon: '/assets/icons/roblox-elemental-powers-tycoon.png' },
    { keywords: ['knife duels', 'knife duel'], icon: '/assets/icons/roblox-knife-duels.png' },
    { keywords: ['sailor piece'], icon: '/assets/icons/roblox-sailor-piece.png' },
    { keywords: ['the hollow'], icon: '/assets/icons/roblox-the-hollow.png' },
    { keywords: ['trading tycoon'], icon: '/assets/icons/roblox-trading-tycoon.png' },
    { keywords: ['vox seas'], icon: '/assets/icons/roblox-vox-seas.png' },
    { keywords: ['free fire zone', 'free fire'], icon: '/assets/icons/roblox-free-fire-zone.png' },
    { keywords: ['grow a garden'], icon: '/assets/icons/roblox-grow-a-garden.png' },
    { keywords: ['survive a million monkeys', 'million monkeys'], icon: '/assets/icons/roblox-survive-a-million-monkeys.png' },
    { keywords: ['tap simulator'], icon: '/assets/icons/roblox-tap-simulator-reborn.png' },
    { keywords: ['drive highway'], icon: '/assets/icons/roblox-drive-highway-script.png' },
    { keywords: ['bike for egg'], icon: '/assets/icons/roblox-bike-for-egg.png' },
    { keywords: ['catch a plane'], icon: '/assets/icons/roblox-catch-a-plane-upd-1.png' },
    { keywords: ['create a robot fighter', 'robot fighter'], icon: '/assets/icons/roblox-create-a-robot-fighter.png' },
    { keywords: ['fake an egg'], icon: '/assets/icons/roblox-fake-an-egg.png' },
    { keywords: ['greedy growers'], icon: '/assets/icons/roblox-greedy-growers.png' },
    { keywords: ['hike for eggs'], icon: '/assets/icons/roblox-hike-for-eggs.png' },
    { keywords: ['merge a nuke'], icon: '/assets/icons/roblox-merge-a-nuke.png' },
    { keywords: ['pets universe'], icon: '/assets/icons/roblox-pets-universe.png' },
    { keywords: ['ride a pet'], icon: '/assets/icons/roblox-ride-a-pet.png' },
    { keywords: ['roll a lucky egg'], icon: '/assets/icons/roblox-roll-a-lucky-egg-update-1.png' },
    { keywords: ['roll a stickman'], icon: '/assets/icons/roblox-roll-a-stickman.png' },
    { keywords: ['skate for animals'], icon: '/assets/icons/roblox-skate-for-animals.png' },
    { keywords: ['tribes 3v3', 'tribes'], icon: '/assets/icons/roblox-tribes-3v3.png' },
    { keywords: ['anime fighting simulator'], icon: '/assets/icons/roblox-update-12-anime-fighting-simulator.png' },
    { keywords: ['ww3 commander'], icon: '/assets/icons/roblox-ww3-commander.png' },
    { keywords: ['cameraman tower defense', 'cameraman'], icon: '/assets/icons/roblox-x2-cameraman-tower-defense.png' },
    { keywords: ['anime dice'], icon: '/assets/icons/roblox-anime-dice.png' },
    { keywords: ['1 money per click', 'money per click'], icon: '/assets/icons/roblox-1-money-per-click.png' },
    { keywords: ['1 animal mog evolution', 'animal mog'], icon: '/assets/icons/roblox-1-animal-mog-evolution.png' },
    { keywords: ['bahay kubo garden'], icon: '/assets/icons/roblox-bahay-kubo-garden.png' },
  ];

  function getGameIcon(gameName, title) {
    const text = `${gameName || ''} ${title || ''}`.toLowerCase();
    for (const item of GAME_ICON_MAP) {
      if (item.keywords.some((kw) => text.includes(kw))) {
        return item.icon;
      }
    }
    return '/assets/icons/roblox-bluered-roblox.png';
  }

  /**
   * Smart Icon System:
   * 1. Official Script Icon: returned if provided in database or matched to verified official hub
   * 2. Game Icon: matched to specific Roblox game icon, replacing any 3rd party external URLs
   */
  function resolveScriptSmartIcons(raw, gameName, title) {
    if (!raw) raw = {};
    const t = (title || raw.title || raw.scriptName || '').trim();
    const g = (gameName || (typeof raw.game === 'string' ? raw.game : raw.game?.name) || 'Roblox').trim();

    // 1. Check for official script icon
    let officialIcon = cleanIconUrl(raw.scriptIcon || raw.hubLogo || '');
    if (!officialIcon) {
      const candidate = extractScriptImage(raw);
      if (candidate && !candidate.includes('roblox-')) {
        officialIcon = cleanIconUrl(candidate);
      }
    }

    let isOfficialHub = Boolean(officialIcon);
    let matchedHub = null;
    const combined = `${t} ${raw.hubName || ''} ${raw.author || ''}`.toLowerCase();
    for (const hub of HUB_OFFICIAL_LOGOS) {
      if (hub.keywords.some((kw) => combined.includes(kw))) {
        matchedHub = hub;
        if (!officialIcon) {
          officialIcon = hub.logoUrl;
          isOfficialHub = true;
        }
        break;
      }
    }

    // 2. Check for game icon
    let gameIcon = cleanIconUrl(raw.gameIcon || '');
    if (!gameIcon) {
      gameIcon = getGameIcon(g, t);
    }

    return {
      scriptIcon: officialIcon,
      gameIcon: gameIcon,
      isOfficialHub,
      matchedHub,
    };
  }

  // ─── Popular Scripts Database ─────────────────────────────
  const popularScripts = [
    {
      id: 'popular_chilli_hub',
      title: 'Steal An Egg Script Chilli Hub (NO KEY) | BEST GUI AUTO STEAL EGGS',
      scriptName: 'Steal An Egg Script Chilli Hub',
      game: 'Steal an Egg',
      features: 'BEST GUI AUTO STEAL EGGS, Instant Steal, Anti Hit',
      hubName: 'Chilli Hub',
      author: 'Chilli Hub',
      scriptIcon: '/assets/icons/hub-chilli-hub.png',
      gameIcon: '/assets/icons/roblox-steal-an-egg.png',
      imageUrl: '/assets/icons/hub-chilli-hub.png',
      logoUrl: '/assets/icons/hub-chilli-hub.png',
      link: 'loadstring(game:HttpGet("https://raw.githubusercontent.com/tienkhanh1/spicy/main/Chilli.lua"))()',
      loadstring: 'loadstring(game:HttpGet("https://raw.githubusercontent.com/tienkhanh1/spicy/main/Chilli.lua"))()',
      code: 'loadstring(game:HttpGet("https://raw.githubusercontent.com/tienkhanh1/spicy/main/Chilli.lua"))()',
      verified: true,
      keyRequired: false,
      neonColor: '#FF3366',
      glowColor: 'rgba(255, 51, 102, 0.45)',
    },
    {
      id: 'popular_fyycommunity',
      title: 'FyyCommunity Script Hub | Keyless GUI, Auto Farm & ESP',
      scriptName: 'FyyCommunity Hub',
      game: 'Universal',
      features: 'Keyless GUI, Auto Farm, Player ESP, Speed & Fly',
      hubName: 'FyyCommunity',
      author: 'FyyCommunity',
      scriptIcon: '/assets/icons/script2-logo.png',
      gameIcon: '/assets/icons/roblox-scriptcentral-universal.png',
      imageUrl: '/assets/icons/script2-logo.png',
      logoUrl: '/assets/icons/script2-logo.png',
      link: 'loadstring(game:HttpGet("https://raw.githubusercontent.com/FyyCommunity/loader/main/script.lua"))()',
      loadstring: 'loadstring(game:HttpGet("https://raw.githubusercontent.com/FyyCommunity/loader/main/script.lua"))()',
      code: 'loadstring(game:HttpGet("https://raw.githubusercontent.com/FyyCommunity/loader/main/script.lua"))()',
      verified: true,
      keyRequired: false,
      neonColor: '#6366F1',
      glowColor: 'rgba(99, 102, 241, 0.45)',
    },
  ];

  const POPULAR_SCRIPTS = popularScripts;
  const verifiedScripts = popularScripts;
  const customScriptsDatabase = popularScripts;
  const CURATED_SCRIPTS = popularScripts;

  function extractAuthorName(title) {
    const match = (title || '').match(/(?:by|cre:\s*|dev:\s*)\s*([a-zA-Z0-9_\-]+)/i);
    return match && match[1] ? match[1] : '';
  }

  /**
   * Identifies or resolves authentic brand icon/avatar for a script hub
   */
  function getHubAvatar(s) {
    if (!s) {
      return {
        name: 'Roblox Script Hub',
        imgUrl: DEFAULT_HUB_LOGO,
        neonColor: '#6366F1',
        glowColor: 'rgba(99, 102, 241, 0.45)',
        isOfficialHub: false,
      };
    }

    const explicitImg = s.scriptIcon || s.logoUrl || s.imageUrl || s.image || s.icon;
    if (explicitImg && typeof explicitImg === 'string' && explicitImg.trim().length > 0) {
      return {
        name: s.hubName || s.title || 'Script Hub',
        imgUrl: cleanIconUrl(explicitImg),
        neonColor: s.neonColor || '#38BDF8',
        glowColor: s.glowColor || 'rgba(56, 189, 248, 0.45)',
        isOfficialHub: true,
      };
    }

    const title = (s.title || '').trim();
    const hubName = (s.hubName || '').trim();
    const authorName = (s.author || s.owner?.username || '').trim();
    const combined = `${title} ${hubName} ${authorName}`.toLowerCase();

    for (const hub of HUB_OFFICIAL_LOGOS) {
      if (hub.keywords.some((kw) => combined.includes(kw))) {
        return {
          name: hub.name,
          imgUrl: hub.logoUrl,
          neonColor: hub.neonColor,
          glowColor: hub.glowColor,
          isOfficialHub: true,
        };
      }
    }

    const gameIcon = s.gameIcon || getGameIcon(s.game, title);
    if (gameIcon) {
      return {
        name: hubName || title || 'Roblox Script',
        imgUrl: gameIcon,
        neonColor: '#38BDF8',
        glowColor: 'rgba(56, 189, 248, 0.45)',
        isOfficialHub: false,
      };
    }

    return {
      name: hubName || title || 'Roblox Script Hub',
      imgUrl: DEFAULT_HUB_LOGO,
      neonColor: '#6366F1',
      glowColor: 'rgba(99, 102, 241, 0.45)',
      isOfficialHub: false,
    };
  }

  /**
   * Normalizes any script entry (database.json or API) into the standardized model.
   * Ensures official scriptIcon and gameIcon are resolved and preserved.
   */
  function normalizeScript(raw) {
    if (!raw) return null;
    const title = (raw.title || raw.scriptName || 'Untitled Script').trim();
    const gameName = typeof raw.game === 'string'
      ? raw.game.trim()
      : (raw.game?.name || raw.gameName || 'Roblox').trim();
    const features = (raw.features || 'Auto Farm, Keyless GUI, Undetected').trim();
    const author = (raw.author || raw.owner?.username || 'Roblox Scripter').trim();

    // 1. Resolve smart icons (Official Script Icon -> Game Icon)
    const smart = resolveScriptSmartIcons(raw, gameName, title);
    const scriptIcon = smart.scriptIcon;
    const gameIcon = smart.gameIcon || getGameIcon(gameName, title);

    const neonColor = raw.neonColor || (smart.matchedHub ? smart.matchedHub.neonColor : '#38BDF8');
    const glowColor = raw.glowColor || (smart.matchedHub ? smart.matchedHub.glowColor : 'rgba(56, 189, 248, 0.45)');

    // 2. Link & Loadstring normalization
    let rawCode = (raw.link || raw.code || raw.loadstring || raw.script || '').trim();
    if (rawCode.startsWith('http://') || rawCode.startsWith('https://')) {
      if (!rawCode.includes('loadstring')) {
        rawCode = `loadstring(game:HttpGet("${rawCode}"))()`;
      }
    }

    const updatedDate = raw.updatedDate || (raw.createdAt ? formatDate(raw.createdAt) : 'Recent');
    const sourceLink = (raw.sourceLink || raw.source_url || raw.source || '').trim();

    const rawHub = (raw.hubName || '').trim();
    const cleanHubName = (rawHub && rawHub !== 'Unknown Hub' && rawHub !== 'Cheater.fun')
      ? rawHub
      : (smart.matchedHub ? smart.matchedHub.name : (rawHub || gameName));

    // Display image prioritized: Official script icon -> Game icon -> Site logo
    const resolvedDisplay = scriptIcon || gameIcon || DEFAULT_HUB_LOGO;

    return {
      id: String(raw.id || raw._id || ('script_' + Math.random().toString(36).substr(2, 9))),
      title,
      scriptName: title,
      game: gameName,
      features,
      hubName: cleanHubName,
      author: cleanHubName,
      scriptIcon: scriptIcon,
      gameIcon: gameIcon,
      image: resolvedDisplay,
      icon: resolvedDisplay,
      imageUrl: resolvedDisplay,
      logoUrl: resolvedDisplay,
      rawImageUrl: gameIcon,
      verified: Boolean(raw.verified !== undefined ? raw.verified : true),
      keyRequired: Boolean(raw.keyRequired !== undefined ? raw.keyRequired : (raw.key || false)),
      updatedDate,
      link: rawCode,
      loadstring: rawCode,
      code: rawCode,
      sourceLink,
      views: Number(raw.views || 1250),
      likes: Number(raw.likes || 85),
      neonColor,
      glowColor,
    };
  }

  function renderAvatarHtml(s) {
    const safeTitle = escapeHtml(s.hubName || s.title || 'Roblox Script Hub');
    const neonColor = s.neonColor || '#38BDF8';
    const glowColor = s.glowColor || 'rgba(56, 189, 248, 0.45)';

    // Smart Icon Hierarchy:
    // 1. Official script icon (if specified)
    // 2. Game icon (if no script icon or if script icon fails to load)
    // 3. Site default logo (only as genuine last resort)
    const primaryImg = s.scriptIcon || s.gameIcon || s.image || DEFAULT_HUB_LOGO;
    const gameFallback = s.gameIcon || DEFAULT_HUB_LOGO;

    const safePrimary = escapeHtml(primaryImg);
    const safeGameIcon = escapeHtml(gameFallback);
    const safeDefault = escapeHtml(DEFAULT_HUB_LOGO);

    const styleAttr = `style="--neon-color:${neonColor};--glow-color:${glowColor};background:#0F172A;"`;

    // Smart Fallback: on error, attempt game icon first before site logo
    const onErrorHandler = `if(!this.dataset.triedGame&&this.dataset.gameIcon&&this.dataset.gameIcon!==this.src){this.dataset.triedGame='true';this.src=this.dataset.gameIcon;}else{this.onerror=null;this.src='${safeDefault}';}`;

    return `
      <div class="hub-avatar" ${styleAttr} title="${safeTitle}">
        <img src="${safePrimary}" 
             data-game-icon="${safeGameIcon}" 
             alt="${safeTitle}" 
             class="hub-avatar-img" 
             loading="lazy" 
             onerror="${onErrorHandler}" />
      </div>`;
  }

  function renderHubStatusTags(s) {
    const tags = [];
    if (s.verified) {
      tags.push(`
        <span class="hub-tag tag-verified" title="${escapeHtml(t('hub.verified'))}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          ${escapeHtml(t('hub.verified'))}
        </span>
      `);
    }
    if (!s.keyRequired) {
      tags.push(`
        <span class="hub-tag tag-keyless" title="${escapeHtml(t('hub.keyless'))}">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          ${escapeHtml(t('hub.keyless'))}
        </span>
      `);
    } else {
      tags.push(`
        <span class="hub-tag tag-key" title="${escapeHtml(t('hub.key_required'))}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-2-2l2 2m0 0l-4.5 4.5a5.5 5.5 0 10-7.78 7.78 5.5 5.5 0 007.78-7.78L19 4z"/></svg>
          ${escapeHtml(t('hub.key_required'))}
        </span>
      `);
    }
    if (s.game && s.game.toLowerCase() === 'universal') {
      tags.push(`
        <span class="hub-tag tag-universal" title="Universal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          Universal
        </span>
      `);
    }
    return tags.join('');
  }

  /**
   * Try each CORS proxy with a fast timeout (3.5s) in order until one succeeds
   */
  async function fetchWithProxy(url) {
    let lastErr;
    for (const proxy of CORS_PROXIES) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const proxyUrl = proxy(url);
        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data;
      } catch (err) {
        clearTimeout(timeoutId);
        lastErr = err;
        continue;
      }
    }
    throw lastErr || new Error('All CORS proxies failed');
  }

  // ─── State ───────────────────────────────────────────────
  const state = {
    scripts: [],
    totalPages: 1,
    currentPage: 1,
    searchQuery: '',
    selectedCategory: 'All',
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    currentScript: null, // No script initially loaded
    detectedPlatform: 'android',
    currentLang: 'en',
    activeModalScript: null,
    isOfflineFallback: false,
  };

  // ─── DOM References ──────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    navbar:            $('#navbar'),
    navLinks:          $('#navLinks'),
    menuToggle:        $('#menuToggle'),
    langSwitcher:      $('#langSwitcher'),
    langBtn:           $('#langBtn'),
    langDropdown:      $('#langDropdown'),
    activeLangFlag:    $('#activeLangFlag'),
    activeLangCode:    $('#activeLangCode'),
    // Key Bypass Tool Elements
    bypassBar: $('#bypassBar'),
    bypassInput: $('#bypassInput'),
    bypassPasteBtn: $('#bypassPasteBtn'),
    bypassSubmitBtn: $('#bypassSubmitBtn'),
    bypassBtnText: $('#bypassSubmitBtn .bypass-btn-text'),
    bypassBtnIcon: $('#bypassSubmitBtn .bypass-btn-icon'),
    bypassLoadingBox: $('#bypassLoadingBox'),
    bypassResultBox: $('#bypassResultBox'),
    bypassResultSuccess: $('#bypassResultSuccess'),
    bypassTimeTag: $('#bypassTimeTag'),
    bypassKeyLink: $('#bypassKeyLink'),
    bypassKeyLinkLabel: $('#bypassKeyLinkLabel'),
    bypassKeyLinkUrl: $('#bypassKeyLinkUrl'),
    bypassKeyValue: $('#bypassKeyValue'),
    bypassCopyKeyBtn: $('#bypassCopyKeyBtn'),
    bypassOpenLinkBtn: $('#bypassOpenLinkBtn'),
    bypassResultError: $('#bypassResultError'),
    bypassStatusIcon: $('#bypassStatusIcon'),
    bypassStatusBadge: $('#bypassStatusBadge'),
    bypassErrorMsg: $('#bypassErrorMsg'),
    bypassErrorActions: $('#bypassErrorActions'),
    bypassExtBtn: $('#bypassExtBtn'),
    bypassExtBtnText: $('#bypassExtBtnText'),
    bypassRetryBtn: $('#bypassRetryBtn'),
    // Captcha Modal Elements
    captchaModal: $('#captchaModal'),
    closeCaptchaModal: $('#closeCaptchaModal'),
    captchaModalCancelBtn: $('#captchaModalCancelBtn'),
    captchaModalOpenBtn: $('#captchaModalOpenBtn'),
    captchaModalRetryBtn: $('#captchaModalRetryBtn'),
    captchaModalTargetUrl: $('#captchaModalTargetUrl'),
    searchInput:       $('#searchInput'),
    searchBtn:         $('#searchBtn'),
    gameFilters:       $('#game-filters'),
    loadingSpinner:    $('#loadingSpinner'),
    loadingText:       $('#loadingText'),
    scriptsGrid:       $('#scriptsGrid'),
    loadMoreContainer: $('#loadMoreContainer'),
    loadMoreBtn:       $('#loadMoreBtn'),
    loadMoreIcon:      $('#loadMoreBtn .load-more-icon'),
    loadMoreSpinner:   $('#loadMoreBtn .load-more-spinner'),
    loadMoreText:      $('#loadMoreBtn .load-more-text'),
    pagination:        $('#pagination'),
    terminalBody:   $('#terminalBody'),
    terminalTitle:  $('#terminalTitle'),
    btnCopy:        $('#btnCopy'),
    btnClear:       $('#btnClear'),
    switchTrack:    $('#switchTrack'),
    switchSlider:   $('#switchSlider'),
    switchAndroid:  $('#btn-android') || $('#switchAndroid'),
    switchIos:      $('#btn-ios') || $('#switchIos'),
    btnAndroid:     $('#btn-android'),
    btnIos:         $('#btn-ios'),
    cardAndroid:    $('#android-card'),
    cardIos:        $('#ios-card'),
    platformCards:  $('#executors-grid') || $('#platformCards'),
    detectedBadge:  $('#detectedBadge'),
    detectedText:   $('#detectedText'),
    statScripts:    $('#statScripts'),
    toastContainer: $('#toastContainer'),
    modalOverlay:   $('#modalOverlay'),
    modalTitle:     $('#modalTitle'),
    modalBody:      $('#modalBody'),
    modalClose:     $('#modalClose'),
    modalCopyBtn:   $('#modalCopyBtn'),
    modalLoadBtn:   $('#modalLoadBtn'),
    imageModal:      $('#image-modal'),
    closeImageModal: $('#close-image-modal'),
    expandedImage:   $('#expanded-image'),
    wifiDevBtn:      $('#wifiDevBtn'),
    wifiModal:       $('#wifi-modal'),
    closeWifiModal:  $('#closeWifiModal'),
    wifiNetworkUrl:  $('#wifiNetworkUrl'),
    copyWifiUrlBtn:  $('#copyWifiUrlBtn'),
    copyWifiUrlText: $('#copyWifiUrlText'),
    wifiQrImage:     $('#wifiQrImage'),
  };

  // ─── Platform Data ──────────────────────────────────────
  const platformData = {
    android: [
      {
        svgIcon: '<img src="/assets/icons/denki-icon.jpg" alt="Denki Logo" class="executor-icon">',
        iconClass: 'android',
        title: 'Denki Executor (Android)',
        version: 'Version: v2.743.1136',
        desc: {
          en: 'The #1 Android Roblox executor. Fast, stable, and supports most scripts with a clean UI.',
          km: 'Executor លេខ 1 សម្រាប់ Android ដើរលឿន ស្រួលប្រើ និងដំណើរការស្ទើរគ្រប់ Script។',
        },
        link: '/assets/downloads/DENKI-Delta-2.743.1136.apk',
        download: 'DENKI-Delta-2.743.1136.apk',
        btnClass: 'android-btn',
        btnText: {
          en: 'Download for Android',
          km: 'ដោនឡូតសម្រាប់ Android',
        },
      },
    ],
    ios: [
      {
        svgIcon: '<img src="/assets/icons/denki-icon.jpg" alt="Denki Logo" class="executor-icon">',
        iconClass: 'ios',
        title: 'Denki Executor (iOS)',
        version: 'Version: v2.717.982',
        desc: {
          en: 'The #1 iOS Roblox executor. Supports direct sideloading and top-tier script execution.',
          km: 'Executor គុណភាពខ្ពស់សម្រាប់ iOS គាំទ្រការតម្លើងតាមរយៈ Sideload និងដំណើរការ Script បានលឿន។',
        },
        link: '/assets/downloads/DENKI-Delta-2.717.982.ipa',
        download: 'DENKI-Delta-2.717.982.ipa',
        btnClass: 'ios-btn',
        btnText: {
          en: 'Download for iOS',
          km: 'ដោនឡូតសម្រាប់ iOS',
        },
      },
    ],
  };

  // ═══════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════
  function init() {
    initLanguage();
    detectPlatform();
    setupNavbar();
    setupSearch();
    setupBypassTool();
    setupGameFilters();
    setupPlatformSwitcher();
    setupImageLightbox();
    setupWifiModal();
    setupScrollReveal();
    setupLoadMore();
    fetchScripts('', 1, false);
  }

  function initTerminalInitialScript() {
    if (verifiedScripts.length > 0) {
      loadScriptInTerminal(verifiedScripts[0], false);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  LANGUAGE SWITCHER CONTROLLER
  // ═══════════════════════════════════════════════════════════

  function initLanguage() {
    let savedLang = 'en';
    try {
      savedLang = localStorage.getItem('denki_lang') || 'en';
    } catch (e) {
      console.warn('localStorage access failed', e);
    }

    setLanguage(savedLang, false);

    // Toggle dropdown open/close
    if (dom.langBtn) {
      dom.langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dom.langSwitcher.classList.toggle('open');
        dom.langBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // Select language option
    $$('.lang-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chosen = btn.dataset.lang;
        setLanguage(chosen, true);
        dom.langSwitcher.classList.remove('open');
        dom.langBtn.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (dom.langSwitcher && !dom.langSwitcher.contains(e.target)) {
        dom.langSwitcher.classList.remove('open');
        dom.langBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dom.langSwitcher.classList.contains('open')) {
        dom.langSwitcher.classList.remove('open');
        dom.langBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function setLanguage(lang, notify = true) {
    if (!['en', 'km'].includes(lang)) lang = 'en';
    state.currentLang = lang;

    try {
      localStorage.setItem('denki_lang', lang);
    } catch (e) {
      console.warn('localStorage not writable', e);
    }

    // HTML root
    document.documentElement.lang = lang;

    // Header switcher UI
    const UK_FLAG_SVG = `<svg class="flag-icon" viewBox="0 0 60 30" width="18" height="12"><clipPath id="uk-clip-head"><path d="M0 0v30h60V0z"/></clipPath><g clip-path="url(#uk-clip-head)"><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" stroke-width="3.5"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g></svg>`;
    const KH_FLAG_SVG = `<svg class="flag-icon" viewBox="0 0 60 38" width="18" height="12"><rect width="60" height="38" fill="#032EA6"/><rect y="9.5" width="60" height="19" fill="#E00025"/><g fill="#FFFFFF" transform="translate(18, 10.5) scale(0.6)"><path d="M20 2v6h-4v2h-4v4H8v4h24v-4h-4v-4h-4V10h-4V2zm0 3l2 3h-4l2-3zm-6 5l2 3h-4l2-3zm12 0l2 3h-4l2-3z"/><rect x="6" y="18" width="28" height="3"/></g></svg>`;

    if (dom.activeLangFlag) {
      dom.activeLangFlag.innerHTML = lang === 'km' ? KH_FLAG_SVG : UK_FLAG_SVG;
    }
    if (dom.activeLangCode) {
      dom.activeLangCode.textContent = lang === 'km' ? 'KH' : 'EN';
    }

    // Active state in dropdown
    $$('.lang-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.lang === lang);
    });

    // Translate DOM elements with data-i18n
    $$('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      if (text) el.textContent = text;
    });

    // Translate placeholders
    $$('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = t(key);
      if (text) el.placeholder = text;
    });

    // Translate titles
    $$('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const text = t(key);
      if (text) el.title = text;
    });

    // Update detected badge
    updateDetectedBadge();

    // Re-render platform cards
    renderPlatformCards(state.detectedPlatform, false);

    // Re-render game category filters if initialized
    renderGameFilters();

    // Re-render script cards if already loaded
    if (state.scripts.length > 0) {
      renderScriptCards();
      renderPagination();
    }

    // If modal is currently open, refresh it with localized labels
    if (state.activeModalScript && dom.modalOverlay.classList.contains('open')) {
      openScriptModal(state.activeModalScript);
    }

    // Optional toast notification
    if (notify) {
      toast(lang === 'km' ? 'បានប្តូរទៅជាភាសាខ្មែរ' : 'Switched to English', 'info');
    }
  }

  // ─── Backend API Dynamic Origin Resolution ─────────────────
  /**
   * Resolves the full URL for backend endpoints by dynamically prepending
   * window.location.origin (e.g., http://192.168.1.5:3000) with robust fallbacks,
   * guaranteeing mobile devices on LAN reach the server without connection failures.
   */
  function getBackendApiUrl(endpoint = '/api/scripts') {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.origin && window.location.origin !== 'null') {
        return `${window.location.origin}${cleanEndpoint}`;
      }
      if (window.location.protocol && window.location.host) {
        return `${window.location.protocol}//${window.location.host}${cleanEndpoint}`;
      }
    }
    return cleanEndpoint;
  }

  const BACKEND_API = getBackendApiUrl('/api/scripts');

  /**
   * Set loading UI state for the Load More button
   */
  function setLoadMoreBtnState(loading) {
    state.isLoadingMore = loading;
    if (!dom.loadMoreBtn) return;
    dom.loadMoreBtn.disabled = loading;
    if (dom.loadMoreIcon) {
      dom.loadMoreIcon.style.display = loading ? 'none' : 'inline-block';
    }
    if (dom.loadMoreSpinner) {
      dom.loadMoreSpinner.style.display = loading ? 'inline-block' : 'none';
    }
  }

  /**
   * Set up Load More button click handler
   */
  function setupLoadMore() {
    if (!dom.loadMoreBtn) return;
    dom.loadMoreBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (state.isLoadingMore || !state.hasMore) return;
      state.currentPage += 1;
      await fetchScripts(state.searchQuery, state.currentPage);
    });
  }

  /**
   * Fetch scripts from backend endpoint with dynamic origin resolution.
   * If primary endpoint fails, gracefully falls back to local /data/database.json
   * so mobile devices on LAN never get a Connection Error.
   */
  async function fetchScripts(query = '', page = 1, isAppend = undefined) {
    const shouldAppend = isAppend !== undefined ? Boolean(isAppend) : page > 1;
    state.searchQuery = query;
    state.currentPage = page;

    if (shouldAppend) {
      setLoadMoreBtnState(true);
    } else {
      state.scripts = [];
      showGridLoading();
    }

    const cleanQuery = (query || '').trim();
    const params = new URLSearchParams();
    if (cleanQuery) params.set('search', cleanQuery);
    params.set('page', String(page));
    const targetUrl = `${getBackendApiUrl('/api/scripts')}?${params.toString()}`;

    // AbortController timeout ensures browser fetch doesn't hang indefinitely
    const controller = new AbortController();
    const clientTimeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(targetUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const rawList = Array.isArray(data.scripts) ? data.scripts : [];
      const validScripts = rawList.map(normalizeScript).filter(Boolean);

      if (typeof data.total_pages === 'number') {
        state.totalPages = data.total_pages;
      }
      if (typeof data.has_more === 'boolean') {
        state.hasMore = data.has_more;
      }

      if (shouldAppend) {
        if (validScripts.length === 0) {
          state.hasMore = false;
          if (dom.loadMoreContainer) {
            dom.loadMoreContainer.style.display = 'none';
          }
        } else {
          const existingIds = new Set(state.scripts.map((s) => s.id));
          const uniqueScripts = validScripts.filter((s) => !existingIds.has(s.id));

          if (uniqueScripts.length === 0) {
            state.hasMore = false;
            if (dom.loadMoreContainer) {
              dom.loadMoreContainer.style.display = 'none';
            }
          } else {
            appendScriptCards(uniqueScripts);
            if (dom.loadMoreContainer) {
              dom.loadMoreContainer.style.display = state.hasMore ? 'flex' : 'none';
            }
          }
        }
      } else {
        state.scripts = validScripts;
        state.hasMore = typeof data.has_more === 'boolean' ? data.has_more : validScripts.length > 0;

        if (dom.statScripts) {
          dom.statScripts.textContent = formatNumber(validScripts.length);
        }

        if (validScripts.length === 0) {
          renderEmptyState();
        } else {
          renderScriptCards();
          if (dom.loadMoreContainer) {
            dom.loadMoreContainer.style.display = state.hasMore ? 'flex' : 'none';
          }
        }
      }
    } catch (error) {
      console.warn('API request failed, attempting static database fallback:', error);
      let fallbackSuccess = false;

      // Resilient Fallback: load static data/database.json directly
      try {
        const fallbackUrl = getBackendApiUrl('/data/database.json');
        const fbRes = await fetch(fallbackUrl);
        if (fbRes.ok) {
          const dbData = await fbRes.json();
          const allScripts = Array.isArray(dbData) ? dbData : (dbData.scripts || []);
          let filtered = allScripts;
          if (cleanQuery) {
            const terms = cleanQuery.toLowerCase().split(/\s+/).filter(Boolean);
            filtered = filtered.filter((s) => {
              const fullText = `${s.title || ''} ${s.game || ''} ${s.hubName || ''} ${s.features || ''} ${s.author || ''}`.toLowerCase();
              return terms.every((t) => fullText.includes(t));
            });
          }
          const perPage = PER_PAGE || 12;
          const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
          const paged = filtered.slice((page - 1) * perPage, page * perPage);
          const validScripts = paged.map(normalizeScript).filter(Boolean);

          state.totalPages = totalPages;
          state.hasMore = page < totalPages;

          if (shouldAppend) {
            appendScriptCards(validScripts);
            if (dom.loadMoreContainer) {
              dom.loadMoreContainer.style.display = state.hasMore ? 'flex' : 'none';
            }
          } else {
            state.scripts = validScripts;
            state.hasMore = validScripts.length > 0 && page < totalPages;
            if (dom.statScripts) {
              dom.statScripts.textContent = formatNumber(validScripts.length);
            }
            if (validScripts.length === 0) {
              renderEmptyState();
            } else {
              renderScriptCards();
              if (dom.loadMoreContainer) {
                dom.loadMoreContainer.style.display = state.hasMore ? 'flex' : 'none';
              }
            }
          }
          fallbackSuccess = true;
        }
      } catch (fbErr) {
        console.warn('Static database fallback also failed:', fbErr);
      }

      if (!fallbackSuccess) {
        const userFriendlyMsg = t('error.fetch_failed') || 'បរាជ័យក្នុងការទាញយកទិន្នន័យ សូមសាកល្បងម្ដងទៀត។';
        if (shouldAppend) {
          state.currentPage = Math.max(1, state.currentPage - 1);
          toast(userFriendlyMsg, 'error');
        } else {
          state.scripts = [];
          if (dom.statScripts) {
            dom.statScripts.textContent = '0';
          }
          showGridError(userFriendlyMsg);
        }
      }
    } finally {
      clearTimeout(clientTimeoutId);
      // Hide the loading spinner so it stops spinning regardless of success or failure
      if (dom.loadingSpinner) {
        dom.loadingSpinner.classList.add('hidden');
      }
      setLoadMoreBtnState(false);
    }
  }

  function loadCuratedFallbackScripts(query = '', page = 1) {
    fetchScripts(query, page, false);
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER — Clean Script Cards (Avatar, Title, Game, Features, Direct Copy)
  // ═══════════════════════════════════════════════════════════

  function generateScriptCardHtml(s, i) {
    const avatarHtml = renderAvatarHtml(s);
    const gameLabel = t('card.game_label');
    const featuresLabel = t('card.features_label');
    const gameName = s.game || (state.currentLang === 'km' ? 'គ្រប់ហ្គេម (Universal)' : 'Universal');
    const featuresText = s.features || (state.currentLang === 'km' ? 'Auto Farm, Keyless GUI, Undetected' : 'Auto Farm, Keyless GUI, Undetected');
    // Absolute full raw title without any split or truncation
    const scriptTitle = s.title || s.scriptName || 'Untitled Script';
    const hubName = s.hubName || 'Unknown Hub';

    return `
      <div class="script-card" data-index="${i}" style="animation-delay:${(i % 12) * 40}ms">
        <div class="card-header">
          <div class="card-avatar-wrapper">
            ${avatarHtml}
          </div>
          <div class="card-title-group">
            <h4 class="card-title script-title" title="${escapeHtml(scriptTitle)}">${escapeHtml(scriptTitle)}</h4>
            <div class="card-hub-subtitle">
              <span class="hub-name-badge" title="Hub: ${escapeHtml(hubName)}">
                <svg class="hub-badge-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span class="hub-name-text">${escapeHtml(hubName)}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="card-details">
          <div class="card-detail-item card-game-row">
            <span class="detail-label">${escapeHtml(gameLabel)}</span>
            <span class="detail-value game-badge">${escapeHtml(gameName)}</span>
          </div>
          <div class="card-detail-item card-features-row">
            <span class="detail-label">${escapeHtml(featuresLabel)}</span>
            <span class="detail-value features-text" title="${escapeHtml(featuresText)}">${escapeHtml(featuresText)}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="card-copy-btn" data-action="copy" title="${escapeHtml(t('card.copy_script'))}">
            <svg class="btn-icon copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            <svg class="btn-icon check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:none">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span class="btn-label">${escapeHtml(t('card.copy_script'))}</span>
            <span class="card-tooltip" aria-hidden="true">${escapeHtml(t('card.copied'))}</span>
          </button>
        </div>
      </div>`;
  }

  function attachCardEventListeners(card, script) {
    if (!card || !script) return;

    // Direct click on avatar opens lightbox modal
    const avatar = card.querySelector('.hub-avatar');
    if (avatar) {
      avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        const img = avatar.querySelector('.hub-avatar-img') || avatar.querySelector('img');
        const src = img ? (img.currentSrc || img.src) : '';
        if (src) {
          openImageLightbox(src, img.alt || script.title || 'Expanded Script Icon');
        }
      });
    }

    // Single primary action button: "កូពី Script" (Direct Copy Script)
    const copyBtn = card.querySelector('.card-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleDirectCopyScript(script, copyBtn);
      });
    }
  }

  /**
   * Directly copies raw script code (from backend deep scrape) to clipboard
   * and triggers visual feedback: temporary button tooltip and toast notification
   */
  async function handleDirectCopyScript(script, btn) {
    let rawCode = (script.code || script.loadstring || '').trim();

    // Fallback if code isn't deeply scraped yet
    if (!rawCode && script.sourceLink) {
      rawCode = `loadstring(game:HttpGet("${script.sourceLink}"))()`;
    }

    if (!rawCode) {
      toast(t('toast.no_script'), 'error');
      return;
    }

    const success = await copyTextToClipboard(rawCode);
    if (success && btn) {
      btn.classList.add('copied');
      const copyIcon = btn.querySelector('.copy-icon');
      const checkIcon = btn.querySelector('.check-icon');
      const btnLabel = btn.querySelector('.btn-label');
      const origText = btnLabel ? btnLabel.textContent : '';

      if (copyIcon) copyIcon.style.display = 'none';
      if (checkIcon) checkIcon.style.display = 'inline-block';
      if (btnLabel) btnLabel.textContent = t('card.copied');

      setTimeout(() => {
        btn.classList.remove('copied');
        if (copyIcon) copyIcon.style.display = 'inline-block';
        if (checkIcon) checkIcon.style.display = 'none';
        if (btnLabel && origText) btnLabel.textContent = origText;
      }, 2000);
    }
  }

  function renderScriptCards() {
    if (!state.scripts.length) {
      renderEmptyState();
      return;
    }

    dom.scriptsGrid.innerHTML = state.scripts.map((s, i) => generateScriptCardHtml(s, i)).join('');

    // Attach card event listeners
    const cards = dom.scriptsGrid.querySelectorAll('.script-card');
    cards.forEach((card) => {
      const idx = parseInt(card.dataset.index, 10);
      const script = state.scripts[idx];
      if (script) {
        attachCardEventListeners(card, script);
      }
    });
  }

  function appendScriptCards(newScripts) {
    if (!newScripts || !newScripts.length) return;
    const startIndex = state.scripts.length;
    state.scripts.push(...newScripts);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newScripts.map((s, idx) => generateScriptCardHtml(s, startIndex + idx)).join('');
    const cardNodes = Array.from(tempDiv.children);

    cardNodes.forEach((cardEl, idx) => {
      dom.scriptsGrid.appendChild(cardEl);
      attachCardEventListeners(cardEl, newScripts[idx]);
    });

    if (dom.statScripts) {
      dom.statScripts.textContent = formatNumber(state.scripts.length);
    }
  }

  function renderEmptyState() {
    dom.scriptsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-glow"></div>
        <div class="empty-state-icon-box">
          <svg class="empty-state-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <div class="empty-state-badge">
          <span class="empty-state-dot"></span>
          <span>${escapeHtml(t('empty.badge'))}</span>
        </div>
        <h4 class="empty-state-title">${escapeHtml(t('empty.title'))}</h4>
        <p class="empty-state-desc">${escapeHtml(t('empty.desc'))}</p>
      </div>`;
    if (dom.loadMoreContainer) {
      dom.loadMoreContainer.style.display = 'none';
    }
    if (dom.pagination) {
      dom.pagination.innerHTML = '';
      dom.pagination.style.display = 'none';
    }
  }

  function showGridLoading() {
    if (dom.loadingSpinner) {
      dom.loadingSpinner.classList.remove('hidden');
    }
    dom.scriptsGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="spinner" style="width:32px;height:32px;margin:0 auto 16px;border:3px solid rgba(99,102,241,.15);border-top-color:var(--primary-500)"></div>
        <h4>${escapeHtml(t('loading.title'))}</h4>
        <p>${escapeHtml(t('loading.desc'))}</p>
      </div>`;
    if (dom.loadMoreContainer) {
      dom.loadMoreContainer.style.display = 'none';
    }
    if (dom.pagination) {
      dom.pagination.innerHTML = '';
      dom.pagination.style.display = 'none';
    }
  }

  function showGridError(errorMessage) {
    if (dom.loadingSpinner) {
      dom.loadingSpinner.classList.add('hidden');
    }
    const message = errorMessage || t('error.fetch_failed') || t('error.desc') || 'បរាជ័យក្នុងការទាញយកទិន្នន័យ សូមសាកល្បងម្ដងទៀត។';
    dom.scriptsGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h4>${escapeHtml(t('error.title'))}</h4>
        <p>${escapeHtml(message)}</p>
        <button class="btn btn-outline" style="margin-top:16px" onclick="location.reload()">${escapeHtml(t('error.retry'))}</button>
      </div>`;
    if (dom.loadMoreContainer) {
      dom.loadMoreContainer.style.display = 'none';
    }
    if (dom.pagination) {
      dom.pagination.innerHTML = '';
      dom.pagination.style.display = 'none';
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER — Pagination (Legacy Fallback)
  // ═══════════════════════════════════════════════════════════

  function renderPagination() {
    if (dom.pagination) {
      dom.pagination.innerHTML = '';
      dom.pagination.style.display = 'none';
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SCRIPT TERMINAL
  // ═══════════════════════════════════════════════════════════

  function loadScriptInTerminal(script, scroll = true) {
    if (!script) return;
    const raw = (script.loadstring || script.script || '').trim();
    if (!raw) return;
    state.currentScript = raw;
    dom.terminalTitle.textContent = `${script.hubName || script.title || 'Script'} — script.lua`;

    const lines = raw.split('\n');
    dom.terminalBody.innerHTML = lines.map((line, i) => {
      return `<div class="terminal-line"><span class="line-num">${i + 1}</span><span>${highlightLua(line)}</span></div>`;
    }).join('');

    if (scroll) {
      $('#terminal-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(t('toast.script_loaded'), 'success');
    }
  }

  function highlightLua(line) {
    if (!line) return '';
    // Tokenize Lua code to format accurately without stripping quotes or breaking syntax
    const TOKEN_REGEX = /(--.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(?:local|function|end|if|then|else|elseif|for|while|do|return|repeat|until|in|not|and|or|true|false|nil|break|goto)\b)|(\b(?:loadstring|HttpGet|getgenv|_G|require|print|game|workspace|wait|spawn|pcall|xpcall|coroutine|string|table|math|Instance|Vector3|CFrame|Color3|UDim2|Enum)\b)|(\b\d+(?:\.\d+)?\b)|([()\[\]{},.:=+\-*/%#<>~])/g;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = TOKEN_REGEX.exec(line)) !== null) {
      if (match.index > lastIndex) {
        result += escapeHtml(line.slice(lastIndex, match.index));
      }
      const token = match[0];
      const esc = escapeHtml(token);

      if (match[1]) {
        result += `<span class="comment">${esc}</span>`;
      } else if (match[2]) {
        result += `<span class="string">${esc}</span>`;
      } else if (match[3]) {
        result += `<span class="keyword">${esc}</span>`;
      } else if (match[4]) {
        result += `<span class="func">${esc}</span>`;
      } else if (match[5]) {
        result += `<span class="number">${esc}</span>`;
      } else if (match[6]) {
        result += `<span class="operator">${esc}</span>`;
      } else {
        result += esc;
      }
      lastIndex = TOKEN_REGEX.lastIndex;
    }

    if (lastIndex < line.length) {
      result += escapeHtml(line.slice(lastIndex));
    }

    return result;
  }

  function clearTerminal() {
    state.currentScript = null;
    dom.terminalTitle.textContent = 'script.lua';
    dom.terminalBody.innerHTML = `
      <div class="terminal-line"><span class="line-num">1</span><span class="comment">${escapeHtml(t('terminal.cleared_line1'))}</span></div>
      <div class="terminal-line"><span class="line-num">2</span><span class="comment">${escapeHtml(t('terminal.cleared_line2'))}</span></div>`;
    toast(t('toast.terminal_cleared'), 'info');
  }

  async function copyToClipboard() {
    await copyTextToClipboard(state.currentScript, dom.btnCopy);
  }

  async function copyTextToClipboard(text, btn = null) {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      toast(t('toast.no_script'), 'error');
      return;
    }

    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(cleanText);
        success = true;
      } catch (err) {
        console.warn('navigator.clipboard.writeText failed, using fallback', err);
      }
    }
    if (!success) {
      success = fallbackCopy(cleanText);
    }

    if (success) {
      if (typeof window.playCopySound === 'function') {
        window.playCopySound();
      }
      toast(t('toast.copied'), 'success');
      if (btn) {
        btn.classList.add('copied');
        const label = btn.querySelector('.btn-label, .hub-btn-label');
        const origText = label ? label.textContent : '';
        if (label) label.textContent = t('terminal.copied');
        setTimeout(() => {
          btn.classList.remove('copied');
          if (label && origText) label.textContent = origText;
        }, 2000);
      }
    } else {
      toast(t('toast.copy_failed'), 'error');
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (e) {
      copied = false;
    }
    document.body.removeChild(textarea);
    return copied;
  }

  // ═══════════════════════════════════════════════════════════
  //  PLATFORM DETECTION & SWITCHER
  // ═══════════════════════════════════════════════════════════

  function detectPlatform() {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) {
      state.detectedPlatform = 'android';
    } else if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      state.detectedPlatform = 'ios';
    } else {
      state.detectedPlatform = 'android';
    }
  }

  function updateDetectedBadge() {
    if (!dom.detectedText) return;
    const key = state.detectedPlatform === 'ios' ? 'detected.ios' : 'detected.android';
    dom.detectedText.textContent = t(key);
  }

  function positionSwitchSlider(platform) {
    const track = document.getElementById('switchTrack');
    const slider = document.getElementById('switchSlider');
    if (!track || !slider) return;
    const activeBtn = platform === 'ios' ? document.getElementById('btn-ios') : document.getElementById('btn-android');
    if (!activeBtn) return;

    requestAnimationFrame(() => {
      const trackRect = track.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      if (trackRect.width > 0 && btnRect.width > 0) {
        slider.style.left = (btnRect.left - trackRect.left) + 'px';
        slider.style.width = btnRect.width + 'px';
      }
    });
  }

  function setupPlatformSwitcher() {
    const btnAndroid = document.getElementById('btn-android');
    const btnIos = document.getElementById('btn-ios');
    const cardAndroid = document.getElementById('android-card');
    const cardIos = document.getElementById('ios-card');

    if (btnAndroid && btnIos) {
      btnAndroid.addEventListener('click', () => {
        btnAndroid.classList.add('active');
        btnIos.classList.remove('active');
        if (cardAndroid) cardAndroid.classList.remove('hidden');
        if (cardIos) cardIos.classList.add('hidden');
        state.detectedPlatform = 'android';
        positionSwitchSlider('android');
        updateDetectedBadge();
      });

      btnIos.addEventListener('click', () => {
        btnIos.classList.add('active');
        btnAndroid.classList.remove('active');
        if (cardIos) cardIos.classList.remove('hidden');
        if (cardAndroid) cardAndroid.classList.add('hidden');
        state.detectedPlatform = 'ios';
        positionSwitchSlider('ios');
        updateDetectedBadge();
      });
    }

    // Set initial view state based on platform detection
    if (state.detectedPlatform === 'ios') {
      if (btnIos) btnIos.classList.add('active');
      if (btnAndroid) btnAndroid.classList.remove('active');
      if (cardIos) cardIos.classList.remove('hidden');
      if (cardAndroid) cardAndroid.classList.add('hidden');
    } else {
      if (btnAndroid) btnAndroid.classList.add('active');
      if (btnIos) btnIos.classList.remove('active');
      if (cardAndroid) cardAndroid.classList.remove('hidden');
      if (cardIos) cardIos.classList.add('hidden');
    }

    positionSwitchSlider(state.detectedPlatform);
    updateDetectedBadge();

    window.addEventListener('resize', () => {
      positionSwitchSlider(state.detectedPlatform);
    });
  }

  function switchPlatform(platform) {
    const btnAndroid = document.getElementById('btn-android');
    const btnIos = document.getElementById('btn-ios');
    const cardAndroid = document.getElementById('android-card');
    const cardIos = document.getElementById('ios-card');

    state.detectedPlatform = platform;
    if (platform === 'ios') {
      if (btnIos) btnIos.classList.add('active');
      if (btnAndroid) btnAndroid.classList.remove('active');
      if (cardIos) cardIos.classList.remove('hidden');
      if (cardAndroid) cardAndroid.classList.add('hidden');
    } else {
      if (btnAndroid) btnAndroid.classList.add('active');
      if (btnIos) btnIos.classList.remove('active');
      if (cardAndroid) cardAndroid.classList.remove('hidden');
      if (cardIos) cardIos.classList.add('hidden');
    }

    positionSwitchSlider(platform);
    updateDetectedBadge();
  }

  function renderPlatformCards() {
    const cardAndroid = document.getElementById('android-card');
    const cardIos = document.getElementById('ios-card');
    const btnAndroid = document.getElementById('btn-android');
    const btnIos = document.getElementById('btn-ios');

    if (state.detectedPlatform === 'ios') {
      if (cardIos) cardIos.classList.remove('hidden');
      if (cardAndroid) cardAndroid.classList.add('hidden');
      if (btnIos) btnIos.classList.add('active');
      if (btnAndroid) btnAndroid.classList.remove('active');
    } else {
      if (cardAndroid) cardAndroid.classList.remove('hidden');
      if (cardIos) cardIos.classList.add('hidden');
      if (btnAndroid) btnAndroid.classList.add('active');
      if (btnIos) btnIos.classList.remove('active');
    }

    positionSwitchSlider(state.detectedPlatform);
    updateDetectedBadge();
  }

  // ─── Direct Download Fallback ────────────────────────────────
  window.triggerDirectDownload = function(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || url.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ═══════════════════════════════════════════════════════════
  //  MODAL
  // ═══════════════════════════════════════════════════════════

  function openScriptModal(script) {
    if (!script) return;
    state.activeModalScript = script;
    const rawCode = script.loadstring || script.script || '-- No code available';
    state.currentScript = rawCode;

    const avatarHtml = renderAvatarHtml(script);
    const author = script.author || 'Verified Creator';

    dom.modalTitle.textContent = script.title || t('modal.title');
    const gameName = script.game || (state.currentLang === 'km' ? 'ប្រើបានគ្រប់ហ្គេម' : 'Universal');

    dom.modalBody.innerHTML = `
      <div style="margin-bottom:18px;display:flex;gap:14px;align-items:center">
        ${avatarHtml}
        <div>
          <h4 style="font-size:1.05rem;font-weight:700;margin-bottom:4px;color:var(--gray-900)">${escapeHtml(script.title || 'Script Hub')}</h4>
          <div style="font-size:0.78rem;color:var(--gray-500)">${escapeHtml(t('hub.by'))} <strong>${escapeHtml(author)}</strong> · <span class="script-card-game">${escapeHtml(gameName)}</span></div>
        </div>
      </div>
      <div style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          ${renderHubStatusTags(script)}
        </div>
        <div style="display:flex;gap:20px;font-size:.82rem;color:var(--gray-500);margin-bottom:16px;align-items:center;flex-wrap:wrap">
          <span style="display:inline-flex;align-items:center;gap:6px">
            <svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ${formatNumber(script.views || 0)} ${escapeHtml(t('card.views'))}
          </span>
          <span style="display:inline-flex;align-items:center;gap:6px">
            <svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            ${formatNumber(script.likes || 0)} ${escapeHtml(t('card.likes'))}
          </span>
          <span style="display:inline-flex;align-items:center;gap:6px">
            <svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${escapeHtml(script.updatedDate || 'Oct 2026')}
          </span>
        </div>
      </div>
      <div class="modal-code-preview">${escapeHtml(rawCode)}</div>
    `;

    dom.modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Rebind modal buttons for this script
    dom.modalCopyBtn.onclick = () => {
      copyTextToClipboard(rawCode, dom.modalCopyBtn);
    };
    dom.modalLoadBtn.onclick = () => {
      loadScriptInTerminal(script, true);
      closeModal();
    };
  }

  function closeModal() {
    dom.modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function setupModal() {
    dom.modalClose.addEventListener('click', closeModal);
    dom.modalOverlay.addEventListener('click', (e) => {
      if (e.target === dom.modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  IMAGE LIGHTBOX MODAL
  // ═══════════════════════════════════════════════════════════

  function openImageLightbox(src, alt = 'Expanded Script Icon') {
    if (!dom.imageModal || !dom.expandedImage || !src) return;
    dom.expandedImage.src = src;
    dom.expandedImage.alt = alt;
    dom.imageModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeImageLightbox() {
    if (!dom.imageModal) return;
    dom.imageModal.classList.add('hidden');
    if (dom.expandedImage) dom.expandedImage.src = '';
    if (!dom.modalOverlay || !dom.modalOverlay.classList.contains('open')) {
      document.body.style.overflow = '';
    }
  }

  function setupImageLightbox() {
    if (!dom.imageModal) return;

    // Close on close button click
    if (dom.closeImageModal) {
      dom.closeImageModal.addEventListener('click', (e) => {
        e.stopPropagation();
        closeImageLightbox();
      });
    }

    // Close on clicking backdrop outside expanded image
    dom.imageModal.addEventListener('click', (e) => {
      if (e.target === dom.imageModal) {
        closeImageLightbox();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dom.imageModal && !dom.imageModal.classList.contains('hidden')) {
        closeImageLightbox();
      }
    });

    // Event delegation on scriptsGrid container
    if (dom.scriptsGrid) {
      dom.scriptsGrid.addEventListener('click', (e) => {
        const avatar = e.target.closest('.hub-avatar');
        if (avatar) {
          e.stopPropagation();
          const img = avatar.querySelector('.hub-avatar-img') || avatar.querySelector('img');
          const src = img ? (img.currentSrc || img.src) : '';
          if (src) {
            openImageLightbox(src, img.alt || 'Expanded Script Icon');
          }
        }
      });
    }

    // Also support clicking avatar in modalBody if details modal is open
    if (dom.modalBody) {
      dom.modalBody.addEventListener('click', (e) => {
        const avatar = e.target.closest('.hub-avatar');
        if (avatar) {
          e.stopPropagation();
          const img = avatar.querySelector('.hub-avatar-img') || avatar.querySelector('img');
          const src = img ? (img.currentSrc || img.src) : '';
          if (src) {
            openImageLightbox(src, img.alt || 'Expanded Script Icon');
          }
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  WI-FI / MOBILE CONNECTION HELPER
  // ═══════════════════════════════════════════════════════════

  function setupWifiModal() {
    let networkUrl = (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
      ? window.location.origin
      : 'http://localhost:3000';

    if (dom.wifiNetworkUrl && !dom.wifiNetworkUrl.value) {
      dom.wifiNetworkUrl.value = networkUrl;
    }

    // 1. Try to fetch dynamic network info from local dev server or data file using dynamic origin
    const devNetworkUrl = getBackendApiUrl('/__dev/network');
    const devDataUrl = getBackendApiUrl('/data/network_info.json');

    fetch(devNetworkUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const liveUrl = data.tunnel_url || data.https_url || data.network_url;
          if (liveUrl) {
            networkUrl = liveUrl;
            if (dom.wifiNetworkUrl) dom.wifiNetworkUrl.value = networkUrl;
          }
        }
      })
      .catch(() => {
        // Fallback: check /data/network_info.json
        fetch(devDataUrl)
          .then((res) => res.json())
          .then((data) => {
            if (data) {
              const liveUrl = data.tunnel_url || data.https_url || data.network_url;
              if (liveUrl) {
                networkUrl = liveUrl;
                if (dom.wifiNetworkUrl) dom.wifiNetworkUrl.value = networkUrl;
              }
            }
          })
          .catch(() => {
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
              networkUrl = window.location.origin;
              if (dom.wifiNetworkUrl) dom.wifiNetworkUrl.value = networkUrl;
            }
          });
      });

    // 2. Open modal on button click
    if (dom.wifiDevBtn && dom.wifiModal) {
      dom.wifiDevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.wifiModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      });
    }

    // 3. Close modal handlers
    function closeWifi() {
      if (dom.wifiModal) {
        dom.wifiModal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    }

    if (dom.closeWifiModal) {
      dom.closeWifiModal.addEventListener('click', (e) => {
        e.stopPropagation();
        closeWifi();
      });
    }

    if (dom.wifiModal) {
      dom.wifiModal.addEventListener('click', (e) => {
        if (e.target === dom.wifiModal) {
          closeWifi();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dom.wifiModal && !dom.wifiModal.classList.contains('hidden')) {
        closeWifi();
      }
    });

    // 4. Copy URL button
    if (dom.copyWifiUrlBtn && dom.wifiNetworkUrl) {
      dom.copyWifiUrlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const urlToCopy = dom.wifiNetworkUrl.value;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(urlToCopy).then(() => {
            if (dom.copyWifiUrlText) dom.copyWifiUrlText.textContent = 'Copied!';
            toast(state.currentLang === 'km' ? 'បានចម្លង Link Wi-Fi!' : 'Wi-Fi URL copied to clipboard!', 'success');
            setTimeout(() => {
              if (dom.copyWifiUrlText) dom.copyWifiUrlText.textContent = 'Copy';
            }, 2000);
          }).catch(() => {
            fallbackCopy(urlToCopy);
          });
        } else {
          fallbackCopy(urlToCopy);
        }
      });
    }

    function fallbackCopy(text) {
      dom.wifiNetworkUrl.select();
      document.execCommand('copy');
      if (dom.copyWifiUrlText) dom.copyWifiUrlText.textContent = 'Copied!';
      toast(state.currentLang === 'km' ? 'បានចម្លង Link Wi-Fi!' : 'Wi-Fi URL copied to clipboard!', 'success');
      setTimeout(() => {
        if (dom.copyWifiUrlText) dom.copyWifiUrlText.textContent = 'Copy';
      }, 2000);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  NAVBAR
  // ═══════════════════════════════════════════════════════════

  function setupNavbar() {
    window.addEventListener('scroll', () => {
      dom.navbar.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });

    dom.menuToggle.addEventListener('click', () => {
      dom.menuToggle.classList.toggle('open');
      dom.navLinks.classList.toggle('open');
    });

    dom.navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        dom.menuToggle.classList.remove('open');
        dom.navLinks.classList.remove('open');
      });
    });

    const sections = ['scripts-section', 'platform-section', 'tutorials-section'];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          dom.navLinks.querySelectorAll('a').forEach((a) => {
            a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { threshold: 0.3 });
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  SEARCH
  // ═══════════════════════════════════════════════════════════

  function setupSearch() {
    function doSearch() {
      const q = dom.searchInput.value.trim();
      state.currentPage = 1;
      state.hasMore = true;

      // Sync active category pill if typed query matches a category
      const matchedGame = GAME_CATEGORIES.find(
        (g) => g.toLowerCase() === q.toLowerCase()
      );
      state.selectedCategory = matchedGame || (q === '' ? 'All' : '');
      if (dom.gameFilters) {
        dom.gameFilters.querySelectorAll('.game-filter-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.game === state.selectedCategory);
        });
      }

      fetchScripts(q, 1, false);
    }
    dom.searchBtn.addEventListener('click', doSearch);
    dom.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        doSearch();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  KEY BYPASS TOOL
  // ═══════════════════════════════════════════════════════════

  function playClickSound() {
    if (typeof window.playCopySound === 'function') {
      try {
        window.playCopySound();
      } catch (err) {
        console.warn('Audio play error:', err);
      }
    }
  }

  function setupBypassTool() {
    if (!dom.bypassSubmitBtn || !dom.bypassInput) return;

    // Paste button: Reads clipboard text using navigator.clipboard.readText()
    if (dom.bypassPasteBtn) {
      dom.bypassPasteBtn.addEventListener('click', async () => {
        playClickSound();

        if (navigator.clipboard && navigator.clipboard.readText) {
          try {
            const clipText = await navigator.clipboard.readText();
            if (clipText && clipText.trim()) {
              dom.bypassInput.value = clipText.trim();
              dom.bypassInput.focus();
              toast(t('bypass.pasted'), 'success');
            } else {
              toast(t('bypass.clip_empty'), 'info');
              dom.bypassInput.focus();
            }
          } catch (err) {
            console.warn('Clipboard read failed:', err);
            toast(t('bypass.clip_denied'), 'error');
            dom.bypassInput.focus();
          }
        } else {
          toast(t('bypass.clip_denied'), 'info');
          dom.bypassInput.focus();
        }
      });
    }

    // Progress status steps ticker
    let progressTimer = null;
    function startProgressStatus() {
      const steps = [
        t('bypass.progress_validating'),
        t('bypass.progress_analyzing'),
        t('bypass.progress_extracting')
      ];
      let stepIdx = 0;
      if (dom.bypassLoadingText) {
        dom.bypassLoadingText.textContent = steps[0];
      }
      progressTimer = setInterval(() => {
        stepIdx = (stepIdx + 1) % steps.length;
        if (dom.bypassLoadingText) {
          dom.bypassLoadingText.textContent = steps[stepIdx];
        }
      }, 1000);
    }

    function stopProgressStatus() {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      if (dom.bypassLoadingText) {
        dom.bypassLoadingText.textContent = t('bypass.loading');
      }
    }

    const LOOTLABS_APPROVED_DOMAINS = [
      'lootlabs.gg',
      'loot-link.com',
      'lootlinks.co'
    ];

    function isLootLabsUrl(rawUrl) {
      if (!rawUrl || typeof rawUrl !== 'string') return false;
      try {
        const parsed = new URL(rawUrl.trim());
        const hostname = (parsed.hostname || '').toLowerCase().replace(/\.+$/, '');
        if (!hostname) return false;
        return LOOTLABS_APPROVED_DOMAINS.some(
          (domain) => hostname === domain || hostname.endsWith('.' + domain)
        );
      } catch {
        return false;
      }
    }

    if (typeof window !== 'undefined') {
      window.isLootLabsUrl = isLootLabsUrl;
    }

    // In-page Asynchronous Bypass action
    async function doBypass() {
      playClickSound();

      const rawUrl = dom.bypassInput.value.trim();

      if (!rawUrl) {
        if (dom.bypassBar) {
          dom.bypassBar.classList.remove('shake');
          void dom.bypassBar.offsetWidth; // Trigger reflow for re-animation
          dom.bypassBar.classList.add('shake');
          setTimeout(() => {
            if (dom.bypassBar) dom.bypassBar.classList.remove('shake');
          }, 450);
        }
        dom.bypassInput.focus();
        toast(t('bypass.empty_warn'), 'error');
        return;
      }

      // Validate against unsafe client-side schemes
      const lowerUrl = rawUrl.toLowerCase();
      if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:') || lowerUrl.startsWith('file:') || lowerUrl.startsWith('about:')) {
        toast('Unsafe link scheme rejected.', 'error');
        dom.bypassInput.focus();
        return;
      }

      // Ensure valid URL scheme
      let validUrl = rawUrl;
      if (!/^https?:\/\//i.test(validUrl)) {
        validUrl = 'https://' + validUrl;
      }

      // STATE: Processing
      if (dom.bypassResultBox) dom.bypassResultBox.classList.add('hidden');
      if (dom.bypassLoadingBox) dom.bypassLoadingBox.classList.remove('hidden');
      dom.bypassSubmitBtn.disabled = true;
      if (dom.bypassBtnText) {
        dom.bypassBtnText.textContent = t('bypass.processing');
      }
      startProgressStatus();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      try {
        const response = await fetch('/api/bypass', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: validUrl }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        // Stop loading state
        stopProgressStatus();
        if (dom.bypassLoadingBox) dom.bypassLoadingBox.classList.add('hidden');

        const resultKey = (data.key || data.destination || '').trim();
        if (data.success && resultKey) {
          // STATE: Success
          playClickSound();
          if (dom.bypassResultBox) dom.bypassResultBox.classList.remove('hidden');
          if (dom.bypassResultSuccess) dom.bypassResultSuccess.classList.remove('hidden');
          if (dom.bypassResultError) dom.bypassResultError.classList.add('hidden');
          if (dom.bypassKeyValue) {
            dom.bypassKeyValue.value = resultKey;
          }

          // Show Clickable Destination Link with Green/Purple Glow
          if (dom.bypassKeyLink) {
            if (resultKey.startsWith('http://') || resultKey.startsWith('https://')) {
              dom.bypassKeyLink.href = resultKey;
              dom.bypassKeyLink.classList.remove('hidden');
              if (dom.bypassKeyLinkUrl) {
                dom.bypassKeyLinkUrl.textContent = resultKey;
              }
              if (dom.bypassKeyLinkLabel) {
                dom.bypassKeyLinkLabel.textContent = t('bypass.click_get_key');
              }
            } else {
              dom.bypassKeyLink.classList.add('hidden');
            }
          }

          // Show Open Link button if the key is a valid HTTP destination
          if (dom.bypassOpenLinkBtn) {
            if (resultKey.startsWith('http://') || resultKey.startsWith('https://')) {
              dom.bypassOpenLinkBtn.href = resultKey;
              dom.bypassOpenLinkBtn.classList.remove('hidden');
            } else {
              dom.bypassOpenLinkBtn.classList.add('hidden');
            }
          }

          toast(t('bypass.unlocked_title'), 'success');
        } else if (data.status === 'CAPTCHA_REQUIRED' ||
                   data.error_code === 'CAPTCHA_REQUIRED' ||
                   data.captcha_type === 'cloudflare_turnstile' ||
                   (typeof data.error === 'string' && /turnstile|captcha/i.test(data.error))) {
          // STATE: Verification Required (Turnstile Challenge)
          // Hide inline result box completely to prevent duplicate inline warnings behind the modal
          if (dom.bypassResultBox) dom.bypassResultBox.classList.add('hidden');
          if (dom.bypassResultSuccess) dom.bypassResultSuccess.classList.add('hidden');
          if (dom.bypassResultError) dom.bypassResultError.classList.add('hidden');

          const verificationUrl = data.bypassUrl || `https://bypass.city/bypass?bypass=${encodeURIComponent(validUrl)}`;

          // Open In-Page CAPTCHA Verification Modal without redirecting
          openCaptchaModal(validUrl, verificationUrl);

          const toastMsg = data.error || t('captcha.modal_subtitle');
          toast(toastMsg, 'info');
        } else if (data.error_code === 'EXTERNAL_RESOLVER_HANDOFF' ||
                   (data.status === 'MANUAL_INTERACTION_REQUIRED' && data.provider === 'bypass_city')) {
          // STATE: External Resolver Handoff (Bypass.city)
          if (dom.bypassResultBox) dom.bypassResultBox.classList.remove('hidden');
          if (dom.bypassResultSuccess) dom.bypassResultSuccess.classList.add('hidden');
          if (dom.bypassResultError) {
            dom.bypassResultError.classList.remove('hidden', 'failed', 'success');
            dom.bypassResultError.classList.add('warning');
          }
          if (dom.bypassStatusIcon) {
            dom.bypassStatusIcon.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
          }

          if (dom.bypassStatusBadge) {
            dom.bypassStatusBadge.classList.remove('hidden');
            dom.bypassStatusBadge.textContent = t('bypass.status_handoff');
            dom.bypassStatusBadge.className = 'bypass-status-badge warning';
          }
          const errMsg = data.error || t('bypass.handoff_desc');
          if (dom.bypassErrorMsg) dom.bypassErrorMsg.textContent = errMsg;

          const openUrl = data.bypassUrl || `https://bypass.city/bypass?bypass=${encodeURIComponent(validUrl)}`;
          if (dom.bypassExtBtn) {
            dom.bypassExtBtn.href = openUrl;
            dom.bypassExtBtn.setAttribute('target', '_blank');
            dom.bypassExtBtn.setAttribute('rel', 'noopener noreferrer');
            dom.bypassExtBtn.classList.remove('hidden', 'success');
            const btnSpan = dom.bypassExtBtn.querySelector('span') || dom.bypassExtBtn;
            btnSpan.textContent = t('bypass.open_bypass_city');
          }
          if (dom.bypassRetryBtn) {
            dom.bypassRetryBtn.classList.remove('hidden');
          }

          toast(errMsg, 'info');
        } else if (data.error_code === 'AD_INTERACTION_REQUIRED' ||
                   (data.status === 'MANUAL_INTERACTION_REQUIRED' && data.error_code !== 'CAPTCHA_REQUIRED')) {
          // STATE: Interactive Ad Tasks Required (e.g. LootLabs)
          if (dom.bypassResultBox) dom.bypassResultBox.classList.remove('hidden');
          if (dom.bypassResultSuccess) dom.bypassResultSuccess.classList.add('hidden');

          const isLoot = data.provider === 'lootlabs' ||
                         isLootLabsUrl(validUrl) ||
                         isLootLabsUrl(data.url) ||
                         isLootLabsUrl(data.bypassUrl);

          if (isLoot) {
            // Success state for LootLabs / Fallback
            if (dom.bypassResultError) {
              dom.bypassResultError.classList.remove('hidden', 'failed', 'warning');
              dom.bypassResultError.classList.add('success');
            }

            // Green checkmark SVG icon
            if (dom.bypassStatusIcon) {
              dom.bypassStatusIcon.innerHTML = '<circle cx="12" cy="12" r="10"/><polyline points="16 9 10 15 8 13"/>';
            }

            // Remove "MANUAL INTERACTION REQUIRED" badge
            if (dom.bypassStatusBadge) {
              dom.bypassStatusBadge.classList.add('hidden');
              dom.bypassStatusBadge.textContent = '';
            }

            // Positive text
            const positiveMsg = state.currentLang === 'km'
              ? 'ដំណើរការរួចរាល់! ✓ សូមចុចប៊ូតុងខាងក្រោមដើម្បីទទួលយក Key របស់អ្នក។'
              : t('bypass.lootlabs_desc');
            if (dom.bypassErrorMsg) dom.bypassErrorMsg.textContent = positiveMsg;

            const targetUrl = data.url || data.providerUrl || validUrl || data.bypassUrl;
            const bypassCityTarget = data.bypassCityUrl || `https://bypass.city/bypass?bypass=${encodeURIComponent(targetUrl)}`;
            const openUrl = bypassCityTarget;

            if (dom.bypassExtBtn) {
              dom.bypassExtBtn.href = openUrl;
              dom.bypassExtBtn.setAttribute('target', '_blank');
              dom.bypassExtBtn.setAttribute('rel', 'noopener noreferrer');
              dom.bypassExtBtn.classList.remove('hidden');
              dom.bypassExtBtn.classList.add('success');
              const btnSpan = dom.bypassExtBtn.querySelector('span') || dom.bypassExtBtn;
              btnSpan.textContent = state.currentLang === 'km'
                ? (data.button_text || 'ចុចទីនេះដើម្បីយក Key')
                : t('bypass.open_lootlabs');
            }
            if (dom.bypassRetryBtn) {
              dom.bypassRetryBtn.classList.add('hidden');
            }

            toast(state.currentLang === 'km' ? 'ដំណើរការរួចរាល់!' : 'Process complete!', 'success');
          } else {
            if (dom.bypassResultError) {
              dom.bypassResultError.classList.remove('hidden', 'failed', 'success');
              dom.bypassResultError.classList.add('warning');
            }
            if (dom.bypassStatusIcon) {
              dom.bypassStatusIcon.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
            }
            if (dom.bypassStatusBadge) {
              dom.bypassStatusBadge.classList.remove('hidden');
              dom.bypassStatusBadge.textContent = t('bypass.status_interaction');
              dom.bypassStatusBadge.className = 'bypass-status-badge warning';
            }
            const errMsg = data.error || t('bypass.status_interaction');
            if (dom.bypassErrorMsg) dom.bypassErrorMsg.textContent = errMsg;

            const targetUrl = data.url || data.providerUrl || validUrl || data.bypassUrl;
            const openUrl = data.bypassUrl || targetUrl;

            if (dom.bypassExtBtn) {
              dom.bypassExtBtn.href = openUrl;
              dom.bypassExtBtn.setAttribute('target', '_blank');
              dom.bypassExtBtn.setAttribute('rel', 'noopener noreferrer');
              dom.bypassExtBtn.classList.remove('hidden', 'success');
              const btnSpan = dom.bypassExtBtn.querySelector('span') || dom.bypassExtBtn;
              btnSpan.textContent = t('bypass.open_provider');
            }
            if (dom.bypassRetryBtn) {
              dom.bypassRetryBtn.classList.remove('hidden');
            }

            toast(errMsg, 'info');
          }
        } else if (data.status === 'PROVIDER_UNAVAILABLE' || data.error_code === 'API_SHUTDOWN') {
          // STATE: Provider Free API Offline / Unavailable
          if (dom.bypassResultBox) dom.bypassResultBox.classList.remove('hidden');
          if (dom.bypassResultSuccess) dom.bypassResultSuccess.classList.add('hidden');
          if (dom.bypassResultError) {
            dom.bypassResultError.classList.remove('hidden', 'failed', 'success');
            dom.bypassResultError.classList.add('warning');
          }
          if (dom.bypassStatusIcon) {
            dom.bypassStatusIcon.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
          }

          if (dom.bypassStatusBadge) {
            dom.bypassStatusBadge.classList.remove('hidden');
            dom.bypassStatusBadge.textContent = t('bypass.status_unavailable');
            dom.bypassStatusBadge.className = 'bypass-status-badge unavailable';
          }
          const errMsg = t('bypass.provider_offline');
          if (dom.bypassErrorMsg) dom.bypassErrorMsg.textContent = errMsg;

          const openUrl = data.bypassUrl || data.url || validUrl;
          if (dom.bypassExtBtn) {
            dom.bypassExtBtn.href = openUrl;
            dom.bypassExtBtn.classList.remove('hidden', 'success');
            const btnSpan = dom.bypassExtBtn.querySelector('span') || dom.bypassExtBtn;
            btnSpan.textContent = t('bypass.open_provider');
          }
          if (dom.bypassRetryBtn) {
            dom.bypassRetryBtn.classList.remove('hidden');
          }

          toast(errMsg, 'error');
        } else {
          // STATE: Failed (Generic Error)
          if (dom.bypassResultBox) dom.bypassResultBox.classList.remove('hidden');
          if (dom.bypassResultSuccess) dom.bypassResultSuccess.classList.add('hidden');
          if (dom.bypassResultError) {
            dom.bypassResultError.classList.remove('hidden', 'warning', 'success');
            dom.bypassResultError.classList.add('failed');
          }
          if (dom.bypassStatusIcon) {
            dom.bypassStatusIcon.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
          }

          if (dom.bypassStatusBadge) {
            dom.bypassStatusBadge.classList.remove('hidden');
            dom.bypassStatusBadge.textContent = t('bypass.status_failed');
            dom.bypassStatusBadge.className = 'bypass-status-badge failed';
          }
          const errMsg = data.error || t('bypass.failed');
          if (dom.bypassErrorMsg) dom.bypassErrorMsg.textContent = errMsg;

          if (dom.bypassExtBtn) {
            dom.bypassExtBtn.classList.remove('success');
            if (data.bypassUrl) {
              dom.bypassExtBtn.href = data.bypassUrl;
              dom.bypassExtBtn.classList.remove('hidden');
              const btnSpan = dom.bypassExtBtn.querySelector('span') || dom.bypassExtBtn;
              btnSpan.textContent = t('bypass.open_external');
            } else {
              dom.bypassExtBtn.classList.add('hidden');
            }
          }
          if (dom.bypassRetryBtn) {
            dom.bypassRetryBtn.classList.remove('hidden');
          }

          toast(errMsg, 'error');
        }
      } catch (err) {
        clearTimeout(timeoutId);
        stopProgressStatus();
        console.error('Bypass request failed:', err);

        const isTimeout = err.name === 'AbortError';
        const errMsg = isTimeout ? t('bypass.timeout') : t('bypass.failed');

        if (dom.bypassLoadingBox) dom.bypassLoadingBox.classList.add('hidden');
        if (dom.bypassResultBox) dom.bypassResultBox.classList.remove('hidden');
        if (dom.bypassResultSuccess) dom.bypassResultSuccess.classList.add('hidden');
        if (dom.bypassResultError) {
          dom.bypassResultError.classList.remove('hidden', 'warning', 'success');
          dom.bypassResultError.classList.add('failed');
        }
        if (dom.bypassStatusIcon) {
          dom.bypassStatusIcon.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
        }

        if (dom.bypassStatusBadge) {
          dom.bypassStatusBadge.classList.remove('hidden');
          dom.bypassStatusBadge.textContent = t('bypass.status_failed');
          dom.bypassStatusBadge.className = 'bypass-status-badge failed';
        }
        if (dom.bypassErrorMsg) dom.bypassErrorMsg.textContent = errMsg;

        if (dom.bypassExtBtn) {
          dom.bypassExtBtn.classList.remove('success');
          dom.bypassExtBtn.href = `https://bypass.city/bypass?bypass=${encodeURIComponent(validUrl)}`;
          dom.bypassExtBtn.classList.remove('hidden');
        }
        if (dom.bypassRetryBtn) {
          dom.bypassRetryBtn.classList.remove('hidden');
        }

        toast(errMsg, 'error');
      } finally {
        dom.bypassSubmitBtn.disabled = false;
        if (dom.bypassBtnText) {
          dom.bypassBtnText.textContent = t('bypass.submit');
        }
      }
    }

    // CAPTCHA Verification Modal Functions
    function openCaptchaModal(targetUrl, bypassUrl) {
      const modal = dom.captchaModal || document.querySelector('#captchaModal');
      if (!modal) return;
      playClickSound();
      const targetEl = dom.captchaTargetUrl || document.querySelector('#captchaTargetUrl');
      if (targetEl) {
        targetEl.textContent = targetUrl;
      }
      const extBtn = dom.captchaOpenExtBtn || document.querySelector('#captchaOpenExtBtn');
      if (extBtn) {
        extBtn.href = bypassUrl || `https://bypass.city/bypass?bypass=${encodeURIComponent(targetUrl)}`;
      }
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      const retryBtn = dom.captchaModalRetryBtn || document.querySelector('#captchaModalRetryBtn');
      if (retryBtn) {
        retryBtn.focus();
      }
    }

    function closeCaptchaModal() {
      const modal = dom.captchaModal || document.querySelector('#captchaModal');
      if (!modal) return;
      modal.classList.add('hidden');
      document.body.style.overflow = '';
      if (dom.bypassInput) {
        dom.bypassInput.focus();
      }
    }

    // Copy Key Button Action
    if (dom.bypassCopyKeyBtn) {
      dom.bypassCopyKeyBtn.addEventListener('click', () => {
        playClickSound();
        const key = dom.bypassKeyValue ? dom.bypassKeyValue.value.trim() : '';
        if (!key) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(key).then(() => {
            dom.bypassCopyKeyBtn.classList.add('copied');
            const label = dom.bypassCopyKeyBtn.querySelector('.copy-label');
            if (label) {
              label.textContent = state.currentLang === 'km' ? 'កូពីបានហើយ!' : 'Copied!';
            }
            toast(t('bypass.key_copied'), 'success');
            setTimeout(() => {
              dom.bypassCopyKeyBtn.classList.remove('copied');
              if (label) {
                label.textContent = t('bypass.copy_key');
              }
            }, 2000);
          }).catch((err) => {
            console.warn('Copy key failed:', err);
            toast(t('toast.copy_failed'), 'error');
          });
        }
      });
    }

    // Open Link Button Action
    if (dom.bypassOpenLinkBtn) {
      dom.bypassOpenLinkBtn.addEventListener('click', () => {
        playClickSound();
      });
    }

    // Clickable Destination Link Action
    if (dom.bypassKeyLink) {
      dom.bypassKeyLink.addEventListener('click', () => {
        playClickSound();
      });
    }

    // In-Card Retry Button Action
    if (dom.bypassRetryBtn) {
      dom.bypassRetryBtn.addEventListener('click', () => {
        doBypass();
      });
    }

    // Modal Actions
    if (dom.closeCaptchaModal) {
      dom.closeCaptchaModal.addEventListener('click', closeCaptchaModal);
    }
    if (dom.dismissCaptchaModal) {
      dom.dismissCaptchaModal.addEventListener('click', closeCaptchaModal);
    }
    if (dom.captchaModal) {
      dom.captchaModal.addEventListener('click', (e) => {
        if (e.target === dom.captchaModal) {
          closeCaptchaModal();
        }
      });
    }
    if (dom.captchaModalRetryBtn) {
      dom.captchaModalRetryBtn.addEventListener('click', (e) => {
        if (e && e.preventDefault) e.preventDefault();
        closeCaptchaModal();
        doBypass();
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dom.captchaModal && !dom.captchaModal.classList.contains('hidden')) {
        closeCaptchaModal();
      }
    });

    dom.bypassSubmitBtn.addEventListener('click', doBypass);
    dom.bypassInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doBypass();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  GAME CATEGORY FILTERS
  // ═══════════════════════════════════════════════════════════

  const GAME_CATEGORIES = [
    "All",
    "Steal an Egg",
    "Blox Fruits",
    "Blade Ball",
    "Arsenal",
    "The Strongest Battlegrounds",
  ];

  function setupGameFilters() {
    renderGameFilters();
  }

  function renderGameFilters() {
    if (!dom.gameFilters) return;

    dom.gameFilters.innerHTML = GAME_CATEGORIES.map((game) => {
      const isActive = game === state.selectedCategory ? ' active' : '';
      const displayLabel = game === 'All' && state.currentLang === 'km' ? 'ទាំងអស់ (All)' : game;
      return `<button type="button" class="game-filter-btn${isActive}" data-game="${escapeHtml(game)}">${escapeHtml(displayLabel)}</button>`;
    }).join('');

    const buttons = dom.gameFilters.querySelectorAll('.game-filter-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const game = btn.dataset.game;
        selectGameCategory(game);
      });
    });
  }

  function selectGameCategory(game) {
    state.selectedCategory = game;

    if (dom.gameFilters) {
      dom.gameFilters.querySelectorAll('.game-filter-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.game === game);
      });
    }

    state.currentPage = 1;
    state.hasMore = true;

    if (game === 'All') {
      if (dom.searchInput) dom.searchInput.value = '';
      fetchScripts('', 1, false);
    } else {
      if (dom.searchInput) dom.searchInput.value = game;
      fetchScripts(game, 1, false);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  TERMINAL BUTTONS
  // ═══════════════════════════════════════════════════════════

  function setupTerminalButtons() {
    dom.btnCopy.addEventListener('click', copyToClipboard);
    dom.btnClear.addEventListener('click', clearTerminal);
  }

  // ═══════════════════════════════════════════════════════════
  //  SCROLL-REVEAL
  // ═══════════════════════════════════════════════════════════

  function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    $$('.reveal').forEach((el) => observer.observe(el));
  }

  // ═══════════════════════════════════════════════════════════
  //  TOAST NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════

  function toast(message, type = 'info') {
    const icons = {
      success: '<svg class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 9 10 15 8 13"/></svg>',
      error: '<svg class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${escapeHtml(message)}</span>`;
    dom.toastContainer.appendChild(el);

    setTimeout(() => {
      el.classList.add('exiting');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════

  function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, (c) => map[c]);
  }

  function formatNumber(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(state.currentLang === 'km' ? 'km-KH' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  }

  // ─── Boot ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
