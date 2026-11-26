/* =====================================================================
   SOC COMMAND — LabKit
   Shared by the lab player, Lab Builder preview, live monitor and review:
     • LabKit.md(text)                 safe mini-Markdown → HTML
     • LabKit.render(el, lab, opts)    draws a Lab Builder lab
     • LabKit.progress(lab, state)     how far a student is in a built lab
     • LabKit.htmlDoc(html, state, o)  wraps an uploaded HTML lab for its sandbox
     • LabKit.texts(data)              pulls written answers out of saved HTML-lab data
   ===================================================================== */
window.LabKit = (function(){
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const newId = () => Math.random().toString(36).slice(2, 10);

  /* ---------- mini Markdown: # headings, **bold**, *italic*, `code`, ```blocks```, lists, links, images ---------- */
  function inline(t){
    return esc(t)
      .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="lk-img">')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>');
  }
  function md(src){
    const parts = String(src ?? '').replace(/\r/g, '').split(/^```.*$/m);
    return parts.map((part, i) => {
      if (i % 2) return `<pre class="lk-code">${esc(part.replace(/^\n|\n$/g, ''))}</pre>`;
      const out = []; let list = null;
      const close = () => { if (list){ out.push(`</${list}>`); list = null; } };
      part.split('\n').forEach(line => {
        let m;
        if ((m = line.match(/^(#{1,3})\s+(.*)/))){ close(); out.push(`<h${m[1].length + 2} class="lk-h">${inline(m[2])}</h${m[1].length + 2}>`); }
        else if ((m = line.match(/^\s*[-*]\s+(.*)/))){ if (list !== 'ul'){ close(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); }
        else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))){ if (list !== 'ol'){ close(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); }
        else if (!line.trim()){ close(); out.push(''); }
        else { close(); out.push(`<p>${inline(line)}</p>`); }
      });
      close();
      return out.join('\n');
    }).join('');
  }

  /* ---------- progress of a built lab ---------- */
  function progress(lab, state){
    const blocks = (lab.content || []).filter(b => !b.locked);
    const s = state || {}, ans = s.answers || {}, shots = s.shots || {};
    const qs = blocks.filter(b => b.type === 'question'), ss = blocks.filter(b => b.type === 'screenshot');
    const qDone = qs.filter(b => String(ans[b.id] || '').trim()).length;
    const sDone = ss.filter(b => (shots[b.id] || []).length).length;
    const total = qs.length + ss.length;
    return { qDone, qTotal: qs.length, sDone, sTotal: ss.length, pct: total ? (qDone + sDone) / total : 0,
             lockedCount: (lab.content || []).filter(b => b.locked).length };
  }

  /* ---------- draw a built lab ----------
     opts.mode:    'student' (editable) | 'review' (CISO, read-only, shows locked items) | 'preview' (builder)
     opts.readOnly student view after submitting
     opts.state    { answers: {blockId: text}, shots: {blockId: [path]} }
     opts.onChange(state)      student edits
     opts.upload(file, block)  → resolves to a storage path
     opts.remove(path)         deletes an uploaded file
     opts.imgUrl(path)         → resolves to a viewable URL                                        */
  function render(el, lab, opts = {}){
    const mode = opts.mode || 'student';
    const state = opts.state || {};
    state.answers = state.answers || {}; state.shots = state.shots || {};
    const editable = mode === 'student' && !opts.readOnly;
    let qn = 0, sn = 0;

    el.innerHTML = (lab.content || []).map(b => {
      const lockedForStudent = b.locked && mode === 'student';
      const lockTag = b.locked && mode !== 'student' ? '<span class="lk-lock">LOCKED FOR STUDENTS</span>' : '';
      if (b.type === 'text'){
        if (lockedForStudent) return `<section class="lk-block lk-locked"><b>🔒 More instructions coming.</b> Your CISO will unlock this section.</section>`;
        return `<section class="lk-block lk-text" data-b="${b.id}">${lockTag}${md(b.body)}</section>`;
      }
      if (b.type === 'question'){
        qn++;
        const head = `<div class="lk-qhead">QUESTION ${qn}${b.points ? ` · ${b.points} PTS` : ''}${lockTag}</div>`;
        if (lockedForStudent) return `<section class="lk-block lk-locked">${head}<b>🔒 Locked.</b> Your CISO will unlock this question.</section>`;
        const val = state.answers[b.id] || '';
        const answer = mode === 'student'
          ? `<textarea class="lk-answer" data-answer="${b.id}" rows="5" placeholder="Type your answer here…" ${editable ? '' : 'readonly'}>${esc(val)}</textarea>`
          : mode === 'review'
            ? `<div class="lk-given ${val.trim() ? '' : 'empty'}">${val.trim() ? esc(val) : 'No answer yet.'}</div>`
            : `<textarea class="lk-answer" rows="3" placeholder="Students type their answer here…" disabled></textarea>`;
        return `<section class="lk-block lk-q" data-b="${b.id}">${head}<div class="lk-prompt">${md(b.body)}</div>${answer}</section>`;
      }
      if (b.type === 'screenshot'){
        sn++;
        const head = `<div class="lk-qhead">SCREENSHOT ${sn}${lockTag}</div>`;
        if (lockedForStudent) return `<section class="lk-block lk-locked">${head}<b>🔒 Locked.</b> Your CISO will unlock this step.</section>`;
        const files = state.shots[b.id] || [];
        const thumbs = files.map(p => `<figure class="lk-thumb" data-path="${esc(p)}"><img alt="screenshot" data-src="${esc(p)}">
            ${editable ? '<button class="lk-x" data-remove title="Remove">✕</button>' : ''}</figure>`).join('');
        const drop = editable ? `<div class="lk-drop" tabindex="0" data-drop="${b.id}">
            <b>📷 Add screenshot</b><span>Click to choose a file · or click here and press <kbd>Ctrl</kbd>+<kbd>V</kbd> to paste</span>
            <input type="file" accept="image/*" hidden data-file="${b.id}"></div>` :
          mode === 'preview' ? `<div class="lk-drop disabled"><b>📷 Add screenshot</b><span>Students upload or paste a screenshot here</span></div>` : '';
        return `<section class="lk-block lk-shot" data-b="${b.id}">${head}<div class="lk-prompt">${md(b.body)}</div>
          <div class="lk-thumbs">${thumbs || (mode === 'review' ? '<div class="lk-given empty">No screenshot yet.</div>' : '')}</div>${drop}</section>`;
      }
      return '';
    }).join('') || '<p class="lk-empty">This lab has no content yet.</p>';

    // load images
    el.querySelectorAll('img[data-src]').forEach(async img => {
      if (!opts.imgUrl) return;
      try { img.src = await opts.imgUrl(img.dataset.src); } catch(e){ img.alt = 'image unavailable'; }
      img.onclick = () => window.open(img.src, '_blank', 'noopener');
    });
    if (!editable) return;

    // typing
    el.querySelectorAll('[data-answer]').forEach(t => t.addEventListener('input', () => {
      state.answers[t.dataset.answer] = t.value; opts.onChange && opts.onChange(state);
    }));
    // uploads
    const add = async (blockId, file) => {
      if (!file || !/^image\//.test(file.type)) return alert('Please choose an image file.');
      if (file.size > 10 * 1024 * 1024) return alert('That image is larger than 10 MB.');
      const drop = el.querySelector(`[data-drop="${blockId}"]`); drop.classList.add('busy');
      try {
        const path = await opts.upload(file, blockId);
        (state.shots[blockId] = state.shots[blockId] || []).push(path);
        opts.onChange && opts.onChange(state);
        render(el, lab, opts);
      } catch(e){ alert('Upload failed: ' + e.message); drop.classList.remove('busy'); }
    };
    el.querySelectorAll('[data-drop]').forEach(d => {
      const input = d.querySelector('input');
      d.addEventListener('click', () => input.click());
      d.addEventListener('keydown', e => { if (e.key === 'Enter') input.click(); });
      input.addEventListener('change', () => add(d.dataset.drop, input.files[0]));
      d.addEventListener('paste', e => {
        const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
        if (item){ e.preventDefault(); add(d.dataset.drop, item.getAsFile()); }
      });
      d.addEventListener('dragover', e => { e.preventDefault(); d.classList.add('over'); });
      d.addEventListener('dragleave', () => d.classList.remove('over'));
      d.addEventListener('drop', e => { e.preventDefault(); d.classList.remove('over'); add(d.dataset.drop, e.dataTransfer.files[0]); });
    });
    el.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', async () => {
      const fig = btn.closest('[data-path]'), path = fig.dataset.path, blockId = btn.closest('[data-b]').dataset.b;
      if (!confirm('Remove this screenshot?')) return;
      try { if (opts.remove) await opts.remove(path); } catch(e){}
      state.shots[blockId] = (state.shots[blockId] || []).filter(p => p !== path);
      opts.onChange && opts.onChange(state);
      render(el, lab, opts);
    }));
  }

  /* ---------- uploaded HTML labs: sandbox bridge ----------
     persist=true  → the lab's localStorage is reported to the page so it can be saved
     persist=false → read-only replay (CISO review): changes stay in memory only          */
  function htmlDoc(html, state, o = {}){
    const persist = o.persist !== false;
    const bridge = `<script>(function(){
      var data = ${JSON.stringify(state || {}).replace(/</g, '\\u003c')};
      var PERSIST = ${persist ? 'true' : 'false'};
      var t; function push(){ if (!PERSIST) return; clearTimeout(t); t = setTimeout(function(){ parent.postMessage({soc:'state', state:data}, '*'); }, 400); }
      function mk(d, saveIt){ return {
        getItem:function(k){ return Object.prototype.hasOwnProperty.call(d,k) ? d[k] : null; },
        setItem:function(k,v){ d[k] = String(v); if(saveIt) push(); },
        removeItem:function(k){ delete d[k]; if(saveIt) push(); },
        clear:function(){ for (var k in d) delete d[k]; if(saveIt) push(); },
        key:function(i){ var k = Object.keys(d)[i]; return k === undefined ? null : k; },
        get length(){ return Object.keys(d).length; } }; }
      try { Object.defineProperty(window, 'localStorage',   { value: mk(data, true), configurable: true }); } catch(e){}
      try { Object.defineProperty(window, 'sessionStorage', { value: mk({}, false),  configurable: true }); } catch(e){}
      window.addEventListener('click', function(e){
        var a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
        if (!a || e.defaultPrevented) return;
        e.preventDefault();
        var h = a.getAttribute('href');
        if (h.length > 1) location.hash = h; else window.scrollTo(0, 0);
      });
      var lastPing = 0;
      ['mousemove','mousedown','keydown','scroll','touchstart','wheel'].forEach(function(ev){
        window.addEventListener(ev, function(){ var n = Date.now(); if (n - lastPing > 15000){ lastPing = n; parent.postMessage({soc:'activity'}, '*'); } }, {passive:true, capture:true});
      });
      window.SOC_LAB = {
        progress: function(o){ parent.postMessage({soc:'progress', score:o&&o.score, max:o&&o.max}, '*'); },
        complete: function(o){ if (PERSIST) parent.postMessage({soc:'complete', score:o&&o.score, max:o&&o.max, answers:o&&o.answers}, '*'); }
      };
    })();<\/script>`;
    html = String(html || '');
    const headAt = html.search(/<head[^>]*>/i);
    if (headAt >= 0){ const end = html.indexOf('>', headAt) + 1; return html.slice(0, end) + bridge + html.slice(end); }
    return bridge + html;
  }

  /* ---------- written answers inside saved HTML-lab data ---------- */
  function texts(d){
    const out = [];
    const walk = (v, path) => {
      if (typeof v === 'string'){
        if (/^[\[{]/.test(v.trim())){ try { return walk(JSON.parse(v), path); } catch(e){} }
        if (v.trim().split(/\s+/).length >= 4) out.push([path, v]);
      } else if (v && typeof v === 'object') for (const k in v) walk(v[k], path ? `${path} › ${k}` : k);
    };
    walk(d, '');
    return out;
  }

  return { md, render, progress, htmlDoc, texts, newId, esc };
})();
