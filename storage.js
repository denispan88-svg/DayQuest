/* =========================================================
   ХРАНИЛИЩЕ (только для нативного APK через Capacitor)
   ========================================================= */
const Storage = {
  async get(key){
    try {
      const { value } = await window.Capacitor.Plugins.Preferences.get({ key });
      return value;
    } catch(e) {
      console.error('Ошибка чтения Preferences:', e);
      return null;
    }
  },
  async set(key, value){
    try {
      await window.Capacitor.Plugins.Preferences.set({ key, value });
    } catch(e) {
      console.error('Ошибка записи Preferences:', e);
    }
  }
};