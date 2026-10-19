/* ============================ РЕЕСТР СЕРВИСОВ ============================ */
const SERVICES = [
  {
    id: 'diary',
    name: 'Дневник',
    icon: '📓',
    description: 'Выгрузи то, что вертится в голове. Не влияет на баллы.',
  },
  {
    id: 'medications',
    name: 'Витамины',
    icon: '💊',
    description: 'План приема и проверка совместимости препаратов.',
  }
];

let currentServiceId = null;
let serviceView = 'list';

function renderServices(){
  const listEl = $('#servicesList');
  const viewEl = $('#serviceView');
  if(!listEl || !viewEl) return;

  if(serviceView === 'list'){
    listEl.style.display = '';
    viewEl.style.display = 'none';
    renderServicesList();
  } else {
    listEl.style.display = 'none';
    viewEl.style.display = '';
    
    if(currentServiceId === 'diary'){
      if(serviceView === 'editor') renderDiaryEditor();
      else renderDiaryView();
    } else if(currentServiceId === 'medications'){
      renderMedsView();
    }
  }
}

function openService(id){
  currentServiceId = id;
  serviceView = 'service';
  
  if(id === 'diary' && typeof loadDiary === 'function'){
    loadDiary().then(() => renderServices());
  } else if(id === 'medications' && typeof openMedications === 'function'){
    openMedications();
  } else {
    renderServices();
  }
}

function renderServicesList(){
  let h = `<div class="services-intro">
    <h2>🧰 Сервисы</h2>
    <p class="hint">Дополнительные инструменты. Не влияют на баллы и статистику.</p>
  </div>`;

  h += `<div class="services-grid">`;
  for(const s of SERVICES){
    h += `<div class="service-card" data-service="${s.id}">
      <div class="service-icon">${s.icon}</div>
      <div class="service-info">
        <div class="service-name">${s.name}</div>
        <div class="service-desc">${s.description}</div>
      </div>
      <div class="service-arrow">›</div>
    </div>`;
  }
  h += `</div>`;
  $('#servicesList').innerHTML = h;
}

function openService(id){
  currentServiceId = id;
  serviceView = 'service';
  if(id === 'diary' && typeof loadDiary === 'function'){
    loadDiary().then(() => renderServices());
  } else {
    renderServices();
  }
}

function closeService(){
  currentServiceId = null;
  serviceView = 'list';
  renderServices();
}

function openServiceEditor(){
  serviceView = 'editor';
  renderServices();
}

function closeServiceEditor(){
  serviceView = 'service';
  renderServices();
}