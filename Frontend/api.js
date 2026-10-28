/* Frontend <-> Backend connector. index.html mein main </script> ke BAAD load hota hai. */
(function () {
  /* Backend ka address. Same server se khol rahe ho to khali rehne do. Alag port se khol rahe ho to
     index.html mein api.js se pehle likho:  <script>window.API_BASE='http://127.0.0.1:5000'</script> */
  const API_BASE = (window.API_BASE || '').replace(/\/$/, '');
  const raw = Storage.prototype.setItem;
  const KEYS = ['u', 'dn', 'ch', 'act', 'rs', 'ms', 'mh', 'bm', 'st'];
  const tok = () => localStorage.getItem('tok');

  async function api(p, o) {
    o = o || {};
    const r = await fetch(API_BASE + '/api' + p, {
      method: o.method || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, tok() ? { Authorization: 'Bearer ' + tok() } : {}),
      body: o.body ? JSON.stringify(o.body) : undefined
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  }

  /* Jab bhi app kuch save kare (progress, resume, profile...), wo server par bhi chala jaye */
  let pend = {}, tm;
  Storage.prototype.setItem = function (k, v) {
    raw.call(this, k, v);
    if (this === localStorage && KEYS.includes(k) && tok()) {
      try { pend[k] = JSON.parse(v); } catch (e) { return; }
      clearTimeout(tm);
      tm = setTimeout(() => { const b = pend; pend = {}; api('/state', { method: 'PUT', body: b }).catch(() => {}); }, 800);
    }
  };

  async function enter(d, isNew, name) {
    KEYS.forEach(k => localStorage.removeItem(k));
    raw.call(localStorage, 'tok', d.token);
    const s = d.state || {};
    if (!s.u) {
      const nm = name || d.user.name || (d.user.email ? d.user.email.split('@')[0] : 'Student');
      Object.assign(s, {
        u: { name: nm.split(' ')[0], full: nm, age: '', gender: 'Female', city: '', edu: 'Student', goal: 'Software Developer', skills: [], email: d.user.email || '', notif: true },
        dn: [], ch: [], act: [], mh: [], ms: { Communication: 0, 'Technical Knowledge': 0, Confidence: 0, 'Body Language': 0, overall: 0 }
      });
      await api('/state', { method: 'PUT', body: s }).catch(() => {});
    }
    KEYS.forEach(k => { if (s[k] !== undefined) raw.call(localStorage, k, JSON.stringify(s[k])); });
    location.hash = isNew ? '#onboarding' : '#dashboard';
    location.reload();
  }

  /* Login / Sign up */
  doLogin = async function () {
    const em = $('.box input[type=email]').value.trim(), pw = $('.box input[type=password]').value;
    const nm = $('.box input[type=text]'), name = nm ? nm.value.trim() : '';
    if (!/^\S+@\S+\.\S+$/.test(em)) return toast('Please enter a valid email address');
    if (pw.length < 6) return toast('Password must be at least 6 characters');
    try {
      const d = await api(mode === 'login' ? '/auth/login' : '/auth/signup', { method: 'POST', body: { email: em, password: pw, name } });
      toast(mode === 'login' ? 'Logged in successfully' : 'Account created!');
      enter(d, d.isNew, name);
    } catch (e) { toast(e.message); }
  };

  /* OTP, forgot password, logout */
  const _act = doAct;
  doAct = async function (a, el) {
    try {
      if (a === 'osend') {
        const p = $('#ph').value.trim();
        if (!/^\d{10}$/.test(p)) return toast('Enter a valid 10-digit number');
        const d = await api('/auth/otp/send', { method: 'POST', body: { phone: p } });
        window._ph = p;
        modal('<h3>Enter OTP</h3><p class="mu">' + (d.devOtp ? 'Demo OTP: <b>' + d.devOtp + '</b>' : 'OTP sent to your phone') + '</p><input id="otp" maxlength="4" placeholder="4-digit OTP"><button class="btn" data-act="overify">Verify</button>');
        return;
      }
      if (a === 'overify') {
        const d = await api('/auth/otp/verify', { method: 'POST', body: { phone: window._ph, otp: $('#otp').value.trim() } });
        closeM(); return enter(d, d.isNew);
      }
      if (a === 'forgot') {
        const em = $('.box input[type=email]').value.trim();
        if (!/^\S+@\S+\.\S+$/.test(em)) return toast('Enter your email first');
        await api('/auth/forgot', { method: 'POST', body: { email: em } });
        return toast('If this email exists, a reset link has been sent');
      }
      if (a === 'logout') {
        KEYS.concat('tok').forEach(k => localStorage.removeItem(k));
        location.hash = '#login'; return location.reload();
      }
    } catch (e) { return toast(e.message); }
    return _act(a, el);
  };

  /* AI chat: asli jawab server se (Claude), login na ho to purana demo jawab */
  chatGo = async function () {
    const i = $('#cin'), m = $('#msgs');
    if (!i || !i.value.trim()) return;
    const q = i.value.trim(); i.value = '';
    m.insertAdjacentHTML('beforeend', '<div class="msg u">' + esc(q) + '</div><div class="msg" id="ty">Fugu is typing…</div>');
    let r, demo = false;
    try {
      r = (await api('/chat', { method: 'POST', body: {
        message: q, lang: L,
        profile: { name: U.name, edu: U.edu, goal: U.goal, skills: U.skills },
        history: CH.slice(-6).map(c => ({ role: c.r === 'u' ? 'user' : 'assistant', content: c.t }))
      } })).reply;
    } catch (e) {
      demo = true;
      if (e instanceof TypeError) r = '⚠️ Server se connect nahi ho paya. Terminal me python server.py chal raha hai?';
      else if (/log in/i.test(e.message)) { localStorage.removeItem('tok'); r = '⚠️ Chat ke liye pehle Login ya Sign up karo.'; }
      else r = '⚠️ ' + e.message;
    }
    const ty = $('#ty'); if (ty) { ty.removeAttribute('id'); ty.style.whiteSpace = 'pre-wrap'; ty.textContent = r; }
    if (!demo) { CH.push({ r: 'u', t: q }, { r: 'b', t: r }); CH = CH.slice(-30); SV('ch', CH); }
  };
  /* Status badge: neeche dahine kone me dikhta hai ki server, login aur AI chal rahe hain ya nahi */
  (function () {
    const b = document.createElement('div');
    b.id = 'sbadge';
    b.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:70;background:#000c;color:#fff;border:1px solid #7C4DFF;border-radius:8px;padding:7px 11px;font:12px Inter,sans-serif;max-width:75vw';
    b.textContent = 'Checking…';
    document.body.appendChild(b);
    async function check() {
      let h;
      try { h = await api('/health'); }
      catch (e) { b.textContent = '❌ Server se connect nahi ho paya. Terminal me python server.py chalao'; return; }
      let li = !!tok();
      if (li) { try { await api('/me'); } catch (e) { localStorage.removeItem('tok'); li = false; } }
      b.textContent = '✅ Server OK  ·  ' + (li ? '✅ Login OK' : '⚠️ Login nahi hua (chat chalega, data save nahi hoga)') + '  ·  ' + (h.ollama ? '✅ AI (Ollama) chalu' : '❌ Ollama band');
    }
    check(); setInterval(check, 15000);
  })();
})();