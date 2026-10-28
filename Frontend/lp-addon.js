/* ===== AI Bharat Mentor: Skills + Resources + Roadmap + Resume + Mock + Progress (sab ek dusre se jude) ===== */
(function () {
  if (window.__lpAddon) return;
  window.__lpAddon = true;
  const API = (window.API_BASE || '').replace(/\/$/, '');
  const tok = () => localStorage.getItem('tok');
  const rawSet = Storage.prototype.setItem;
  const $q = s => document.querySelector(s);
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const uid = () => Math.random().toString(36).slice(2, 9);

  async function api(p, o) {
    o = o || {};
    const r = await fetch(API + '/api' + p, {
      method: o.method || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, tok() ? { Authorization: 'Bearer ' + tok() } : {}),
      body: o.body ? JSON.stringify(o.body) : undefined
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  }

  /* ---------- 1) Login + data sync (agar pehle se laga ho to ye hissa chhod diya jata hai) ---------- */
  if (!/\/auth\//.test(String(doLogin))) {
    const KEYS = ['u', 'dn', 'ch', 'act', 'rs', 'ms', 'mh', 'bm', 'st'];
    let pend = {}, tm;
    Storage.prototype.setItem = function (k, v) {
      rawSet.call(this, k, v);
      if (this === localStorage && KEYS.includes(k) && tok()) {
        try { pend[k] = JSON.parse(v); } catch (e) { return; }
        clearTimeout(tm);
        tm = setTimeout(() => { const b = pend; pend = {}; api('/state', { method: 'PUT', body: b }).catch(() => {}); }, 800);
      }
    };
    async function enter(d, isNew, name) {
      KEYS.forEach(k => localStorage.removeItem(k));
      rawSet.call(localStorage, 'tok', d.token);
      const s = d.state || {};
      if (!s.u) {
        const nm = name || d.user.name || (d.user.email ? d.user.email.split('@')[0] : 'Student');
        Object.assign(s, {
          u: { name: nm.split(' ')[0], full: nm, age: '', gender: 'Female', city: '', edu: 'Student', goal: 'Software Developer', skills: [], email: d.user.email || '', notif: true },
          dn: [], ch: [], act: [], mh: [], ms: { Communication: 0, 'Technical Knowledge': 0, Confidence: 0, 'Body Language': 0, overall: 0 }
        });
        await api('/state', { method: 'PUT', body: s }).catch(() => {});
      }
      KEYS.forEach(k => { if (s[k] !== undefined) rawSet.call(localStorage, k, JSON.stringify(s[k])); });
      location.hash = isNew ? '#onboarding' : '#dashboard';
      location.reload();
    }
    doLogin = async function () {
      const em = $q('.box input[type=email]').value.trim(), pw = $q('.box input[type=password]').value;
      const nm = $q('.box input[type=text]'), name = nm ? nm.value.trim() : '';
      if (!/^\S+@\S+\.\S+$/.test(em)) return toast('Please enter a valid email address');
      if (pw.length < 6) return toast('Password must be at least 6 characters');
      try {
        const d = await api(mode === 'login' ? '/auth/login' : '/auth/signup', { method: 'POST', body: { email: em, password: pw, name } });
        toast(mode === 'login' ? 'Logged in successfully' : 'Account created!');
        enter(d, d.isNew, name);
      } catch (e) { toast(e.message); }
    };
    const _act = doAct;
    doAct = async function (a, el) {
      try {
        if (a === 'osend') {
          const p = $q('#ph').value.trim();
          if (!/^\d{10}$/.test(p)) return toast('Enter a valid 10-digit number');
          const d = await api('/auth/otp/send', { method: 'POST', body: { phone: p } });
          window._ph = p;
          modal('<h3>Enter OTP</h3><p class="mu">' + (d.devOtp ? 'Demo OTP: <b>' + d.devOtp + '</b>' : 'OTP sent to your phone') + '</p><input id="otp" maxlength="4" placeholder="4-digit OTP"><button class="btn" data-act="overify">Verify</button>');
          return;
        }
        if (a === 'overify') {
          const d = await api('/auth/otp/verify', { method: 'POST', body: { phone: window._ph, otp: $q('#otp').value.trim() } });
          closeM(); return enter(d, d.isNew);
        }
        if (a === 'forgot') {
          const em = $q('.box input[type=email]').value.trim();
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
  }
  const _act2 = doAct;                               // logout par is account ka skills-data bhi saaf
  doAct = function (a, el) {
    if (a === 'logout') { localStorage.removeItem('lp'); localStorage.removeItem('lp_owner'); }
    return _act2(a, el);
  };

  /* ---------- 2) Data ---------- */
  const LEVELS = { Beginner: 25, Intermediate: 55, Advanced: 85 };
  const lvlName = v => v >= 75 ? 'Advanced' : v >= 45 ? 'Intermediate' : 'Beginner';
  const GOALS = {
    'Software Developer': { 'Python': 70, 'Data Structures & Algorithms': 65, 'HTML/CSS/JS': 60, 'SQL': 55, 'Git & GitHub': 50, 'Communication': 50 },
    'Data Analyst': { 'Excel': 60, 'SQL': 70, 'Python': 55, 'Statistics': 55, 'Data Visualization': 55, 'Communication': 50 },
    'UI/UX Designer': { 'Figma': 65, 'Design Principles': 60, 'HTML/CSS/JS': 40, 'User Research': 50, 'Communication': 55 },
    'Digital Marketing': { 'SEO': 60, 'Social Media': 60, 'Content Writing': 55, 'Analytics': 50, 'Communication': 55 },
    'Government Jobs': { 'General Knowledge': 60, 'Quantitative Aptitude': 60, 'Reasoning': 60, 'English': 60, 'Current Affairs': 55 }
  };
  const KNOWN = [...new Set(Object.values(GOALS).flatMap(g => Object.keys(g)).concat(['Java', 'C/C++', 'React', 'Machine Learning', 'Problem Solving', 'Teamwork']))];
  const ALIAS = { js: 'HTML/CSS/JS', javascript: 'HTML/CSS/JS', html: 'HTML/CSS/JS', css: 'HTML/CSS/JS', 'web development': 'HTML/CSS/JS', 'basic web dev': 'HTML/CSS/JS',
    dsa: 'Data Structures & Algorithms', 'data structures': 'Data Structures & Algorithms', algorithms: 'Data Structures & Algorithms',
    git: 'Git & GitHub', github: 'Git & GitHub', mysql: 'SQL', 'c++': 'C/C++', c: 'C/C++', ml: 'Machine Learning', ms: 'Excel', 'ms excel': 'Excel' };
  const canon = n => { const k = norm(n); return ALIAS[k] || KNOWN.find(x => norm(x) === k) || String(n).trim().slice(0, 40); };
  const SUGG = [
    ['Python for Beginners', 'Coursera', 'Course', 'Python', 12, 'https://www.coursera.org/'],
    ['Python for Everybody', 'py4e.com', 'Course', 'Python', 20, 'https://www.py4e.com/'],
    ['Data Structures Handbook', 'GeeksforGeeks', 'Article', 'Data Structures & Algorithms', 8, 'https://www.geeksforgeeks.org/'],
    ['Programming, Data Structures & Algorithms', 'NPTEL', 'Course', 'Data Structures & Algorithms', 30, 'https://nptel.ac.in/'],
    ['Web Development (HTML, CSS, JS)', 'FreeCodeCamp', 'Course', 'HTML/CSS/JS', 20, 'https://www.freecodecamp.org/'],
    ['React: Official Tutorial', 'react.dev', 'Article', 'React', 6, 'https://react.dev/'],
    ['MySQL for Beginners', 'Simplilearn', 'Course', 'SQL', 10, 'https://www.simplilearn.com/'],
    ['SQLBolt: Learn SQL with Exercises', 'SQLBolt', 'Article', 'SQL', 5, 'https://sqlbolt.com/'],
    ['Git & GitHub Crash Course', 'YouTube', 'Video', 'Git & GitHub', 2, 'https://www.youtube.com/'],
    ['Learn Git Branching (interactive)', 'learngitbranching', 'Article', 'Git & GitHub', 3, 'https://learngitbranching.js.org/'],
    ['CS50: Intro to Computer Science', 'Harvard', 'Course', 'Problem Solving', 25, 'https://cs50.harvard.edu/'],
    ['Java Programming MOOC', 'University of Helsinki', 'Course', 'Java', 40, 'https://java-programming.mooc.fi/'],
    ['Machine Learning Specialization', 'Coursera', 'Course', 'Machine Learning', 40, 'https://www.coursera.org/'],
    ['Communication Skills', 'SWAYAM', 'Course', 'Communication', 12, 'https://swayam.gov.in/'],
    ['Excel Tutorials for Beginners', 'ExcelJet', 'Article', 'Excel', 6, 'https://exceljet.net/'],
    ['Statistics Basics', 'Khan Academy', 'Course', 'Statistics', 10, 'https://www.khanacademy.org/'],
    ['Data Visualization', 'Kaggle Learn', 'Course', 'Data Visualization', 4, 'https://www.kaggle.com/learn'],
    ['Figma for Beginners', 'Figma', 'Video', 'Figma', 4, 'https://www.figma.com/'],
    ['Laws of UX', 'lawsofux.com', 'Article', 'Design Principles', 3, 'https://lawsofux.com/'],
    ['User Research Basics', 'Nielsen Norman Group', 'Article', 'User Research', 5, 'https://www.nngroup.com/articles/'],
    ['SEO Starter Guide', 'Google', 'Article', 'SEO', 4, 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide'],
    ['Social Media Marketing', 'Meta Blueprint', 'Course', 'Social Media', 6, 'https://www.facebook.com/business/learn'],
    ['Content Marketing Course', 'HubSpot Academy', 'Course', 'Content Writing', 5, 'https://academy.hubspot.com/'],
    ['Google Analytics Training', 'Google Skillshop', 'Course', 'Analytics', 6, 'https://skillshop.withgoogle.com/'],
    ['Quantitative Aptitude Practice', 'IndiaBIX', 'Article', 'Quantitative Aptitude', 15, 'https://www.indiabix.com/'],
    ['Logical Reasoning Practice', 'IndiaBIX', 'Article', 'Reasoning', 12, 'https://www.indiabix.com/'],
    ['Learning English', 'BBC Learning English', 'Course', 'English', 15, 'https://www.bbc.co.uk/learningenglish'],
    ['Daily News & Current Affairs', 'PIB India', 'Article', 'Current Affairs', 10, 'https://pib.gov.in/'],
    ['General Knowledge Basics', 'NCERT / DIKSHA', 'Book', 'General Knowledge', 20, 'https://diksha.gov.in/']
  ];
  const QS = {
    'Python': ['What is the difference between a list and a tuple?', 'How does a dictionary work in Python?', 'What is a function and why do we use it?', 'What is a list comprehension? Give an example.'],
    'SQL': ['What is a primary key?', 'Explain the difference between INNER JOIN and LEFT JOIN.', 'What does GROUP BY do?', 'What is the difference between WHERE and HAVING?'],
    'HTML/CSS/JS': ['What is the CSS box model?', 'What is the difference between let, const and var?', 'What is the DOM?', 'How do you make a website responsive?'],
    'Data Structures & Algorithms': ['What is the difference between an array and a linked list?', 'Explain Big O notation in simple words.', 'How does binary search work?', 'When would you use a stack or a queue?'],
    'Git & GitHub': ['What is the difference between git and GitHub?', 'What does git commit do?', 'How do you resolve a merge conflict?', 'What is a pull request?'],
    'Communication': ['How do you explain a technical idea to a non-technical person?', 'Tell me about a time you disagreed with a teammate.', 'How do you handle feedback?', 'How do you make sure your message is clear?']
  };
  Object.assign(Q, QS);

  let LP = null;
  try { LP = JSON.parse(localStorage.getItem('lp')); } catch (e) {}
  function blank() {
    const o = { upd: 0, skills: [], res: [], tasks: [], iv: {} };
    (Array.isArray(U.skills) ? U.skills : []).forEach(n => { const c = canon(n); if (c && !o.skills.some(s => norm(s.name) === norm(c))) o.skills.push({ id: uid(), name: c, level: 25 }); });
    return o;
  }
  if (!LP || typeof LP !== 'object') LP = blank();
  ['skills', 'res', 'tasks'].forEach(k => { if (!Array.isArray(LP[k])) LP[k] = []; });
  if (!LP.iv || typeof LP.iv !== 'object') LP.iv = {};

  let pt;
  function save() {
    LP.upd = Date.now();
    try { rawSet.call(localStorage, 'lp', JSON.stringify(LP)); } catch (e) {}
    U.skills = LP.skills.map(s => s.name); SV('u', U);       // AI mentor aur baaki screens ko bhi skills pata chalti hain
    clearTimeout(pt);
    if (tok()) pt = setTimeout(() => api('/state', { method: 'PUT', body: { lp: LP } }).catch(() => {}), 700);
  }
  function jwtId(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id || ''; } catch (e) { return ''; } }
  async function init() {
    const t = tok();
    if (!t) { if (localStorage.getItem('lp_owner')) { localStorage.removeItem('lp_owner'); LP = blank(); rawSet.call(localStorage, 'lp', JSON.stringify(LP)); render(true); } return; }
    const id = jwtId(t);
    let srv; try { srv = await api('/state'); } catch (e) { return; }
    const owner = localStorage.getItem('lp_owner');
    if (owner && owner !== id) LP = blank();
    if (srv.lp && typeof srv.lp === 'object' && (srv.lp.upd || 0) >= (LP.upd || 0)) { LP = srv.lp; ['skills', 'res', 'tasks'].forEach(k => { if (!Array.isArray(LP[k])) LP[k] = []; }); if (!LP.iv) LP.iv = {}; }
    rawSet.call(localStorage, 'lp_owner', id);
    save(); render(true);
  }

  /* ---------- 3) Hisaab-kitaab (sab screens yahin se data lete hain) ---------- */
  const req = () => GOALS[U.goal] || GOALS['Software Developer'];
  const skillOf = n => LP.skills.find(s => norm(s.name) === norm(n));
  const hoursDone = n => LP.res.filter(r => r.done && (!n || norm(r.skill) === norm(n))).reduce((a, r) => a + (+r.hours || 0), 0);
  const eff = s => Math.min(100, Math.round(s.level + 6 * LP.tasks.filter(t => t.done && norm(t.skill) === norm(s.name)).length + Math.min(20, hoursDone(s.name) * 1.5)));
  const gaps = () => Object.entries(req()).map(([n, t]) => { const s = skillOf(n), cur = s ? eff(s) : 0; return { n, t, cur, gap: Math.max(0, t - cur) }; }).sort((a, b) => b.gap - a.gap);
  const match = () => { const g = gaps(); return g.length ? Math.round(g.reduce((a, x) => a + Math.min(1, x.cur / x.t), 0) / g.length * 100) : 0; };
  const taskPct = () => LP.tasks.length ? Math.round(LP.tasks.filter(t => t.done).length / LP.tasks.length * 100) : null;
  const nextTask = () => { const order = gaps().map(g => g.n); return LP.tasks.filter(t => !t.done).sort((a, b) => (order.indexOf(a.skill) < 0 ? 99 : order.indexOf(a.skill)) - (order.indexOf(b.skill) < 0 ? 99 : order.indexOf(b.skill)))[0]; };
  function genTasks() {
    let n = 0;
    gaps().filter(g => g.gap > 0).forEach((g, i) => {
      const add = (kind, title) => { if (!LP.tasks.some(t => norm(t.skill) === norm(g.n) && t.kind === kind)) { LP.tasks.push({ id: uid(), skill: g.n, title, kind, done: false }); n++; } };
      add('learn', 'Learn ' + g.n + ' basics');
      add('practice', 'Practice ' + g.n + ' with 5 small exercises');
      if (g.gap >= 25 || i < 3) add('project', 'Build a mini project using ' + g.n);
    });
    return n;
  }
  function addSkill(name, level) {
    const c = canon(name); if (!c) return null;
    let s = skillOf(c);
    if (s) { s.level = Math.max(s.level, level); } else { s = { id: uid(), name: c, level }; LP.skills.push(s); }
    return s;
  }

  function pullSkills() {                       // onboarding me chuni skills bhi yahan aa jayein
    let ch = false;
    (Array.isArray(U.skills) ? U.skills : []).forEach(n => { const c = canon(n); if (c && !skillOf(c)) { LP.skills.push({ id: uid(), name: c, level: 25 }); ch = true; } });
    if (ch) save();
  }

  /* ---------- 4) Screens ---------- */
  const LPUI = { rf: 'All', rq: '' };
  const inp = 'style="width:100%;background:#16264a;border:1px solid #7C4DFF55;border-radius:10px;padding:11px;color:#fff;font:13px Inter;outline:0"';
  const dlist = () => '<datalist id="lp-dl">' + [...new Set([...LP.skills.map(s => s.name), ...Object.keys(req()), ...KNOWN])].map(x => '<option value="' + esc(x) + '">').join('') + '</datalist>';
  const lvlSel = (id, cur, extra) => '<select ' + (id ? 'id="' + id + '" ' : '') + (extra || '') + ' style="width:100%">' + Object.keys(LEVELS).map(l => '<option ' + (cur === l ? 'selected' : '') + '>' + l + '</option>').join('') + '</select>';
  const goalSel = () => '<select data-lp="goal">' + Object.keys(GOALS).map(g => '<option ' + (U.goal === g ? 'selected' : '') + '>' + g + '</option>').join('') + '</select>';

  P.skills = () => {
    const gs = gaps(), have = new Set(LP.skills.map(s => norm(s.name)));
    const mine = LP.skills.map(s => '<div class="cd"><div class="sp"><b>' + esc(s.name) + '</b><div style="display:flex;gap:8px;align-items:center">' + lvlSel('', lvlName(s.level), 'data-lp="lvl" data-id="' + s.id + '"') + '<button class="star" data-lp="delskill" data-id="' + s.id + '" title="Remove">🗑</button></div></div>' + bar('Current level (progress ke saath badhta hai)', eff(s)) + (LP.iv[s.name] != null ? '<span class="mu">Mock interview score: ' + LP.iv[s.name] + '%</span>' : '') + '</div>').join('') || '<p class="mu">Abhi koi skill nahi jodi. Neeche se apni pehli skill add karo.</p>';
    const quick = gs.filter(g => !have.has(norm(g.n))).map(g => '<span class="tag" data-lp="quick" data-n="' + esc(g.n) + '">+ ' + esc(g.n) + '</span>').join('');
    const gapH = gs.map(g => '<div class="cd"><div class="sp"><b>' + esc(g.n) + '</b><span class="mu">' + g.cur + '% / needed ' + g.t + '%</span></div><div class="bar2"><i data-w="' + Math.min(100, g.cur) + '" style="width:0"></i></div>' + (g.gap > 0 ? '<div class="sp"><span class="mu">Gap: ' + g.gap + '%</span><button class="btn out" style="padding:6px 12px" data-lp="findres" data-n="' + esc(g.n) + '">Resources →</button></div>' : '<span class="chip">✔ Goal reached</span>') + '</div>').join('');
    return shell('skills', dlist() + '<div class="sp"><div><h2>Skill Gap Analysis</h2><p class="mu">Apni skills jodo, hum bataenge goal tak kya kam hai.</p></div><div style="min-width:190px"><span class="mu">Goal</span>' + goalSel() + '</div></div>'
      + '<div class="g2"><div class="cd">' + rg(match()) + '<p class="mu" style="text-align:center;margin-top:8px">Overall Match for ' + esc(U.goal) + '</p></div>'
      + '<div class="cd"><b>Add a skill</b><div class="g2" style="margin-top:10px"><input id="lp-sn" list="lp-dl" placeholder="e.g. Python, SQL, Excel" ' + inp + '>' + lvlSel('lp-sl', 'Beginner') + '</div><br><button class="btn" data-lp="addskill">+ Add skill</button>' + (quick ? '<p class="mu" style="margin:12px 0 6px">Goal ke liye zaroori skills (tap karke jodo):</p>' + quick : '') + '</div></div>'
      + '<h3>Your skills</h3><div style="display:grid;gap:12px">' + mine + '</div><h3>Skills to improve (goal ke hisaab se)</h3><div style="display:grid;gap:12px">' + gapH + '</div>'
      + '<div class="cd sp"><span class="mu">Roadmap in gaps se banta hai. Resources aur tasks poore karoge to level badhega.</span><button class="btn" data-lp="gen" data-go="1">Make my roadmap</button></div>');
  };

  P.roadmap = () => {
    const order = gaps().map(g => g.n), groups = {};
    LP.tasks.forEach(t => (groups[t.skill] = groups[t.skill] || []).push(t));
    const names = Object.keys(groups).sort((a, b) => (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)));
    const p = taskPct(), nx = nextTask();
    const cards = names.map((n, i) => { const ts = groups[n], d = ts.filter(t => t.done).length, st = d === ts.length ? ['Completed', ''] : d ? ['In Progress', 'background:#7a5a1f55;color:#ffcf6d'] : ['Not Started', 'background:#7a1f1f55;color:#ff8f8f'];
      return '<div class="cd"><div class="sp"><b>Phase ' + (i + 1) + ' · ' + esc(n) + '</b><span class="chip" style="' + st[1] + '">' + st[0] + '</span></div>' + ts.map(t => '<div class="sp"><label class="tk"><input type="checkbox" data-lp="tdone" data-id="' + t.id + '" ' + (t.done ? 'checked' : '') + '> ' + esc(t.title) + '</label><button class="star" style="font-size:14px" data-lp="deltask" data-id="' + t.id + '" title="Remove">✕</button></div>').join('') + '<br><button class="btn out" style="padding:6px 12px" data-lp="findres" data-n="' + esc(n) + '">Resources for ' + esc(n) + ' →</button></div>'; }).join('')
      || '<div class="cd"><p class="mu">Roadmap abhi khali hai. Pehle <b>Skill Analysis</b> me apni skills jodo, phir <b>Make my roadmap</b> dabao.</p></div>';
    return shell('roadmap', '<div class="sp"><div><h2>Your Personalized Career Roadmap</h2><p class="mu">' + esc(U.edu) + ' · Goal: ' + esc(U.goal) + '</p></div><div style="display:flex;gap:8px"><button class="btn" data-lp="gen">Make my roadmap</button><button class="btn out" data-lp="dlplan">Download Plan</button></div></div>'
      + '<div class="g2" style="grid-template-columns:2fr 1fr"><div style="display:grid;gap:12px">' + cards
      + '<div class="cd"><b>Add your own task</b><div class="g2" style="margin-top:10px"><input id="lp-tt" placeholder="e.g. Finish chapter 3" ' + inp + '><input id="lp-ts" list="lp-dl" placeholder="Skill (optional)" ' + inp + '></div><br><button class="btn" data-lp="addtask">+ Add task</button></div></div>'
      + '<div class="cd" style="text-align:center"><b>Overall Progress</b><br><br>' + rg(p == null ? 0 : p) + '<p class="mu" style="margin:12px 0">' + (nx ? 'Next Task: ' + esc(nx.title) : (LP.tasks.length ? 'All tasks done! 🎉' : 'Roadmap banao')) + '</p>' + (nx ? '<button class="btn" style="width:100%" data-lp="findres" data-n="' + esc(nx.skill) + '">Start Learning</button>' : '') + '</div></div>' + dlist());
  };

  const typeOK = r => UI.rtab === 'All' || (r.type + 's') === UI.rtab;
  const rowRes = r => '<div class="cd sp"><div>' + (r.done ? '✅' : '📘') + ' <b>' + esc(r.title) + '</b><br><span class="mu">' + esc(r.type) + ' · <a data-lp="goskill" data-n="' + esc(r.skill) + '" style="color:#22d3ee;cursor:pointer">' + esc(r.skill || 'No skill') + '</a> · ' + (+r.hours || 0) + 'h' + (r.url ? ' · <a href="' + esc(r.url) + '" target="_blank" rel="noopener" style="color:#22d3ee">Open ↗</a>' : '') + '</span></div><div style="display:flex;gap:8px;align-items:center"><button class="btn ' + (r.done ? 'out' : '') + '" style="padding:7px 12px" data-lp="rdone" data-id="' + r.id + '">' + (r.done ? 'Done ✔' : 'Mark done') + '</button><button class="star" data-lp="rdel" data-id="' + r.id + '" title="Remove">🗑</button></div></div>';
  const resList = () => { const q = norm(LPUI.rq); const l = LP.res.filter(r => typeOK(r) && (LPUI.rf === 'All' || norm(r.skill) === norm(LPUI.rf)) && norm(r.title + ' ' + r.skill).includes(q)); return l.map(rowRes).join('') || '<p class="mu">Koi resource nahi mila. Neeche se apna resource add karo.</p>'; };
  P.resources = () => {
    const have = new Set(LP.res.map(r => norm(r.title)));
    const gp = Object.fromEntries(gaps().map(g => [norm(g.n), g.gap]));
    const rank = s => (norm(s[3]) in gp) ? (gp[norm(s[3])] > 0 ? 0 : 1) : 2;     // goal ki kami wali skills pehle
    const sug = SUGG.map((s, i) => [s, i]).filter(([s]) => !have.has(norm(s[0]))).sort((x, y) => (rank(x[0]) - rank(y[0])) || ((gp[norm(y[0][3])] || 0) - (gp[norm(x[0][3])] || 0))).slice(0, 12).map(([s, i]) => '<div class="cd sp"><div>⭐ <b>' + esc(s[0]) + '</b><br><span class="mu">' + s[1] + ' · ' + s[2] + ' · ' + esc(s[3]) + ' · ' + s[4] + 'h</span></div><button class="btn out" style="padding:7px 12px" data-lp="sugadd" data-i="' + i + '">+ Add to my list</button></div>').join('');
    const fsk = ['All', ...new Set([...LP.skills.map(s => s.name), ...LP.res.map(r => r.skill).filter(Boolean)])];
    return shell('resources', dlist() + '<h2>Learning Resources</h2><p class="mu">Apne courses, videos aur links yahan jodo. Poora karte hi us skill ka level badhta hai.</p>'
      + '<div class="cd"><b>Add a resource</b><div class="g2" style="margin-top:10px"><input id="lp-rt" placeholder="Title (e.g. Python Full Course)" ' + inp + '><input id="lp-ru" placeholder="Link (optional) https://..." ' + inp + '><input id="lp-rs" list="lp-dl" placeholder="Skill (e.g. Python)" ' + inp + '><div class="g2"><select id="lp-ry" style="width:100%"><option>Course</option><option>Video</option><option>Article</option><option>Book</option></select><input id="lp-rh" type="number" min="1" max="500" value="5" ' + inp + ' title="Hours"></div></div><br><button class="btn" data-lp="addres">+ Add resource</button></div>'
      + '<div class="g2" style="grid-template-columns:2fr 1fr"><input id="lp-rq" placeholder="Search my resources..." value="' + esc(LPUI.rq) + '" ' + inp + '><select data-lp="rfilter" style="width:100%">' + fsk.map(f => '<option ' + (LPUI.rf === f ? 'selected' : '') + '>' + esc(f) + '</option>').join('') + '</select></div>'
      + tabs('rtab', ['All', 'Courses', 'Videos', 'Articles', 'Books'], UI.rtab)
      + '<h3>My resources</h3><div id="lp-rl" style="display:grid;gap:12px">' + resList() + '</div>'
      + (sug ? '<h3>Suggested for you</h3><div style="display:grid;gap:12px">' + sug + '</div>' : ''));
  };

  const _resume = P.resume;
  P.resume = () => _resume().replace('<button class="btn" style="width:100%" data-act="rpdf">', '<button class="btn out" style="width:100%" data-lp="fillres">Fill from my profile</button><br><br><button class="btn" style="width:100%" data-act="rpdf">');

  P.mock = () => {
    const banks = LP.skills.map(s => s.name).filter(n => Q[n] && !['Technical', 'HR', 'Behavioral'].includes(n));
    const list = ['Technical', 'HR', 'Behavioral', ...banks, 'Recent Performance'];
    if (!list.includes(UI.mtab)) UI.mtab = 'Technical';
    let b;
    if (UI.mtab === 'Recent Performance') b = '<div class="cd"><b>Recent Performance</b>' + (MH.length ? MH.slice(0, 6).map(h => '<p class="mu" style="margin-top:10px">' + esc(h.d) + ' · ' + esc(h.c) + ' · <b style="color:#fff">' + h.s + '%</b></p>').join('') : '<p class="mu" style="margin-top:10px">No interviews yet. Start your first practice!</p>') + '</div>';
    else {
      const iv = Object.entries(LP.iv).map(([k, v]) => '<p class="mu" style="margin-top:8px">' + esc(k) + ': <b style="color:#fff">' + v + '%</b></p>').join('') || '<p class="mu" style="margin-top:8px">Skill-wise interview dene par yahan score dikhega.</p>';
      b = '<div class="g2"><div class="cd">' + rg(MS.overall) + '<p class="mu" style="text-align:center;margin:8px 0 14px">Overall Score</p>' + ['Communication', 'Technical Knowledge', 'Confidence', 'Body Language'].map(k => bar(k, MS[k])).join('') + '</div><div style="display:grid;gap:14px;align-content:start"><div class="cd"><b>' + esc(UI.mtab) + ' Interview</b><p class="mu">' + Q[UI.mtab].length + ' questions · 90 seconds each</p><br><button class="btn" style="width:100%" data-act="mstart">Start Practice</button></div><div class="cd"><b>Your skill-wise scores</b>' + iv + '</div></div></div>';
    }
    return shell('mock', '<h2>Mock Interview</h2><p class="mu">Tumhari skills ke hisaab se alag-alag tabs.</p>' + tabs('mtab', list, UI.mtab) + b + '<button class="btn" style="padding:13px" data-act="mstart">Start New Interview</button>');
  };
  const _mnext = mnext;
  mnext = function () {
    const m = MP, last = m && (m.i + 1 >= Q[m.cat].length), cat = m && m.cat;
    _mnext();
    if (last && cat && MH[0] && MH[0].c === cat && skillOf(cat)) { LP.iv[skillOf(cat).name] = MH[0].s; save(); }
  };

  P.progress = () => {
    const p = UI.ptab, tp = taskPct(), ov = tp == null ? match() : Math.round((tp + match()) / 2), hrs = hoursDone(), gs = gaps();
    let b = '';
    if (p === 'Overview') b = '<div class="g3"><div class="cd">' + rg(ov) + '<p class="mu" style="text-align:center;margin-top:8px">Learning Progress</p></div><div class="cd"><span class="mu">Study Streak</span><h2>' + ST.n + ' day' + (ST.n > 1 ? 's' : '') + '</h2><span class="mu">Keep going!</span></div><div class="cd"><span class="mu">Learning hours completed</span><h2>' + hrs + ' hours</h2></div></div>'
      + '<div class="g3"><div class="cd"><span class="mu">Skills added</span><h2>' + LP.skills.length + '</h2></div><div class="cd"><span class="mu">Roadmap tasks</span><h2>' + LP.tasks.filter(t => t.done).length + '/' + LP.tasks.length + '</h2></div><div class="cd"><span class="mu">Resources done</span><h2>' + LP.res.filter(r => r.done).length + '/' + LP.res.length + '</h2></div></div>'
      + '<div class="cd"><b>Recent Activity</b><p class="mu" style="margin-top:10px">' + (ACT.length ? ACT.map(a => '✔ ' + esc(a)).join('<br>') : 'Abhi koi activity nahi.') + '</p></div>';
    if (p === 'Skills') b = '<div class="cd">' + (gs.map(g => bar(g.n + ' (needed ' + g.t + '%)', Math.min(100, g.cur))).join('') || '') + '</div>';
    if (p === 'Learning') b = '<div class="g2"><div class="cd"><b>Roadmap tasks done</b><p class="mu" style="margin-top:10px">' + (LP.tasks.filter(t => t.done).map(t => '✔ ' + esc(t.title)).join('<br>') || 'Abhi koi task poora nahi hua.') + '</p></div><div class="cd"><b>Resources completed</b><p class="mu" style="margin-top:10px">' + (LP.res.filter(r => r.done).map(r => '✔ ' + esc(r.title) + ' (' + r.hours + 'h)').join('<br>') || 'Abhi koi resource poora nahi hua.') + '</p></div></div>';
    if (p === 'Achievements') { const A = [['🌱 First skill added', LP.skills.length >= 1], ['📚 5 skills added', LP.skills.length >= 5], ['🎓 First resource completed', LP.res.some(r => r.done)], ['✅ First task done', LP.tasks.some(t => t.done)], ['⛰️ Roadmap 50% done', (tp || 0) >= 50], ['🎤 Interview practised', MH.length >= 1], ['🔥 3-day streak', ST.n >= 3], ['🏆 Goal skills reached', gs.length > 0 && gs.every(g => g.gap === 0)]]; b = '<div class="cd">' + A.map(a => '<span class="bd ' + (a[1] ? '' : 'lock') + '">' + a[0] + '</span>').join('') + '</div>'; }
    return shell('progress', '<div><h2>Your Progress</h2><p class="mu">Skills, resources, roadmap aur interview, sab ek jagah.</p></div>' + tabs('ptab', ['Overview', 'Skills', 'Learning', 'Achievements'], p) + b + '<div class="cd" style="text-align:center;color:#c4b5fd">You\'re doing great, ' + esc(U.name) + '! Keep going! 💪</div>');
  };

  const _dash = P.dashboard;
  P.dashboard = () => _dash().replace(/<b>\d+\/10 skills completed<\/b><div class="bar2" style="margin-top:10px"><i style="width:\d+%"><\/i><\/div>/, () => { const gs = gaps(); return '<b>' + gs.filter(g => g.gap === 0).length + '/' + gs.length + ' goal skills reached</b><div class="bar2" style="margin-top:10px"><i style="width:' + match() + '%"></i></div>'; });

  ['skills', 'roadmap', 'resources', 'mock', 'progress', 'dashboard'].forEach(k => { const f = P[k]; P[k] = () => { pullSkills(); return f(); }; });

  const _ob = P.onboarding;                     // signup ka naam onboarding me pehle se bhara aaye
  P.onboarding = () => { if (!OB.name && U.full && tok()) OB.name = U.full; return _ob(); };

  window.__lpAPI = {                              // lp-library.js isse judta hai (Study Library -> My resources)
    gaps: () => gaps(),
    has: t => LP.res.some(r => norm(r.title) === norm(t)),
    add: r => { LP.res.unshift(Object.assign({ id: uid(), done: false }, r)); if (r.skill && !skillOf(r.skill)) LP.skills.push({ id: uid(), name: canon(r.skill), level: 10 }); save(); render(true); }
  };

  /* ---------- 5) Buttons aur forms ---------- */
  const go = (hash) => { if (location.hash === '#' + hash) render(true); else location.hash = '#' + hash; };
  const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-lp]'); if (!el) return;
    const a = el.dataset.lp, id = el.dataset.id, n = el.dataset.n;
    if (a === 'addskill') { const nm = val('lp-sn'); if (nm.length < 2) return toast('Skill ka naam likho'); addSkill(nm, LEVELS[val('lp-sl')] || 25); logAct('Added skill ' + canon(nm)); save(); toast('Skill added: ' + canon(nm)); return render(true); }
    if (a === 'quick') { addSkill(n, 25); save(); return render(true); }
    if (a === 'delskill') { LP.skills = LP.skills.filter(s => s.id !== id); save(); return render(true); }
    if (a === 'findres') { LPUI.rf = n; UI.rtab = 'All'; LPUI.rq = ''; return go('resources'); }
    if (a === 'goskill') { return go('skills'); }
    if (a === 'gen') { const c = genTasks(); save(); toast(c ? c + ' naye tasks bane' : 'Roadmap pehle se taiyar hai'); return el.dataset.go ? go('roadmap') : render(true); }
    if (a === 'addtask') { const t = val('lp-tt'); if (t.length < 2) return toast('Task likho'); const sk = val('lp-ts'); LP.tasks.push({ id: uid(), skill: sk ? canon(sk) : 'My tasks', title: t.slice(0, 120), kind: 'custom', done: false }); save(); return render(true); }
    if (a === 'deltask') { LP.tasks = LP.tasks.filter(t => t.id !== id); save(); return render(true); }
    if (a === 'dlplan') { const txt = 'MY CAREER ROADMAP - ' + U.goal + '\n\n' + LP.tasks.map(t => (t.done ? '[x] ' : '[ ] ') + '[' + t.skill + '] ' + t.title).join('\n') + '\n\nProgress: ' + (taskPct() || 0) + '%'; const x = document.createElement('a'); x.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); x.download = 'career-roadmap.txt'; x.click(); return; }
    if (a === 'addres') {
      const t = val('lp-rt'); if (t.length < 2) return toast('Resource ka title likho');
      let u = val('lp-ru'); if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
      const sk = val('lp-rs') ? canon(val('lp-rs')) : '';
      LP.res.unshift({ id: uid(), title: t.slice(0, 100), url: u.slice(0, 300), type: val('lp-ry') || 'Course', skill: sk, hours: Math.max(1, Math.min(500, +val('lp-rh') || 5)), done: false });
      if (sk && !skillOf(sk)) LP.skills.push({ id: uid(), name: sk, level: 10 });
      save(); toast('Resource added'); return render(true);
    }
    if (a === 'sugadd') { const s = SUGG[+el.dataset.i]; LP.res.unshift({ id: uid(), title: s[0], url: s[5], type: s[2], skill: s[3], hours: s[4], done: false }); if (!skillOf(s[3])) LP.skills.push({ id: uid(), name: s[3], level: 10 }); save(); return render(true); }
    if (a === 'rdone') { const r = LP.res.find(x => x.id === id); if (!r) return; r.done = !r.done; if (r.done) { logAct('Completed ' + r.title); const s = skillOf(r.skill); toast(s ? r.skill + ' level ab ' + eff(s) + '%' : 'Great job!'); } save(); return render(true); }
    if (a === 'rdel') { LP.res = LP.res.filter(r => r.id !== id); save(); return render(true); }
    if (a === 'fillres') {
      const sk = LP.skills.slice().sort((x, y) => eff(y) - eff(x)).filter(s => eff(s) >= 25).map(s => s.name + ' (' + lvlName(eff(s)) + ')').join(', ');
      const ach = [...LP.res.filter(r => r.done).map(r => 'Completed: ' + r.title), ...LP.tasks.filter(t => t.done && t.kind === 'project').map(t => t.title.replace('Build a mini project using ', 'Project: '))].slice(0, 6).join('; ');
      if (sk) RS.skills = sk; if (ach) RS.ach = ach; if (U.full) RS.name = U.full; RS.title = U.goal;
      SV('rs', RS); toast('Resume tumhari skills se bhar diya'); return render(true);
    }
  });
  document.addEventListener('change', e => {
    const el = e.target, a = el.dataset && el.dataset.lp; if (!a) return;
    if (a === 'lvl') { const s = LP.skills.find(x => x.id === el.dataset.id); if (s) { s.level = LEVELS[el.value] || 25; save(); render(true); } }
    if (a === 'goal') { U.goal = el.value; SV('u', U); render(true); }
    if (a === 'rfilter') { LPUI.rf = el.value; render(true); }
    if (a === 'tdone') { const t = LP.tasks.find(x => x.id === el.dataset.id); if (t) { t.done = el.checked; if (t.done) logAct('Completed task: ' + t.title); save(); render(true); } }
  });
  document.addEventListener('input', e => { if (e.target.id === 'lp-rq') { LPUI.rq = e.target.value; const l = document.getElementById('lp-rl'); if (l) l.innerHTML = resList(); } });

  render(true);
  init();
})();