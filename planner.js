/* ============================ ПЛАНЕР ДНЯ ============================ */
const LS_KEY='dayquest_v1';
const TIERS={important:{label:'Важно',icon:'🔥',percent:30,max:6},desirable:{label:'Желательно',icon:'⭐',percent:20,max:3},minor:{label:'Неважно',icon:'🌱',percent:10,max:1}};
const TIER_ORDER=['important','desirable','minor'];
const STATUSES={important:[{key:'started',label:'Начато',pts:1},{key:'long',label:'Много времени, но не сделано',pts:2},{key:'done',label:'Завершено',pts:3}],desirable:[{key:'started',label:'Начато',pts:1},{key:'done',label:'Завершено',pts:2}],minor:[{key:'done',label:'Завершено',pts:1}]};
const DEFAULT_RITUALS={morning:{important:['Выпить стакан воды','Зарядка или растяжка'],desirable:['Умыться и привести себя в порядок','Записать 3 главные цели дня'],minor:['Заправить постель','Проветрить комнату']},evening:{important:['Отключить экраны за час до сна','Подготовить вещи и план на завтра'],desirable:['Спокойная прогулка','Чтение книги'],minor:['Тёплый душ','Травяной чай']}};
const DEFAULT_CONDITIONS = ['Не пил кофе','Не матерился'];
const CONDITION_PERCENT = 30;

let state=null,expandedTaskId=null;

function buildRituals(){const r={};for(const b of['morning','evening']){r[b]={};for(const t of TIER_ORDER){r[b][t]=DEFAULT_RITUALS[b][t].map(x=>({id:uid(),text:x}));}}return r;}
function freshState(){return{rituals:buildRituals(),conditions:DEFAULT_CONDITIONS.map(t=>({id:uid(),text:t})),tasks:[],days:{},createdAt:todayKey()};}

async function loadState(){
  let raw=null;
  try{ raw = await Storage.get(LS_KEY); }catch(e){ raw=null; }
  try{ state = raw ? JSON.parse(raw) : null; }catch(e){ state=null; }
  if(!state||typeof state!=='object')state=freshState();
  if(!state.rituals)state.rituals=buildRituals();
  if(!state.tasks)state.tasks=[];
  if(!state.days)state.days={};
  if(!Array.isArray(state.conditions))state.conditions=DEFAULT_CONDITIONS.map(t=>({id:uid(),text:t}));
  for(const b of['morning','evening']){if(!state.rituals[b])state.rituals[b]={};for(const t of TIER_ORDER){if(!Array.isArray(state.rituals[b][t])||!state.rituals[b][t].length){state.rituals[b][t]=DEFAULT_RITUALS[b][t].map(x=>({id:uid(),text:x}));}}}
}
async function saveState(){ try{ await Storage.set(LS_KEY, JSON.stringify(state)); }catch(e){} }

function blankDay(){return{slots:{important:[null,null,null],desirable:[null,null,null],minor:[null,null,null]},status:{},checks:{},settled:false};}
function getDay(k){if(!state.days[k])state.days[k]=blankDay();return state.days[k];}
function peekDay(k){return state.days[k]||blankDay();}

function computeDay(key){
  const day=peekDay(key);
  let taskPoints=0;
  for(const t of TIER_ORDER){
    for(const id of day.slots[t]){
      if(!id)continue;
      const st=day.status[id]||{};
      for(const s of STATUSES[t])if(st[s.key])taskPoints+=s.pts;
    }
  }
  let ritualPercent=0;
  for(const b of['morning','evening'])for(const t of TIER_ORDER)for(const r of state.rituals[b][t])if(day.checks[r.id])ritualPercent+=TIERS[t].percent;
  let condPercent=0;
  for(const c of state.conditions)if(day.checks[c.id])condPercent+=CONDITION_PERCENT;
  const percent=ritualPercent+condPercent;
  const projPts=projectPointsForDay(key);
  const bonus=Math.round((taskPoints+projPts)*percent)/100;
  const total=Math.round((taskPoints+projPts+bonus)*10)/10;
  return{taskPoints,projectPoints:projPts,ritualPercent,condPercent,percent,bonus,total};
}

function completeTask(id){const t=state.tasks.find(x=>x.id===id);if(!t||t.place==='archive')return;t.dueDate=null;t.overdue=false;
  if(t.kind==='weekly'){t.place='weekly';t.returnAfter=nextMonday();}
  else if(t.kind==='monthly'){t.place='monthly';t.returnAfter=firstOfNextMonth();}
  else{t.place='archive';t.archivedAt=todayKey();}}
function dailyMaintenance(){const today=todayKey();
  for(const t of state.tasks){if((t.place==='weekly'||t.place==='monthly')&&t.returnAfter&&t.returnAfter<=today){t.place='main';t.returnAfter=null;}}
  for(const k of Object.keys(state.days)){const day=state.days[k];if(day.settled||k>=today)continue;
    for(const t of TIER_ORDER)for(const id of day.slots[t]){if(!id)continue;const st=day.status[id];if(st&&st.done)completeTask(id);}
    day.settled=true;}
  for(const t of state.tasks){if(t.place==='archive')continue;if(t.dueDate&&t.dueDate<today)t.overdue=true;}}
function addTask(){const title=$('#newTitle').value.trim();if(!title){toast('Введите название');return;}
  const kind=$('#newKind').value;const dateVal=$('#newDate').value||null;
  state.tasks.push({id:uid(),title,kind,dueDate:dateVal,place:'main',returnAfter:null,overdue:false,createdAt:todayKey()});
  $('#newTitle').value='';$('#newDate').value='';saveState();render();toast('Дело добавлено ✨');}
function deleteTask(id){state.tasks=state.tasks.filter(t=>t.id!==id);
  for(const k of Object.keys(state.days)){const d=state.days[k];for(const t of TIER_ORDER)d.slots[t]=d.slots[t].map(x=>x===id?null:x);delete d.status[id];}
  if(expandedTaskId===id)expandedTaskId=null;saveState();render();}
function discardTask(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;t.place='archive';t.archivedAt=todayKey();t.overdue=false;t.dueDate=null;if(expandedTaskId===id)expandedTaskId=null;saveState();render();toast('В сброс 🗑');}
function reschedule(id,date){const t=state.tasks.find(x=>x.id===id);if(!t||!date)return;t.dueDate=date;t.overdue=false;if(expandedTaskId===id)expandedTaskId=null;saveState();render();toast('Дата: '+prettyDate(date));}
function toggleRitual(id){const day=getDay(todayKey());day.checks[id]=!day.checks[id];saveState();render();}
function toggleCondition(id){const day=getDay(todayKey());day.checks[id]=!day.checks[id];saveState();render();}
function renameRitual(id){for(const b of['morning','evening'])for(const t of TIER_ORDER){const r=state.rituals[b][t].find(x=>x.id===id);if(r){const val=prompt('Название ритуала:',r.text);if(val!==null&&val.trim()){r.text=val.trim();saveState();render();}return;}}}
function renameCondition(id){const c=state.conditions.find(x=>x.id===id);if(!c)return;const val=prompt('Название условия:',c.text);if(val!==null&&val.trim()){c.text=val.trim();saveState();render();}}
function placeTaskAuto(taskId,tier){const day=getDay(todayKey());let curTier=null;
  for(const tr of TIER_ORDER)if(day.slots[tr].includes(taskId)){curTier=tr;break;}
  let idx=-1;
  for(let i=0;i<day.slots[tier].length;i++){if(day.slots[tier][i]===null){idx=i;break;}if(curTier===tier&&day.slots[tier][i]===taskId){idx=i;break;}}
  if(idx===-1){toast('Все слоты «'+TIERS[tier].label+'» заняты');return false;}
  for(const tr of TIER_ORDER)day.slots[tr]=day.slots[tr].map(x=>x===taskId?null:x);
  day.slots[tier][idx]=taskId;expandedTaskId=null;saveState();render();toast(`${TIERS[tier].icon} «${TIERS[tier].label}»`);return true;}
function clearSlot(tier,index){const day=getDay(todayKey());const id=day.slots[tier][index];day.slots[tier][index]=null;
  if(id&&day.status[id]&&!Object.values(day.status[id]).some(Boolean))delete day.status[id];saveState();render();}
function toggleStatus(tier,index,key){const day=getDay(todayKey());const id=day.slots[tier][index];if(!id)return;
  if(!day.status[id])day.status[id]={};day.status[id][key]=!day.status[id][key];saveState();render();}

function openSheet(){
  $('#bottomSheet').classList.add('open');
  $('#sheetBackdrop').classList.add('show');
  document.body.style.overflow='hidden';
}
function closeSheet(){
  $('#bottomSheet').classList.remove('open');
  $('#sheetBackdrop').classList.remove('show');
  document.body.style.overflow='';
  expandedTaskId=null;
  renderDecks();
}
function openStepModal(){renderStepModal();$('#stepModal').classList.add('show');$('#stepModalBackdrop').classList.add('show');document.body.style.overflow='hidden';}
function closeStepModal(){$('#stepModal').classList.remove('show');$('#stepModalBackdrop').classList.remove('show');document.body.style.overflow='';}
function openTitlesModal(){renderTitlesModal();$('#titlesModal').classList.add('show');$('#titlesModalBackdrop').classList.add('show');document.body.style.overflow='hidden';}
function closeTitlesModal(){$('#titlesModal').classList.remove('show');$('#titlesModalBackdrop').classList.remove('show');document.body.style.overflow='';render();}