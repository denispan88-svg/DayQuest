/* ============================ ПРОЕКТ (58 шагов) ============================ */
const PROJ_LS_KEY='dayquest_projects_v2';
const PHASES=[
  {cycles:1,work:5,rest:1,rewards:[2,3,4],name:'Разгон',emoji:'🌱'},
  {cycles:2,work:4,rest:1,rewards:[3,4,5],name:'Втягивание',emoji:'🌿'},
  {cycles:4,work:3,rest:1,rewards:[4,5,6],name:'Ритм',emoji:'🌳'},
  {cycles:8,work:2,rest:1,rewards:[5,6,7],name:'Марафон',emoji:'⛰️'},
  {cycles:17,work:1,rest:1,rewards:[6,7,8],name:'Спринт',emoji:'🏆'},
];
const TOTAL_STEPS=58;
const STEP_KEYS=['started','time','done'];

function getPhaseInfo(dayIdx){
  let offset=0;
  for(let pi=0;pi<PHASES.length;pi++){
    const p=PHASES[pi];
    const total=p.cycles*(p.work+p.rest);
    if(dayIdx<offset+total){
      const inPhase=dayIdx-offset;
      const cycleLen=p.work+p.rest;
      const cycleIdx=Math.floor(inPhase/cycleLen);
      const dayInCycle=inPhase%cycleLen;
      const isWork=dayInCycle<p.work;
      return{phaseIdx:pi,cycleIdx,dayInCycle,isWork,rewards:p.rewards,name:p.name,emoji:p.emoji};
    }
    offset+=total;
  }
  return null;
}
function totalProjectDays(){return PHASES.reduce((a,p)=>a+p.cycles*(p.work+p.rest),0);}
const TOTAL_PROJ_DAYS=totalProjectDays();

function freshProject(name){
  return{id:uid(),name:name,status:'idle',startedAt:null,daysElapsed:0,lastProcessedDate:null,
    activeStep:null,activeStepProgress:{},completedSteps:[],stepDates:{},stepMarks:{},stepTitles:{}};
}
function freshStore(){return{projects:[],activeProjectId:null};}
let store=null;

async function loadStore(){
  let raw=null;
  try{ raw = await Storage.get(PROJ_LS_KEY); }catch(e){ raw=null; }
  try{ store = raw ? JSON.parse(raw) : null; }catch(e){ store=null; }
  if(!store||typeof store!=='object')store=freshStore();
  if(!store.projects)store.projects=[];
  if(!('activeProjectId' in store))store.activeProjectId=null;
  for(const p of store.projects){
    if(!p.stepTitles)p.stepTitles={};
    if(!p.stepMarks)p.stepMarks={};
    if(!p.stepDates)p.stepDates={};
    if(!p.completedSteps)p.completedSteps=[];
    if(!p.activeStepProgress)p.activeStepProgress={};
    if(!('activeStep' in p))p.activeStep=null;
  }
}
async function saveStore(){ try{ await Storage.set(PROJ_LS_KEY, JSON.stringify(store)); }catch(e){} }
function getActiveProject(){return store.projects.find(p=>p.id===store.activeProjectId)||null;}

function processProjectDaily(){
  const p=getActiveProject();
  if(!p||p.status!=='active')return;
  const today=todayKey();
  if(!p.lastProcessedDate){p.lastProcessedDate=today;saveStore();return;}
  const diff=daysBetween(p.lastProcessedDate,today);
  if(diff>0){
    p.daysElapsed+=diff;
    p.lastProcessedDate=today;
    if(p.daysElapsed>=TOTAL_PROJ_DAYS){p.daysElapsed=TOTAL_PROJ_DAYS;p.status='completed';}
    saveStore();
  }
}
function projectPointsForDay(key){
  let total=0;
  for(const p of store.projects){
    if(!p.stepMarks)continue;
    for(const sn in p.stepMarks){
      const marks=p.stepMarks[sn];
      for(const sk of STEP_KEYS){
        if(marks[sk]&&marks[sk].date===key)total+=marks[sk].pts;
      }
    }
  }
  return total;
}
function getStepTitle(proj,num){if(!proj||!proj.stepTitles)return 'Шаг '+num;const t=proj.stepTitles[num];return (t&&t.trim())?t:'Шаг '+num;}
function getStepShort(proj,num){if(!proj||!proj.stepTitles)return '';const t=proj.stepTitles[num];return (t&&t.trim())?t.trim():'';}

function createProject(){const name=$('#newProjName').value.trim();if(!name){toast('Введите название');return;}
  const p=freshProject(name);store.projects.push(p);if(!store.activeProjectId)store.activeProjectId=p.id;
  $('#newProjName').value='';saveStore();render();toast('Проект создан ✨');}
function startProject(id){const p=store.projects.find(x=>x.id===id);if(!p)return;
  if(p.status==='active'){toast('Уже запущен');return;}
  for(const x of store.projects){if(x.id!==id&&x.status==='active')x.status='paused';}
  p.status='active';if(!p.startedAt){p.startedAt=todayKey();p.daysElapsed=0;}
  p.lastProcessedDate=todayKey();store.activeProjectId=p.id;saveStore();render();toast('Проект запущен 🚀');}
function pauseProject(id){const p=store.projects.find(x=>x.id===id);if(!p)return;p.status='paused';saveStore();render();toast('На паузе ⏸');}
function resumeProject(id){const p=store.projects.find(x=>x.id===id);if(!p)return;
  for(const x of store.projects){if(x.id!==id&&x.status==='active')x.status='paused';}
  p.status='active';p.lastProcessedDate=todayKey();store.activeProjectId=p.id;saveStore();render();toast('Продолжаем ▶');}
function resetProject(id){const p=store.projects.find(x=>x.id===id);if(!p)return;
  if(!confirm('Сбросить прогресс этого проекта? Названия шагов останутся.'))return;
  p.status='idle';p.startedAt=null;p.daysElapsed=0;p.lastProcessedDate=null;p.activeStep=null;p.activeStepProgress={};p.completedSteps=[];p.stepDates={};p.stepMarks={};
  saveStore();render();toast('Проект сброшен');}
function deleteProject(id){const p=store.projects.find(x=>x.id===id);if(!p)return;
  if(!confirm('Удалить проект «'+p.name+'» навсегда?'))return;
  store.projects=store.projects.filter(x=>x.id!==id);
  if(store.activeProjectId===id)store.activeProjectId=store.projects[0]?.id||null;
  saveStore();render();toast('Удалено');}
function selectActive(id){store.activeProjectId=id;saveStore();render();}

function takeStep(stepNum){
  const p=getActiveProject();if(!p||p.status!=='active')return;
  const info=getPhaseInfo(p.daysElapsed);if(!info||!info.isWork){toast('Сегодня не рабочий день');return;}
  if(p.activeStep!==null){toast('Сначала заверши текущий шаг');return;}
  if(p.completedSteps.includes(stepNum)){toast('Шаг уже выполнен');return;}
  p.activeStep=stepNum;p.activeStepProgress={};saveStore();render();
  const t=getStepTitle(p,stepNum);toast('Взято: '+t);
}
function markStep(key){
  const p=getActiveProject();if(!p||p.activeStep===null)return;
  const info=getPhaseInfo(p.daysElapsed);if(!info)return;
  const today=todayKey();const idx=STEP_KEYS.indexOf(key);
  if(!p.stepMarks[p.activeStep])p.stepMarks[p.activeStep]={};
  const cur=!!p.activeStepProgress[key];
  if(!cur){
    for(let i=0;i<=idx;i++){const k=STEP_KEYS[i];if(!p.activeStepProgress[k]){p.activeStepProgress[k]=true;if(!p.stepMarks[p.activeStep][k])p.stepMarks[p.activeStep][k]={date:today,pts:info.rewards[i]};}}
  } else {
    for(let i=idx;i<STEP_KEYS.length;i++){const k=STEP_KEYS[i];p.activeStepProgress[k]=false;delete p.stepMarks[p.activeStep][k];}
  }
  saveStore();render();
  if(p.activeStepProgress.done){
    const sn=p.activeStep;
    if(!p.completedSteps.includes(sn))p.completedSteps.push(sn);
    p.stepDates[sn]=today;p.activeStep=null;p.activeStepProgress={};
    saveStore();render();toast('Шаг '+sn+' завершён! 🎉');
  }
}
function dropActiveStep(){const p=getActiveProject();if(!p)return;
  if(!confirm('Отменить текущий шаг? Прогресс по нему сгорит.'))return;
  if(p.activeStep!==null&&p.stepMarks[p.activeStep])delete p.stepMarks[p.activeStep];
  p.activeStep=null;p.activeStepProgress={};saveStore();render();}