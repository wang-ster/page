/* ============================================================
   SOC COMMAND — shared engine
   (pixel icons, profile math, HUD, nav, modals, splash art)
   You normally don't need to edit this file — edit data/config.js.
   ============================================================ */
(function(){
  const CFG = window.SOC_SETTINGS;

  /* ---------------- helpers ---------------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = n => `<span class="px" data-icon="${n}"></span>`;
  const store = {
    get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
  };

  /* ---------------- pixel icons ----------------
     Each character = one pixel. '.' = transparent.            */
  const PAL = {
    k:'#02060d', w:'#eef8ff', g:'#f6c945', G:'#b07a1f', b:'#3db8ff', B:'#1a5fa8',
    c:'#9ff4ff', r:'#ff3b5c', R:'#8e1f30', p:'#f2dcc0', P:'#c49a7a',
    s:'#c9d6e8', S:'#5e7090', n:'#6a4a2e', N:'#3c2818', e:'#39ff88', E:'#13804a',
    z:'#06121f', v:'#b48cff', V:'#5a3a9a'
  };
  const ICONS = {
    envelope:[".kkkkkkkkkkkkkk.",".kkwwwwwwwwwwkk.",".kwkwwwwwwwwkwk.",".kwwkwwwwwwkwwk.",".kwwwkwwwwkwwwk.",".kwwwwkrrkwwwwk.",".kwwwwwrrwwwwwk.",".kwwwwwwwwwwwwk.",".kwwwwwwwwwwwwk.",".kSSSSSSSSSSSSk.",".kkkkkkkkkkkkkk."],
    arrow:["..kkkkkkkk..",".kccbbbbbbk.","kcbbwbbbbbbk","kbbbwwbbbbbk","kbbbwwwbbbbk","kbbbwwwwbbbk","kbbbwwwwbbbk","kbbbwwwbbbbk","kbbbwwbbbbbk","kBbbwbbbbbBk",".kBBBBBBBBk.","..kkkkkkkk.."],
    gear:["....kkkk....",".kk.kssk.kk.",".kskksskksk.","..kssssssk..","kkksskkssSkk","ksssk..kSSSk","kssSk..kSSSk","kkkSSkkSSkkk","..kSSSSSSk..",".kSkkSSkkSk.",".kk.kSSk.kk.","....kkkk...."],
    home:[".....kk.....","....kbbk....","...kbbbbk...","..kbbbbbbk..",".kbbbbbbbbk.","kkkkkkkkkkkk",".kssssssssk.",".kscceskksk.",".ksccesknsk.",".ksssskknsk.",".kkkkkkkkkk."],
    terminal:["kkkkkkkkkkkkkk","kSSSSSSSSrgeSk","kkkkkkkkkkkkkk","kzzzzzzzzzzzzk","kzezzzzzzzzzzk","kzzezzzzzzzzzk","kzzzezzzzzzzzk","kzzezzzeeeezzk","kzezzzzzzzzzzk","kzzzzzzzzzzzzk","kkkkkkkkkkkkkk"],
    shield:["kkkkkkkkkkkk","kccccbbbbbBk","kcwccbbbbbBk","kcccckkbbbBk","kccckwwkbbBk","kccckwwkbbBk",".kcccwwbbBk.",".kccckkbbBk.","..kccbbbBk..","...kcbbBk...","....kbBk....",".....kk....."],
    radar:["...kkkkkk...",".kkEEEEEEkk.",".kEEEEEEEEk.","kEEEEeEEEwEk","kEEEEEeEEEEk","kEeEEEkeeeek","kEEEEEEEEEEk","kEEEEEEEEEEk",".kEEEEEEEEk.",".kkEEEEEEkk.","...kkkkkk..."],
    medal:["kbbk..krrk",".kbbkkrrk.","..kbkkrk..","...kkkk...","..kggggk..",".kgwgggGk.","kgwggGggGk","kggGGGGgGk","kgggGgggGk",".kgggggGk.","..kGGGGk..","...kkkk..."],
    chest:["..kkkkkkkkkk..",".knnnnnnnnnnk.","kgnnnnnnnnnngk","kgNNNNNNNNNNgk","kkkkkkggkkkkkk","kgnnnkggknnngk","kgnnnnkknnnngk","kgnnnnnnnnnngk","kgNNNNNNNNNNgk","kkkkkkkkkkkkkk"],
    lock:["..kkkkkk..",".ksk..ksk.",".ksk..ksk.","kkkkkkkkkk","kgggkkgggk","kgggkkgggk","kggggkgggk","kGGGGGGGGk","kkkkkkkkkk"],
    crystal:["..kkkkkkkk..",".kcwcbbcbbBk","kcwcbbbcbbBk","kBBBBBBBBBBk",".kcbbbbbbBk.","..kcbbbbBk..","...kcbbBk...","....kbBk....",".....kk....."],
    coin:["..kkkkkk..",".kwgggggk.","kwggkkggGk","kgggkgggGk","kgggkgggGk","kgggkgggGk","kgggkgggGk","kgggkkggGk",".kGGGGGGk.","..kkkkkk.."],
    analyst:["...kkkkkk...","..knnnnnnk..",".knnnnnnnnk.","kSknppppnkSk","kSkpkppkpkSk","kSkppppppkSk","..kSppPPpk..","...kcpppk...","..kkkkkkkk..",".kBBBcBBBBk.","kBBBBcBBBBBk","kkkkkkkkkkkk"],
    check:["........kk",".......kek","kk....kek.","kek..kek..",".kekkek...","..keek....","...kk....."],
    chips:["kkkkkkkkkk","ksSsSsSsSk","kkkkkkkkkk",".krrrrrrk.",".krwwwwrk.",".krwggwrk.",".krwggwrk.",".krwwwwrk.",".krrrrrrk.","kkkkkkkkkk","ksSsSsSsSk","kkkkkkkkkk"],
    candy:["kk..kkkkkk..kk","kbkkrrrrrrkkbk","kbbkrwrrrrkbbk","kbkkrrrrrRkkbk","kk..kkkkkk..kk"],
    ticket:["kkkkkkkkkkkkkk","kgggggggkggggk","kgrrrrggkgggGk",".kgggggggggggk",".kgrrrggkgggGk","kggggggggggggk","kGGGGGGGkGGGGk","kkkkkkkkkkkkkk"],
    music:["....kkkkkk","....kbbbbk","....kbkkkk","....kbk...","....kbk...","....kbk...",".kkkkbk...","kbbbbbk...","kbcbbbk...","kbbbbbk...",".kkkkk...."],
    clock:["...kkkkkk...",".kkwwwwwwkk.",".kwwwwkwwwk.","kwwwwwkwwwwk","kwwwwwkwwwwk","kwwwwwkkkkwk","kwwwwwwwwwwk","kwwwwwwwwwwk",".kwwwwwwwwk.",".kkwwwwwwkk.","...kkkkkk..."],
    chat:[".kkkkkkkkkkkk.","kcccccccccccck","kcSSSSSSSSSSck","kcccccccccccck","kcSSSSSSScccck","kcccccccccccck",".kkkcckkkkkkk.","...kck........","...kk........."],
    star:[".....k.....","....kgk....","....kgk....","kkkkgwgkkkk",".kggwgggGk.","..kgggggk..","...kgggk...","..kggkggk..",".kgk...kgk.",".kk.....kk."]
  };
  function pixelSVG(rows){
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    let out = `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">`;
    rows.forEach((row,y) => [...row].forEach((ch,x) => {
      if (PAL[ch]) out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL[ch]}"/>`;
    }));
    return out + '</svg>';
  }
  function hydrate(root = document){
    root.querySelectorAll('[data-icon]').forEach(el => {
      if (el.dataset.done) return;
      const rows = ICONS[el.dataset.icon];
      if (rows){ el.innerHTML = pixelSVG(rows); el.dataset.done = 1; }
    });
  }

  /* ---------------- backend ---------------- */
  const configured = !!(CFG.supabaseUrl && !/YOUR-/.test(CFG.supabaseUrl) && window.supabase);
  const sb = configured ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;
  const never = () => new Promise(() => {});

  async function api(action, payload = {}){
    const { data, error } = await sb.functions.invoke('soc-api', { body: { action, ...payload } });
    if (error){
      let msg = error.message;
      try { const j = await error.context.json(); msg = j.error || msg; } catch(e){}
      throw new Error(msg);
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }
  const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

  let ME = null;
  /* ---------------- STUDENT VIEW (CISO preview) ----------------
     Per browser tab. The CISO sees the site as a brand-new student: no CISO tools,
     zero XP/coins, locked questions hidden. Pages check Core.preview to skip saving. */
  const ssGet = k => { try { return sessionStorage.getItem(k); } catch(e){ return null; } };
  const ssSet = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch(e){} };
  let REAL = null, PREVIEW = false, firstLevels = null;
  function setPreview(on){ ssSet('soc.preview', on ? '1' : null); location.href = on ? 'index.html' : 'console.html'; }

  async function loadMe(){
    const { data, error } = await sb.rpc('wallet');
    if (error) throw error;
    REAL = data;
    PREVIEW = data.role === 'ciso' && ssGet('soc.preview') === '1';
    if (!PREVIEW){ ME = data; return data; }
    if (!firstLevels) firstLevels = (await sb.from('levels').select('*').order('xp').limit(2)).data || [];
    const l1 = firstLevels[0] || { level: 1, xp: 0, rank: 'Recruit' }, l2 = firstLevels[1];
    ME = { ...data, role: 'analyst', display_name: 'Student Preview', xp: 0, level: l1.level, rank: l1.rank, cur_xp: l1.xp,
           next_xp: l2 ? l2.xp : null, next_level: l2 ? l2.level : null, next_coins: l2 ? l2.coins : null,
           coins: 0, diamonds: 0, cleared: 0 };
    return ME;
  }
  function previewBar(){
    if (!PREVIEW || document.getElementById('previewBar')) return;
    document.documentElement.classList.add('previewing');
    const b = document.createElement('div'); b.id = 'previewBar';
    b.innerHTML = `<span>👁 STUDENT VIEW</span><em>You're seeing exactly what a new student sees. Nothing you do here is saved or submitted.</em>
      <button class="btn sm" id="pvExit">EXIT STUDENT VIEW</button>`;
    document.body.appendChild(b);
    b.querySelector('#pvExit').onclick = () => setPreview(false);
  }

  // Every page except login calls this. No session → login page.
  async function guard(){
    if (!sb){ location.replace('login.html'); return never(); }
    const { data: { session } } = await sb.auth.getSession();
    const here = location.pathname.split('/').pop() + location.search;
    if (!session){ location.replace('login.html?next=' + encodeURIComponent(here)); return never(); }
    const la = lastActive();
    if (la && Date.now() - la > IDLE_MS){ await idleLogout(); return never(); }
    try { await loadMe(); } catch(e){ ME = null; }
    if (!ME || ME.role === 'pending'){
      await sb.auth.signOut();
      location.replace('login.html?denied=1'); return never();
    }
    return ME;
  }

  /* ---------------- UI pieces ---------------- */
  function renderHUD(){
    const el = document.getElementById('hud'); if (!el || !ME) return;
    const p = ME;
    const pct = p.next_xp ? (p.xp - p.cur_xp) / (p.next_xp - p.cur_xp) : 1;
    el.innerHTML = `
      <button class="avatar" id="whoBtn" title="Profile & settings">${icon('analyst')}</button>
      <div class="player">
        <div class="player-name"><span class="lv">LV.${p.level}</span><span class="rank">${esc(p.rank)}</span>
          <span class="callsign">// ${esc(p.display_name || p.username)}</span>${p.role === 'ciso' ? '<span class="role-tag">CISO</span>' : ''}</div>
        <div class="bar"><i style="width:${(pct*100).toFixed(1)}%"></i><b>XP</b><span>${p.next_xp ? `${p.xp}/${p.next_xp}` : `${p.xp} MAX`}</span></div>
        <div class="bar alt"><i style="width:${p.total_labs ? Math.min(1, p.cleared/p.total_labs)*100 : 0}%"></i><b>LABS</b><span>${p.cleared}/${p.total_labs}</span></div>
      </div>
      <div class="currencies">
        <div class="chip" title="Coins — earned from milestones">${icon('coin')}${(+p.coins).toLocaleString()}</div>
        <div class="chip" title="Diamonds — awarded by your CISO">${icon('crystal')}${p.diamonds}</div>
      </div>
      <div class="hud-actions">
        <button class="icon-btn" id="mailBtn" aria-label="Announcements">${icon('envelope')}<span class="badge" data-ann hidden></span></button>
        <button class="icon-btn" id="setBtn" aria-label="Settings">${icon('gear')}</button>
      </div>`;
    el.querySelector('#whoBtn').onclick = showSettings;
    el.querySelector('#mailBtn').onclick = showAnnouncements;
    el.querySelector('#setBtn').onclick = showSettings;
    hydrate(el);
  }
  async function refreshMe(){ await loadMe(); renderHUD(); annBadge(); }

  function renderTicker(){
    const el = document.getElementById('ticker'); if (!el) return;
    el.innerHTML = `<span class="ticker-label">THREAT FEED</span>
      <div class="ticker-track"><p>${CFG.ticker.map(t => '▲ ' + esc(t)).join(' &nbsp; ')} &nbsp; ▲</p></div>`;
  }

  function renderNav(active){
    const el = document.getElementById('nav'); if (!el) return;
    const items = [
      ['home','HOME','index.html'], ['terminal','LABS','labs.html'], ['medal','RANKS','milestones.html'],
      ['chest','SHOP','shop.html'], ['radar','INTEL','intel.html'], ['envelope','ANNOUNCEMENTS','announcements.html'], ['chat','CHAT','chat.html']
    ];
    if (ME && ME.role === 'ciso') items.push(['star','CHARACTER','character.html'], ['shield','CONSOLE','console.html']);
    el.style.gridTemplateColumns = `repeat(${items.length},1fr)`;
    el.innerHTML = items.map(([ic,label,href]) =>
      `<a class="nav-btn ${label === active ? 'active' : ''}" href="${href}">${icon(ic)}<span>${label}</span>${
        label === 'ANNOUNCEMENTS' ? '<span class="badge" data-ann hidden></span>' : label === 'CHAT' ? '<span class="badge" data-chat hidden></span>' : ''}</a>`).join('');
    hydrate(el);
  }

  function modal(html, opts = {}){
    const back = document.createElement('div');
    back.className = 'modal-back' + (opts.side ? ' side' : '');
    back.innerHTML = `<div class="modal frame ${opts.wide ? 'wide' : ''}" role="dialog"><button class="x" data-close aria-label="Close">✕</button>${html}</div>`;
    document.body.appendChild(back);
    hydrate(back);
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) close(); });
    return { el: back, close };
  }
  function confirmBox(title, msg, okLabel = 'CONFIRM', danger = false){
    return new Promise(res => {
      const m = modal(`<h3>${esc(title)}</h3><p class="note">${esc(msg)}</p>
        <div class="modal-actions"><button class="btn ghost" data-close>CANCEL</button>
        <button class="btn ${danger ? 'red' : 'green'}" id="ok">${esc(okLabel)}</button></div>`);
      let done = false;
      m.el.querySelector('#ok').onclick = () => { done = true; m.close(); res(true); };
      new MutationObserver((_, o) => { if (!document.body.contains(m.el)){ o.disconnect(); if (!done) res(false); } })
        .observe(document.body, { childList: true });
    });
  }

  /* announcements (badge counts posts newer than the last time you opened them) */
  let annCache = null;
  async function annBadge(){
    try {
      annCache = must(await sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(30));
      const seen = store.get('soc.annSeen.' + ME.id) || '';
      const n = annCache.filter(a => a.created_at > seen).length;
      document.querySelectorAll('[data-ann]').forEach(b => { b.hidden = !n; b.textContent = n; });
    } catch(e){}
  }
  /* chat unread badge: messages since you last had the chat open */
  async function chatBadge(){
    try {
      const seen = store.get('soc.chatSeen.' + ME.id) || new Date(0).toISOString();
      const { count } = await sb.from('chat_messages').select('id', { count: 'exact', head: true }).gt('created_at', seen).neq('user_id', ME.id);
      document.querySelectorAll('[data-chat]').forEach(b => { b.hidden = !count; b.textContent = count > 99 ? '99+' : count; });
    } catch(e){}
  }
  function showAnnouncements(){ location.href = 'announcements.html'; }
  function markAnnouncementsSeen(list){
    if (list && list[0]) store.set('soc.annSeen.' + ME.id, list[0].created_at);
    document.querySelectorAll('[data-ann]').forEach(b => b.hidden = true);
  }
  function showSettings(){
    const m = modal(`<h3>OPERATOR SETTINGS</h3>
      <p class="note">Signed in as <b>${esc(ME.username)}</b> · ${REAL && REAL.role === 'ciso' ? 'Chief Information Security Officer' + (PREVIEW ? ' (in Student View)' : '') : 'Analyst'}</p>
      <div class="modal-list">
        <button class="op-row" id="sPw">${icon('lock')}<b>CHANGE PASSWORD</b></button>
        <button class="op-row" id="sBg">${icon('star')}<b>BACKGROUND</b><span>${BG_SCENES[bgGet().scene] || ''}</span></button>
        ${REAL && REAL.role === 'ciso' ? `<button class="op-row" id="sPv">${icon('analyst')}<b>${PREVIEW ? 'EXIT STUDENT VIEW' : 'VIEW AS STUDENT'}</b><span>${PREVIEW ? 'ON' : ''}</span></button>` : ''}
        <button class="op-row" id="sOut">${icon('arrow')}<b>LOG OUT</b></button>
      </div>`);
    const pv = m.el.querySelector('#sPv'); if (pv) pv.onclick = () => setPreview(!PREVIEW);
    m.el.querySelector('#sBg').onclick = () => { m.close(); showBackground(); };
    m.el.querySelector('#sOut').onclick = async () => { await sb.auth.signOut(); location.replace('login.html'); };
    m.el.querySelector('#sPw').onclick = () => {
      m.close();
      const p = modal(`<h3>CHANGE PASSWORD</h3>
        <label class="lbl">New password</label><input class="inp" type="password" id="p1" autocomplete="new-password">
        <label class="lbl">Confirm</label><input class="inp" type="password" id="p2" autocomplete="new-password">
        <p class="err" id="pe"></p>
        <div class="modal-actions"><button class="btn ghost" data-close>CANCEL</button><button class="btn green" id="go">SAVE</button></div>`);
      p.el.querySelector('#go').onclick = async () => {
        const a = p.el.querySelector('#p1').value, b = p.el.querySelector('#p2').value, e = p.el.querySelector('#pe');
        if (a.length < 6) return e.textContent = 'At least 6 characters.';
        if (a !== b) return e.textContent = "Passwords don't match.";
        const { error } = await sb.auth.updateUser({ password: a });
        if (error) return e.textContent = error.message;
        p.close(); toast('PASSWORD UPDATED', 'Use it next time you log in.');
      };
    };
  }

  let toastTimer;
  function toast(title, msg = ''){
    let t = document.getElementById('toast');
    if (!t){ t = document.createElement('div'); t.id = 'toast'; t.className = 'toast frame'; document.body.appendChild(t); }
    t.innerHTML = `<h3>${esc(title)}</h3><p>${esc(msg)}</p>`;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ---------------- SPLASH: pixel SOC room ---------------- */
  function sceneSOC(cv, still, my){
    const W = 320, H = 180; cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    const b = bg.getContext('2d');
    const px = (c,x,y,w=1,h=1) => c.fillRect(x|0, y|0, w, h);
    const fill = (c,col,x,y,w,h) => { c.fillStyle = col; px(c,x,y,w,h); };

    // back wall with dithered gradient
    const wall = ['#02060d','#040b18','#061226','#081a34','#0a2040'];
    const bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
    for (let y = 0; y < 124; y++){
      const t = (y/124)*(wall.length-1), i = Math.floor(t), f = t - i;
      for (let x = 0; x < W; x++){
        b.fillStyle = wall[Math.min(wall.length-1, f > bayer[(y%4)*4 + x%4]/16 ? i+1 : i)];
        px(b,x,y);
      }
    }
    // wall panel seams
    b.fillStyle = '#0c2648';
    for (let x = 0; x < W; x += 40) px(b, x, 8, 1, 116);
    // ceiling strip + lights
    fill(b,'#010409',0,0,W,8);
    for (let x = 60; x < W-40; x += 50){ fill(b,'#9ff4ff',x,6,20,1); fill(b,'#3df0ff22',x-4,7,28,3); }

    // floor
    fill(b,'#030913',0,124,W,56);
    b.fillStyle = '#0a1a30';
    for (let i = -10; i <= 10; i++){ for (let y = 124; y < H; y += 2){ const x = 160 + i*16*((y-110)/30); px(b,x,y); } }
    for (let y = 128; y < H; y += 8) px(b,0,y,W,1);
    // wall glow reflected on floor
    for (let y = 124; y < 140; y++){ b.fillStyle = `rgba(61,240,255,${0.10 - (y-124)*0.006})`; px(b,44,y,232,1); }

    // main wall display
    const D = { x:44, y:12, w:232, h:86 };
    fill(b,'#1b2f4a',D.x-3,D.y-3,D.w+6,D.h+6);
    fill(b,'#02060d',D.x-1,D.y-1,D.w+2,D.h+2);
    fill(b,'#020e1c',D.x,D.y,D.w,D.h);
    fill(b,'#3a0c18',D.x,D.y,D.w,6);                 // header bar
    for (let x = D.x+8; x < D.x+70; x += 4) fill(b,'#ff8a9c',x,D.y+2,2,2);
    b.fillStyle = '#06203a';
    for (let x = D.x; x < D.x+D.w; x += 16) px(b,x,D.y+6,1,D.h-6);
    for (let y = D.y+6; y < D.y+D.h; y += 12) px(b,D.x,y,D.w,1);

    // world map (very rough), 4px cells
    const MAP = [
      "........................................................",
      ".....######.......####......########################....",
      "...##########....##.......###########################...",
      "..###########.....#......##########################.....",
      "....########.............#####.####################.....",
      ".....######..............###########.##########.........",
      "......####..............########.....#######..#.........",
      ".......##...............#########.....###...............",
      "........###..............########......#.......##.......",
      ".........#####............######...............###......",
      "..........######...........####.................#.......",
      "...........#####...........###..............####........",
      "............###.............##..............#######.....",
      "............##.................................####.....",
      "............#..................................#........"
    ];
    const MX = D.x + 4, MY = D.y + 12, land = [];
    MAP.forEach((row,ry) => [...row].forEach((ch,rx) => {
      if (ch === '#'){ fill(b,'#145a78',MX+rx*4+1,MY+ry*4+1,2,2); land.push([MX+rx*4+2, MY+ry*4+2]); }
    }));

    // side status panels
    const side = (x) => { fill(b,'#1b2f4a',x-2,20,36,72); fill(b,'#020e1c',x,22,32,68); };
    side(6); side(282);

    // desks + monitors
    fill(b,'#0d1a2c',0,126,W,8); fill(b,'#1f3a5a',0,126,W,1); fill(b,'#050b14',0,134,W,2);
    const mons = [];
    for (let i = 0; i < 6; i++){
      const x = 16 + i*52, y = 106;
      fill(b,'#1b2f4a',x-1,y-1,28,18); fill(b,'#020e1c',x,y,26,16);
      fill(b,'#1b2f4a',x+11,y+17,4,9);
      mons.push({ x, y, col: ['#39ff88','#3df0ff','#ffb347'][i%3], lines: [8,14,10,18] });
    }
    // analysts (seen from behind) with cyan rim light
    for (let i = 0; i < 6; i++){
      if (i === 2) continue; // one empty seat
      const cx = 29 + i*52;
      b.fillStyle = '#0a1422';                       // chair back
      px(b,cx-12,150,24,30);
      b.fillStyle = '#03070f';
      for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x*x+y*y <= 36) px(b,cx+x,138+y); // head
      px(b,cx-11,146,22,34); px(b,cx-13,150,26,30); // shoulders
      b.fillStyle = '#2a6a8a';                       // rim light
      px(b,cx-4,132,8,1); px(b,cx-6,134,1,3); px(b,cx+5,134,1,3);
      px(b,cx-11,146,22,1);
      b.fillStyle = '#5e7090';                       // headset
      px(b,cx-7,134,1,6); px(b,cx+6,134,1,6); px(b,cx-6,132,12,1);
    }

    // dynamic state
    const attacks = Array.from({length:6}, () => newAttack(true));
    function newAttack(stagger){
      const a = land[(rnd()*land.length)|0], c = land[(rnd()*land.length)|0];
      return { a, c, t: stagger ? -rnd() : 0, sp: 1/(24 + rnd()*24), ring: 0,
               col: ['#ff3b5c','#ffb347','#ff3b5c','#b48cff'][(rnd()*4)|0] };
    }
    const bars = Array.from({length:6}, () => 10 + rnd()*40);
    const logs = Array.from({length:16}, () => ({ len: 4 + rnd()*24, col: rnd() < .15 ? '#ff3b5c' : '#39ff88' }));
    let t = 0, last = 0;
    function frame(now){
      if (my !== sceneToken) return;                 // a newer background replaced this one
      if (!still) requestAnimationFrame(frame);
      if (now - last < 66 && !still) return;
      last = now; t++;
      ctx.drawImage(bg,0,0);

      // header blink
      if (t % 10 < 5) fill(ctx,'#ff3b5c',D.x+D.w-8,D.y+2,3,2);

      // attacks
      attacks.forEach((k,i) => {
        if (k.ring){
          const r = 7 - k.ring;
          ctx.fillStyle = k.col;
          px(ctx,k.c[0]-r,k.c[1]-r,r*2+1,1); px(ctx,k.c[0]-r,k.c[1]+r,r*2+1,1);
          px(ctx,k.c[0]-r,k.c[1]-r,1,r*2+1); px(ctx,k.c[0]+r,k.c[1]-r,1,r*2+1);
          if (--k.ring === 0) attacks[i] = newAttack(false);
          return;
        }
        k.t += k.sp;
        if (k.t < 0) return;
        if (k.t >= 1){ k.ring = 6; return; }
        const dx = k.c[0]-k.a[0], dy = k.c[1]-k.a[1], lift = Math.min(28, Math.hypot(dx,dy)*0.35);
        for (let j = 0; j < 12; j++){
          const tt = k.t - j*0.018; if (tt < 0) break;
          const x = k.a[0] + dx*tt, y = k.a[1] + dy*tt - Math.sin(Math.PI*tt)*lift;
          ctx.globalAlpha = 1 - j/12; ctx.fillStyle = j ? k.col : '#ffffff'; px(ctx,x,y);
        }
        ctx.globalAlpha = 1;
        if (t % 6 < 3) fill(ctx,k.col,k.a[0]-1,k.a[1]-1,2,2);
      });

      // left panel: live bar graph
      bars.forEach((v,i) => {
        bars[i] = Math.max(4, Math.min(60, v + (rnd()-.5)*8));
        const h = bars[i]|0, col = h > 46 ? '#ff3b5c' : h > 30 ? '#ffb347' : '#39ff88';
        fill(ctx,col,9+i*5,88-h,3,h);
      });
      // right panel: scrolling log
      if (t % 3 === 0){ logs.shift(); logs.push({ len: 4 + rnd()*24, col: rnd() < .15 ? '#ff3b5c' : '#39ff88' }); }
      logs.forEach((l,i) => fill(ctx,l.col,285,25+i*4,l.len|0,1));

      // desk monitors flicker
      mons.forEach(m => {
        if (t % 5 === 0) m.lines = m.lines.map(() => 4 + rnd()*18);
        m.lines.forEach((w,j) => fill(ctx,m.col,m.x+3,m.y+3+j*3,w|0,1));
        ctx.globalAlpha = .08; fill(ctx,m.col,m.x-4,m.y-4,34,24); ctx.globalAlpha = 1;
      });

      // red alert beacons
      const pulse = (Math.sin(t*0.35)+1)/2;
      [[16,9],[304,9]].forEach(([x,y]) => {
        fill(ctx,'#ff3b5c',x-2,y,5,3);
        ctx.fillStyle = `rgba(255,59,92,${0.08 + pulse*0.12})`;
        ctx.beginPath(); ctx.moveTo(x-2,y+3); ctx.lineTo(x+3,y+3); ctx.lineTo(x+22,y+80); ctx.lineTo(x-22,y+80); ctx.fill();
      });
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- inactivity auto-logout ----------------
     Last activity is shared across tabs, so working in one tab keeps the others alive. */
  const IDLE_MS = Math.max(1, +CFG.idleMinutes || 10) * 60000;
  const WARN_MS = Math.min(60000, IDLE_MS / 2);
  const lastActive = () => +(store.get('soc.lastActive') || 0);
  function markActive(){
    const now = Date.now();
    if (now - lastActive() < 5000) return;       // throttle writes
    store.set('soc.lastActive', String(now));
    const w = document.getElementById('idleWarn'); if (w) w.remove();
  }
  async function idleLogout(){
    store.set('soc.lastActive', '0');
    if (sb) await sb.auth.signOut();
    location.replace('login.html?timeout=1');
  }
  function startIdleWatch(){
    store.set('soc.lastActive', String(Date.now()));
    ['mousemove','mousedown','keydown','scroll','touchstart','wheel'].forEach(ev =>
      window.addEventListener(ev, markActive, { passive: true, capture: true }));
    window.addEventListener('message', e => { if (e.data && e.data.soc === 'activity') markActive(); });
    setInterval(() => {
      const idle = Date.now() - lastActive();
      if (idle >= IDLE_MS) return idleLogout();
      if (idle >= IDLE_MS - WARN_MS && !document.getElementById('idleWarn')){
        const w = document.createElement('div');
        w.id = 'idleWarn'; w.className = 'idle-warn frame';
        w.innerHTML = '<b>SESSION EXPIRING</b> Move the mouse or press a key to stay logged in.';
        document.body.appendChild(w);
      }
    }, 5000);
  }

  /* ---------------- BACKGROUNDS ----------------
     Saved per user on this device. scene: soc | calm | sky | minimal | image
     theme tints built-in scenes; dim darkens any scene so panels stand out.        */
  const BG_DEFAULT = { scene: 'soc', theme: 'cyan', dim: 40, pixel: 'medium' };
  const BG_SCENES = { soc: 'SOC ROOM', calm: 'CALM GRID', sky: 'NIGHT SKY', minimal: 'MINIMAL', image: 'MY IMAGE' };
  const BG_THEMES = {
    cyan:    { label: 'CYAN',    swatch: '#3df0ff', filter: 'none' },
    emerald: { label: 'EMERALD', swatch: '#39ff88', filter: 'hue-rotate(-45deg) saturate(1.1)' },
    violet:  { label: 'VIOLET',  swatch: '#b48cff', filter: 'hue-rotate(75deg)' },
    amber:   { label: 'AMBER',   swatch: '#ffb347', filter: 'hue-rotate(-155deg) saturate(1.2)' },
    crimson: { label: 'CRIMSON', swatch: '#ff5c7a', filter: 'hue-rotate(160deg)' },
    mono:    { label: 'MONO',    swatch: '#b8c4d0', filter: 'grayscale(1) brightness(.95)' }
  };
  const PIXEL_W = { chunky: 112, medium: 192, fine: 320 };
  let sceneToken = 0;
  const bgKey = k => `soc.${k}.${ME ? ME.id : 'last'}`;
  function bgGet(){
    try { return { ...BG_DEFAULT, ...JSON.parse(store.get(bgKey('bg')) || (ME ? '{}' : store.get('soc.bg.last')) || '{}') }; }
    catch(e){ return { ...BG_DEFAULT }; }
  }
  function bgSave(v){ const j = JSON.stringify(v); store.set(bgKey('bg'), j); store.set('soc.bg.last', j); }
  const bgImg = () => (ME ? store.get(bgKey('bgimg')) : store.get('soc.bgimg.last')) || null;

  // small dithered vertical gradient helper for calm scenes
  const bayer4 = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  function dither(c, cols, y0, y1, W){
    for (let y = y0; y < y1; y++){
      const t = ((y - y0) / (y1 - y0)) * (cols.length - 1), i = Math.floor(t), f = t - i;
      for (let x = 0; x < W; x++){ c.fillStyle = cols[Math.min(cols.length - 1, f > bayer4[(y%4)*4 + x%4]/16 ? i+1 : i)]; c.fillRect(x, y, 1, 1); }
    }
  }
  function loop(my, still, fps, draw){
    let last = 0, t = 0;
    const f = now => { if (my !== sceneToken) return; if (!still) requestAnimationFrame(f);
      if (!still && now - last < 1000 / fps) return; last = now; draw(t++); };
    requestAnimationFrame(f);
  }

  function sceneCalm(cv, still, my){                 // slow perspective grid + faint stars
    const W = 320, H = 180; cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H; const b = bg.getContext('2d');
    dither(b, ['#02050c','#040a18','#071226','#0a1a34'], 0, 112, W);
    dither(b, ['#081830','#040a16','#02050c'], 112, H, W);
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const stars = Array.from({length: 40}, () => [rnd()*W|0, rnd()*95|0, rnd()*6.28]);
    loop(my, still, 12, t => {
      c.drawImage(bg, 0, 0);
      stars.forEach(([x, y, p]) => { const v = (Math.sin(t*0.05 + p) + 1) / 2; c.fillStyle = `rgba(160,220,255,${0.15 + v*0.35})`; c.fillRect(x, y, 1, 1); });
      c.fillStyle = 'rgba(61,240,255,.35)'; c.fillRect(0, 112, W, 1);
      c.fillStyle = 'rgba(61,240,255,.08)'; c.fillRect(0, 108, W, 4);
      c.fillStyle = 'rgba(61,240,255,.16)';
      for (let i = -12; i <= 12; i++){ for (let y = 113; y < H; y += 1){ const x = 160 + i * 14 * ((y - 108) / 12); if (x >= 0 && x < W) c.fillRect(x|0, y, 1, 1); } }
      const off = (t * 0.25) % 1;
      for (let k = 0; k < 9; k++){ const z = k + off, y = 112 + Math.pow(z, 2) * 0.85; if (y < H) c.fillRect(0, y|0, W, 1); }
    });
  }

  function sceneSky(cv, still, my){                  // night sky, moon, hills
    const W = 320, H = 180; cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H; const b = bg.getContext('2d');
    dither(b, ['#02040b','#050b1c','#0a1630','#122244','#1a2f55'], 0, H, W);
    const disc = (cx, cy, r, col) => { b.fillStyle = col; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x*x + y*y <= r*r) b.fillRect(cx+x, cy+y, 1, 1); };
    disc(250, 40, 16, 'rgba(200,230,255,.06)'); disc(250, 40, 11, '#cfe6ff'); disc(254, 37, 10, '#e9f4ff');
    const ridge = (base, amp, fr, col, ph) => { b.fillStyle = col; for (let x = 0; x < W; x++){ const top = base - Math.abs(Math.sin(x*fr + ph) + Math.sin(x*fr*2.3 + ph*2)/2) * amp; b.fillRect(x, top|0, 1, H); } };
    ridge(150, 22, 0.017, '#0b1a33', 1); ridge(165, 16, 0.024, '#07101f', 3); ridge(176, 6, 0.05, '#040912', 5);
    let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const stars = Array.from({length: 70}, () => [rnd()*W|0, rnd()*120|0, rnd()*6.28, rnd()]);
    loop(my, still, 8, t => {
      c.drawImage(bg, 0, 0);
      stars.forEach(([x, y, p, s]) => { const v = (Math.sin(t*0.08*(0.5+s) + p) + 1) / 2; c.fillStyle = `rgba(220,236,255,${0.2 + v*0.6})`; c.fillRect(x, y, 1, 1); });
    });
  }

  function sceneMinimal(cv, still, my){               // quiet gradient + dot grid, no motion
    const W = 320, H = 180; cv.width = W; cv.height = H; const c = cv.getContext('2d');
    dither(c, ['#02050c','#040b18','#06112a','#040b18'], 0, H, W);
    c.fillStyle = 'rgba(61,240,255,.07)';
    for (let y = 6; y < H; y += 12) for (let x = 6; x < W; x += 12) c.fillRect(x, y, 1, 1);
  }

  function sceneImage(cv, still, my){
    const src = bgImg(); if (!src) return sceneMinimal(cv, still, my);
    const img = new Image();
    img.onload = () => { if (my !== sceneToken) return; cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0); };
    img.src = src;
  }

  // the background behind every page
  function splash(){
    const cv = document.getElementById('splash'); if (!cv) return;
    const v = bgGet(), still = store.get('soc.still') === '1', my = ++sceneToken;
    let dim = document.getElementById('bgDim');
    if (!dim){ dim = document.createElement('div'); dim.id = 'bgDim'; dim.className = 'bg-dim'; cv.after(dim); }
    dim.style.background = `rgba(2,5,12,${Math.max(0, Math.min(90, +v.dim || 0)) / 100})`;
    const scene = v.scene === 'image' && !bgImg() ? 'soc' : v.scene;
    cv.style.filter = scene === 'image' ? 'none' : (BG_THEMES[v.theme] || BG_THEMES.cyan).filter;
    ({ soc: sceneSOC, calm: sceneCalm, sky: sceneSky, minimal: sceneMinimal, image: sceneImage }[scene] || sceneSOC)(cv, still, my);
  }

  // turn an uploaded photo into pixel art: shrink, then reduce colours
  function pixelize(dataUrl, pixel){
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const w = PIXEL_W[pixel] || PIXEL_W.medium, h = Math.max(1, Math.round(img.height * w / img.width));
        // shrink in steps so the result stays smooth before posterizing
        let cur = img, cw = img.width, ch = img.height;
        while (cw / 2 > w){ const t = document.createElement('canvas'); t.width = cw = Math.round(cw / 2); t.height = ch = Math.round(ch / 2); t.getContext('2d').drawImage(cur, 0, 0, cw, ch); cur = t; }
        const out = document.createElement('canvas'); out.width = w; out.height = h;
        const c = out.getContext('2d'); c.drawImage(cur, 0, 0, w, h);
        const d = c.getImageData(0, 0, w, h), a = d.data, L = 7, step = 255 / (L - 1);
        for (let i = 0; i < a.length; i += 4){
          const e = (bayer4[((i/4/w|0)%4)*4 + (i/4%w)%4] / 16 - 0.5) * step * 0.6;   // ordered dither
          for (let k = 0; k < 3; k++) a[i+k] = Math.round(Math.min(255, Math.max(0, a[i+k] + e)) / step) * step;
        }
        c.putImageData(d, 0, 0);
        res(out.toDataURL('image/png'));
      };
      img.onerror = () => rej(new Error('That file is not an image this browser can read.'));
      img.src = dataUrl;
    });
  }

  function showBackground(){
    const v = bgGet();
    const draw = () => {
      const has = !!bgImg();
      m.el.querySelector('.modal').innerHTML = `<button class="x" data-close aria-label="Close">✕</button>
        <h3>BACKGROUND</h3>
        <label class="lbl">SCENE</label>
        <div class="filters">${Object.entries(BG_SCENES).map(([k, l]) =>
          `<button class="fchip ${v.scene === k ? 'on' : ''}" data-scene="${k}" ${k === 'image' && !has ? 'disabled title="Upload an image first"' : ''}>${l}</button>`).join('')}</div>
        <label class="lbl">COLOR ${v.scene === 'image' ? '<span class="hint">(built-in scenes only)</span>' : ''}</label>
        <div class="filters">${Object.entries(BG_THEMES).map(([k, t]) =>
          `<button class="swatch ${v.theme === k ? 'on' : ''}" data-theme="${k}" title="${t.label}" style="--sw:${t.swatch}"><i></i>${t.label}</button>`).join('')}</div>
        <label class="lbl">DIM BACKGROUND · <span id="dimVal">${v.dim}%</span></label>
        <input type="range" min="0" max="85" step="5" value="${v.dim}" id="dim" class="range">
        <label class="lbl">ANIMATION</label>
        <div class="filters">${['ON','OFF'].map(x => `<button class="fchip ${(store.get('soc.still') === '1') === (x === 'OFF') ? 'on' : ''}" data-anim="${x}">${x}</button>`).join('')}</div>
        <label class="lbl">MY IMAGE <span class="hint">(turned into pixel art · stays on this device)</span></label>
        <div class="bg-img-row">
          ${has ? `<img src="${bgImg()}" class="bg-thumb" alt="Your background">` : '<div class="bg-thumb empty">NO IMAGE</div>'}
          <div class="filters" style="flex-direction:column; align-items:flex-start; gap:8px">
            <button class="btn sm" id="pick">${has ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}</button>
            <div class="filters">${Object.keys(PIXEL_W).map(k => `<button class="fchip ${v.pixel === k ? 'on' : ''}" data-pixel="${k}" ${has ? '' : 'disabled'}>${k.toUpperCase()}</button>`).join('')}</div>
            ${has ? '<button class="btn sm red" id="rmImg">REMOVE IMAGE</button>' : ''}
          </div>
          <input type="file" accept="image/*" id="imgFile" hidden>
        </div>
        <p class="err" id="bgErr"></p>
        <div class="modal-actions"><button class="btn ghost" id="reset">RESET TO DEFAULT</button><button class="btn green" data-close>DONE</button></div>`;
      hydrate(m.el);
      const q = s => m.el.querySelector(s), qa = s => m.el.querySelectorAll(s);
      const apply = () => { bgSave(v); splash(); draw(); };
      qa('[data-scene]').forEach(b => b.onclick = () => { v.scene = b.dataset.scene; apply(); });
      qa('[data-theme]').forEach(b => b.onclick = () => { v.theme = b.dataset.theme; apply(); });
      qa('[data-anim]').forEach(b => b.onclick = () => {
        const off = b.dataset.anim === 'OFF'; store.set('soc.still', off ? '1' : '0');
        document.documentElement.classList.toggle('still', off); apply();
      });
      q('#dim').oninput = e => { v.dim = +e.target.value; q('#dimVal').textContent = v.dim + '%'; bgSave(v);
        document.getElementById('bgDim').style.background = `rgba(2,5,12,${v.dim / 100})`; };
      const repixel = async () => {
        const srcKey = bgKey('bgsrc'), src = store.get(srcKey); if (!src) return;
        const px = await pixelize(src, v.pixel); store.set(bgKey('bgimg'), px); store.set('soc.bgimg.last', px);
      };
      q('#pick').onclick = () => q('#imgFile').click();
      q('#imgFile').onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        if (!/^image\//.test(f.type)) return q('#bgErr').textContent = 'Please choose an image file.';
        try {
          const raw = await new Promise((r, j) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = j; fr.readAsDataURL(f); });
          // keep a modest copy of the original so the pixel size can be changed later
          const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error('Unreadable image.')); i.src = raw; });
          const k = Math.min(1, 800 / img.width), t = document.createElement('canvas');
          t.width = Math.round(img.width * k); t.height = Math.round(img.height * k); t.getContext('2d').drawImage(img, 0, 0, t.width, t.height);
          store.set(bgKey('bgsrc'), t.toDataURL('image/jpeg', 0.85));
          await repixel();
          if (!store.get(bgKey('bgimg'))) throw new Error('This browser could not save the image (storage may be full).');
          v.scene = 'image'; apply();
        } catch(err){ q('#bgErr').textContent = err.message; }
      };
      qa('[data-pixel]').forEach(b => b.onclick = async () => { v.pixel = b.dataset.pixel; await repixel(); apply(); });
      const rm = q('#rmImg'); if (rm) rm.onclick = () => {
        store.set(bgKey('bgimg'), ''); store.set(bgKey('bgsrc'), ''); store.set('soc.bgimg.last', '');
        if (v.scene === 'image') v.scene = 'soc'; apply();
      };
      q('#reset').onclick = () => { Object.assign(v, BG_DEFAULT); store.set('soc.still', '0'); document.documentElement.classList.remove('still'); apply(); };
    };
    const m = modal('', { side: true });
    draw();
  }

  /* class order: 'class' (CISO's saved order) | 'first' | 'last' name */
  function sortStudents(list, mode = 'class'){
    const name = s => (s.display_name || s.username || '').trim();
    const last = s => { const p = name(s).split(/\s+/); return (p.length > 1 ? p[p.length - 1] + ' ' + p.slice(0, -1).join(' ') : name(s)).toLowerCase(); };
    const byName = (a, b) => name(a).toLowerCase().localeCompare(name(b).toLowerCase());
    return list.sort(mode === 'last' ? (a, b) => last(a).localeCompare(last(b))
      : mode === 'first' ? byName
      : (a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9) || byName(a, b));
  }

  /* ---------------- page bootstrap ---------------- */
  // Visuals start immediately; HUD/nav fill in once the login is verified.
  async function init(active, opts = {}){
    if (store.get('soc.still') === '1') document.documentElement.classList.add('still');
    renderTicker(); splash(); hydrate();
    await guard();
    if (opts.ciso && PREVIEW){ ssSet('soc.preview', null); await loadMe(); }   // opening a CISO page ends Student View
    if (opts.ciso && ME.role !== 'ciso'){ location.replace('index.html'); return never(); }
    previewBar();
    renderHUD(); renderNav(active); annBadge(); if (active !== 'CHAT') chatBadge(); startIdleWatch();
    // show this user's own background (the login screen used whoever logged in last on this device)
    const mine = store.get(bgKey('bg')) || '{}', myImg = store.get(bgKey('bgimg')) || '';
    if (mine !== (store.get('soc.bg.last') || '{}') || myImg !== (store.get('soc.bgimg.last') || '')){
      store.set('soc.bg.last', mine); store.set('soc.bgimg.last', myImg); splash();
    }
    return ME;
  }

  window.Core = {
    init, sb, api, must, configured, refreshMe, get me(){ return ME; }, get preview(){ return PREVIEW; }, get realMe(){ return REAL; }, setPreview,
    hydrate, splash, showBackground, sortStudents, markAnnouncementsSeen, icon, esc, modal, confirmBox, toast, store, showAnnouncements, cfg: CFG
  };
})();
