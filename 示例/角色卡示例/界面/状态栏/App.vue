<template>
  <div class="card">
    <WorldSection />

    <DependencyBar />

    <TabNav v-model="active_tab" :tabs="tabs" />

    <div v-if="active_tab" class="content-area">
      <div v-if="active_tab === '白娅'" class="tab-pane active">
        <CharacterPanel />
      </div>
      <div v-else-if="active_tab === '主角'" class="tab-pane active">
        <InventoryPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CharacterPanel from './components/CharacterPanel.vue';
import DependencyBar from './components/DependencyBar.vue';
import InventoryPanel from './components/InventoryPanel.vue';
import TabNav from './components/TabNav.vue';
import WorldSection from './components/WorldSection.vue';

const tabs = [
  { id: '白娅', label: '角色情报' },
  { id: '主角', label: '持有物品' },
];

const active_tab = useLocalStorage<string | null>('status_bar:active_tab', null);
</script>

<style lang="scss" scoped>
.card {
  width: 100%;
  max-width: 720px;
  background-color: var(--c-charcoal);
  border: 1.5px solid var(--c-gold-dim);
  box-shadow: 0 0 20px var(--c-gold-glow), inset 0 0 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  font-family: var(--font-body);
  color: var(--c-parchment);
  font-size: 13px;
  line-height: 1.35;
  margin: 0 auto;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-conic-gradient(rgba(200, 184, 138, 0.01) 0% 25%, transparent 0% 50%) 0 0 / 3px 3px;
    pointer-events: none;
    z-index: 1;
  }
}

.content-area {
  padding: 12px;
  min-height: 0;
  position: relative;
  z-index: 2;
}

.tab-pane {
  display: none;
  animation: fadeEffect 0.4s;
}

.tab-pane.active {
  display: block;
}

@keyframes fadeEffect {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
