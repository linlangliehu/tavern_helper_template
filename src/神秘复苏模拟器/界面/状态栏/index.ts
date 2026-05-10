import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import './global.css';

$(async () => {
  try {
    console.info('[MFRS Status] mounting status UI');
    createApp(App).use(createPinia()).mount('#app');
  } catch (error) {
    console.error('[MFRS Status] failed to mount status UI', error);
    throw error;
  }
});
