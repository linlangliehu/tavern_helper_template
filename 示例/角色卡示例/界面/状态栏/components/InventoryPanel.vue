<template>
  <div>
    <div class="section-head">物品清单</div>
    <div v-if="!_.isEmpty(store.data.主角.物品栏)" class="inventory-grid">
      <div v-for="(item, name) in store.data.主角.物品栏" :key="name" class="item-row">
        <div class="item-icon">{{ getItemIcon(name as string) }}</div>
        <div class="item-detail">
          <span class="item-name">{{ name }}</span>
          <span class="item-desc">{{ item.描述 }}</span>
        </div>
        <span class="item-count">x{{ item.数量 }}</span>
      </div>
    </div>
    <div v-else class="empty-state">背包空空如也...</div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useDataStore } from '../store';

const store = useDataStore();

function getItemIcon(name: string): string {
  // 根据物品名生成简短图标
  if (name.includes('手机') || name.includes('电话')) return 'PH';
  if (name.includes('钥匙')) return 'KY';
  if (name.includes('钱') || name.includes('币')) return '$$';
  if (name.includes('证') || name.includes('卡')) return 'ID';
  if (name.includes('糖') || name.includes('药')) return 'RX';
  if (name.includes('创可贴') || name.includes('绷带')) return '+';
  // 默认取前两个字符
  return name.substring(0, 2).toUpperCase();
}
</script>

<style lang="scss" scoped>
.inventory-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
<<<<<<< HEAD
  border: 1px solid var(--c-gold-dark);
  padding: 8px;
  background: var(--c-dark-surface);
  transition: all 0.2s;
=======
  border: 1.5px solid var(--c-granite);
  padding: 8px;
  background: #fff;
  transition: transform 0.2s;
>>>>>>> 4f0b745981550e95a66a32adf5b43f01a2cde104
}

.item-row:hover {
  transform: translateX(5px);
<<<<<<< HEAD
  border-color: var(--c-gold-dim);
  box-shadow: 0 0 8px var(--c-gold-glow);
=======
  background: var(--c-mint-cream);
>>>>>>> 4f0b745981550e95a66a32adf5b43f01a2cde104
}

.item-icon {
  width: 28px;
  height: 28px;
<<<<<<< HEAD
  background: linear-gradient(135deg, var(--c-gold-dark), var(--c-gold-dim));
  border: 1px solid var(--c-gold);
=======
  background: var(--c-celadon);
  border: 1.5px solid var(--c-granite);
>>>>>>> 4f0b745981550e95a66a32adf5b43f01a2cde104
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-weight: bold;
  font-size: 0.7rem;
<<<<<<< HEAD
  color: var(--c-charcoal);
=======
>>>>>>> 4f0b745981550e95a66a32adf5b43f01a2cde104
}

.item-detail {
  flex: 1;
}

.item-name {
  font-weight: bold;
  display: block;
<<<<<<< HEAD
  color: var(--c-white);
=======
>>>>>>> 4f0b745981550e95a66a32adf5b43f01a2cde104
}

.item-desc {
  font-size: 0.76rem;
<<<<<<< HEAD
  color: var(--c-ghost);
}

.item-count {
  background: linear-gradient(180deg, var(--c-gold-dark), var(--c-gold-dim));
  color: var(--c-charcoal);
  padding: 2px 6px;
  font-size: 0.72rem;
  font-weight: bold;
  letter-spacing: 0.5px;
=======
  color: var(--c-grey-olive);
}

.item-count {
  background: var(--c-granite);
  color: #fff;
  padding: 2px 5px;
  font-size: 0.72rem;
  border-radius: 3px;
>>>>>>> 4f0b745981550e95a66a32adf5b43f01a2cde104
}

.empty-state {
  text-align: center;
<<<<<<< HEAD
  color: var(--c-ghost);
=======
  color: var(--c-grey-olive);
>>>>>>> 4f0b745981550e95a66a32adf5b43f01a2cde104
  padding: 18px;
  font-style: italic;
  font-size: 0.85rem;
}
<<<<<<< HEAD

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
=======
>>>>>>> 4f0b745981550e95a66a32adf5b43f01a2cde104
</style>
