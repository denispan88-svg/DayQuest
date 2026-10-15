/* ============================ СОБЫТИЯ ============================ */
document.addEventListener('click',e=>{
  const tabBtn=e.target.closest('.nav-btn');if(tabBtn){switchTab(tabBtn.dataset.tab);return;}
  if(e.target.closest('#fabDecks')){openSheet();return;}
  if(e.target.closest('#sheetClose')||e.target.closest('#sheetBackdrop')){closeSheet();return;}
  if(e.target.closest('#stepModalClose')||e.target.closest('#stepModalBackdrop')){closeStepModal();return;}
  if(e.target.closest('#titlesModalClose')||e.target.closest('#titlesModalBackdrop')||e.target.closest('#titlesDone')){closeTitlesModal();return;}
  if(e.target.closest('#titlesClear')){
    const p=getActiveProject();if(!p)return;
    if(!confirm('Очистить все названия шагов?'))return;
    p.stepTitles={};saveStore();renderTitlesModal();toast('Названия очищены');
    return;
  }
  const editRit=e.target.closest('[data-edit-ritual]');if(editRit){e.stopPropagation();renameRitual(editRit.dataset.editRitual);return;}
  const editCond=e.target.closest('[data-edit-condition]');if(editCond){e.stopPropagation();renameCondition(editCond.dataset.editCondition);return;}
  const ritual=e.target.closest('.ritual[data-ritual]');if(ritual){toggleRitual(ritual.dataset.ritual);return;}
  const cond=e.target.closest('.ritual[data-condition]');if(cond){toggleCondition(cond.dataset.condition);return;}
  const clearBtn=e.target.closest('[data-clear-slot]');if(clearBtn){const[t,i]=clearBtn.dataset.clearSlot.split(':');clearSlot(t,Number(i));return;}
  if(e.target.closest('[data-open-sheet]')){openSheet();return;}
  if(e.target.closest('#addTask')){addTask();return;}
  const placeBtn=e.target.closest('[data-place]');if(placeBtn&&!placeBtn.disabled){placeTaskAuto(placeBtn.dataset.task,placeBtn.dataset.place);return;}
  const disc=e.target.closest('[data-discard]');if(disc){discardTask(disc.dataset.discard);return;}
  const del=e.target.closest('[data-del]');if(del){deleteTask(del.dataset.del);return;}
  const di=e.target.closest('.deck-item');if(di&&di.dataset.task){if(e.target.closest('.resched,.mini-btn'))return;expandedTaskId=expandedTaskId===di.dataset.task?null:di.dataset.task;renderDecks();return;}
  if(e.target.closest('#createProject')){createProject();return;}
  const sp=e.target.closest('[data-select-proj]');if(sp){selectActive(sp.dataset.selectProj);toast('Активный проект обновлён');return;}
  const st=e.target.closest('[data-start-proj]');if(st){startProject(st.dataset.startProj);return;}
  const pa=e.target.closest('[data-pause-proj]');if(pa){pauseProject(pa.dataset.pauseProj);return;}
  const re=e.target.closest('[data-resume-proj]');if(re){resumeProject(re.dataset.resumeProj);return;}
  const rs=e.target.closest('[data-reset-proj]');if(rs){resetProject(rs.dataset.resetProj);return;}
  const de=e.target.closest('[data-delete-proj]');if(de){deleteProject(de.dataset.deleteProj);return;}
  const et=e.target.closest('[data-edit-titles]');
  if(et){
    if(et.dataset.editTitles!==store.activeProjectId)selectActive(et.dataset.editTitles);
    openTitlesModal();return;
  }
  if(e.target.closest('#takeStepBtn')){openStepModal();return;}
  if(e.target.closest('#dropActiveStep')){dropActiveStep();return;}
  const pick=e.target.closest('[data-pick-step]');if(pick&&!pick.classList.contains('done')){const n=Number(pick.dataset.pickStep);closeStepModal();takeStep(n);return;}
  const sn=e.target.closest('[data-step-num]');
  if(sn&&!sn.classList.contains('done')&&!sn.classList.contains('active')){
    const p=getActiveProject();if(!p)return;
    if(p.activeStep!==null){toast('Сначала заверши текущий шаг');return;}
    const info=getPhaseInfo(p.daysElapsed);
    if(!info||!info.isWork){toast('Сегодня выходной');return;}
    takeStep(Number(sn.dataset.stepNum));return;
  }

  // === СЕРВИСЫ ===
  if(e.target.closest('#serviceBack')){closeService();return;}
  if(e.target.closest('#diaryNew')){newDiaryEntry();return;}
  if(e.target.closest('#diaryBack') || e.target.closest('#diaryCancel')){discardDiaryEntry();return;}
  if(e.target.closest('#diarySave')){saveDiaryEntryFromForm();return;}

  const svc=e.target.closest('[data-service]');
  if(svc){openService(svc.dataset.service);return;}

  const diaryDel=e.target.closest('[data-diary-del]');
  if(diaryDel){deleteDiaryEntry(diaryDel.dataset.diaryDel);return;}

  const diaryOpen=e.target.closest('[data-diary-open]');
  if(diaryOpen){
    editingEntryId=diaryOpen.dataset.diaryOpen;
    openServiceEditor();
    return;
  }
});

document.addEventListener('change',e=>{
  const cb=e.target.closest('input[data-status]');if(cb){toggleStatus(cb.dataset.tier,Number(cb.dataset.index),cb.dataset.status);return;}
  const rs=e.target.closest('input.resched');if(rs&&rs.value){reschedule(rs.dataset.task,rs.value);return;}
  const pm=e.target.closest('input[data-proj-mark]');if(pm){markStep(pm.dataset.projMark);return;}
});

document.addEventListener('input',e=>{
  const ti=e.target.closest('input[data-title-num]');
  if(ti){
    const num=Number(ti.dataset.titleNum);const val=ti.value;
    const p=getActiveProject();if(!p)return;
    if(val.trim())p.stepTitles[num]=val.trim();else delete p.stepTitles[num];
    ti.classList.toggle('filled',!!val.trim());
    saveStore();
  }
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if($('#bottomSheet').classList.contains('open'))closeSheet();if($('#stepModal').classList.contains('show'))closeStepModal();if($('#titlesModal').classList.contains('show'))closeTitlesModal();}
  if(e.key==='Enter'&&e.target.id==='newTitle')addTask();
  if(e.key==='Enter'&&e.target.id==='newProjName')createProject();
});