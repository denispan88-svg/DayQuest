/* ============================ СЕРВИС: КАРТА СВЯЗЕЙ ============================ */
const NETWORK_LS_KEY = 'dayquest_network_v1';

let networkState = null;
let networkMode = 'list';
let editingNodeId = null;
let pendingNetworkDeleteId = null;

// Состояние зума и панорамирования
let panZoomState = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let startPan = { x: 0, y: 0 };
let initialPinchDistance = 0;
let initialScale = 1;

const TEMPERAMENTS = [
  { key: 'choleric', label: 'Холерик' },
  { key: 'sanguine', label: 'Сангвиник' },
  { key: 'phlegmatic', label: 'Флегматик' },
  { key: 'melancholic', label: 'Меланхолик' }
];

const REL_TYPES = [
  { key: 'friend', label: 'Дружеский', color: '#3ddc97' },
  { key: 'love', label: 'Любовный', color: '#ff6b6b' },
  { key: 'work', label: 'Рабочий', color: '#42d3ff' }
];

function freshNetworkState(){ return { nodes: [], edges: [] }; }

async function loadNetwork(){
  let raw = null;
  try{ raw = await Storage.get(NETWORK_LS_KEY); }catch(e){ raw = null; }
  try{ networkState = raw ? JSON.parse(raw) : null; }catch(e){ networkState = null; }
  if(!networkState || typeof networkState !== 'object') networkState = freshNetworkState();
  if(!Array.isArray(networkState.nodes)) networkState.nodes = [];
  
  // МИГРАЦИЯ: превращаем старые node.connections в отдельные рёбра
  if(!Array.isArray(networkState.edges)) {
    networkState.edges = [];
    for (const node of networkState.nodes) {
      if (!Array.isArray(node.connections)) continue;
      for (const conn of node.connections) {
        let types = conn.types;
        if (Array.isArray(types)) {
          const oldStrength = conn.strength || 5;
          const newTypes = {};
          types.forEach(t => newTypes[t] = oldStrength);
          types = newTypes;
        }
        // Проверяем, нет ли уже такого ребра (с любой стороны)
        const existing = networkState.edges.find(e =>
          (e.a === node.id && e.b === conn.targetId) ||
          (e.a === conn.targetId && e.b === node.id)
        );
        if (!existing) {
          networkState.edges.push({
            id: uid(),
            a: node.id,
            b: conn.targetId,
            types: types
          });
        }
      }
      delete node.connections;
    }
  }
  
  // Убираем "битые" рёбра, указывающие на удалённых людей
  const nodeIds = new Set(networkState.nodes.map(n => n.id));
  networkState.edges = networkState.edges.filter(e => nodeIds.has(e.a) && nodeIds.has(e.b));
  
  return networkState;
}

async function saveNetwork(){
  try{ await Storage.set(NETWORK_LS_KEY, JSON.stringify(networkState)); }catch(e){}
}

function openNetwork(){
  networkMode = 'list';
  editingNodeId = null;
  panZoomState = { x: 0, y: 0, scale: 1 };
  loadNetwork().then(() => renderServices());
}

function setNetworkMode(mode, nodeId = null){
  networkMode = mode;
  if(nodeId) editingNodeId = nodeId;
  renderServices();
}

function getNetworkNode(id){
  return networkState.nodes.find(n => n.id === id);
}

// --- Хелперы для рёбер ---
function findEdge(id1, id2){
  return networkState.edges.find(e =>
    (e.a === id1 && e.b === id2) || (e.a === id2 && e.b === id1)
  );
}

function getEdgesForNode(nodeId){
  return networkState.edges.filter(e => e.a === nodeId || e.b === nodeId);
}

function getOtherNodeId(edge, nodeId){
  return edge.a === nodeId ? edge.b : edge.a;
}

// --- Действия с досье ---
function createNetworkNode(){
  const newId = uid();
  networkState.nodes.push({
    id: newId,
    name: 'Новое досье',
    likes: '',
    hobbies: '',
    temperament: { choleric: 5, sanguine: 5, phlegmatic: 5, melancholic: 5 },
    x: 150,
    y: 150
  });
  saveNetwork();
  setNetworkMode('editor', newId);
}

function deleteNetworkNode(id){
  if (pendingNetworkDeleteId === id) {
    networkState.nodes = networkState.nodes.filter(n => n.id !== id);
    // Удаляем все связи, где фигурирует этот человек
    networkState.edges = networkState.edges.filter(e => e.a !== id && e.b !== id);
    saveNetwork();
    pendingNetworkDeleteId = null;
    renderServices();
    toast('Досье и его связи удалены 🗑');
  } else {
    pendingNetworkDeleteId = id;
    renderServices();
    toast('Нажмите еще раз для удаления');
    setTimeout(() => {
        if (pendingNetworkDeleteId === id) {
            pendingNetworkDeleteId = null;
            renderServices();
        }
    }, 3000);
  }
}

function saveNetworkNodeFromForm(){
  const node = getNetworkNode(editingNodeId);
  if(!node) return;

  node.name = document.getElementById('netName').value.trim() || 'Без имени';
  node.likes = document.getElementById('netLikes').value.trim();
  node.hobbies = document.getElementById('netHobbies').value.trim();
  
  TEMPERAMENTS.forEach(t => {
    node.temperament[t.key] = parseInt(document.getElementById('temp_' + t.key).value) || 5;
  });

  saveNetwork();
  toast('Досье сохранено 👤');
  setNetworkMode('list');
}

// --- Связи ---
function fillConnectionForm(targetId) {
  if (!editingNodeId) return;
  
  REL_TYPES.forEach(rt => {
    const cb = document.getElementById('rel_' + rt.key);
    if(cb) cb.checked = false;
    const range = document.getElementById('str_' + rt.key);
    if(range) { range.value = 5; range.nextElementSibling.textContent = 5; }
    const block = document.getElementById('str_block_' + rt.key);
    if(block) block.style.opacity = 0.3;
  });

  if(!targetId) return;

  const edge = findEdge(editingNodeId, targetId);
  if(edge) {
    for (const [type, strength] of Object.entries(edge.types)) {
      const cb = document.getElementById('rel_' + type);
      if(cb) cb.checked = true;
      
      const range = document.getElementById('str_' + type);
      if(range) { 
        range.value = strength; 
        range.nextElementSibling.textContent = strength; 
      }
      
      const block = document.getElementById('str_block_' + type);
      if(block) block.style.opacity = 1;
    }
  }
}

function addConnectionFromForm(){
  if (!editingNodeId) return;
  const targetId = document.getElementById('netTargetSelect').value;
  if(!targetId) { toast('Выберите человека'); return; }

  const selectedTypes = {};
  let hasAtLeastOne = false;

  REL_TYPES.forEach(rt => {
    const cb = document.getElementById('rel_' + rt.key);
    if(cb && cb.checked) {
      selectedTypes[rt.key] = parseInt(document.getElementById('str_' + rt.key).value) || 5;
      hasAtLeastOne = true;
    }
  });

  if(!hasAtLeastOne) { toast('Выберите хотя бы один тип связи'); return; }

  const existing = findEdge(editingNodeId, targetId);
  if(existing) {
    existing.types = selectedTypes;
  } else {
    networkState.edges.push({
      id: uid(),
      a: editingNodeId,
      b: targetId,
      types: selectedTypes
    });
  }

  saveNetwork();
  renderServices();
  toast('Связь сохранена 🔗');
}

function removeConnection(targetId){
  networkState.edges = networkState.edges.filter(e =>
    !((e.a === editingNodeId && e.b === targetId) ||
      (e.a === targetId && e.b === editingNodeId))
  );
  saveNetwork();
  renderServices();
  toast('Связь удалена');
}

// --- Карта: зум и панорамирование ---
function applyTransform() {
  const layer = document.getElementById('networkTransformLayer');
  if(layer) {
    layer.style.transform = `translate(${panZoomState.x}px, ${panZoomState.y}px) scale(${panZoomState.scale})`;
  }
}

function initNetworkMap() {
  const oldMap = document.getElementById('networkCanvas');
  if (!oldMap) return;
  const mapEl = oldMap.cloneNode(true);
  oldMap.parentNode.replaceChild(mapEl, oldMap);

  mapEl.addEventListener('wheel', handleWheel, {passive: false});
  mapEl.addEventListener('touchstart', handleTouchStart, {passive: false});
  mapEl.addEventListener('touchmove', handleTouchMove, {passive: false});
  mapEl.addEventListener('touchend', handleTouchEnd);
  mapEl.addEventListener('mousedown', handleMouseDown);
  mapEl.addEventListener('mousedown', startNodeDrag);
  mapEl.addEventListener('touchstart', startNodeDrag, {passive: false});
  
  document.addEventListener('mousemove', doNodeDrag);
  document.addEventListener('touchmove', doNodeDrag, {passive: false});
  document.addEventListener('mouseup', endNodeDrag);
  document.addEventListener('touchend', endNodeDrag);

  applyTransform();
}

function handleWheel(e) {
  if (!e.ctrlKey) return;
  e.preventDefault();
  const delta = -e.deltaY * 0.01;
  const newScale = Math.min(Math.max(0.3, panZoomState.scale + delta), 3);
  const rect = e.currentTarget.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  panZoomState.x = mouseX - (mouseX - panZoomState.x) * (newScale / panZoomState.scale);
  panZoomState.y = mouseY - (mouseY - panZoomState.y) * (newScale / panZoomState.scale);
  panZoomState.scale = newScale;
  applyTransform();
}

function handleTouchStart(e) {
  if (e.target.closest('.network-node')) return;
  if (e.touches.length === 1) {
    isPanning = true;
    startPan = { x: e.touches[0].clientX - panZoomState.x, y: e.touches[0].clientY - panZoomState.y };
  } else if (e.touches.length === 2) {
    isPanning = false;
    initialPinchDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    initialScale = panZoomState.scale;
  }
}

function handleTouchMove(e) {
  if (e.target.closest('.network-node.dragging')) return;
  if (e.touches.length === 1 && isPanning) {
    e.preventDefault();
    panZoomState.x = e.touches[0].clientX - startPan.x;
    panZoomState.y = e.touches[0].clientY - startPan.y;
    applyTransform();
  } else if (e.touches.length === 2) {
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const newScale = Math.min(Math.max(0.3, initialScale * (dist / initialPinchDistance)), 3);
    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const rect = e.currentTarget.getBoundingClientRect();
    const localCenterX = centerX - rect.left;
    const localCenterY = centerY - rect.top;
    panZoomState.x = localCenterX - (localCenterX - panZoomState.x) * (newScale / panZoomState.scale);
    panZoomState.y = localCenterY - (localCenterY - panZoomState.y) * (newScale / panZoomState.scale);
    panZoomState.scale = newScale;
    applyTransform();
  }
}

function handleTouchEnd(e) {
  if (e.touches.length === 0) isPanning = false;
}

function handleMouseDown(e) {
  if (e.target.closest('.network-node')) return;
  isPanning = true;
  startPan = { x: e.clientX - panZoomState.x, y: e.clientY - panZoomState.y };
  
  const onMove = (ev) => {
    if (!isPanning) return;
    panZoomState.x = ev.clientX - startPan.x;
    panZoomState.y = ev.clientY - startPan.y;
    applyTransform();
  };
  const onUp = () => {
    isPanning = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// --- Перетаскивание узлов ---
let dragInfo = null;
let longPressTimer = null;

function startNodeDrag(e) {
  const nodeEl = e.target.closest('.network-node');
  if (!nodeEl) return;
  e.stopPropagation();

  const id = nodeEl.dataset.nodeId;
  const isTouch = e.type === 'touchstart';
  const clientX = isTouch ? e.touches[0].clientX : e.clientX;
  const clientY = isTouch ? e.touches[0].clientY : e.clientY;

  longPressTimer = setTimeout(() => {
    const node = getNetworkNode(id);
    const mapRect = document.getElementById('networkCanvas').getBoundingClientRect();
    const localX = (clientX - mapRect.left - panZoomState.x) / panZoomState.scale;
    const localY = (clientY - mapRect.top - panZoomState.y) / panZoomState.scale;

    dragInfo = {
      id: id,
      el: nodeEl,
      offsetX: localX - node.x,
      offsetY: localY - node.y,
    };
    nodeEl.classList.add('dragging');
    if(window.navigator.vibrate) window.navigator.vibrate(50);
  }, 300);
}

function doNodeDrag(e) {
  if (!dragInfo) return;
  e.preventDefault();
  const isTouch = e.type === 'touchmove';
  const clientX = isTouch ? e.touches[0].clientX : e.clientX;
  const clientY = isTouch ? e.touches[0].clientY : e.clientY;
  const mapRect = document.getElementById('networkCanvas').getBoundingClientRect();
  
  const newX = (clientX - mapRect.left - panZoomState.x) / panZoomState.scale - dragInfo.offsetX;
  const newY = (clientY - mapRect.top - panZoomState.y) / panZoomState.scale - dragInfo.offsetY;

  const node = getNetworkNode(dragInfo.id);
  node.x = newX;
  node.y = newY;
  dragInfo.el.style.left = newX + 'px';
  dragInfo.el.style.top = newY + 'px';
  drawConnections();
}

function endNodeDrag(e) {
  clearTimeout(longPressTimer);
  if (dragInfo) {
    dragInfo.el.classList.remove('dragging');
    saveNetwork();
    dragInfo = null;
  } else {
    const nodeEl = e.target.closest('.network-node');
    if (nodeEl && !isPanning) {
      setNetworkMode('editor', nodeEl.dataset.nodeId);
    }
  }
}

// --- Рендер ---
function renderNetworkView(){
  const viewEl = $('#serviceView');
  if(!viewEl) return;

  if(networkMode === 'list') {
    let h = `<div class="service-head" style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <button class="back-btn" id="serviceBack">← Сервисы</button>
        <h2 class="service-title">🕸️ Досье</h2>
      </div>
      <button class="mini-btn" id="netToggleMap" style="font-size:16px; padding:8px 12px; background:var(--accent); border-color:var(--accent2);">🗺️ Карта</button>
    </div>`;

    h += `<button class="btn gold full" id="netCreateNode" style="margin-bottom:16px">➕ Создать досье</button>`;

    if(!networkState.nodes.length) {
      h += `<div class="card"><div class="empty-note" style="text-align:center;padding:20px">Список пуст.</div></div>`;
    } else {
      for(const node of networkState.nodes) {
        const isPending = pendingNetworkDeleteId === node.id;
        const edgeCount = getEdgesForNode(node.id).length;
        h += `<div class="med-item" data-net-edit="${node.id}">
          <div class="med-item-head">
            <div class="med-item-title">👤 ${esc(node.name)}</div>
            <button class="mini-btn" data-net-del="${node.id}" style="${isPending ? 'background:var(--red); border-color:var(--red); color:#fff;' : ''}">
              ${isPending ? 'Точно?' : '🗑'}
            </button>
          </div>
          <div class="med-item-sub">Связей: ${edgeCount}</div>
        </div>`;
      }
    }
    viewEl.innerHTML = h;
  } 
  
  else if(networkMode === 'map') {
    let h = `<div class="service-head" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
      <div>
        <button class="back-btn" id="netBackToList">← К досье</button>
        <h2 class="service-title">🗺️ Карта</h2>
      </div>
      <div class="hint" style="text-align:right; max-width:120px; line-height:1.2;">Свайп — сдвиг, Щипок — зум, Долгое нажатие — перемещение узла</div>
    </div>`;

    h += `<div class="network-map-container">
      <div class="network-canvas" id="networkCanvas">
        <div class="network-transform-layer" id="networkTransformLayer">
          <svg class="network-svg" id="networkSvg"></svg>
    `;

    for(const node of networkState.nodes) {
      h += `<div class="network-node" data-node-id="${node.id}" style="left:${node.x}px; top:${node.y}px;">
        ${esc(node.name.substring(0, 10))}
      </div>`;
    }

    h += `   </div>
          </div>
      </div>`;
    viewEl.innerHTML = h;
    
    setTimeout(() => {
        initNetworkMap();
        drawConnections();
    }, 50);
  }

  else if(networkMode === 'editor') {
    const node = getNetworkNode(editingNodeId);
    if(!node) { setNetworkMode('list'); return; }

    let h = `<div class="service-head">
      <button class="back-btn" id="netBackFromEditor">← Отмена</button>
      <h2 class="service-title">✏️ Досье</h2>
    </div>`;

    h += `<div class="diary-field">
      <label class="diary-label">Имя</label>
      <input type="text" id="netName" class="field" value="${esc(node.name)}" placeholder="Имя человека">
    </div>`;

    h += `<div class="diary-field">
      <label class="diary-label">Что любит</label>
      <textarea id="netLikes" class="diary-textarea" style="min-height:60px;" placeholder="Еда, музыка, подарки...">${esc(node.likes)}</textarea>
    </div>`;

    h += `<div class="diary-field">
      <label class="diary-label">Чем увлекается</label>
      <textarea id="netHobbies" class="diary-textarea" style="min-height:60px;" placeholder="Хобби, спорт, работа...">${esc(node.hobbies)}</textarea>
    </div>`;

    h += `<div class="diary-field" style="margin-top:20px;">
      <label class="diary-label">Темперамент (1–10)</label>`;
    for(const t of TEMPERAMENTS) {
      const val = node.temperament[t.key] || 5;
      h += `<div class="temp-slider-row">
        <span class="temp-label">${t.label}</span>
        <input type="range" id="temp_${t.key}" min="1" max="10" value="${val}" class="temp-range" oninput="this.nextElementSibling.textContent=this.value">
        <span class="temp-val">${val}</span>
      </div>`;
    }
    h += `</div>`;

    h += `<div class="diary-field" style="margin-top:20px; border-top:1px solid var(--border); padding-top:16px;">
      <label class="diary-label">Связи</label>`;

    // Показываем рёбра, где фигурирует этот узел
    const nodeEdges = getEdgesForNode(node.id);
    if(nodeEdges.length) {
      for(const edge of nodeEdges) {
        const otherId = getOtherNodeId(edge, node.id);
        const target = getNetworkNode(otherId);
        if(!target) continue;
        
        let relInfoArr = [];
        for (const [type, strength] of Object.entries(edge.types)) {
          const rt = REL_TYPES.find(r => r.key === type);
          if(rt) relInfoArr.push(`<span style="color:${rt.color};">${rt.label} (${strength})</span>`);
        }
        
        h += `<div class="connection-item">
          <div>
            <div style="font-weight:700;">${esc(target.name)}</div>
            <div style="font-size:11px; color:var(--muted); margin-top:2px;">${relInfoArr.join(' · ')}</div>
          </div>
          <button class="mini-btn" data-net-rem-conn="${otherId}">✕</button>
        </div>`;
      }
    }

    const availableNodes = networkState.nodes.filter(n => n.id !== node.id);
    if(availableNodes.length) {
      h += `<div style="background:rgba(255,255,255,.03); padding:12px; border-radius:12px; margin-top:12px; border:1px solid var(--border);">
        <div style="margin-bottom:8px; font-weight:700; font-size:12px;">Добавить/Изменить связь</div>
        <select id="netTargetSelect" class="field" style="margin-bottom:8px;" onchange="fillConnectionForm(this.value)">
          <option value="">-- Выберите --</option>
          ${availableNodes.map(n => `<option value="${n.id}">${esc(n.name)}</option>`).join('')}
        </select>
        
        <div class="rel-types-container" style="display:flex; flex-direction:column; gap:6px; margin-bottom:8px;">`;

      for(const rt of REL_TYPES) {
        h += `<div style="display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.2); padding:6px; border-radius:8px;">
          <label style="display:flex; align-items:center; gap:4px; font-size:12px; width:90px; flex:none;">
            <input type="checkbox" id="rel_${rt.key}" onchange="document.getElementById('str_block_${rt.key}').style.opacity = this.checked ? 1 : 0.3">
            <span style="color:${rt.color};">${rt.label}</span>
          </label>
          <div id="str_block_${rt.key}" style="flex:1; display:flex; gap:6px; align-items:center; opacity:0.3; transition:0.2s;">
            <input type="range" id="str_${rt.key}" min="1" max="10" value="5" style="flex:1;" oninput="this.nextElementSibling.textContent=this.value">
            <span style="font-size:11px; font-weight:700; width:12px; text-align:right;">5</span>
          </div>
        </div>`;
      }

      h += `</div>
        <button class="btn ghost full" id="netAddConnectionBtn" style="margin-top:8px; font-size:12px; padding:8px;">Сохранить связь</button>
      </div>`;
    }
    h += `</div>`;

    h += `<button class="btn green full" id="netSaveNode" style="margin-top:20px">💾 Сохранить досье</button>`;
    viewEl.innerHTML = h;
  }
}

// Рисуем каждую связь РОВНО ОДИН РАЗ (по массиву edges)
function drawConnections() {
  const svg = document.getElementById('networkSvg');
  if(!svg) return;
  svg.innerHTML = ''; 

  for(const edge of networkState.edges) {
    const a = getNetworkNode(edge.a);
    const b = getNetworkNode(edge.b);
    if(!a || !b) continue;
    
    const x1 = a.x + 30;
    const y1 = a.y + 30;
    const x2 = b.x + 30;
    const y2 = b.y + 30;

    const typesEntries = Object.entries(edge.types);

    typesEntries.forEach(([type, strength], index) => {
      const relMeta = REL_TYPES.find(r => r.key === type);
      if(!relMeta) return;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      
      const offset = (index - (typesEntries.length - 1) / 2) * 4;
      const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
      const ox = Math.cos(angle) * offset;
      const oy = Math.sin(angle) * offset;

      line.setAttribute('x1', x1 + ox);
      line.setAttribute('y1', y1 + oy);
      line.setAttribute('x2', x2 + ox);
      line.setAttribute('y2', y2 + oy);
      line.setAttribute('stroke', relMeta.color);
      line.setAttribute('stroke-width', Math.max(1, strength / 2));
      line.setAttribute('opacity', '0.6');
      
      svg.appendChild(line);
    });
  }
}