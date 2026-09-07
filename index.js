const STORE_KEY = 'nakladnaya:lastdata';
const SIG_STORE_KEY = 'nakladnaya:signature';
let ROWS = 10;
let signatureDataUrl = '';
let copyMode = 2;

function setCopyMode(n){
  copyMode = n;
  document.querySelectorAll('.copy-toggle-btn').forEach(btn=>{
    btn.classList.toggle('active', Number(btn.dataset.copies) === n);
  });
}

/* ---------- Signature pad ---------- */
let sigCtx = null;
let sigDrawing = false;
let sigLastX = 0, sigLastY = 0;

function openSigPad(){
  const modal = document.getElementById('sigModal');
  modal.classList.add('open');
  const canvas = document.getElementById('sigCanvas');
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  sigCtx = canvas.getContext('2d');
  sigCtx.scale(ratio, ratio);
  sigCtx.lineWidth = 2.6;
  sigCtx.lineCap = 'round';
  sigCtx.lineJoin = 'round';
  sigCtx.strokeStyle = '#1a3fa0'; /* кок ручка ранги */
  clearSigCanvas();

  canvas.onpointerdown = sigStart;
  canvas.onpointermove = sigMove;
  canvas.onpointerup = sigEnd;
  canvas.onpointerleave = sigEnd;
}
function closeSigPad(){
  document.getElementById('sigModal').classList.remove('open');
}
function sigPos(e, canvas){
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function sigStart(e){
  sigDrawing = true;
  const canvas = e.target;
  const p = sigPos(e, canvas);
  sigLastX = p.x; sigLastY = p.y;
  canvas.setPointerCapture(e.pointerId);
}
function sigMove(e){
  if(!sigDrawing) return;
  const canvas = e.target;
  const p = sigPos(e, canvas);
  sigCtx.beginPath();
  sigCtx.moveTo(sigLastX, sigLastY);
  sigCtx.lineTo(p.x, p.y);
  sigCtx.stroke();
  sigLastX = p.x; sigLastY = p.y;
}
function sigEnd(){
  sigDrawing = false;
}
function clearSigCanvas(){
  const canvas = document.getElementById('sigCanvas');
  const ratio = window.devicePixelRatio || 1;
  sigCtx.clearRect(0, 0, canvas.width/ratio, canvas.height/ratio);
}
function isSigCanvasEmpty(){
  const canvas = document.getElementById('sigCanvas');
  const blank = document.createElement('canvas');
  blank.width = canvas.width; blank.height = canvas.height;
  return canvas.toDataURL() === blank.toDataURL();
}
async function saveSigCanvas(){
  if(isSigCanvasEmpty()){
    closeSigPad();
    return;
  }
  const canvas = document.getElementById('sigCanvas');
  signatureDataUrl = canvas.toDataURL('image/png');
  showSigPreview();
  try{ await window.storage.set(SIG_STORE_KEY, signatureDataUrl, false); }catch(e){}
  closeSigPad();
}
function showSigPreview(){
  const img = document.getElementById('sigPreview');
  const clearBtn = document.getElementById('sigClearBtn');
  if(signatureDataUrl){
    img.src = signatureDataUrl;
    img.style.display = 'inline-block';
    clearBtn.style.display = 'inline-block';
  } else {
    img.style.display = 'none';
    clearBtn.style.display = 'none';
  }
}
async function clearSavedSignature(){
  signatureDataUrl = '';
  showSigPreview();
  try{ await window.storage.set(SIG_STORE_KEY, '', false); }catch(e){}
}

function buildRows(){
  const body = document.getElementById('itemsBody');
  body.innerHTML = '';
  for(let i=1;i<=ROWS;i++){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="num">${i}</td>
      <td data-label="Наименование"><input data-row="${i}" data-field="name" type="text"></td>
      <td data-label="Ед.изм"><input data-row="${i}" data-field="unit" type="text" value="шт"></td>
      <td data-label="Кол-во"><input data-row="${i}" data-field="qty" type="text" inputmode="decimal"></td>
      <td data-label="Сумма"><input data-row="${i}" data-field="sum" type="text"></td>
    `;
    body.appendChild(tr);
  }
}
function collectItems(){
  const items = [];
  for(let i=1;i<=ROWS;i++){
    items.push({
      name: val(`[data-row="${i}"][data-field="name"]`),
      unit: val(`[data-row="${i}"][data-field="unit"]`),
      qty: val(`[data-row="${i}"][data-field="qty"]`),
      sum: val(`[data-row="${i}"][data-field="sum"]`),
    });
  }
  return items;
}
function val(sel){
  const el = document.querySelector(sel);
  return el ? el.value : '';
}
function fillItems(items){
  ROWS = Math.max(items.length, 10);
  buildRows();
  items.forEach((it,idx)=>{
    const i = idx+1;
    setVal(`[data-row="${i}"][data-field="name"]`, it.name);
    setVal(`[data-row="${i}"][data-field="unit"]`, it.unit || 'шт');
    setVal(`[data-row="${i}"][data-field="qty"]`, it.qty);
    setVal(`[data-row="${i}"][data-field="sum"]`, it.sum);
  });
}
function setVal(sel, v){
  const el = document.querySelector(sel);
  if(el) el.value = v || '';
}

function addRow(){
  const items = collectItems();
  items.push({name:'',unit:'шт',qty:'',sum:''});
  ROWS = items.length;
  buildRows();
  items.forEach((it,idx)=>{
    const i = idx+1;
    setVal(`[data-row="${i}"][data-field="name"]`, it.name);
    setVal(`[data-row="${i}"][data-field="unit"]`, it.unit);
    setVal(`[data-row="${i}"][data-field="qty"]`, it.qty);
    setVal(`[data-row="${i}"][data-field="sum"]`, it.sum);
  });
}
function removeRow(){
  if(ROWS <= 1) return;
  const items = collectItems();
  items.pop();
  ROWS = items.length;
  buildRows();
  items.forEach((it,idx)=>{
    const i = idx+1;
    setVal(`[data-row="${i}"][data-field="name"]`, it.name);
    setVal(`[data-row="${i}"][data-field="unit"]`, it.unit || 'шт');
    setVal(`[data-row="${i}"][data-field="qty"]`, it.qty);
    setVal(`[data-row="${i}"][data-field="sum"]`, it.sum);
  });
}

function gatherFormData(){
  return {
    num: g('f_num'), sender: g('f_sender'), receiver: g('f_receiver'),
    date_send: g('f_date_send'),
    sent_by: g('f_sent_by'), driver: g('f_driver'), received_by: g('f_received_by'),
    car: g('f_car'),
    items: collectItems(),
    signature: signatureDataUrl,
    copies: copyMode
  };
}
function g(id){ const el=document.getElementById(id); return el ? el.value : ''; }
function s(id,v){ const el=document.getElementById(id); if(el) el.value = v || ''; }

function formatDateForPrint(isoStr){
  if(!isoStr) return '';
  const parts = isoStr.split('-');
  if(parts.length !== 3) return isoStr;
  const [y, m, d] = parts;
  return `${d}.${m}.${y.slice(2)}`;
}
function todayISO(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}

function esc(str){
  if(!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ---------- Лотин → Кирилл (ўзбекча) ---------- */
function hasCyrillic(str){
  return /[\u0400-\u04FF]/.test(str || '');
}
function latinToCyrillicUz(str){
  if(!str) return str;
  if(hasCyrillic(str)) return str; /* аллақачон кирилча — тегмаймиз */
  let s = str;
  const AP = "['’ʻʼ`]";
  s = s.replace(new RegExp(`o${AP}`, 'g'), 'ў').replace(new RegExp(`O${AP}`, 'g'), 'Ў');
  s = s.replace(new RegExp(`g${AP}`, 'g'), 'ғ').replace(new RegExp(`G${AP}`, 'g'), 'Ғ');
  const digraphs = [['sh','ш'],['ch','ч'],['yo','ё'],['yu','ю'],['ya','я'],['ye','е']];
  digraphs.forEach(([lat, cyr])=>{
    s = s.replace(new RegExp(lat, 'g'), cyr);
    s = s.replace(new RegExp(lat.charAt(0).toUpperCase()+lat.slice(1), 'g'), cyr.toUpperCase());
    s = s.replace(new RegExp(lat.toUpperCase(), 'g'), cyr.toUpperCase());
  });
  s = s.replace(new RegExp(AP, 'g'), 'ъ');
  const singles = {
    a:'а', b:'б', d:'д', e:'е', f:'ф', g:'г', h:'ҳ', i:'и', j:'ж',
    k:'к', l:'л', m:'м', n:'н', o:'о', p:'п', q:'қ', r:'р', s:'с',
    t:'т', u:'у', v:'в', x:'х', y:'й', z:'з', c:'с'
  };
  s = s.replace(/[a-zA-Z]/g, (ch)=>{
    const cyr = singles[ch.toLowerCase()];
    if(!cyr) return ch;
    return (ch === ch.toUpperCase()) ? cyr.toUpperCase() : cyr;
  });
  return s;
}
function printText(str){
  return esc(latinToCyrillicUz(str));
}

function renderCopyHTML(data){
  let rows = '';
  data.items.forEach((it,idx)=>{
    rows += `<tr>
      <td class="c-num">${idx+1}</td>
      <td class="c-name">${printText(it.name)}</td>
      <td class="c-unit">${printText(it.unit)}</td>
      <td class="c-qty">${esc(it.qty)}</td>
      <td class="c-sum">${esc(it.sum)}</td>
    </tr>`;
  });
  const sigImg = data.signature
    ? `<img src="${data.signature}" class="sig-img">`
    : '';
  return `
    <h3>НАКЛАДНАЯ № <span class="num-underline">${esc(data.num)}</span></h3>
    <div class="meta-block">
      <div class="meta-line">Отправитель: <span class="val">${printText(data.sender)}</span></div>
      <div class="meta-line">Получатель: <span class="val">${printText(data.receiver)}</span></div>
      <div class="meta-line">Дата отправки: <span class="val">${esc(formatDateForPrint(data.date_send))}</span></div>
    </div>
    <table class="print-table">
      <colgroup>
        <col style="width:6%">
        <col style="width:50%">
        <col style="width:10%">
        <col style="width:11%">
        <col style="width:23%">
      </colgroup>
      <thead><tr><th>№</th><th>Наименование</th><th>Ед.изм</th><th>Кол-во</th><th>Сумма</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="sig-line"><span class="left">Отправил (ФИО): <span class="val">${printText(data.sent_by)}</span>${sigImg}</span><span class="tag">(подпись)</span></div>
    <div class="sig-line"><span class="left">Водитель (ФИО): <span class="val">${printText(data.driver)}</span></span><span class="tag">(подпись)</span></div>
    <div class="sig-line"><span class="left">Получил (ФИО): <span class="val">${printText(data.received_by)}</span></span><span class="tag">(подпись)</span></div>
    <div class="sig-line"><span class="left">Автомобиль: <span class="val">${esc(data.car)}</span></span><span class="tag">(подпись)</span></div>
  `;
}

async function doPrint(){
  const data = gatherFormData();
  const html = renderCopyHTML(data);
  const sheetInner = document.querySelector('#printSheet .sheet');
  document.getElementById('copyA').innerHTML = html;
  if(copyMode === 1){
    document.getElementById('copyB').innerHTML = '';
    sheetInner.classList.add('single');
  } else {
    document.getElementById('copyB').innerHTML = html;
    sheetInner.classList.remove('single');
  }
  try{
    await window.storage.set(STORE_KEY, JSON.stringify(data), false);
  }catch(e){}

  const btn = document.getElementById('pdfBtn');
  const oldText = btn.textContent;
  btn.textContent = '⏳ Тайёрланмоқда...';
  btn.disabled = true;

  const sheetEl = document.getElementById('printSheet');
  const wrapEl = document.getElementById('printSheetWrap');
  const filename = 'nakladnaya' + (data.num ? '_' + data.num.replace(/[^\w-]+/g,'') : '') + '.pdf';

  const opt = {
    margin: [5,5,5,5],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 3, useCORS: true, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['avoid-all'] }
  };

  wrapEl.classList.add('capturing');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  try{
    await html2pdf().set(opt).from(sheetEl).save();
  }catch(e){
    alert('PDF тайёрлашда хатолик юз берди. Қайта уриниб кўринг.');
  }finally{
    wrapEl.classList.remove('capturing');
    btn.textContent = oldText;
    btn.disabled = false;
  }
}

function resetForm(){
  ['f_num','f_receiver','f_sent_by','f_driver','f_received_by','f_car'].forEach(id=>s(id,''));
  s('f_date_send', todayISO());
  clearSavedSignature();
  setCopyMode(2);
  ROWS = 10;
  buildRows();
}

async function loadLast(){
  buildRows();
  try{
    const sigRes = await window.storage.get(SIG_STORE_KEY, false);
    if(sigRes && sigRes.value){
      signatureDataUrl = sigRes.value;
      showSigPreview();
    }
  }catch(e){}
  try{
    const res = await window.storage.get(STORE_KEY, false);
    if(res && res.value){
      const data = JSON.parse(res.value);
      s('f_num', data.num);
      s('f_sender', data.sender);
      s('f_receiver', data.receiver);
      s('f_date_send', data.date_send || todayISO());
      s('f_sent_by', data.sent_by);
      s('f_driver', data.driver);
      s('f_received_by', data.received_by);
      s('f_car', data.car);
      setCopyMode(data.copies === 1 ? 1 : 2);
      if(data.items && data.items.length){ fillItems(data.items); }
    } else {
      s('f_sender', '"ЭКМ" МЧЖ');
      s('f_date_send', todayISO());
    }
  }catch(e){
    s('f_sender', '"ЭКМ" МЧЖ');
    s('f_date_send', todayISO());
  }
}

loadLast();