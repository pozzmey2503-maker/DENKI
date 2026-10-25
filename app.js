/* ============================================
   DenKi Platform — Application Logic
   ScriptBlox API Integration & UI Controllers
   ============================================ */

;(function () {
  'use strict';

  // ─── Configuration ───────────────────────────────────────
  const API_BASE = 'https://scriptblox.com/api/script';
  const CORS_PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];
  const PER_PAGE = 12;

  /** Try each CORS proxy in order until one succeeds */
  async function fetchWithProxy(url) {
    let lastErr;
    for (const proxy of CORS_PROXIES) {
      try {
        const res = await fetch(proxy(url));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        lastErr = err;
        continue;
      }
    }
    throw lastErr || new Error('All proxies failed');
  }

  // ─── State ───────────────────────────────────────────────
  const state = {
    scripts: [],
    totalPages: 1,
    currentPage: 1,
    searchQuery: '',
    currentScript: null,   // raw script text currently in terminal
    detectedPlatform: 'android',
  };

  // ─── DOM References ──────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    navbar:        $('#navbar'),
    navLinks:      $('#navLinks'),
    menuToggle:    $('#menuToggle'),
    searchInput:   $('#searchInput'),
    searchBtn:     $('#searchBtn'),
    scriptsGrid:   $('#scriptsGrid'),
    pagination:    $('#pagination'),
    terminalBody:  $('#terminalBody'),
    terminalTitle: $('#terminalTitle'),
    btnCopy:       $('#btnCopy'),
    btnClear:      $('#btnClear'),
    switchTrack:   $('#switchTrack'),
    switchSlider:  $('#switchSlider'),
    switchAndroid: $('#switchAndroid'),
    switchIos:     $('#switchIos'),
    platformCards: $('#platformCards'),
    detectedBadge: $('#detectedBadge'),
    detectedText:  $('#detectedText'),
    statScripts:   $('#statScripts'),
    toastContainer:$('#toastContainer'),
    modalOverlay:  $('#modalOverlay'),
    modalTitle:    $('#modalTitle'),
    modalBody:     $('#modalBody'),
    modalClose:    $('#modalClose'),
    modalCopyBtn:  $('#modalCopyBtn'),
    modalLoadBtn:  $('#modalLoadBtn'),
  };

  // ─── Platform Data ──────────────────────────────────────
  const platformData = {
    android: [
      {
        icon: '🤖',
        iconClass: 'android',
        title: 'Delta Executor',
        desc: 'The #1 Android Roblox executor. Fast, stable, and supports most scripts with a clean UI.',
        link: 'https://deltaexecutor.com/',
        btnClass: 'android-btn',
        btnText: '⬇ Download for Android',
      },
      {
        icon: '⚡',
        iconClass: 'android',
        title: 'Fluxus Mobile',
        desc: 'Lightweight executor for Android with key system. Reliable performance on lower-end devices.',
        link: 'https://fluxteam.net/',
        btnClass: 'android-btn',
        btnText: '⬇ Download for Android',
      },
      {
        icon: '🚀',
        iconClass: 'android',
        title: 'Arceus X Neo',
        desc: 'Feature-rich mobile executor with floating overlay and game hub built-in.',
        link: 'https://arceusx.com/',
        btnClass: 'android-btn',
        btnText: '⬇ Download for Android',
      },
    ],
    ios: [
      {
        icon: '',
        iconClass: 'ios',
        title: 'Script-Ware iOS',
        desc: 'Premium iOS executor. Requires jailbroken device. Excellent script compatibility.',
        link: 'https://script-ware.com/',
        btnClass: 'ios-btn',
        btnText: '⬇ Download for iOS',
      },
      {
        icon: '🎯',
        iconClass: 'ios',
        title: 'Codex Mobile',
        desc: 'The mobile counterpart of Codex. Supports iOS sideloading for non-jailbroken devices.',
        link: 'https://codex.lol/',
        btnClass: 'ios-btn',
        btnText: '⬇ Download for iOS',
      },
      {
        icon: '🔓',
        iconClass: 'ios',
        title: 'Hydrogen iOS',
        desc: 'Open-source iOS executor with community support and regular updates.',
        link: 'https://hydrogenexec.com/',
        btnClass: 'ios-btn',
        btnText: '⬇ Download for iOS',
      },
    ],
  };

  // ═══════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════
  function init() {
    detectPlatform();
    setupNavbar();
    setupSearch();
    setupTerminalButtons();
    setupPlatformSwitcher();
    setupModal();
    setupScrollReveal();
    fetchScripts();
  }

  // ═══════════════════════════════════════════════════════════
  //  API — sp-roblox integration via ScriptBlox
  // ═══════════════════════════════════════════════════════════

  /**
   * Fetch scripts from ScriptBlox API.
   * Uses multi-proxy fallback for reliable cross-origin access.
   */
  async function fetchScripts(query = '', page = 1) {
    state.searchQuery = query;
    state.currentPage = page;

    showGridLoading();

    let url;
    if (query.trim()) {
      url = `${API_BASE}/search?q=${encodeURIComponent(query)}&page=${page}&max=${PER_PAGE}`;
    } else {
      url = `${API_BASE}/fetch?page=${page}&max=${PER_PAGE}`;
    }

    try {
      const data = await fetchWithProxy(url);

      if (data.result) {
        state.scripts = data.result.scripts || [];
        state.totalPages = data.result.totalPages || 1;

        // Update stat counter on first load
        if (!query && page === 1 && data.result.totalPages) {
          dom.statScripts.textContent = formatNumber(data.result.totalPages * PER_PAGE);
        }

        renderScriptCards();
        renderPagination();
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.error('API Error:', err);
      showGridError();
      toast('Failed to fetch scripts. Check your connection.', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER — Script Cards
  // ═══════════════════════════════════════════════════════════

  function renderScriptCards() {
    if (!state.scripts.length) {
      dom.scriptsGrid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          <h4>No Scripts Found</h4>
          <p>Try a different search term or browse the latest scripts</p>
        </div>`;
      return;
    }

    dom.scriptsGrid.innerHTML = state.scripts.map((s, i) => {
      const gameName = s.game?.name || 'Universal';
      const gameImg = s.game?.imageUrl
        ? `<img src="${escapeHtml(s.game.imageUrl)}" alt="" onerror="this.style.display='none'" />`
        : '';
      const badges = buildBadges(s);

      return `
        <div class="script-card" data-index="${i}" style="animation-delay:${i * 40}ms">
          <div class="script-card-header">
            <div class="script-card-title">${escapeHtml(s.title || 'Untitled Script')}</div>
            <div class="script-card-game">${gameImg}${escapeHtml(gameName)}</div>
          </div>
          <div class="script-card-meta">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ${formatNumber(s.views || 0)}
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-6 0v4"/><path d="M18.8 21H5.2A2.2 2.2 0 013 18.8V9.2A2.2 2.2 0 015.2 7h13.6A2.2 2.2 0 0121 9.2v9.6a2.2 2.2 0 01-2.2 2.2z"/><line x1="12" y1="17" x2="12" y2="13"/></svg>
              ${s.key ? 'Key' : 'No Key'}
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              ${formatNumber(s.likes || 0)}
            </span>
          </div>
          ${badges ? `<div class="script-card-badges">${badges}</div>` : ''}
        </div>`;
    }).join('');

    // Bind click events
    $$('.script-card').forEach((card) => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index, 10);
        openScriptModal(state.scripts[idx]);
      });
    });
  }

  function buildBadges(s) {
    const badges = [];
    if (s.verified)  badges.push('<span class="badge badge-verified">✓ Verified</span>');
    if (!s.key)      badges.push('<span class="badge badge-free">Free</span>');
    if (s.key)       badges.push('<span class="badge badge-key">🔑 Key</span>');
    if (s.isUniversal || (s.game && s.game.name === 'Universal'))
                     badges.push('<span class="badge badge-universal">Universal</span>');
    if (s.isPatched)  badges.push('<span class="badge badge-patched">Patched</span>');
    return badges.join('');
  }

  function showGridLoading() {
    dom.scriptsGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="spinner" style="width:32px;height:32px;margin:0 auto 16px;border:3px solid rgba(99,102,241,.15);border-top-color:var(--primary-500)"></div>
        <h4>Loading Scripts...</h4>
        <p>Fetching from ScriptBlox API</p>
      </div>`;
    dom.pagination.innerHTML = '';
  }

  function showGridError() {
    dom.scriptsGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h4>Connection Error</h4>
        <p>Unable to reach the API. Check your connection and try again.</p>
        <button class="btn btn-outline" style="margin-top:16px" onclick="location.reload()">Retry</button>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER — Pagination
  // ═══════════════════════════════════════════════════════════

  function renderPagination() {
    if (state.totalPages <= 1) { dom.pagination.innerHTML = ''; return; }

    const { currentPage, totalPages } = state;
    let html = '';

    // Prev
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹ Prev</button>`;

    // Page numbers
    const pages = getPageNumbers(currentPage, totalPages);
    pages.forEach((p) => {
      if (p === '...') {
        html += `<span style="padding:0 6px;color:var(--gray-400)">…</span>`;
      } else {
        html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      }
    });

    // Next
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next ›</button>`;

    dom.pagination.innerHTML = html;
    dom.pagination.querySelectorAll('.page-btn[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page, 10);
        if (page >= 1 && page <= totalPages) {
          fetchScripts(state.searchQuery, page);
          $('#scripts-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function getPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    if (current <= 4)       { pages.push(1,2,3,4,5,'...',total); }
    else if (current >= total - 3) { pages.push(1,'...',total-4,total-3,total-2,total-1,total); }
    else                    { pages.push(1,'...',current-1,current,current+1,'...',total); }
    return pages;
  }

  // ═══════════════════════════════════════════════════════════
  //  SCRIPT TERMINAL
  // ═══════════════════════════════════════════════════════════

  function loadScriptInTerminal(script) {
    const raw = script.script || '-- No script content available';
    state.currentScript = raw;
    dom.terminalTitle.textContent = `DenKi — ${script.title || 'Script'}`;

    const lines = raw.split('\n');
    dom.terminalBody.innerHTML = lines.map((line, i) => {
      return `<div class="terminal-line"><span class="line-num">${i + 1}</span><span>${highlightLua(escapeHtml(line))}</span></div>`;
    }).join('');

    // Scroll to terminal
    $('#terminal-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Script loaded in terminal!', 'success');
  }

  function highlightLua(line) {
    // Simple Lua syntax highlighting
    line = line.replace(/(--.*)/g, '<span class="comment">$1</span>');
    line = line.replace(/\b(local|function|end|if|then|else|elseif|for|while|do|return|repeat|until|in|not|and|or|true|false|nil|break|goto)\b/g, '<span class="keyword">$1</span>');
    line = line.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="string">$1</span>');
    line = line.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
    line = line.replace(/\b(print|require|loadstring|game|workspace|wait|spawn|pcall|xpcall|coroutine|string|table|math|Instance|Vector3|CFrame|Color3|UDim2|Enum)\b/g, '<span class="func">$1</span>');
    return line;
  }

  function clearTerminal() {
    state.currentScript = null;
    dom.terminalTitle.textContent = 'DenKi Terminal';
    dom.terminalBody.innerHTML = `
      <div class="terminal-line"><span class="line-num">1</span><span class="comment">-- Terminal cleared ⚡</span></div>
      <div class="terminal-line"><span class="line-num">2</span><span class="comment">-- Select a script from the library to begin.</span></div>`;
    toast('Terminal cleared', 'info');
  }

  async function copyToClipboard() {
    if (!state.currentScript) {
      toast('No script loaded. Select one first!', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(state.currentScript);
      dom.btnCopy.classList.add('copied');
      dom.btnCopy.querySelector('.btn-label').textContent = 'Copied!';
      toast('Script copied to clipboard!', 'success');
      setTimeout(() => {
        dom.btnCopy.classList.remove('copied');
        dom.btnCopy.querySelector('.btn-label').textContent = 'Copy';
      }, 2000);
    } catch (err) {
      // Fallback
      fallbackCopy(state.currentScript);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      toast('Script copied to clipboard!', 'success');
      dom.btnCopy.classList.add('copied');
      dom.btnCopy.querySelector('.btn-label').textContent = 'Copied!';
      setTimeout(() => {
        dom.btnCopy.classList.remove('copied');
        dom.btnCopy.querySelector('.btn-label').textContent = 'Copy';
      }, 2000);
    } catch (e) {
      toast('Copy failed. Please copy manually.', 'error');
    }
    document.body.removeChild(textarea);
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
      // Default to android for desktop (most common use case)
      state.detectedPlatform = 'android';
    }
  }

  function setupPlatformSwitcher() {
    // Set initial platform
    switchPlatform(state.detectedPlatform, false);

    // Detected badge text
    const names = { android: 'Android', ios: 'iOS' };
    dom.detectedText.textContent = `Detected: ${names[state.detectedPlatform]} — showing relevant downloads`;

    // Button clicks
    dom.switchAndroid.addEventListener('click', () => switchPlatform('android'));
    dom.switchIos.addEventListener('click', () => switchPlatform('ios'));
  }

  function switchPlatform(platform, animate = true) {
    state.detectedPlatform = platform;

    // Update button states
    $$('.switch-btn').forEach((b) => b.classList.remove('active'));
    const activeBtn = platform === 'android' ? dom.switchAndroid : dom.switchIos;
    activeBtn.classList.add('active');

    // Move slider
    requestAnimationFrame(() => {
      const trackRect = dom.switchTrack.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      dom.switchSlider.style.left = (btnRect.left - trackRect.left) + 'px';
      dom.switchSlider.style.width = btnRect.width + 'px';
    });

    // Render platform cards
    renderPlatformCards(platform, animate);
  }

  function renderPlatformCards(platform, animate) {
    const cards = platformData[platform] || [];
    dom.platformCards.innerHTML = cards.map((c, i) => `
      <div class="platform-card" style="${animate ? `animation-delay:${i * 80}ms` : ''}">
        <div class="card-icon ${c.iconClass}">${c.icon}</div>
        <h4>${escapeHtml(c.title)}</h4>
        <p>${escapeHtml(c.desc)}</p>
        <a href="${c.link}" target="_blank" rel="noopener" class="download-btn ${c.btnClass}">${c.btnText}</a>
      </div>
    `).join('');
  }

  // ═══════════════════════════════════════════════════════════
  //  MODAL
  // ═══════════════════════════════════════════════════════════

  function openScriptModal(script) {
    if (!script) return;
    state.currentScript = script.script || '-- No content';

    dom.modalTitle.textContent = script.title || 'Script Details';
    const gameName = script.game?.name || 'Universal';
    const preview = (script.script || '').substring(0, 300);

    dom.modalBody.innerHTML = `
      <div style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <span class="script-card-game">${escapeHtml(gameName)}</span>
          ${buildBadges(script)}
        </div>
        <div style="display:flex;gap:20px;font-size:.82rem;color:var(--gray-500);margin-bottom:16px">
          <span>👁️ ${formatNumber(script.views || 0)} views</span>
          <span>❤️ ${formatNumber(script.likes || 0)} likes</span>
          <span>📅 ${formatDate(script.createdAt)}</span>
        </div>
      </div>
      <div style="background:var(--bg-terminal);border-radius:var(--radius-sm);padding:16px;font-family:var(--font-mono);font-size:.78rem;line-height:1.6;color:#CBD5E1;max-height:200px;overflow-y:auto;white-space:pre-wrap;word-break:break-all">${escapeHtml(preview)}${script.script && script.script.length > 300 ? '\n...' : ''}</div>
    `;

    dom.modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Rebind modal buttons for this script
    dom.modalCopyBtn.onclick = () => {
      copyScriptText(script.script || '');
    };
    dom.modalLoadBtn.onclick = () => {
      loadScriptInTerminal(script);
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

  async function copyScriptText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Script copied to clipboard!', 'success');
    } catch {
      fallbackCopy(text);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  NAVBAR
  // ═══════════════════════════════════════════════════════════

  function setupNavbar() {
    // Scroll shadow
    window.addEventListener('scroll', () => {
      dom.navbar.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });

    // Mobile menu
    dom.menuToggle.addEventListener('click', () => {
      dom.menuToggle.classList.toggle('open');
      dom.navLinks.classList.toggle('open');
    });

    // Close menu on link click
    dom.navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        dom.menuToggle.classList.remove('open');
        dom.navLinks.classList.remove('open');
      });
    });

    // Active link on scroll
    const sections = ['hero', 'scripts-section', 'platform-section', 'terminal-section'];
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
    dom.searchBtn.addEventListener('click', () => {
      fetchScripts(dom.searchInput.value.trim(), 1);
    });
    dom.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        fetchScripts(dom.searchInput.value.trim(), 1);
      }
    });
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
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span>${escapeHtml(message)}`;
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
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
