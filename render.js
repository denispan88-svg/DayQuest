/* ============================ РЕНДЕР ============================ */
function render(){
  renderSummary();
  renderRituals('morning',$('#morningBlock'));
  renderTaskBlock($('#dayBlock'));
  renderRituals('evening',$('#eveningBlock'));
  renderConditions($('#conditionsBlock'));
  renderDecks();
  renderStats();
  renderProjDay();
  renderProjectTab();
}
function renderSummary(){const key=todayKey();const r=computeDay(key);
  $('#sumDate').textContent='Сегодня · '+prettyDate(key);
  $('#totalPts').textContent=fmtNum(r.total);
  $('#taskPts').textContent=r.taskPoints;
  $('#projPts').textContent=r.projectPoints;
  $('#ritPct').textContent=r.percent+'%';
  $('#bonusPts').textContent='+'+fmtNum(r.bonus);}
function renderRituals(blockKey,container){const title=blockKey==='morning'?'🌅 Утро — Пробуждение':'🌙 Вечер — Релакс';const day=getDay(todayKey());
  let h=`<div class="block-head"><h2>${title}</h2><span class="hint">ритуалы неизменны</span></div>`;
  for(const tier of TIER_ORDER){const meta=TIERS[tier];
    h+=`<div class="tier tier-${tier}"><div class="tier-head"><span class="tier-name">${meta.icon} ${meta.label}</span><span class="tier-badge">+${meta.percent}% к итогу</span></div><div class="ritual-grid">`;
    for(const r of state.rituals[blockKey][tier]){const on=!!day.checks[r.id];
      h+=`<div class="ritual ${on?'on':''}" data-ritual="${r.id}"><span class="check">${on?'✓':''}</span><span class="ritual-text">${esc(r.text)}</span><button class="edit-ritual" data-edit-ritual="${r.id}">✏️</button></div>`;}
    h+=`</div></div>`;}
  container.innerHTML=h;}
function renderConditions(container){const day=getDay(todayKey());
  let h=`<div class="block-head"><h2>🚫 Условия дня</h2><span class="hint">держишь — получаешь бонус</span></div>`;
  h+=`<div class="ritual-grid">`;
  for(const c of state.conditions){const on=!!day.checks[c.id];
    h+=`<div class="ritual cond ${on?'on':''}" data-condition="${c.id}"><span class="check">${on?'✓':''}</span><span class="ritual-text">${esc(c.text)}</span><button class="edit-ritual" data-edit-condition="${c.id}">✏️</button></div>`;}
  h+=`</div>`;
  h+=`<div class="conditions-note">Каждое условие даёт +${CONDITION_PERCENT}% к итоговым баллам (задачи + проект)</div>`;
  container.innerHTML=h;}
function renderTaskBlock(container){const day=getDay(todayKey());
  let h=`<div class="block-head"><h2>🎯 Задачи дня</h2><span class="hint">тапни пустой слот</span></div>`;
  for(const tier of TIER_ORDER){const meta=TIERS[tier];
    h+=`<div class="tier tier-${tier}"><div class="tier-head"><span class="tier-name">${meta.icon} ${meta.label}</span><span class="tier-badge">до ${meta.max} б</span></div><div class="slot-row">`;
    for(let i=0;i<3;i++){const id=day.slots[tier][i];const t=id?state.tasks.find(x=>x.id===id):null;
      if(!t){h+=`<div class="slot empty" data-open-sheet="1">+ добавить</div>`;}
      else{const st=day.status[id]||{};const pts=STATUSES[tier].reduce((a,s)=>a+(st[s.key]?s.pts:0),0);
        h+=`<div class="slot filled ${st.done?'done':''}"><div class="slot-title">${esc(t.title)}</div><div class="slot-status">`;
        for(const s of STATUSES[tier])h+=`<label class="st ${st[s.key]?'on':''}"><input type="checkbox" data-status="${s.key}" data-tier="${tier}" data-index="${i}" ${st[s.key]?'checked':''}><span>${s.label} <b>+${s.pts}</b></span></label>`;
        h+=`</div><div class="slot-foot"><span class="pts">${pts} б</span><button class="icon-btn" data-clear-slot="${tier}:${i}">✕</button></div></div>`;}}
    h+=`</div></div>`;}
  container.innerHTML=h;}
function deckItem(t,extra=''){const exp=expandedTaskId===t.id;const day=getDay(todayKey());let picker='';
  if(exp){const btns=TIER_ORDER.map(tier=>{const meta=TIERS[tier];const free=day.slots[tier].filter(x=>x===null).length;
    return `<button data-place="${tier}" data-task="${t.id}" ${free===0?'disabled':''}>${meta.icon} ${meta.label} · ${free}/3</button>`;}).join('');
    picker=`<div class="tier-picker show"><div class="picker-hint">Выбери приоритет</div><div style="display:flex;gap:6px">${btns}</div></div>`;}
  return `<div class="deck-item ${exp?'expanded':''}" data-task="${t.id}"><span class="di-title">${esc(t.title)}</span>${extra}<button class="mini-btn" data-del="${t.id}">✕</button></div>${picker}`;}
function renderDecks(){const key=todayKey();const day=getDay(key);const used=new Set();TIER_ORDER.forEach(tr=>day.slots[tr].forEach(id=>{if(id)used.add(id);}));
  const main=state.tasks.filter(t=>t.place==='main'&&!t.dueDate&&!used.has(t.id)&&!t.overdue);
  const sched=state.tasks.filter(t=>t.place!=='archive'&&t.dueDate===key&&!used.has(t.id));
  const overdue=state.tasks.filter(t=>t.place!=='archive'&&t.dueDate&&t.dueDate<key);
  const weekly=state.tasks.filter(t=>t.place==='weekly');
  const monthly=state.tasks.filter(t=>t.place==='monthly');
  const archive=state.tasks.filter(t=>t.place==='archive');
  $('#fabCount').textContent=main.length+sched.length+overdue.length;
  let h='';
  h+=`<div class="deck-group" style="border-bottom:1px solid var(--border);padding-bottom:16px"><div class="deck-title">➕ Новое дело</div><input class="field" id="newTitle" placeholder="Что нужно сделать?" maxlength="90"><div class="form-row"><select class="field" id="newKind"><option value="normal">Обычное</option><option value="weekly">Еженедельное</option><option value="monthly">Ежемесячное</option></select><input class="field" type="date" id="newDate"></div><button class="btn full" id="addTask">Добавить в колоду</button></div>`;
  h+=`<div class="deck-group"><div class="deck-title">📦 Основная <span class="count">${main.length}</span></div>`;
  h+=main.length?main.map(t=>deckItem(t,t.kind!=='normal'?`<span class="di-date">${t.kind==='weekly'?'нед':'мес'}</span>`:'')).join(''):`<div class="empty-note">Пусто</div>`;
  h+=`</div>`;
  h+=`<div class="deck-group"><div class="deck-title">📅 На сегодня <span class="count">${sched.length}</span></div>`;
  h+=sched.length?sched.map(t=>deckItem(t)).join(''):`<div class="empty-note">Нет</div>`;
  h+=`</div>`;
  if(overdue.length){h+=`<div class="deck-group"><div class="deck-title" style="color:var(--red)">⚠️ Просрочено <span class="count">${overdue.length}</span></div>`;
    h+=overdue.map(t=>`<div class="deck-item overdue" data-task="${t.id}"><span class="di-title">${esc(t.title)}<br><span style="font-size:10px;color:var(--muted)">было на ${prettyDate(t.dueDate)}</span></span><input type="date" class="resched" data-task="${t.id}" onclick="event.stopPropagation()"><button class="mini-btn" data-discard="${t.id}" onclick="event.stopPropagation()">🗑</button></div>`).join('');
    h+=`</div>`;}
  if(weekly.length)h+=`<div class="deck-group"><div class="deck-title">🔁 Еженедельные <span class="count">${weekly.length}</span></div>`+weekly.map(t=>`<div class="deck-item" style="cursor:default"><span class="di-title">${esc(t.title)}</span><span class="di-date">${t.returnAfter?prettyDate(t.returnAfter):'—'}</span></div>`).join('')+`</div>`;
  if(monthly.length)h+=`<div class="deck-group"><div class="deck-title">🗓 Ежемесячные <span class="count">${monthly.length}</span></div>`+monthly.map(t=>`<div class="deck-item" style="cursor:default"><span class="di-title">${esc(t.title)}</span><span class="di-date">${t.returnAfter?prettyDate(t.returnAfter):'—'}</span></div>`).join('')+`</div>`;
  if(archive.length)h+=`<div class="deck-group"><div class="deck-title">✅ Готово <span class="count">${archive.length}</span></div>`+archive.slice(-8).reverse().map(t=>`<div class="deck-item" style="opacity:.55;cursor:default"><span class="di-title" style="text-decoration:line-through">${esc(t.title)}</span><button class="mini-btn" data-del="${t.id}">✕</button></div>`).join('')+`</div>`;
  $('#sheetBody').innerHTML=h;}
function renderStats(){const bars=[];let maxV=1;
  for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=fmtKey(d);const r=computeDay(k);bars.push({k,r,isToday:i===0});if(r.total>maxV)maxV=r.total;}
  $('#chart').innerHTML=bars.map(b=>{const h=Math.max(3,Math.round(b.r.total/maxV*130));const dd=parseKey(b.k);
    return `<div class="bar-wrap" title="${prettyDate(b.k)}: ${fmtNum(b.r.total)} б"><span class="bar-val">${b.r.total?fmtNum(b.r.total):''}</span><div class="bar ${b.isToday?'today':''}" style="height:${h}px"></div><span class="bar-label">${dd.getDate()}.${pad(dd.getMonth()+1)}</span></div>`;}).join('');
  const keys=Object.keys(state.days).filter(k=>{const d=state.days[k];return TIER_ORDER.some(t=>d.slots[t].some(Boolean))||Object.keys(d.checks||{}).length||projectPointsForDay(k)>0;}).sort();
  const rows=keys.map(k=>({k,...computeDay(k)})).reverse();
  const totalAll=rows.reduce((a,r)=>a+r.total,0);
  const best=rows.reduce((a,r)=>(r.total>(a?.total??-1)?r:a),null);
  const active=rows.filter(r=>r.total>0).length;
  const avg=active?Math.round(totalAll/active*10)/10:0;
  let streak=0;const d=new Date();
  while(true){const k=fmtKey(d);const r=computeDay(k);if(r.total>0){streak++;d.setDate(d.getDate()-1);}else break;if(streak>400)break;}
  let h=`<h3>🏆 Рекорды</h3><div class="big-stats">
    <div class="big-stat"><b>${fmtNum(Math.round(totalAll*10)/10)}</b><span>всего</span></div>
    <div class="big-stat"><b>${active}</b><span>дней</span></div>
    <div class="big-stat"><b>${fmtNum(avg)}</b><span>средн.</span></div>
    <div class="big-stat"><b>${streak}</b><span>подряд</span></div>
    <div class="big-stat"><b>${best?fmtNum(best.total):0}</b><span>лучший</span></div></div>
    <h3 style="margin-top:18px">📋 История</h3>`;
  if(!rows.length)h+=`<div class="empty-note">Пока нет данных</div>`;
  else h+=rows.map(r=>{const parts=[];if(r.taskPoints)parts.push(`задачи ${r.taskPoints}`);if(r.projectPoints)parts.push(`проект ${r.projectPoints}`);
    if(r.percent)parts.push(`бонусы +${r.percent}% (+${fmtNum(r.bonus)})`);
    return `<div class="table-row"><span class="tr-date">${prettyDate(r.k)}</span><span class="tr-main">${fmtNum(r.total)} б<span class="tr-sub">${parts.length?' · '+parts.join(', '):''}</span></span><span class="tr-total">${r.total>=30?'🔥':r.total>0?'⚡':'·'}</span></div>`;}).join('');
  $('#statsCard').innerHTML=h;}
function renderProjDay(){const cont=$('#projDayCard');const p=getActiveProject();
  if(!p||p.status!=='active'){cont.innerHTML='';return;}
  const info=getPhaseInfo(p.daysElapsed);
  if(!info){cont.innerHTML='';return;}
  const isWork=info.isWork;
  const totalDone=p.completedSteps.length;
  const pctDone=Math.round(totalDone/TOTAL_STEPS*100);
  let h=`<div class="card proj-card ${isWork?'work':'rest'}">
    <div class="proj-head">
      <div>
        <div class="proj-status ${isWork?'work':'rest'}">${info.emoji} Фаза ${info.phaseIdx+1} · ${info.name} · ${isWork?'РАБОЧИЙ':'ВЫХОДНОЙ'}</div>
        <div class="proj-title">${esc(p.name)}</div>
        <div class="hint">Шагов: ${totalDone}/${TOTAL_STEPS} · День ${p.daysElapsed+1}/${TOTAL_PROJ_DAYS}</div>
      </div>
      <div class="proj-day">${totalDone}<small>/${TOTAL_STEPS}</small></div>
    </div>
    <div class="proj-progress"><div class="proj-progress-fill" style="width:${pctDone}%"></div></div>`;
  if(p.activeStep!==null){
    const step=p.activeStep;const pr=p.activeStepProgress||{};
    const pts=STEP_KEYS.reduce((a,k,i)=>a+(pr[k]?info.rewards[i]:0),0);
    const title=getStepTitle(p,step);
    const hasCustom=p.stepTitles&&p.stepTitles[step];
    h+=`<div class="proj-active-step">
      <div class="proj-step-name"><span class="num">Шаг ${step}</span>${hasCustom?' · <span class="lbl">'+esc(title)+'</span>':''}</div>
      <div class="proj-step-checks">
        ${STEP_KEYS.map((k,i)=>`<label class="${pr[k]?'on':''}"><input type="checkbox" data-proj-mark="${k}" ${pr[k]?'checked':''}><span>${k==='started'?'Начать':k==='time'?'Время':'Готово'} <b>+${info.rewards[i]}</b></span></label>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="pts" style="font-size:14px;font-weight:800;color:var(--gold)">${pts} б за шаг</span>
        <button class="mini-btn" id="dropActiveStep" style="font-size:11px;padding:5px 10px">✕ Отменить шаг</button>
      </div>
    </div>`;
  } else if(isWork){
    h+=`<div class="proj-active-step" style="text-align:center">
      <div class="hint" style="margin-bottom:10px">Награды: ${info.rewards.map((r,i)=>`${['Начало','Время','Готово'][i]} +${r}`).join(' · ')}</div>
      <button class="btn gold" id="takeStepBtn">🎯 Взять задание проекта</button>
    </div>`;
  } else {
    h+=`<div class="proj-rest-msg"><span class="emoji">☕</span>Сегодня выходной — отдыхай и восстанавливайся</div>`;
  }
  h+=`</div>`;
  cont.innerHTML=h;}
function renderProjectTab(){const list=$('#projectList');
  if(!store.projects.length){list.innerHTML=`<div class="card"><div class="empty-note" style="text-align:center;padding:20px">У тебя пока нет проектов.<br>Создай первый выше 👆</div></div>`;return;}
  let h='';
  for(const p of store.projects){
    const isActive=p.id===store.activeProjectId;
    const info=getPhaseInfo(p.daysElapsed);
    const done=p.completedSteps.length;
    const statusTxt={idle:'⏹ Не запущен',active:'▶ Активен',paused:'⏸ Пауза',completed:'🏁 Завершён'}[p.status]||p.status;
    let meta=`Шагов: ${done}/${TOTAL_STEPS}`;
    if(p.status==='active'||p.status==='paused'||p.status==='completed')meta+=` · День ${p.daysElapsed+1}/${TOTAL_PROJ_DAYS}`;
    if(info&&(p.status==='active'||p.status==='paused'))meta+=` · Фаза ${info.phaseIdx+1} ${info.emoji}`;
    h+=`<div class="proj-item ${isActive?'active':''}">
      <div class="proj-item-head">
        <div><div class="proj-item-title">${esc(p.name)}${isActive?' ⭐':''}</div><div class="proj-item-meta">${statusTxt} · ${meta}</div></div>
      </div>
      <div class="proj-item-actions">
        ${!isActive?`<button class="mini-btn" data-select-proj="${p.id}">⭐ Активным</button>`:''}
        ${p.status==='idle'?`<button class="mini-btn ok" data-start-proj="${p.id}" style="background:rgba(61,220,151,.2);border-color:var(--green)">🚀 Начать</button>`:''}
        ${p.status==='active'?`<button class="mini-btn" data-pause-proj="${p.id}">⏸ Пауза</button>`:''}
        ${p.status==='paused'?`<button class="mini-btn ok" data-resume-proj="${p.id}" style="background:rgba(61,220,151,.2);border-color:var(--green)">▶ Продолжить</button>`:''}
        <button class="mini-btn" data-edit-titles="${p.id}">✏️ Названия</button>
        <button class="mini-btn" data-reset-proj="${p.id}">↻ Сброс</button>
        <button class="mini-btn" data-delete-proj="${p.id}">🗑 Удалить</button>
      </div>
    </div>`;
    if(isActive&&(p.status==='active'||p.status==='paused')){
      h+=`<div class="card" style="margin-bottom:14px">
        <div class="deck-title">🗺 Карта шагов</div>
        <div class="step-grid">`;
      for(let i=1;i<=TOTAL_STEPS;i++){
        const doneStep=p.completedSteps.includes(i);
        const isActiveStep=p.activeStep===i;
        const cls=doneStep?'done':(isActiveStep?'active':'');
        const short=getStepShort(p,i);
        const fullTitle=getStepTitle(p,i);
        h+=`<div class="step-slot ${cls}" data-step-num="${i}" title="${esc(fullTitle)}">
          <span class="num">${i}</span>
          ${short?`<span class="t">${esc(short)}</span>`:''}
        </div>`;
      }
      h+=`</div>
        <div class="hint" style="margin-top:10px">Тапни свободный шаг — он станет заданием дня (если сегодня рабочий день)</div>
      </div>`;
    }
  }
  list.innerHTML=h;}
function renderStepModal(){const p=getActiveProject();if(!p){closeStepModal();return;}
  let h=`<div class="hint" style="margin-bottom:12px">Выбери любой невыполненный шаг из ${TOTAL_STEPS}</div><div class="step-grid">`;
  for(let i=1;i<=TOTAL_STEPS;i++){
    const done=p.completedSteps.includes(i);
    const short=getStepShort(p,i);
    const fullTitle=getStepTitle(p,i);
    h+=`<div class="step-slot ${done?'done':''}" data-pick-step="${i}" title="${esc(fullTitle)}">
      <span class="num">${i}</span>
      ${short?`<span class="t">${esc(short)}</span>`:''}
    </div>`;
  }
  h+=`</div>`;$('#stepModalBody').innerHTML=h;}
function renderTitlesModal(){const p=getActiveProject();if(!p){closeTitlesModal();return;}
  let h=`<div class="titles-list">`;
  for(let i=1;i<=TOTAL_STEPS;i++){
    const val=p.stepTitles[i]||'';
    h+=`<div class="titles-row"><span class="num">${i}.</span><input type="text" data-title-num="${i}" value="${esc(val)}" placeholder="Шаг ${i}" maxlength="80" class="${val.trim()?'filled':''}"></div>`;
  }
  h+=`</div>`;$('#titlesModalBody').innerHTML=h;}
function switchTab(name){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-'+name));
  if(name==='stats')renderStats();
  if(name==='project')renderProjectTab();
  if(name==='services')renderServices();
}