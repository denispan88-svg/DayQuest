/* ============================ УТИЛИТЫ ============================ */
const $ = (s,r=document)=>r.querySelector(s);
const uid = ()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const pad = n=>String(n).padStart(2,'0');
const fmtKey = d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayKey = ()=>fmtKey(new Date());
const parseKey = k=>{const[y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d);};
const esc = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtNum = n=>Number.isInteger(n)?n:(Math.round(n*10)/10);
const DAYS_RU=['вс','пн','вт','ср','чт','пт','сб'];
const MONTHS_RU=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

function prettyDate(k){const d=parseKey(k);return `${DAYS_RU[d.getDay()]}, ${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;}
function nextMonday(from=new Date()){const d=new Date(from);let diff=(8-d.getDay())%7;if(diff===0)diff=7;d.setDate(d.getDate()+diff);return fmtKey(d);}
function firstOfNextMonth(from=new Date()){return fmtKey(new Date(from.getFullYear(),from.getMonth()+1,1));}
function daysBetween(k1,k2){return Math.round((parseKey(k2)-parseKey(k1))/86400000);}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2000);}