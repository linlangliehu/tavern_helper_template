<template>
  <div class="char-layout">
    <div class="section-head">{{ store.data.白娅.$依存度阶段 }}</div>
    <div class="title-grid">
      <div v-for="(title, name) in store.data.白娅.称号" :key="name" class="title-box">
        <span class="title-name">{{ name }}</span>
        <div class="title-effect">{{ title.效果 }}</div>
        <div class="title-quote">"{{ title.自我评价 }}"</div>
      </div>
      <div v-if="_.isEmpty(store.data.白娅.称号)" class="title-box">
        <span class="title-name">无称号</span>
        <div class="title-effect">当前没有生效的称号</div>
        <div class="title-quote">"..."</div>
      </div>
    </div>

    <div class="section-head">着装记录</div>
    <div class="attire-list">
      <div v-for="(description, slot) in store.data.白娅.着装" :key="slot" class="attire-item">
        <span class="attire-slot">【{{ slot }}】</span>
        {{ description }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useDataStore } from '../store';

const store = useDataStore();
</script>

<style lang="scss" scoped>
.char-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-head {
  font-size: 0.95rem;
  font-family: var(--font-title);
  border-bottom: 1px solid var(--c-gold-dim);
  display: inline-block;
  margin-bottom: 8px;
  font-weight: bold;
  color: var(--c-gold);
  letter-spacing: 1px;
  padding-bottom: 2px;
  text-shadow: 0 0 6px var(--c-gold-glow);

  &::before {
    content: '◆ ';
    font-size: 0.6em;
    vertical-align: middle;
  }
}

.title-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.title-box {
  border: 1px solid var(--c-gold-dark);
  padding: 7px;
  background: var(--c-dark-surface);
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--c-gold-dim);
  }
}

.title-name {
  background: linear-gradient(180deg, var(--c-gold-dark), var(--c-gold-dim));
  color: var(--c-charcoal);
  display: inline-block;
  padding: 2px 6px;
  font-size: 0.72rem;
  font-weight: bold;
  margin-bottom: 3px;
  letter-spacing: 0.5px;
}

.title-effect {
  font-size: 0.78rem;
  margin-bottom: 3px;
  color: var(--c-white);
}

.title-quote {
  font-size: 0.7rem;
  color: var(--c-ghost);
  font-style: italic;
}

.attire-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 7px;
}

.attire-item {
  border: 1px solid var(--c-mid-border);
  padding: 6px;
  font-size: 0.82rem;
  background: var(--c-dark-surface);
  color: var(--c-white);
}

.attire-slot {
  color: var(--c-gold-dim);
  font-size: 0.72rem;
  display: block;
}

@media (max-width: 600px) {
  .title-grid,
  .attire-list {
    grid-template-columns: 1fr;
  }
}
</style>
