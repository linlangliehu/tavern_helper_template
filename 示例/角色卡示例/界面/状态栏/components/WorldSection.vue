<template>
  <div class="world-section">
    <div class="meta-row">
      <span>DATE: {{ formatted_date }}</span>
      <span>TIME: {{ formatted_time }}</span>
      <span>LOC: {{ store.data.世界.当前地点 }}</span>
    </div>
    <div class="event-list">
      <div v-for="(description, name) in store.data.世界.近期事务" :key="name" class="event-badge">
        <span class="event-title">{{ name }}</span>
        <span class="event-desc">{{ description }}</span>
      </div>
      <div v-if="_.isEmpty(store.data.世界.近期事务)" class="event-badge">
        <span class="event-title">暂无事务</span>
        <span class="event-desc">当前没有进行中的事务</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useDataStore } from '../store';

const store = useDataStore();

const formatted_date = computed(() => {
  const match = store.data.世界.当前时间.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : store.data.世界.当前时间.split(' ')[0] || '未知';
});

const formatted_time = computed(() => {
  const match = store.data.世界.当前时间.match(/(\d{2}:\d{2})/);
  return match ? match[1] : store.data.世界.当前时间.split(' ')[1] || '未知';
});
</script>

<style lang="scss" scoped>
.world-section {
<<<<<<< HEAD
  border-bottom: 1px solid var(--c-gold-dim);
  padding: 10px;
  background-color: var(--c-charcoal);
=======
  border-bottom: 3px solid var(--c-granite);
  padding: 10px;
  background-color: var(--c-mint-cream);
>>>>>>> 563a54227d547b8c7ade58fb3242b38f89cefd18
}

.meta-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-weight: bold;
  font-size: 0.9rem;
<<<<<<< HEAD
  font-family: var(--font-title);
  color: var(--c-gold-light);
  letter-spacing: 1px;
  border-bottom: 1px dashed var(--c-gold-dark);
  padding-bottom: 6px;
  flex-wrap: wrap;
  gap: 6px;
  text-shadow: 0 0 4px var(--c-gold-glow);
=======
  border-bottom: 1.5px dashed var(--c-grey-olive);
  padding-bottom: 6px;
  flex-wrap: wrap;
  gap: 6px;
>>>>>>> 563a54227d547b8c7ade58fb3242b38f89cefd18
}

.event-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.event-badge {
<<<<<<< HEAD
  background: var(--c-dark-surface);
  border: 1px solid var(--c-gold-dark);
=======
  background: #fff;
  border: 1.5px solid var(--c-granite);
>>>>>>> 563a54227d547b8c7ade58fb3242b38f89cefd18
  padding: 6px 8px;
  min-width: 130px;
  flex: 1;
  position: relative;
}

.event-badge::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
<<<<<<< HEAD
  width: 3px;
  background: linear-gradient(180deg, var(--c-gold), var(--c-gold-dark));
=======
  width: 4px;
  background-color: var(--c-celadon);
>>>>>>> 563a54227d547b8c7ade58fb3242b38f89cefd18
}

.event-title {
  display: block;
  font-weight: bold;
  margin-bottom: 2px;
<<<<<<< HEAD
  padding-left: 8px;
  color: var(--c-white);
=======
  padding-left: 6px;
>>>>>>> 563a54227d547b8c7ade58fb3242b38f89cefd18
}

.event-desc {
  display: block;
  font-size: 0.75rem;
<<<<<<< HEAD
  color: var(--c-ghost);
  padding-left: 8px;
=======
  color: var(--c-grey-olive);
  padding-left: 6px;
>>>>>>> 563a54227d547b8c7ade58fb3242b38f89cefd18
}

@media (max-width: 600px) {
  .meta-row {
    flex-direction: column;
    gap: 5px;
  }

  .event-list {
    flex-direction: column;
  }

  .event-badge {
    min-width: auto;
  }
}
</style>
