import { createPinia } from 'pinia';
import { createApp } from 'vue';
// H10/BF0.5: 发布链孤儿入口。index.yaml 无 iframe 注入；活 UI=消息内面板/数据库前端/界面美化。
// 核心 MVU→DB 镜像已迁入 脚本/数据库前端/mvu-core-mirror.ts。勿恢复加载除非明确决策回滚。
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
