/**
 * Black Rabbit — zero-build marketplace client
 * Fast board · free post · claim jobs · pros directory
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'br_session_v1';
  const DEFAULT_SERVICES = [
    'Lawn Care',
    'Landscaping',
    'Window Washing',
    'Handyman',
    'Pressure Washing',
    'Gutter Cleaning',
  ];

  /** API base: window.BR_API_URL > ?api= > localStorage > same origin > localhost */
  function resolveApi() {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get('api');
    if (fromQuery) {
      localStorage.setItem('br_api', fromQuery.replace(/\/$/, ''));
      return fromQuery.replace(/\/$/, '');
    }
    if (window.BR_API_URL && String(window.BR_API_URL).trim()) {
      return String(window.BR_API_URL).replace(/\/$/, '');
    }
    const saved = localStorage.getItem('br_api');
    if (saved) return saved.replace(/\/$/, '');
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    // Codespace heuristic: frontend 8081 → API 8000
    if (location.hostname.includes('github.dev') && location.hostname.includes('-8081.')) {
      return location.origin.replace('-8081.', '-8000.');
    }
    return location.origin;
  }

  const API = resolveApi();

  let state = {
    view: 'board',
    services: DEFAULT_SERVICES,
    serviceFilter: 'All',
    jobs: [],
    pros: [],
    session: loadSession(),
  };

  function loadSession() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function saveSession(s) {
    state.session = s;
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
    fillMeForm();
  }

  async function api(path, opts = {}) {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const j = await res.json();
        msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail || j);
      } catch {}
      throw new Error(msg || `Request failed (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function $(id) {
    return document.getElementById(id);
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add('hidden'), 2800);
  }

  function go(view) {
    state.view = view;
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.toggle('active', v.dataset.view === view);
    });
    document.querySelectorAll('.dock-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.go === view);
    });
    if (view === 'board') loadBoard();
    if (view === 'pros') loadPros();
    if (view === 'me') loadMe();
    history.replaceState(null, '', `#${view}`);
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function telHref(phone) {
    return `tel:${String(phone).replace(/\D/g, '')}`;
  }

  // ——— Board ———
  async function loadBoard() {
    const list = $('board-list');
    list.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    try {
      state.jobs = await api('/jobs/open/');
      renderFilters();
      renderBoard();
    } catch (e) {
      list.innerHTML = `<div class="empty"><strong>Can't load board</strong>${esc(e.message)}<br/><small>API: ${esc(API)}</small></div>`;
    }
  }

  function renderFilters() {
    const el = $('board-filters');
    const types = ['All', ...state.services];
    el.innerHTML = types
      .map(
        (t) =>
          `<button type="button" class="chip${state.serviceFilter === t ? ' on' : ''}" data-filter="${esc(t)}">${esc(t)}</button>`
      )
      .join('');
    el.querySelectorAll('.chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.serviceFilter = btn.dataset.filter;
        renderFilters();
        renderBoard();
      });
    });
  }

  function renderBoard() {
    const list = $('board-list');
    let jobs = state.jobs || [];
    if (state.serviceFilter !== 'All') {
      jobs = jobs.filter((j) => j.service_type === state.serviceFilter);
    }
    if (!jobs.length) {
      list.innerHTML = `<div class="empty"><strong>Board is quiet</strong>Be first — post a free job.</div>`;
      return;
    }
    list.innerHTML = jobs
      .map((j) => {
        const cut =
          j.lead_price > 0
            ? `<span class="meta">Lead cut ~$${Number(j.lead_price).toFixed(0)} when claimed</span>`
            : `<span class="meta">Free claim</span>`;
        return `
        <article class="job" data-id="${j.id}">
          <div class="job-top">
            <h3>${esc(j.service_type)}</h3>
            <span class="pill">${esc(j.urgency || 'Open')}</span>
          </div>
          <p>${esc(j.description)}</p>
          <p class="meta">${esc(j.address || 'South Sound')}</p>
          ${cut}
          <div class="row-actions">
            <button type="button" class="btn primary small claim-btn" data-id="${j.id}">Claim job</button>
          </div>
        </article>`;
      })
      .join('');
    list.querySelectorAll('.claim-btn').forEach((btn) => {
      btn.addEventListener('click', () => claimJob(Number(btn.dataset.id)));
    });
  }

  async function claimJob(jobId) {
    if (!state.session?.userId) {
      toast('Save your pro profile under You first');
      go('me');
      return;
    }
    if (!state.session.isProvider) {
      toast('Turn on “I’m a pro” under You');
      go('me');
      return;
    }
    if (!confirm('Claim this job? You’ll get the customer’s phone.')) return;
    try {
      const claimed = await api(`/jobs/${jobId}/claim`, {
        method: 'POST',
        body: JSON.stringify({ provider_id: state.session.userId }),
      });
      toast(claimed.customer_phone ? `Call ${claimed.customer_phone}` : 'Claimed!');
      if (claimed.customer_phone) {
        setTimeout(() => {
          location.href = telHref(claimed.customer_phone);
        }, 400);
      }
      loadBoard();
    } catch (e) {
      toast(e.message);
    }
  }

  // ——— Post ———
  function fillServices() {
    const sel = $('f-service');
    sel.innerHTML = state.services
      .map((s) => `<option value="${esc(s)}">${esc(s)}</option>`)
      .join('');
  }

  async function submitPost(e) {
    e.preventDefault();
    const btn = $('f-submit');
    btn.disabled = true;
    const payload = {
      name: $('f-name').value.trim(),
      phone: $('f-phone').value.trim(),
      service_type: $('f-service').value,
      urgency: $('f-urgency').value,
      description: $('f-details').value.trim(),
      address: $('f-address').value.trim() || 'Yelm, WA',
      route: 'open',
    };
    try {
      const job = await api('/jobs/post', { method: 'POST', body: JSON.stringify(payload) });
      // remember poster
      if (!state.session) {
        try {
          const u = await api(`/users/by-phone/${encodeURIComponent(payload.phone)}`);
          saveSession({
            userId: u.id,
            name: u.name,
            phone: u.phone,
            isProvider: !!u.is_provider,
          });
        } catch {
          saveSession({
            userId: job.customer_id,
            name: payload.name,
            phone: payload.phone,
            isProvider: false,
          });
        }
      }
      $('post-form').classList.add('hidden');
      const ok = $('post-success');
      ok.classList.remove('hidden');
      ok.innerHTML = `<strong>You're live on the board</strong><p>Pros can claim and call you. Free to post.</p>
        <button type="button" class="btn primary" id="post-again">Post another</button>
        <button type="button" class="btn ghost" id="post-to-board">See the board</button>`;
      $('post-again').onclick = () => {
        ok.classList.add('hidden');
        $('post-form').classList.remove('hidden');
        $('f-details').value = '';
      };
      $('post-to-board').onclick = () => go('board');
      toast('Posted free');
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
  }

  // ——— Pros ———
  async function loadPros() {
    const list = $('pros-list');
    list.innerHTML = '<div class="skeleton"></div>';
    try {
      state.pros = await api('/provider-listings/');
      if (!state.pros.length) {
        list.innerHTML = `<div class="empty"><strong>No listings yet</strong>Pros can hang a shingle from You (coming soon) or claim board jobs.</div>`;
        return;
      }
      list.innerHTML = state.pros
        .map(
          (p) => `
        <article class="pro">
          <div class="pro-top">
            <h3>${esc(p.provider_name || 'Pro')}</h3>
            <span class="pill">${esc(p.service_type)}</span>
          </div>
          <p><strong>${esc(p.title)}</strong></p>
          <p>${esc(p.description)}</p>
          <p class="meta">${esc(p.service_area || '')}</p>
          ${
            p.provider_phone
              ? `<div class="row-actions"><a class="btn primary small" href="${telHref(p.provider_phone)}">Call ${esc(p.provider_phone)}</a></div>`
              : ''
          }
        </article>`
        )
        .join('');
    } catch (e) {
      list.innerHTML = `<div class="empty"><strong>Can't load pros</strong>${esc(e.message)}</div>`;
    }
  }

  // ——— Me ———
  function fillMeForm() {
    const s = state.session;
    if (s) {
      $('me-name').value = s.name || '';
      $('me-phone').value = s.phone || '';
      $('me-provider').checked = !!s.isProvider;
    }
  }

  async function saveMe() {
    const name = $('me-name').value.trim();
    const phone = $('me-phone').value.trim();
    const isProvider = $('me-provider').checked;
    if (!name || !phone) {
      toast('Name and phone required');
      return;
    }
    try {
      let user;
      try {
        user = await api(`/users/by-phone/${encodeURIComponent(phone)}`);
        user = await api(`/users/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, is_provider: isProvider }),
        });
      } catch {
        user = await api('/users/', {
          method: 'POST',
          body: JSON.stringify({ name, phone, is_provider: isProvider }),
        });
      }
      saveSession({
        userId: user.id,
        name: user.name,
        phone: user.phone,
        isProvider: !!user.is_provider,
      });
      toast(isProvider ? 'Pro mode on' : 'Saved');
      loadMeJobs();
    } catch (e) {
      toast(e.message);
    }
  }

  async function loadMeJobs() {
    const box = $('me-jobs');
    if (!state.session?.userId) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = '<div class="skeleton"></div>';
    try {
      const mine = await api(`/jobs/customer/${state.session.userId}`);
      let claimed = [];
      if (state.session.isProvider) {
        claimed = await api(`/jobs/provider/${state.session.userId}`);
      }
      const all = [...mine];
      claimed.forEach((j) => {
        if (!all.find((x) => x.id === j.id)) all.push(j);
      });
      if (!all.length) {
        box.innerHTML = `<div class="empty"><strong>No activity yet</strong>Post a job or claim one from the board.</div>`;
        return;
      }
      box.innerHTML =
        '<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:20px 0 8px">Your activity</h2>' +
        all
          .slice(0, 12)
          .map(
            (j) => `
          <article class="job">
            <div class="job-top">
              <h3>${esc(j.service_type)}</h3>
              <span class="pill${j.status === 'owner_direct' ? ' gold' : ''}">${esc(j.status)}</span>
            </div>
            <p>${esc(j.description)}</p>
            ${
              j.customer_phone
                ? `<p class="meta"><a href="${telHref(j.customer_phone)}">${esc(j.customer_phone)}</a></p>`
                : ''
            }
          </article>`
          )
          .join('');
    } catch (e) {
      box.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
  }

  function loadMe() {
    fillMeForm();
    loadMeJobs();
  }

  // ——— Boot ———
  async function boot() {
    document.querySelectorAll('.dock-btn').forEach((b) => {
      b.addEventListener('click', () => go(b.dataset.go));
    });
    $('btn-refresh').addEventListener('click', () => {
      if (state.view === 'board') loadBoard();
      else if (state.view === 'pros') loadPros();
      else if (state.view === 'me') loadMe();
      else toast('Refreshed');
    });
    $('post-form').addEventListener('submit', submitPost);
    $('me-save').addEventListener('click', saveMe);
    $('me-clear').addEventListener('click', () => {
      saveSession(null);
      $('me-name').value = '';
      $('me-phone').value = '';
      $('me-provider').checked = false;
      $('me-jobs').innerHTML = '';
      toast('Signed out');
    });

    fillMeForm();
    try {
      const st = await api('/service-types/');
      if (st.types?.length) state.services = st.types;
    } catch {
      /* use defaults */
    }
    fillServices();

    const hash = (location.hash || '#board').replace('#', '');
    go(['board', 'post', 'pros', 'me'].includes(hash) ? hash : 'board');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
