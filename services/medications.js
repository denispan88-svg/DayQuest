/* ============================ СЕРВИС: ВИТАМИНЫ И МЕДИКАМЕНТЫ ============================ */
const MEDS_LS_KEY = 'dayquest_meds_v1';

let medState = null;
let medView = 'main'; 
let currentIntakeId = null;
let addingVitaminId = null; 

function freshMedState(){
  return { intakes: [], vitamins: [] };
}

async function loadMeds(){
  let raw = null;
  try{ raw = await Storage.get(MEDS_LS_KEY); }catch(e){ raw = null; }
  try{ medState = raw ? JSON.parse(raw) : null; }catch(e){ medState = null; }
  if(!medState || typeof medState !== 'object') medState = freshMedState();
  if(!Array.isArray(medState.intakes)) medState.intakes = [];
  if(!Array.isArray(medState.vitamins)) medState.vitamins = [];
  return medState;
}

async function saveMeds(){
  try{ await Storage.set(MEDS_LS_KEY, JSON.stringify(medState)); }catch(e){}
}

function openMedications(){
  medView = 'main';
  currentIntakeId = null;
  addingVitaminId = null;
  loadMeds().then(() => renderServices());
}

function setMedView(view, intakeId = null){
  medView = view;
  if(intakeId) currentIntakeId = intakeId;
  renderServices();
}

// --- Логика совместимости ---
function getCompatibility(v1Id, v2Id) {
  const v1 = medState.vitamins.find(v => v.id === v1Id);
  if (!v1 || !v1.compat) return 'neutral';
  return v1.compat[v2Id] || 'neutral';
}

function canAddToIntake(intake, vitaminId) {
  for (let item of intake.items) {
    if (getCompatibility(item.vitaminId, vitaminId) === 'incompat' ||
        getCompatibility(vitaminId, item.vitaminId) === 'incompat') {
      return false;
    }
  }
  return true;
}

// --- Действия с приемами и галочками ---
function createIntake(name){
  if(!name || !name.trim()) return;
  medState.intakes.push({ id: uid(), name: name.trim(), items: [] });
  saveMeds();
  renderServices();
  toast('Прием создан 💊');
}

function deleteIntake(id){
  if(!confirm('Удалить этот прием вместе со всеми препаратами?')) return;
  medState.intakes = medState.intakes.filter(i => i.id !== id);
  saveMeds();
  renderServices();
}

function toggleIntakeItem(intakeId, vitaminId) {
  const intake = medState.intakes.find(i => i.id === intakeId);
  if(!intake) return;
  const item = intake.items.find(i => i.vitaminId === vitaminId);
  if(!item) return;
  
  const today = todayKey();
  if (item.takenDate === today) {
    item.takenDate = null; // снимаем галочку
  } else {
    item.takenDate = today; // ставим галочку
  }
  
  saveMeds();
  renderServices(); // перерисовываем интерфейс
}

function saveVitaminDosage(dosage){
  const intake = medState.intakes.find(i => i.id === currentIntakeId);
  if(!intake || !addingVitaminId || !dosage || !dosage.trim()) return;
  
  if(!canAddToIntake(intake, addingVitaminId)) {
    toast('Этот витамин несовместим с теми, что уже есть');
    return;
  }

  intake.items.push({ vitaminId: addingVitaminId, dosage: dosage.trim(), takenDate: null });
  addingVitaminId = null;
  saveMeds();
  setMedView('main');
  toast('Добавлено 💊');
}

function removeVitaminFromIntake(intakeId, vitaminId){
  const intake = medState.intakes.find(i => i.id === intakeId);
  if(!intake) return;
  intake.items = intake.items.filter(i => i.vitaminId !== vitaminId);
  saveMeds();
  renderServices();
}

// --- Действия с витаминами ---
function deleteVitamin(id){
  if(!confirm('Удалить витамин из списка? Он исчезнет из всех приемов.')) return;
  medState.vitamins = medState.vitamins.filter(v => v.id !== id);
  for(const intake of medState.intakes){
    intake.items = intake.items.filter(i => i.vitaminId !== id);
  }
  saveMeds();
  renderServices();
}

function getVitaminUsageCount(vitaminId) {
  let count = 0;
  for (const intake of medState.intakes) {
    if (intake.items.some(i => i.vitaminId === vitaminId)) count++;
  }
  return count;
}

function saveNewVitamin(){
  const nameInput = document.getElementById('newVitName');
  if(!nameInput || !nameInput.value.trim()) { toast('Введите название'); return; }
  const name = nameInput.value.trim();

  const newVitId = uid();
  const compat = {};
  
  document.querySelectorAll('select[data-compat-with]').forEach(sel => {
    compat[sel.dataset.compatWith] = sel.value;
  });

  medState.vitamins.push({ id: newVitId, name, compat });
  saveMeds();
  setMedView('vitamins');
  toast('Витамин создан 💊');
}

// --- Рендер ---
function renderMedsView(){
  const viewEl = $('#serviceView');
  if(!viewEl) return;

  if(medView === 'main') {
    let h = `<div class="service-head">
      <button class="back-btn" id="serviceBack">← Сервисы</button>
      <h2 class="service-title">💊 Витамины</h2>
    </div>`;

    // Форма создания приема
    h += `<div style="display:flex; gap:8px; margin-bottom:20px;">
      <input type="text" id="newIntakeNameInput" class="field" placeholder="Утро, Обед, Вечер..." maxlength="40">
      <button class="btn gold" id="medCreateIntakeBtn" style="flex:none; padding: 0 16px;">Создать</button>
    </div>`;

    if(!medState.intakes.length) {
      h += `<div class="card"><div class="empty-note" style="text-align:center;padding:20px">Нет созданных приемов.</div></div>`;
    } else {
      // Выводим приемы и сразу медикаменты
      for(const intake of medState.intakes) {
        h += `<div class="med-card">
          <div class="med-card-head">
            <div class="med-item-title">🕒 ${esc(intake.name)}</div>
            <div style="display:flex; gap:6px;">
              <button class="mini-btn" data-med-add-vit="${intake.id}">+ Добавить</button>
              <button class="mini-btn" data-med-del-intake="${intake.id}">🗑</button>
            </div>
          </div>
          <div class="med-card-body">`;

        if(!intake.items.length) {
          h += `<div class="med-item-sub" style="padding: 10px 0;">Прием пуст</div>`;
        } else {
          for(const item of intake.items) {
            const vit = medState.vitamins.find(v => v.id === item.vitaminId);
            const isChecked = (item.takenDate === todayKey());
            const vitName = vit ? vit.name : 'Удален';
            
            h += `<div class="med-check-row ${isChecked ? 'on' : ''}" data-med-toggle="${intake.id}:${item.vitaminId}">
              <span class="check">${isChecked ? '✓' : ''}</span>
              <div class="med-check-info">
                <span class="med-check-name">${esc(vitName)}</span>
                <span class="med-check-dose">${esc(item.dosage)}</span>
              </div>
              <button class="mini-btn" data-med-rem-vit="${intake.id}:${item.vitaminId}">✕</button>
            </div>`;
          }
        }
        h += `</div></div>`;
      }
    }

    h += `<button class="btn ghost full" id="medVitaminsBtn" style="margin-top:20px; margin-bottom:20px;">📋 Список всех витаминов</button>`;
    viewEl.innerHTML = h;
  }

  else if(medView === 'addToIntake') {
    const intake = medState.intakes.find(i => i.id === currentIntakeId);
    if(!intake) { setMedView('main'); return; }

    let h = `<div class="service-head">
      <button class="back-btn" id="medBackMain">← Назад</button>
      <h2 class="service-title">Добавить в ${esc(intake.name)}</h2>
    </div>`;

    const available = medState.vitamins.filter(v => canAddToIntake(intake, v.id));

    if(!available.length) {
      h += `<div class="card"><div class="empty-note" style="text-align:center;padding:20px">Нет совместимых витаминов для добавления.</div></div>`;
    } else {
      for(const vit of available) {
        h += `<div class="med-item" data-med-pick-vit="${vit.id}">
          <div class="med-item-head"><div class="med-item-title">💊 ${esc(vit.name)}</div></div>
        </div>`;
      }
    }
    viewEl.innerHTML = h;
  }

  else if(medView === 'inputDosage') {
    const vit = medState.vitamins.find(v => v.id === addingVitaminId);
    if(!vit) { setMedView('main'); return; }

    let h = `<div class="service-head">
      <button class="back-btn" id="medBackAddIntake">← Отмена</button>
      <h2 class="service-title">Дозировка</h2>
    </div>`;
    
    h += `<div class="card" style="margin-bottom:16px;">
      <div style="font-size:15px; font-weight:700; margin-bottom:10px;">💊 ${esc(vit.name)}</div>
      <input type="text" id="dosageInput" class="field" placeholder="Например: 2 таб или 500 мг" maxlength="40">
    </div>`;
    
    h += `<button class="btn green full" id="medSaveDosage">Добавить в прием</button>`;
    viewEl.innerHTML = h;
  }

  else if(medView === 'vitamins') {
    let h = `<div class="service-head">
      <button class="back-btn" id="medBackMainFromVits">← К приемам</button>
      <h2 class="service-title">📋 Список витаминов</h2>
    </div>`;

    h += `<button class="btn gold full" id="medNewVitamin" style="margin-bottom:16px">➕ Создать витамин</button>`;

    if(!medState.vitamins.length) {
      h += `<div class="card"><div class="empty-note" style="text-align:center;padding:20px">Список пуст.</div></div>`;
    } else {
      for(const vit of medState.vitamins) {
        const usage = getVitaminUsageCount(vit.id);
        h += `<div class="med-item">
          <div class="med-item-head">
            <div class="med-item-title">💊 ${esc(vit.name)}</div>
            <button class="mini-btn" data-med-del-vit="${vit.id}">🗑</button>
          </div>
          <div class="med-item-sub">В ${usage} приемах</div>
        </div>`;
      }
    }
    viewEl.innerHTML = h;
  }

  else if(medView === 'createVitamin') {
    let h = `<div class="service-head">
      <button class="back-btn" id="medBackVits">← Отмена</button>
      <h2 class="service-title">Новый витамин</h2>
    </div>`;

    h += `<div class="diary-field">
      <label class="diary-label">Название</label>
      <input type="text" id="newVitName" class="field" placeholder="Например: Витамин D3" maxlength="50">
    </div>`;

    if(medState.vitamins.length > 0) {
      h += `<div class="diary-field" style="margin-top:20px">
        <label class="diary-label">Совместимость</label>`;
      
      for(const existing of medState.vitamins) {
        h += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background:rgba(255,255,255,.04); padding:10px; border-radius:10px;">
          <span style="font-size:13px;">${esc(existing.name)}</span>
          <select class="field" data-compat-with="${existing.id}" style="width:140px; padding:6px; flex:none;">
            <option value="synergy">Синергия</option>
            <option value="neutral" selected>Нейтрально</option>
            <option value="incompat">Несовместимо</option>
          </select>
        </div>`;
      }
      h += `</div>`;
    }

    h += `<button class="btn green full" id="medSaveVitamin" style="margin-top:20px">💾 Сохранить</button>`;
    viewEl.innerHTML = h;
  }
}