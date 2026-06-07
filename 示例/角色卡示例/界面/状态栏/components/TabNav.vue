<template>
  <nav class="tabs">
    <button
      v-for="tab in props.tabs"
      :key="tab.id"
      class="tab-button"
      :class="{ active: model === tab.id }"
      :aria-expanded="model === tab.id"
      @click="toggleTab(tab.id)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>

<script setup lang="ts">
const props = defineProps<{
  tabs: { id: string; label: string }[];
}>();

const model = defineModel<string | null>({ required: true });

function toggleTab(id: string) {
  model.value = model.value === id ? null : id;
}
</script>

<style lang="scss" scoped>
.tabs {
  display: flex;
<<<<<<< HEAD
  background-color: var(--c-abyss);
  border-bottom: 1px solid var(--c-gold-dim);
=======
  background-color: var(--c-grey-olive);
  border-bottom: 3px solid var(--c-granite);
>>>>>>> b0b1703a805d03d3a4d97270fa3ebbc17a91f8b8
}

.tab-button {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
<<<<<<< HEAD
  color: var(--c-gold-dim);
  font-size: 0.92rem;
  font-weight: bold;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-right: 1px solid var(--c-gold-dark);
  text-shadow: none;
=======
  color: var(--c-mint-cream);
  font-size: 0.92rem;
  font-weight: bold;
  font-family: var(--font-archive);
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  border-right: 1.5px solid var(--c-granite);
>>>>>>> b0b1703a805d03d3a4d97270fa3ebbc17a91f8b8
}

.tab-button:last-child {
  border-right: none;
}

.tab-button:hover {
<<<<<<< HEAD
  background-color: var(--c-dark-surface);
  color: var(--c-gold-light);
  text-shadow: 0 0 6px var(--c-gold-glow);
}

.tab-button.active {
  background-color: var(--c-charcoal);
  color: var(--c-gold);
  position: relative;
  top: 1px;
  padding-bottom: 10px;
  text-shadow: 0 0 8px var(--c-gold-glow);

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--c-gold), transparent);
  }
=======
  background-color: var(--c-ash-grey);
  color: var(--c-granite);
}

.tab-button.active {
  background-color: var(--c-mint-cream);
  color: var(--c-granite);
  position: relative;
  top: 1px;
  padding-bottom: 10px;
>>>>>>> b0b1703a805d03d3a4d97270fa3ebbc17a91f8b8
}
</style>
