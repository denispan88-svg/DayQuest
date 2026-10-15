/* ============================ СЕРВИС: ДНЕВНИК ============================ */
const DIARY_LS_KEY = 'dayquest_diary_v1';

const DIARY_FIELDS = [
  { key: 'thoughts',    label: 'Текущие мысли',                hint: 'Что сейчас вертится в голове? Выгрузи всё.' },
  { key: 'causes',      label: 'В чём причины',                hint: 'Что привело к этой ситуации?' },
  { key: 'feelings',    label: 'Что ты чувствуешь',            hint: 'Назови эмоции как можно точнее.' },
  { key: 'cantControl', label: 'На что ты не можешь повлиять', hint: 'Отдели зону своего контроля от чужой.' },
  { key: 'solutions',   label: 'Как это можно решить',         hint: 'Варианты действий или как разрешится само.' },
  { key: 'pluses',      label: 'Какие есть плюсы',             hint: 'Даже в плохом можно найти что-то полезное.' },
  { key: 'lessons',     label: 'Какой опыт приобретён',        hint: 'Чему это тебя научило?' },
];

let diaryState = null;
let editingEntryId = null;

function freshDiary(){ return { entries: [] }; }

async function loadDiary(){
  let raw = null;
  try{ raw = await Storage.get(DIARY_LS_KEY); }catch(e){ raw = null; }
  try{ diaryState = raw ? JSON.parse(raw) : null; }catch(e){ diaryState = null; }
  if(!diaryState || typeof diaryState !== 'object') diaryState = freshDiary();
  if(!Array.isArray(diaryState.entries)) diaryState.entries = [];
  return diaryState;
}

async function saveDiary(){
  try{ await Storage.set(DIARY_LS_KEY, JSON.stringify(diaryState)); }catch(e){}
}

function newDiaryEntry(){
  const now = new Date().toISOString();
  const entry = {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    thoughts: '', causes: '', feelings: '',
    cantControl: '', solutions: '', pluses: '', lessons: '',
  };
  diaryState.entries.unshift(entry);
  editingEntryId = entry.id;
  saveDiary();
  openServiceEditor();
  setTimeout(() => {
    const first = document.querySelector('[data-diary-field="thoughts"]');
    if(first) first.focus();
  }, 120);
}

function getDiaryEntry(id){
  return diaryState.entries.find(e => e.id === id);
}

function deleteDiaryEntry(id){
  if(!confirm('Удалить эту запись? Это нельзя отменить.')) return;
  diaryState.entries = diaryState.entries.filter(e => e.id !== id);
  saveDiary();
  renderServices();
}

function saveDiaryEntryFromForm(){
  const entry = getDiaryEntry(editingEntryId);
  if(!entry) return;
  for(const f of DIARY_FIELDS){
    const el = document.querySelector(`[data-diary-field="${f.key}"]`);
    if(el) entry[f.key] = el.value;
  }
  entry.updatedAt = new Date().toISOString();
  saveDiary();
  toast('Запись сохранена 📓');
  closeServiceEditor();
}

function discardDiaryEntry(){
  const entry = getDiaryEntry(editingEntryId);
  if(entry){
    const isEmpty = DIARY_FIELDS.every(f => !(entry[f.key] || '').trim());
    if(isEmpty){
      diaryState.entries = diaryState.entries.filter(e => e.id !== editingEntryId);
      saveDiary();
    }
  }
  closeServiceEditor();
}

function formatDiaryDate(iso){
  const d = new Date(iso);
  const pad2 = n => String(n).padStart(2, '0');
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function diaryEntryPreview(entry){
  for(const f of DIARY_FIELDS){
    const val = (entry[f.key] || '').trim();
    if(val) return val.length > 100 ? val.slice(0, 100) + '…' : val;
  }
  return 'Пустая запись';
}

function diaryFilledCount(entry){
  return DIARY_FIELDS.filter(f => (entry[f.key] || '').trim()).length;
}

function renderDiaryView(){
  const viewEl = $('#serviceView');
  if(!viewEl) return;
  const entries = diaryState ? diaryState.entries : [];

  let h = `<div class="service-head">
    <button class="back-btn" id="serviceBack">← Сервисы</button>
    <h2 class="service-title">📓 Дневник</h2>
    <div class="hint" style="margin-top:6px">Выгрузи то, что вертится в голове. Баллы это не трогает.</div>
  </div>`;

  h += `<button class="btn gold full" id="diaryNew" style="margin-bottom:16px">✏️ Создать новую запись</button>`;

  if(!entries.length){
    h += `<div class="card"><div class="empty-note" style="text-align:center;padding:20px">
      Пока пусто. Создай первую запись — и голова станет легче.
    </div></div>`;
  } else {
    for(const e of entries){
      const preview = esc(diaryEntryPreview(e));
      const date = formatDiaryDate(e.updatedAt || e.createdAt);
      const filled = diaryFilledCount(e);
      h += `<div class="diary-item" data-diary-open="${e.id}">
        <div class="diary-item-head">
          <div class="diary-item-date">${date} · ${filled}/7</div>
          <button class="mini-btn" data-diary-del="${e.id}" onclick="event.stopPropagation()">🗑</button>
        </div>
        <div class="diary-item-preview">${preview}</div>
      </div>`;
    }
  }
  viewEl.innerHTML = h;
}

function renderDiaryEditor(){
  const viewEl = $('#serviceView');
  if(!viewEl) return;
  const entry = getDiaryEntry(editingEntryId);
  if(!entry){
    viewEl.innerHTML = `<div class="hint">Запись не найдена.</div>`;
    return;
  }

  let h = `<div class="service-head">
    <button class="back-btn" id="diaryBack">← Отмена</button>
    <h2 class="service-title">📓 Запись</h2>
  </div>`;

  for(const f of DIARY_FIELDS){
    const val = esc(entry[f.key] || '');
    h += `<div class="diary-field">
      <label class="diary-label">${f.label}</label>
      <textarea class="diary-textarea" data-diary-field="${f.key}" placeholder="${esc(f.hint)}">${val}</textarea>
    </div>`;
  }

  h += `<div class="diary-actions">
    <button class="btn ghost" id="diaryCancel">Отмена</button>
    <button class="btn green" id="diarySave">💾 Сохранить</button>
  </div>`;

  viewEl.innerHTML = h;

  viewEl.querySelectorAll('textarea.diary-textarea').forEach(ta => {
    const grow = () => {
      ta.style.height = 'auto';
      ta.style.height = Math.max(100, ta.scrollHeight) + 'px';
    };
    grow();
    ta.addEventListener('input', grow);
  });
}