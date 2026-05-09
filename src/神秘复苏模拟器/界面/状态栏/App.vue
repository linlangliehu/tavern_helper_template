<template>
  <div class="status-panel">
    <div class="panel-rivet rivet-tl"></div>
    <div class="panel-rivet rivet-tr"></div>
    <div class="panel-rivet rivet-bl"></div>
    <div class="panel-rivet rivet-br"></div>

    <div class="panel-header">
      <span class="header-deco">◇</span>
      <span class="panel-title">生 存 状 态 面 板</span>
      <span class="header-deco">◇</span>
    </div>

    <div class="panel-divider"></div>

    <div class="panel-body">
      <div class="stat-row" v-for="(value, key) in displayData" :key="key">
        <span class="stat-label">▸ {{ key }}</span>
        <span class="stat-sep">━━</span>
        <span class="stat-value" :class="{ 'value-warning': isWarning(key, value) }">{{ value }}</span>
      </div>
    </div>

    <div class="panel-divider"></div>

    <div class="panel-footer">
      <span class="footer-text">◆ 灵异事件监控系统 ◆</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDataStore } from './store'

const store = useDataStore()

const labelMap: Record<string, string> = {
  姓名: '姓名',
  状态: '状态',
  厉鬼复苏程度: '厉鬼复苏程度',
  持有拼图: '持有拼图',
  灵异物品: '灵异物品',
  所在位置: '所在位置',
}

const displayData = computed(() => {
  const data = store.data as Record<string, any>
  if (!data) return {}
  const result: Record<string, string> = {}
  for (const [key, label] of Object.entries(labelMap)) {
    if (data[key] !== undefined) {
      let val = String(data[key])
      if (key === '厉鬼复苏程度' && typeof data[key] === 'number') {
        val = data[key] + '%'
      }
      result[label] = val
    }
  }
  return result
})

function isWarning(key: string, value: string) {
  if (key === '厉鬼复苏程度') {
    const num = parseInt(value)
    return !isNaN(num) && num >= 70
  }
  if (key === '状态') {
    return ['重伤', '濒死', '异化中'].some(s => value.includes(s))
  }
  return false
}
</script>

<style scoped>
.status-panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-steel);
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  box-shadow: 0 0 25px rgba(0, 0, 0, 0.95), inset 0 0 30px rgba(0, 0, 0, 0.6);
}

.panel-rivet {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: radial-gradient(circle, #555 0%, #222 100%);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2);
}
.rivet-tl { top: 6px; left: 8px; }
.rivet-tr { top: 6px; right: 8px; }
.rivet-bl { bottom: 6px; left: 8px; }
.rivet-br { bottom: 6px; right: 8px; }

.panel-header {
  background: linear-gradient(90deg, var(--bg-header) 0%, var(--bg-panel) 50%, var(--bg-header) 100%);
  border-bottom: 1px solid var(--border-dark-red);
  padding: 12px 20px;
  text-align: center;
}

.header-deco {
  color: var(--accent-dark-red);
  font-size: 10px;
  margin: 0 6px;
}

.panel-title {
  color: var(--accent-gold);
  font-family: "Noto Serif SC", "SimSun", serif;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 4px;
  text-shadow: 0 0 8px var(--accent-gold-glow);
}

.panel-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--border-dark-red) 50%, transparent 100%);
  margin: 0 16px;
}

.panel-body {
  padding: 14px 20px;
}

.stat-row {
  display: flex;
  align-items: baseline;
  padding: 4px 0;
  line-height: 2;
}

.stat-label {
  color: var(--text-silver);
  font-family: "Noto Sans SC", "Microsoft YaHei", monospace;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.8px;
  white-space: nowrap;
}

.stat-sep {
  flex: 1;
  color: #2a2a2a;
  font-size: 10px;
  letter-spacing: -1px;
  margin: 0 8px;
  overflow: hidden;
}

.stat-value {
  color: var(--text-white);
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 300;
  text-align: right;
}

.stat-value.value-warning {
  color: #c43c3c;
  text-shadow: 0 0 6px rgba(196, 60, 60, 0.6);
  font-weight: 600;
}

.panel-footer {
  padding: 8px 20px;
  text-align: center;
}

.footer-text {
  color: #3a3a3a;
  font-size: 10px;
  letter-spacing: 2px;
  font-family: monospace;
}
</style>
