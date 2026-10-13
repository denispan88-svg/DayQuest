/* =========================================================
   ХРАНИЛИЩЕ — работает и в браузере, и в APK
   ========================================================= */
const Storage = {
  async get(key){
    try{
      if(window.Capacitor?.Plugins?.Preferences){
        const { value } = await window.Capacitor.Plugins.Preferences.get({ key });
        return value;
      }
    }catch(e){}
    try{ return localStorage.getItem(key); }catch(e){ return null; }
  },
  async set(key, value){
    try{
      if(window.Capacitor?.Plugins?.Preferences){
        await window.Capacitor.Plugins.Preferences.set({ key, value });
        return;
      }
    }catch(e){}
    try{ localStorage.setItem(key, value); }catch(e){}
  }
};