<template>
  <div class="dependency-strip">
    <span class="dependency-label">依存度</span>
    <div class="dependency-track">
      <div class="dependency-fill" :style="{ width: store.data.白娅.依存度 + '%' }"></div>
    </div>
    <span class="dependency-value">{{ store.data.白娅.依存度 }}%</span>
    <div class="dependency-controls">
      <button
        class="dependency-button"
        :disabled="store.data.白娅.依存度 <= 0"
        type="button"
        @click="adjustDependency(-1)"
      >
        -
      </button>
      <button
        class="dependency-button"
        :disabled="store.data.白娅.依存度 >= 100"
        type="button"
        @click="adjustDependency(1)"
      >
        +
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from '../store';

const store = useDataStore();

function adjustDependency(delta: number) {
  store.data.白娅.依存度 = store.data.白娅.依存度 + delta;
}
</script>

<style lang="scss" scoped>
.dependency-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--c-dark-surface);
  border-bottom: 1px dashed var(--c-gold-dark);
}

.dependency-label,
.dependency-value {
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--c-gold-light);
  text-shadow: 0 0 4px var(--c-gold-glow);
}

.dependency-track {
  flex: 1;
  max-width: 360px;
  height: 10px;
  border: 1px solid var(--c-gold-dark);
  background: var(--c-abyss);
  position: relative;
  overflow: hidden;
}

.dependency-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, var(--c-gold-dark), var(--c-gold), var(--c-gold-bright));
  border-right: 1px solid var(--c-gold-bright);
  transition: width 0.25s ease;
  box-shadow: 0 0 6px var(--c-gold-glow);
}

.dependency-controls {
  display: flex;
  gap: 4px;
}

.dependency-button {
  width: 24px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--c-gold-dim);
  background: linear-gradient(180deg, var(--c-dark-surface), var(--c-abyss));
  color: var(--c-gold);
  font-family: inherit;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(201, 168, 76, 0.1);
  transition: all 0.15s;
}

.dependency-button:hover:not(:disabled) {
  background: linear-gradient(180deg, var(--c-gold-dark), var(--c-abyss));
  color: var(--c-gold-bright);
  box-shadow: 0 0 4px var(--c-gold-glow);
}

.dependency-button:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}

.dependency-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  box-shadow: none;
}

.dependency-button:focus-visible {
  outline: 1px dashed var(--c-gold);
  outline-offset: 2px;
}
</style>
