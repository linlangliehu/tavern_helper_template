<template>
  <div class="character-card">
    <div class="card-rivet rivet-tl"></div>
    <div class="card-rivet rivet-tr"></div>
    <div class="card-rivet rivet-bl"></div>
    <div class="card-rivet rivet-br"></div>
    <div class="scan-line"></div>

    <header class="card-title-area">
      <div class="title-deco-line"></div>
      <div class="title-stamp">CLASSIFIED // 档案编号 MFRS-<span class="stamp-blink">█</span>█-2026</div>
      <h1 class="main-title">
        <span class="title-symbol">⟐</span>
        神 秘 复 苏 模 拟 器
        <span class="title-symbol">⟐</span>
      </h1>
      <p class="title-sub">PARANORMAL REVIVAL SIMULATOR — 监控档案 #<span class="blink-cursor">_</span></p>
      <div class="title-deco-line"></div>
    </header>

    <section class="card-section section-world">
      <div class="section-header">
        <span class="section-icon">▸▸</span>
        <span class="section-title">世界 / 阵营</span>
        <span class="section-line"></span>
      </div>
      <div class="section-body world-grid">
        <div class="form-field">
          <label class="field-label">所在世界</label>
          <select v-model="worldSelect" class="field-select">
            <option value="">— 选择世界线 —</option>
            <option value="original">原作世界线</option>
            <option value="parallel">平行世界线</option>
            <option value="custom">自定义世界线</option>
          </select>
        </div>
        <div class="form-field">
          <label class="field-label">阵营归属</label>
          <select v-model="factionSelect" class="field-select">
            <option value="">— 选择阵营 —</option>
            <option value="hq">总部驭鬼者</option>
            <option value="civilian">民间异类</option>
            <option value="rogue">失控者</option>
            <option value="ghost">厉鬼阵营</option>
          </select>
        </div>
      </div>
    </section>

    <div class="card-divider"></div>

    <section class="card-section section-profile">
      <div class="section-header">
        <span class="section-icon">▸▸</span>
        <span class="section-title">基础档案</span>
        <span class="section-line"></span>
      </div>
      <div class="section-body">
        <div class="profile-grid">
          <div class="form-field field-name">
            <label class="field-label">姓名</label>
            <div class="field-display" :class="{ 'value-warning': false }">{{ displayData['姓名'] || '未知' }}</div>
          </div>
          <div class="form-field field-status">
            <label class="field-label">状态</label>
            <div class="field-display status-display" :class="{ 'value-warning': isWarning('状态', displayData['状态'] || '') }">
              <span class="status-indicator" :class="statusClass"></span>
              {{ displayData['状态'] || '健康' }}
            </div>
          </div>
          <div class="form-field field-location">
            <label class="field-label">所在位置</label>
            <div class="field-display">{{ displayData['所在位置'] || '未知' }}</div>
          </div>
        </div>
      </div>
    </section>

    <div class="card-divider"></div>

    <section class="card-section section-attributes">
      <div class="section-header">
        <span class="section-icon">▸▸</span>
        <span class="section-title">属性参数</span>
        <span class="section-line"></span>
      </div>
      <div class="section-body">
        <div class="attr-rows">
          <div class="attr-row">
            <span class="attr-label">▸ 厉鬼复苏程度</span>
            <div class="attr-bar-wrap">
              <div class="attr-bar" :class="{ 'bar-critical': resurgencePercent >= 90 }">
                <div
                  class="attr-bar-fill"
                  :class="resurgenceClass"
                  :style="{ width: resurgencePercent + '%' }"
                >
                  <div class="bar-segments"></div>
                </div>
              </div>
              <span class="attr-value" :class="{ 'value-warning': resurgencePercent >= 70, 'value-critical': resurgencePercent >= 90 }">
                {{ resurgencePercent }}%
              </span>
            </div>
          </div>
        </div>

        <div class="attr-detail-grid">
          <div class="attr-detail-item">
            <span class="attr-detail-label">持有拼图</span>
            <span class="attr-detail-sep">━━</span>
            <span class="attr-detail-value">{{ displayData['持有拼图'] || '无' }}</span>
          </div>
          <div class="attr-detail-item">
            <span class="attr-detail-label">灵异物品</span>
            <span class="attr-detail-sep">━━</span>
            <span class="attr-detail-value">{{ displayData['灵异物品'] || '无' }}</span>
          </div>
        </div>
      </div>
    </section>

    <div class="card-divider"></div>

    <section class="card-section section-abilities">
      <div class="section-header">
        <span class="section-icon">▸▸</span>
        <span class="section-title">能力系统</span>
        <span class="section-line"></span>
      </div>
      <div class="section-body abilities-layout">
        <div class="ability-edit">
          <div class="ability-edit-header">
            <span class="ability-edit-title">◆ 技能编辑</span>
          </div>
          <div class="ability-list">
            <div class="ability-item" v-for="(ability, idx) in abilities" :key="idx">
              <span class="ability-marker">◆</span>
              <span class="ability-name">{{ ability.name }}</span>
              <span class="ability-level">{{ ability.level }}</span>
            </div>
            <div class="ability-empty" v-if="abilities.length === 0">
              <span class="ability-empty-icon">⊘</span>
              <span class="ability-empty-text">暂无已录入技能</span>
            </div>
          </div>
        </div>
        <div class="ability-template">
          <div class="ability-template-header">
            <span class="ability-template-title">◇ 模板提取</span>
          </div>
          <div class="template-list">
            <div class="template-item" v-for="(tpl, idx) in templates" :key="idx" @click="applyTemplate(tpl)">
              <span class="template-marker">◇</span>
              <span class="template-name">{{ tpl.name }}</span>
              <span class="template-arrow">›</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="card-divider"></div>

    <section class="card-section section-background">
      <div class="section-header">
        <span class="section-icon">▸▸</span>
        <span class="section-title">背景设定</span>
        <span class="section-line"></span>
      </div>
      <div class="section-body">
        <div class="form-field">
          <label class="field-label">角色背景</label>
          <textarea
            v-model="backgroundText"
            class="field-textarea"
            placeholder="输入角色背景设定、经历描述..."
            rows="4"
          ></textarea>
        </div>
      </div>
    </section>

    <div class="card-divider"></div>

    <footer class="card-footer">
      <div class="footer-actions">
        <button class="btn btn-primary" @click="handleGenerate">
          <span class="btn-icon">⟐</span>
          生成文本
        </button>
        <button class="btn btn-secondary" @click="handleReset">
          重置档案
        </button>
        <button class="btn btn-secondary" @click="handleExport">
          导出数据
        </button>
      </div>
      <div class="footer-info">
        <span class="footer-text">◆ 灵异事件监控系统 ◆</span>
        <span class="footer-status">
          <span class="status-dot"></span>
          监控中
        </span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDataStore } from './store'

const store = useDataStore()

const worldSelect = ref('')
const factionSelect = ref('')
const backgroundText = ref('')

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
  if (!data) return {} as Record<string, string>
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

const resurgencePercent = computed(() => {
  const data = store.data as Record<string, any>
  if (!data) return 0
  const val = data['厉鬼复苏程度']
  if (typeof val === 'number') return Math.min(100, Math.max(0, val))
  const num = parseInt(String(val))
  return isNaN(num) ? 0 : Math.min(100, Math.max(0, num))
})

const resurgenceClass = computed(() => {
  if (resurgencePercent.value >= 90) return 'fill-critical'
  if (resurgencePercent.value >= 70) return 'fill-danger'
  if (resurgencePercent.value >= 40) return 'fill-warning'
  return 'fill-normal'
})

const statusClass = computed(() => {
  const s = displayData.value['状态'] || '健康'
  if (['重伤', '濒死', '异化中'].some(x => s.includes(x))) return 'status-danger'
  if (['轻伤', '虚弱', '疲劳'].some(x => s.includes(x))) return 'status-warning'
  return 'status-ok'
})

const abilities = computed(() => {
  const data = store.data as Record<string, any>
  if (!data || !data['abilities']) return []
  try {
    return typeof data['abilities'] === 'string' ? JSON.parse(data['abilities']) : data['abilities']
  } catch {
    return []
  }
})

const templates = [
  { name: '驭鬼者标准模板', skills: ['鬼域展开', '灵异感知'] },
  { name: '民间异类模板', skills: ['直觉闪避', '灵异物品使用'] },
  { name: '总部调查员模板', skills: ['情报分析', '灵异压制'] },
]

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

function applyTemplate(tpl: { name: string; skills: string[] }) {
  console.log('Applied template:', tpl.name)
}

function handleGenerate() {
  console.log('Generate triggered')
}

function handleReset() {
  worldSelect.value = ''
  factionSelect.value = ''
  backgroundText.value = ''
}

function handleExport() {
  const data = store.data as Record<string, any>
  console.log('Export data:', JSON.stringify(data, null, 2))
}
</script>

<style scoped>
.character-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-steel);
  max-width: 560px;
  margin: 0 auto;
  position: relative;
  box-shadow: var(--shadow-panel);
  overflow: hidden;
}

.card-rivet {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #4a4a4a 0%, #151515 60%, #0a0a0a 100%);
  box-shadow: inset 0 1px 1px var(--rivet-highlight), 0 0 3px rgba(0, 0, 0, 0.9), 0 0 1px rgba(139, 26, 26, 0.2);
  z-index: 2;
}
.rivet-tl { top: 8px; left: 10px; }
.rivet-tr { top: 8px; right: 10px; }
.rivet-bl { bottom: 8px; left: 10px; }
.rivet-br { bottom: 8px; right: 10px; }

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(139, 26, 26, 0.08), transparent);
  z-index: 3;
  animation: scan-sweep 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes scan-sweep {
  0%, 100% { top: 0; opacity: 0; }
  5% { opacity: 1; }
  95% { opacity: 1; }
  50% { top: 100%; }
}

.card-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--border-dark-red) 15%, var(--border-steel) 50%, var(--border-dark-red) 85%, transparent 100%);
  margin: 0 20px;
  position: relative;
}

.card-title-area {
  padding: 20px 24px 16px;
  text-align: center;
  background: linear-gradient(180deg, rgba(20, 6, 6, 0.6) 0%, transparent 100%);
  border-bottom: 1px solid var(--border-dark-red);
}

.title-deco-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-dark-red), var(--accent-gold-dim), var(--accent-dark-red), transparent);
  margin: 8px 0;
}

.title-stamp {
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 2px;
  margin-bottom: 6px;
  text-transform: uppercase;
  opacity: 0.7;
}

.stamp-blink {
  animation: stamp-flicker 3s step-end infinite;
}

@keyframes stamp-flicker {
  0%, 92% { opacity: 1; }
  93% { opacity: 0; }
  94% { opacity: 1; }
  95% { opacity: 0; }
  96%, 100% { opacity: 1; }
}

.main-title {
  color: var(--accent-gold);
  font-family: var(--font-serif);
  font-size: 21px;
  font-weight: 800;
  letter-spacing: 6px;
  text-shadow: var(--shadow-text-gold), 0 0 24px rgba(184, 150, 58, 0.12);
  margin: 8px 0;
}

.title-symbol {
  color: var(--accent-dark-red);
  font-size: 11px;
  margin: 0 10px;
  text-shadow: var(--shadow-text-red);
}

.title-sub {
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 2px;
  margin-top: 4px;
}

.blink-cursor {
  animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.card-section {
  padding: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px 8px;
}

.section-icon {
  color: var(--accent-dark-red);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: var(--shadow-text-red);
}

.section-title {
  color: var(--accent-dark-red-bright);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  white-space: nowrap;
  text-shadow: var(--shadow-text-red);
}

.section-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--border-dark-red), transparent);
}

.section-body {
  padding: 4px 20px 14px;
}

.world-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  color: var(--text-label);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.field-select {
  appearance: none;
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-sm);
  color: var(--text-input);
  font-family: var(--font-sans);
  font-size: 12px;
  padding: 7px 30px 7px 10px;
  outline: none;
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%237a1a1a' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

.field-select:focus {
  border-color: var(--border-input-focus);
  box-shadow: 0 0 8px rgba(92, 26, 26, 0.25);
}

.field-select option {
  background: #0a0a0a;
  color: var(--text-input);
}

.field-display {
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-sm);
  color: var(--text-input);
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 7px 10px;
  min-height: 32px;
  display: flex;
  align-items: center;
}

.field-display.value-warning {
  color: #c43c3c;
  text-shadow: 0 0 8px rgba(196, 60, 60, 0.6);
  font-weight: 600;
  border-color: rgba(196, 60, 60, 0.35);
  box-shadow: inset 0 0 8px rgba(196, 60, 60, 0.08);
}

.status-display {
  gap: 6px;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-ok {
  background: #2a5a2a;
  box-shadow: 0 0 4px rgba(42, 90, 42, 0.5);
}

.status-warning {
  background: #6a5a1a;
  box-shadow: 0 0 4px rgba(106, 90, 26, 0.5);
  animation: pulse-warn 2s ease-in-out infinite;
}

.status-danger {
  background: #8a1a1a;
  box-shadow: 0 0 6px rgba(138, 26, 26, 0.6);
  animation: pulse-danger 1.5s ease-in-out infinite;
}

@keyframes pulse-warn {
  0%, 100% { box-shadow: 0 0 4px rgba(106, 90, 26, 0.4); }
  50% { box-shadow: 0 0 8px rgba(106, 90, 26, 0.7); }
}

@keyframes pulse-danger {
  0%, 100% { box-shadow: 0 0 4px rgba(138, 26, 26, 0.4); }
  50% { box-shadow: 0 0 10px rgba(138, 26, 26, 0.8); }
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field-location {
  grid-column: 1 / -1;
}

.field-textarea {
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-sm);
  color: var(--text-input);
  font-family: var(--font-sans);
  font-size: 12px;
  padding: 8px 10px;
  outline: none;
  resize: vertical;
  min-height: 60px;
  line-height: 1.7;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.field-textarea:focus {
  border-color: var(--border-input-focus);
  box-shadow: 0 0 8px rgba(92, 26, 26, 0.25);
}

.field-textarea::placeholder {
  color: var(--text-placeholder);
  font-size: 11px;
}

.attr-rows {
  margin-bottom: 12px;
}

.attr-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.attr-label {
  color: var(--text-silver);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.8px;
  white-space: nowrap;
  min-width: 110px;
}

.attr-bar-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.attr-bar {
  flex: 1;
  height: 10px;
  background: var(--border-steel-dark);
  border: 1px solid var(--border-steel);
  border-radius: 1px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

.attr-bar.bar-critical {
  border-color: rgba(160, 32, 32, 0.4);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5), 0 0 6px rgba(160, 32, 32, 0.15);
}

.attr-bar-fill {
  height: 100%;
  transition: width 0.6s ease, background 0.3s ease;
  position: relative;
}

.bar-segments {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 5px,
    rgba(0, 0, 0, 0.25) 5px,
    rgba(0, 0, 0, 0.25) 6px
  );
}

.fill-normal {
  background: linear-gradient(90deg, #1a3a1a, #2a5a2a);
}
.fill-warning {
  background: linear-gradient(90deg, #3a3a12, #6a6a22);
}
.fill-danger {
  background: linear-gradient(90deg, #4a2018, #7a3018);
  box-shadow: 0 0 8px rgba(138, 58, 26, 0.25);
}
.fill-critical {
  background: linear-gradient(90deg, #5a1212, #901818);
  box-shadow: 0 0 12px rgba(160, 32, 32, 0.4);
  animation: critical-pulse 1.2s ease-in-out infinite;
}

@keyframes critical-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(160, 32, 32, 0.25); }
  50% { box-shadow: 0 0 14px rgba(160, 32, 32, 0.55); }
}

.attr-value {
  color: var(--text-white);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 400;
  min-width: 40px;
  text-align: right;
}

.attr-value.value-warning {
  color: #c4883c;
  text-shadow: 0 0 6px rgba(196, 136, 60, 0.5);
  font-weight: 600;
}

.attr-value.value-critical {
  color: #c43c3c;
  text-shadow: 0 0 8px rgba(196, 60, 60, 0.6);
  font-weight: 700;
  animation: value-pulse 1.5s ease-in-out infinite;
}

@keyframes value-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.attr-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}

.attr-detail-item {
  display: flex;
  align-items: baseline;
  padding: 3px 0;
  line-height: 2;
}

.attr-detail-label {
  color: var(--text-silver);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.8px;
  white-space: nowrap;
}

.attr-detail-sep {
  flex: 1;
  color: #141414;
  font-size: 8px;
  letter-spacing: -1px;
  margin: 0 6px;
  overflow: hidden;
}

.attr-detail-value {
  color: var(--text-white);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 300;
  text-align: right;
}

.abilities-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.ability-edit,
.ability-template {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ability-edit-header,
.ability-template-header {
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-steel-dark);
}

.ability-edit-title {
  color: var(--text-label);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
}

.ability-template-header {
  border-bottom-style: dashed;
  border-color: var(--border-dashed);
}

.ability-template-title {
  color: var(--text-dim);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
}

.ability-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ability-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.008);
  border: 1px solid var(--border-steel-dark);
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.ability-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-dark-red);
  box-shadow: 0 0 4px rgba(139, 26, 26, 0.1);
}

.ability-marker {
  color: var(--accent-dark-red);
  font-size: 7px;
  text-shadow: var(--shadow-text-red);
}

.ability-name {
  flex: 1;
  color: var(--text-bright);
  font-size: 12px;
}

.ability-level {
  color: var(--accent-gold-dim);
  font-family: var(--font-mono);
  font-size: 10px;
}

.ability-empty {
  padding: 16px 8px;
  text-align: center;
  border: 1px dashed var(--border-dashed);
  border-radius: var(--radius-sm);
}

.ability-empty-icon {
  display: block;
  color: var(--text-dim);
  font-size: 18px;
  margin-bottom: 4px;
}

.ability-empty-text {
  color: var(--text-placeholder);
  font-size: 10px;
  font-style: italic;
  letter-spacing: 1px;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px dashed var(--border-dashed);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.template-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-dark-red);
  box-shadow: 0 0 4px rgba(139, 26, 26, 0.1);
}

.template-marker {
  color: var(--accent-gold-dim);
  font-size: 8px;
}

.template-name {
  flex: 1;
  color: var(--text-light);
  font-size: 11px;
}

.template-arrow {
  color: var(--text-dim);
  font-size: 12px;
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.template-item:hover .template-arrow {
  color: var(--accent-dark-red);
  transform: translateX(2px);
}

.card-footer {
  padding: 14px 20px 16px;
  background: linear-gradient(180deg, transparent, rgba(20, 6, 6, 0.35));
  border-top: 1px solid var(--border-dark-red);
}

.footer-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.btn {
  font-family: var(--font-sans);
  font-size: 11px;
  letter-spacing: 1.5px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  outline: none;
  position: relative;
  text-transform: uppercase;
}

.btn-primary {
  background: var(--bg-button-primary);
  border: 1px solid var(--border-dark-red-bright);
  color: var(--text-white);
  font-weight: 600;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 0 10px rgba(106, 42, 42, 0.2);
}

.btn-primary:hover {
  border-color: var(--accent-dark-red-bright);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 16px rgba(160, 32, 32, 0.35);
  background: linear-gradient(180deg, #240a0a 0%, #160505 100%);
  text-shadow: 0 0 6px rgba(220, 220, 220, 0.2);
}

.btn-primary:active {
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.5);
  transform: translateY(1px);
}

.btn-icon {
  color: var(--accent-dark-red);
  margin-right: 4px;
  font-size: 9px;
}

.btn-secondary {
  background: var(--bg-button-secondary);
  border: 1px solid var(--border-steel);
  color: var(--text-light);
  font-weight: 400;
}

.btn-secondary:hover {
  border-color: var(--border-steel-light);
  color: var(--text-bright);
  background: linear-gradient(180deg, #242424 0%, #1a1a1a 100%);
}

.btn-secondary:active {
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
  transform: translateY(1px);
}

.footer-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-text {
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 2px;
}

.footer-status {
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #2a5a2a;
  box-shadow: 0 0 5px rgba(42, 90, 42, 0.5);
  animation: dot-pulse 2.5s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 5px rgba(42, 90, 42, 0.5); }
  50% { opacity: 0.4; box-shadow: 0 0 2px rgba(42, 90, 42, 0.3); }
}
</style>
