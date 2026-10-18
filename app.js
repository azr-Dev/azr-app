// azrDev-appbuilder frontend ©azrDev
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const S = { api: localStorage.azrApi || '', key: localStorage.azrKey || '', mode: 'normal', src: 'url', icon: null, html: '', online: false, view: 'build' };
const base = () => S.api.replace(/\/$/, '');
async function api(p, o = {}) {
  const r = await fetch(base() + p, { ...o, headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1', ...(S.key ? { 'x-api-key': S.key } : {}) } });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status); return j;
}
function show(v) {
  S.view = v; const go = () => { gateSync(); $$('.view').forEach(e => e.classList.toggle('on', e.id === 'v-' + v)); $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.view === v)); };
  document.startViewTransition ? document.startViewTransition(go) : go();
}
$$('nav button').forEach(b => b.onclick = () => show(b.dataset.view));
$('#gateSet').onclick = () => show('settings');
function gateSync() { $('#gate').classList.toggle('on', !S.online && S.view !== 'settings'); }
function seg(id, key, attr) { $$('#' + id + ' button').forEach(b => b.onclick = () => { S[key] = b.dataset[attr]; $$('#' + id + ' button').forEach(x => x.classList.toggle('on', x === b)); sync(); }); }
function sync() { $('#dev').hidden = S.mode !== 'dev'; $('#urlBox').hidden = S.src !== 'url'; $('#htmlBox').hidden = S.src !== 'html'; }
seg('modeSeg', 'mode', 'mode'); seg('srcSeg', 'src', 'src'); sync();
$('#apiUrl').value = S.api; $('#apiKey').value = S.key;

async function health() {
  if (!S.api) return setOnline(false);
  try { const h = await api('/api/health'); setOnline(true, h); $('#health').textContent = JSON.stringify(h, null, 2); }
  catch (e) { setOnline(false); $('#health').textContent = 'Gagal: ' + e.message; }
}
function setOnline(on, h) {
  S.online = on; gateSync();
  const p = $('#pill'); p.className = 'pill' + (on ? ' ok' : ''); p.textContent = !on ? 'offline' : h && h.mode === 'demo' ? 'online · demo' : h && !h.ready ? 'online · belum siap' : 'online';
}
$('#saveSet').onclick = () => { S.api = $('#apiUrl').value.trim(); S.key = $('#apiKey').value; localStorage.azrApi = S.api; localStorage.azrKey = S.key; health(); };
health(); setInterval(health, 5000);

$('#htmlFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; S.html = await f.text(); $('#htmlInfo').textContent = `${f.name} (${(f.size / 1024).toFixed(1)} KB)`; };
// ikon: diperkecil ke 192x192 PNG, gambar utuh (contain) tanpa terpotong
$('#iconFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return; const img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 192; const x = c.getContext('2d'), k = Math.min(192 / img.width, 192 / img.height), w = img.width * k, h = img.height * k;
    x.drawImage(img, (192 - w) / 2, (192 - h) / 2, w, h); S.icon = c.toDataURL('image/png'); $('#iconPrev').src = S.icon; $('#iconPrev').hidden = false; };
  img.src = URL.createObjectURL(f);
};
const slug = s => s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'app';
const hist = () => JSON.parse(localStorage.azrHist || '[]');
function drawHist() { $('#hist').innerHTML = hist().map(h => `<li><span>${esc(h.name)}</span><a href="${base()}/api/download/${h.id}${S.key ? '?k=' + encodeURIComponent(S.key) : ''}">unduh</a></li>`).join('') || '<li class="muted">Kosong</li>'; }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
drawHist();

$('#f').onsubmit = async ev => {
  ev.preventDefault(); const err = $('#err'); err.hidden = true;
  const name = $('#appName').value.trim(), dev = S.mode === 'dev';
  const b = { type: S.src, appName: name, icon: S.icon, packageName: dev && $('#pkg').value.trim() ? $('#pkg').value.trim() : 'com.azrdev.' + slug(name),
    versionName: dev ? $('#vn').value : '1.0', versionCode: dev ? +$('#vc').value : 1, orientation: dev ? $('#ori').value : 'auto', themeColor: dev ? $('#theme').value : '#0b1220', fullscreen: dev && $('#full').checked };
  if (S.src === 'url') b.url = $('#url').value.trim(); else { if (!S.html) return fail('Pilih file HTML dulu'); b.html = S.html; }
  $('#start').disabled = true; $('#prog').hidden = false; $('#logs').textContent = ''; $('#barFill').style.width = '3%';
  try {
    const { jobId } = await api('/api/build', { method: 'POST', body: JSON.stringify(b) });
    for (;;) {
      await new Promise(r => setTimeout(r, 1000)); const j = await api('/api/jobs/' + jobId);
      $('#barFill').style.width = j.progress + '%'; $('#stepTxt').textContent = j.step; $('#logs').textContent = j.logs.join('\n');
      if (j.status === 'error') throw new Error(j.error);
      if (j.status === 'done') { done(jobId, j.fileName, b); break; }
    }
  } catch (e) { fail(e.message); }
  $('#start').disabled = false;
  function fail(m) { err.textContent = m; err.hidden = false; $('#start').disabled = false; }
};
function done(id, file, b) {
  localStorage.azrHist = JSON.stringify([{ id, name: file }, ...hist()].slice(0, 15)); drawHist();
  const dl = `${base()}/api/download/${id}${S.key ? '?k=' + encodeURIComponent(S.key) : ''}`;
  $('#pvScreen').innerHTML = `${S.icon ? `<img src="${S.icon}" alt="">` : ''}<h3>${esc(b.appName)}</h3><p class="muted">${esc(b.packageName)}</p>`;
  $('#pvInfo').innerHTML = `<h3>${esc(file)}</h3><p class="muted">Siap dipasang. Aktifkan "Install dari sumber tidak dikenal".</p><a class="start" style="display:inline-block;text-decoration:none" href="${dl}"><span>Unduh APK</span></a>`;
  show('preview');
}
