/* ============================ ОБНОВЛЕНИЕ ДНЯ ============================ */
function refreshDay(){
  processProjectDaily();
  dailyMaintenance();
  saveState();
  render();
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) refreshDay(); });
window.addEventListener('focus',()=>{ refreshDay(); });
if(window.Capacitor?.Plugins?.App){
  window.Capacitor.Plugins.App.addListener('appStateChange',({isActive})=>{
    if(isActive) refreshDay();
  });
}

/* ============================ ПРОВЕРКА ОБНОВЛЕНИЙ ============================ */
async function checkForUpdates(){
  try{
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if(!res.ok){ console.log('No releases yet'); return; }
    const data = await res.json();
    const latestTag = data.tag_name || '';
    const latest = latestTag.replace(/^v/,'').split('-')[0];
    if(!latest) return;
    console.log('Latest:', latest, 'Current:', APP_VERSION);
    if(compareVersions(latest, APP_VERSION) > 0){
      const apkAsset = (data.assets||[]).find(a => a.name && a.name.endsWith('.apk'));
      if(apkAsset) showUpdateBanner(latest, apkAsset.browser_download_url);
    }
  }catch(e){ console.log('Update check failed', e); }
}
function compareVersions(a, b){
  const pa = String(a).split('.').map(n=>parseInt(n)||0);
  const pb = String(b).split('.').map(n=>parseInt(n)||0);
  for(let i=0; i<Math.max(pa.length, pb.length); i++){
    if((pa[i]||0) > (pb[i]||0)) return 1;
    if((pa[i]||0) < (pb[i]||0)) return -1;
  }
  return 0;
}
function showUpdateBanner(version, url){
  if(document.getElementById('updateBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'updateBanner';
  banner.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#3ddc97,#42d3ff);color:#0d1020;padding:12px 18px;border-radius:14px;font-size:13px;font-weight:700;z-index:300;box-shadow:0 8px 30px rgba(61,220,151,.5);display:flex;gap:12px;align-items:center;max-width:92vw';
  banner.innerHTML = `<span>🎉 Версия ${version}</span><button id="updateNow" style="background:#0d1020;color:#fff;padding:7px 14px;border-radius:8px;font-weight:700;border:none;cursor:pointer">Обновить</button><button id="updateDismiss" style="background:transparent;border:none;color:#0d1020;font-size:18px;font-weight:700;cursor:pointer;padding:0 4px">✕</button>`;
  document.body.appendChild(banner);
  banner.querySelector('#updateNow').onclick = () => { window.open(url, '_blank'); };
  banner.querySelector('#updateDismiss').onclick = () => banner.remove();
}
document.addEventListener('visibilitychange', () => { if(!document.hidden) checkForUpdates(); });

/* ============================ СТАРТ ============================ */
(async function init(){
  await loadState();
  await loadStore();
  processProjectDaily();
  dailyMaintenance();
  await saveState();
  await saveStore();
  render();
  setTimeout(checkForUpdates, 2500);
})();