<template>
  <div class="horror-card" :class="{ 'runtime-card': !isFirstFloor }">
    <div class="blood-drip blood-drip-1"></div>
    <div class="blood-drip blood-drip-2"></div>
    <div class="blood-drip blood-drip-3"></div>
    <div class="crack-overlay"></div>

    <header class="card-header">
      <div class="header-quote quote-left">
        <span class="quote-mark">"</span>我叫杨间，当你看到这句话的时候，我已经死了……<span class="quote-mark">"</span>
      </div>
      <h1 class="main-title">神秘复苏模拟器</h1>
      <div class="title-deco-line"></div>
      <div class="header-quote quote-right">
        <span class="quote-mark">"</span>这个世界上，有些东西注定无法被科学解释，它们只会在夜里，悄然归来。<span class="quote-mark">"</span>
      </div>
    </header>

    <template v-if="isFirstFloor">
    <section class="card-module">
      <div class="module-header">
        <span class="module-icon">◆</span>
        <span class="module-title">基本信息</span>
        <div class="module-line"></div>
      </div>
      <div class="module-body info-grid">
        <div class="form-field">
          <label class="field-label">姓名</label>
          <input type="text" class="field-input" v-model="姓名" placeholder="请输入你的名字" />
        </div>
        <div class="form-field">
          <label class="field-label">性别</label>
          <div class="radio-group">
            <label class="radio-item" :class="{ active: 性别 === '男' }" @click="性别 = '男'">
              <span class="radio-dot"></span>男
            </label>
            <label class="radio-item" :class="{ active: 性别 === '女' }" @click="性别 = '女'">
              <span class="radio-dot"></span>女
            </label>
          </div>
        </div>
        <div class="form-field">
          <label class="field-label">开局地点</label>
          <select class="field-select" v-model="开局地点">
            <option value="">请选择开局地点</option>
            <option value="大昌市七中">大昌市七中</option>
            <option value="大海市繁华街区">大海市繁华街区</option>
            <option value="偏远荒村">偏远荒村</option>
            <option value="诡异公交车">诡异公交车</option>
            <option value="灵异公司大楼">灵异公司大楼</option>
            <option value="自定义">自定义地点</option>
          </select>
        </div>
        <div class="form-field">
          <label class="field-label">初始年龄</label>
          <select class="field-select" v-model="初始年龄">
            <option value="16岁">16岁</option>
            <option value="17岁">17岁</option>
            <option value="18岁">18岁</option>
            <option value="19岁">19岁</option>
            <option value="20岁">20岁</option>
            <option value="21岁">21岁</option>
            <option value="22岁">22岁</option>
            <option value="25岁">25岁</option>
            <option value="30岁">30岁</option>
          </select>
        </div>
      </div>
    </section>

    <section class="card-module">
      <div class="module-header">
        <span class="module-icon">♰</span>
        <span class="module-title">背景设定</span>
        <div class="module-line"></div>
      </div>
      <div class="module-body">
        <div class="form-field">
          <label class="field-label field-label-long">你的过去，你的经历，你是如何卷入这个诡异的世界的…</label>
          <textarea class="field-textarea" v-model="角色背景" maxlength="200" placeholder="描述你的角色背景..." rows="3"></textarea>
          <div class="char-count">{{ (角色背景 || '').length }}/200</div>
        </div>
        <div class="form-field">
          <label class="field-label">身份</label>
          <select class="field-select" v-model="身份">
            <option value="">请选择你的身份</option>
            <option value="普通人">普通人</option>
            <option value="驭鬼者">驭鬼者</option>
            <option value="民间异类">民间异类</option>
            <option value="总部调查员">总部调查员</option>
            <option value="失控者">失控者</option>
          </select>
        </div>
      </div>
    </section>

    <section class="card-module">
      <div class="module-header">
        <span class="module-icon">◇</span>
        <span class="module-title">驾驭厉鬼</span>
        <div class="module-line"></div>
      </div>
      <div class="module-body">
        <div class="item-list" v-if="ghosts.length > 0">
          <div class="item-card" v-for="(ghost, idx) in ghosts" :key="idx">
            <div class="item-card-header">
              <span class="item-number">厉鬼 #{{ idx + 1 }}</span>
              <button class="item-remove" @click="removeGhost(idx)">×</button>
            </div>
            <div class="form-field">
              <label class="field-label">厉鬼名称</label>
              <input type="text" class="field-input" v-model="ghost.厉鬼名称" placeholder="描述驾驭的厉鬼名称" />
            </div>
            <div class="form-field">
              <label class="field-label">杀人规律</label>
              <textarea class="field-textarea" v-model="ghost.杀人规律" maxlength="150" placeholder="描述厉鬼的杀人规律..." rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="item-add-row">
          <button class="btn-add" @click="addGhost" :disabled="ghosts.length >= 3">
            + 添加驾驭厉鬼（最多3个）
          </button>
          <div class="item-empty" v-if="ghosts.length === 0">
            <div class="eye-icon">◎</div>
            <span>暂无驾驭厉鬼</span>
          </div>
        </div>
      </div>
    </section>

    <section class="card-module">
      <div class="module-header">
        <span class="module-icon">※</span>
        <span class="module-title">特殊能力</span>
        <div class="module-line"></div>
      </div>
      <div class="module-body">
        <div class="form-field">
          <label class="field-label">能力描述</label>
          <textarea class="field-textarea" v-model="特殊能力描述" maxlength="200" placeholder="描述能力的具体效果、触发条件与限制..." rows="3"></textarea>
          <div class="char-count">{{ (特殊能力描述 || '').length }}/200</div>
        </div>
        <div class="form-field">
          <label class="field-label">消耗代价</label>
          <select class="field-select" v-model="消耗代价">
            <option value="无">无</option>
            <option value="体力消耗">体力消耗</option>
            <option value="精神损耗">精神损耗</option>
            <option value="复苏加速">复苏加速</option>
            <option value="生命力">生命力</option>
            <option value="记忆丧失">记忆丧失</option>
          </select>
        </div>
      </div>
    </section>

    <section class="card-module">
      <div class="module-header">
        <span class="module-icon">▽</span>
        <span class="module-title">灵异物品</span>
        <div class="module-line"></div>
      </div>
      <div class="module-body">
        <div class="item-list" v-if="items.length > 0">
          <div class="item-card" v-for="(item, idx) in items" :key="idx">
            <div class="item-card-header">
              <span class="item-number">物品 #{{ idx + 1 }}</span>
              <button class="item-remove" @click="removeItem(idx)">×</button>
            </div>
            <div class="form-field">
              <label class="field-label">物品名称</label>
              <input type="text" class="field-input" v-model="item.名称" placeholder="请输入物品名称" />
            </div>
            <div class="form-field">
              <label class="field-label">物品效果</label>
              <textarea class="field-textarea" v-model="item.效果" maxlength="150" placeholder="描述物品的效果与用途..." rows="2"></textarea>
            </div>
            <div class="form-field">
              <label class="field-label">使用限制</label>
              <textarea class="field-textarea" v-model="item.使用限制" maxlength="150" placeholder="描述使用条件、代价或副作用..." rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="item-add-row">
          <button class="btn-add" @click="addItem" :disabled="items.length >= 5">
            + 添加灵异物品（最多5件）
          </button>
          <div class="item-empty" v-if="items.length === 0">
            <div class="eye-icon">◎</div>
            <span>暂无物品</span>
          </div>
        </div>
      </div>
    </section>
    </template>

    <section class="card-module dossier-module">
      <div class="module-header">
        <span class="module-icon">▣</span>
        <span class="module-title">灵异档案</span>
        <div class="module-line"></div>
      </div>
      <div v-if="isDeathRiskCritical" class="death-ended-banner">你已死亡，模拟结束</div>
      <div class="module-body survival-strip">
        <div class="survival-card survival-card-main">
          <span class="survival-icon">◇</span>
          <span class="survival-label">危害等级</span>
          <strong>{{ displayEvent.危害等级 }}</strong>
        </div>
        <div class="survival-card survival-card-death" :class="{ critical: isDeathRiskCritical }">
          <span class="survival-icon">!</span>
          <span class="survival-label">死亡风险</span>
          <strong>{{ displayDeathRisk }}</strong>
        </div>
        <div class="survival-card">
          <span class="survival-icon">◎</span>
          <span class="survival-label">复苏风险</span>
          <strong>{{ displayResurrectionRisk }}</strong>
        </div>
        <div class="survival-card">
          <span class="survival-icon">▥</span>
          <span class="survival-label">主线阶段</span>
          <strong>{{ displayMainlineStage }}</strong>
        </div>
      </div>
      <div class="module-body archive-layout">
        <div class="event-dossier-card">
          <div class="event-eye">◎</div>
          <div class="event-file-no">FILE / {{ displayMainlineStatus }}</div>
          <h2>{{ displayEvent.事件代号 }}</h2>
          <div class="event-state-row">
            <span>鬼域：{{ displayEvent.鬼域状态 }}</span>
            <span>处理：{{ displayEvent.处理状态 }}</span>
          </div>
        </div>
        <div class="archive-grid">
          <div class="archive-card" v-for="item in archiveCards" :key="item.label">
            <div class="archive-icon">{{ item.icon }}</div>
            <div class="archive-copy">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </div>
      </div>
      <div class="module-body intel-list">
        <div class="intel-card" v-for="note in intelligenceNotes" :key="note.label">
          <span>{{ note.label }}</span>
          <em>{{ note.value }}</em>
        </div>
      </div>
    </section>

    <section v-if="options.length && !isDeathRiskCritical" class="card-module options-module">
      <div class="option-status-strip">
        <span>[推演节点：{{ displayMainlineStage }}]</span>
        <span>[死亡风险：{{ displayDeathRisk }}]</span>
        <span>[复苏风险：{{ displayResurrectionRisk }}]</span>
      </div>
      <div class="option-warning-title">
        <span class="warning-cross">×</span>
        <span>推演选项</span>
        <span class="warning-cross">×</span>
      </div>
      <div class="option-action-line"></div>
      <div class="option-action-text">请选择下一步行动</div>
      <div class="module-body option-list">
        <button
          v-for="opt in options"
          :key="opt.key"
          class="option-btn"
          type="button"
          @click="pickOption(opt)"
        >
          <span class="opt-key">{{ opt.key }}.</span>
          <span class="opt-text">{{ opt.text }}</span>
        </button>
      </div>
    </section>

    <footer v-if="isFirstFloor" class="card-footer">
      <div class="footer-actions">
        <button class="btn btn-start" :disabled="isStarting" @click="handleStart">
          {{ isStarting ? '正在坠入世界…' : '进入神秘复苏世界' }}
        </button>
        <button class="btn btn-reset" :disabled="isStarting" @click="handleReset">清空所有信息</button>
      </div>
      <div class="footer-warning">※ 注意：模拟器中的一切选择，皆会影响你的生死。</div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRaw } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from './store'

const store = useDataStore()
const { data } = storeToRefs(store)
const isStarting = ref(false)

// 开局表单（基本信息 / 背景设定 / 驾驭厉鬼 / 特殊能力 / 灵异物品 / 底部按钮）
// 只在开场白（楼 0）显示；楼 1+ 只渲染"灵异档案"动态状态面板。
const isFirstFloor = getCurrentMessageId() === 0

// 解析当前楼 AI 文本里的「推演选项」并渲染为按钮，点击后把选项文本填进酒馆输入框。
type OptionRisk = { death: number; revive: number; source: string; tagged: boolean }
type OptionItem = { key: string; text: string; risk: OptionRisk }

const optionRiskOpenTagPattern = /<risk\b[^>]*\/?>/i
const optionRiskTagPattern = /<\/?risk\b[^>]*>/gi

function clampRiskDelta(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function readRiskNumber(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']?(-?\\d+(?:\\.\\d+)?)["']?`, 'i'))
  return clampRiskDelta(match?.[1])
}

function readRiskText(tag: string, name: string) {
  const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))
  if (quoted) return quoted[2].trim()
  const bare = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i'))
  return bare?.[1]?.trim() ?? ''
}

function optionDeathRiskDelta(text: string) {
  const riskRules = [
    { pattern: /自定义行动/, delta: 0 },
    { pattern: /厉鬼能力|动用厉鬼|使用厉鬼|鬼域深处|强行压制|身体试探|试探规律|硬闯|硬抗|对抗厉鬼|正面/, delta: 15 },
    { pattern: /靠近|接近|进入|开门|触碰|回应|回头|盯住|查看|调查|追上|跟踪|声音源头|敲门声源头|高危/, delta: 10 },
    { pattern: /大喊|制造声音|暴露|冲出去|立刻站起来|奔跑|撞开|强行/, delta: 8 },
    { pattern: /等待|躲|藏|屏住呼吸|保持安静|远离|撤离|后退|离开|绕开|黄金|鬼烛|替死|求援/, delta: 3 },
  ]
  const matched = riskRules.find(rule => rule.pattern.test(text))
  return matched?.delta ?? 5
}

function parseOptionRisk(rawText: string) {
  const tag = rawText.match(optionRiskOpenTagPattern)?.[0]
  const text = rawText.replace(optionRiskTagPattern, '').replace(/\s+/g, ' ').trim()
  if (!tag) {
    return {
      text,
      risk: { death: optionDeathRiskDelta(text), revive: 0, source: '关键词兜底', tagged: false },
    }
  }
  return {
    text,
    risk: {
      death: readRiskNumber(tag, 'death'),
      revive: readRiskNumber(tag, 'revive'),
      source: readRiskText(tag, 'source'),
      tagged: true,
    },
  }
}

function extractOptions(): OptionItem[] {
  try {
    const mes = getChatMessages(getCurrentMessageId())[0]?.message ?? ''
    // 遍历所有含"选项"的方括号块（AI 有时在思考块里也提"推演选项"标签但不带 A/B/C/D），
    // 找到第一个能解析出 A/B/C/D 行的块作为真选项。
    const blockRe = /【[^】]*选项[^】]*】\s*([\s\S]*?)(?=\n\s*【|\n\s*<|$)/g
    let bm: RegExpExecArray | null
    while ((bm = blockRe.exec(mes)) !== null) {
      const out: OptionItem[] = []
      for (const line of bm[1].split('\n')) {
        const lm = line.match(/^\s*([A-Z])[.、:：]\s*(.+?)\s*$/)
        if (!lm) continue
        const body = lm[2].trim().replace(/^\[(.*)\]$/, '$1').trim()
        const parsed = parseOptionRisk(body)
        if (parsed.text) out.push({ key: lm[1], text: parsed.text, risk: parsed.risk })
      }
      if (out.length > 0) return out
    }
    return []
  } catch (e) {
    console.warn('[MFRS Status] 解析推演选项失败', e)
    return []
  }
}

const options = ref<OptionItem[]>(extractOptions())

function applyOptionRisk(risk: OptionRisk) {
  if (!data.value) data.value = { ...defaults }
  if (!data.value.驭鬼者状态) data.value.驭鬼者状态 = { ...defaultGhostState }

  const currentDeath = Math.max(0, Math.min(100, Math.max(Number(data.value.风险值 ?? 0), panelDeathRiskValue.value ?? 0)))
  const legacyRevive = Number(data.value.厉鬼复苏程度 ?? 0)
  const currentTotalRevive = Math.max(0, Math.min(100, Math.max(Number(data.value.驭鬼者状态.总复苏风险 ?? 0), panelResurrectionRiskValue.value ?? 0, legacyRevive)))
  const nextDeath = Math.min(100, currentDeath + risk.death)
  const nextTotalRevive = Math.min(100, currentTotalRevive + risk.revive)

  data.value.风险值 = nextDeath
  data.value.驭鬼者状态.总复苏风险 = nextTotalRevive
  data.value.厉鬼复苏程度 = nextTotalRevive

  const statData = clonePlainData(data.value)
  updateVariablesWith(variables => {
    _.set(variables, 'stat_data', statData)
    return variables
  }, { type: 'message', message_id: getCurrentMessageId() })

  return {
    death: nextDeath - currentDeath,
    revive: nextTotalRevive - currentTotalRevive,
    totalRevive: nextTotalRevive - currentTotalRevive,
  }
}

function findSendTextarea() {
  const docs: Document[] = []
  try {
    if (window.parent?.document) docs.push(window.parent.document)
  } catch {
    // ignore cross-frame access errors
  }
  docs.push(document)

  for (const doc of docs) {
    const textarea = doc.querySelector('#send_textarea') as HTMLTextAreaElement | null
    if (textarea) return textarea
  }
  return null
}

function pickOption(opt: OptionItem) {
  if (isDeathRiskCritical.value) {
    toastr.warning('角色已经死亡，不能继续选择行动。', '模拟结束')
    return
  }

  const ta = findSendTextarea()
  if (!ta) {
    toastr.warning('找不到酒馆输入框 #send_textarea', '推演选项')
    return
  }
  const applied = applyOptionRisk(opt.risk)
  ta.value = `我选择：${opt.text}`
  ta.dispatchEvent(new Event('input', { bubbles: true }))
  ta.dispatchEvent(new Event('change', { bubbles: true }))
  ta.focus()
  toastr.success(`已填入选项 ${opt.key}，死亡风险 +${applied.death}，复苏风险 +${applied.revive}`, '推演选项')
}

const defaultEventFile = {
  事件代号: '未立案灵异事件',
  危害等级: '未知',
  发生地点: '未知',
  鬼域状态: '未确认',
  已知杀人规律: [],
  猜测杀人规律: [],
  错误推断: [],
  已死亡人数: 0,
  扩散趋势: '未观察',
  处理状态: '未接触',
}

const defaultGhostState = {
  总复苏风险: 0,
  已驾驭厉鬼: [],
}

const defaultResources = {
  鬼拼图: [],
  灵异物品: [],
  黄金储备: '未准备',
}

const defaultFactionState = {
  总部备案状态: '未备案',
  所属城市: '未知',
  联系人: [],
  敌对势力: [],
  可调用资源: [],
}

const defaultHiddenFile = {
  真实杀人规律: '未生成',
  关键生路: '未生成',
  误导线索: [],
  鬼的真实位置: '未确认',
}

const defaultMainlineProgress = {
  当前阶段: '开局接入',
  阶段序号: 0,
  阶段状态: '未启动',
  已完成节点: [],
  可触发节点: [],
  偏移等级: 0,
  正史锚点: {
    当前锚点: '自定义开局',
    默认走向: '等待玩家开局地点与身份确定',
    玩家偏移: [],
  },
  世界压力: {
    灵异复苏强度: 0,
    总部关注度: 0,
    社会公开度: 0,
  },
  下一步推进提示: '等待首个灵异征兆或开局事件立案',
}

const defaults = {
  姓名: '',
  性别: '男',
  开局地点: '',
  初始年龄: '18岁',
  角色背景: '',
  身份: '',
  驾驭厉鬼: [],
  特殊能力描述: '',
  消耗代价: '无',
  灵异物品: [],
  状态: '健康',
  风险值: 0,
  厉鬼复苏程度: 0,
  持有拼图: '无',
  所在位置: '未知',
  当前灵异事件: defaultEventFile,
  规律推理记录: [],
  驭鬼者状态: defaultGhostState,
  灵异资源: defaultResources,
  势力关系: defaultFactionState,
  世界线记录: [],
  主线进度: defaultMainlineProgress,
  隐藏档案: defaultHiddenFile,
}

function d() {
  return data.value ?? defaults
}

function bindField(key: string, def = '') {
  return computed<string>({
    get: () => String((d() as Record<string, unknown>)[key] ?? def),
    set: val => {
      if (!data.value) data.value = { ...defaults }
      ;(data.value as Record<string, unknown>)[key] = val
    },
  })
}

const 姓名 = bindField('姓名')
const 性别 = bindField('性别', '男')
const 开局地点 = bindField('开局地点')
const 初始年龄 = bindField('初始年龄', '18岁')
const 角色背景 = bindField('角色背景')
const 身份 = bindField('身份')
const 特殊能力描述 = bindField('特殊能力描述')
const 消耗代价 = bindField('消耗代价', '无')

const ghosts = computed(() => d().驾驭厉鬼 ?? [])
const items = computed(() => d().灵异物品 ?? [])
const eventFile = computed(() => d().当前灵异事件 ?? defaultEventFile)
const ghostState = computed(() => d().驭鬼者状态 ?? defaultGhostState)
const factionState = computed(() => d().势力关系 ?? defaultFactionState)
const mainlineProgress = computed(() => d().主线进度 ?? defaultMainlineProgress)

type StatusPanelData = Partial<Record<'当前灵异事件' | '鬼域状态' | '已知规律' | '猜测规律' | '风险值' | '死亡风险' | '复苏风险' | '持有拼图/灵异物品', string>>

function currentMessageText() {
  try {
    return getChatMessages(getCurrentMessageId())[0]?.message ?? ''
  } catch {
    return ''
  }
}

function parseStatusPanel(): StatusPanelData {
  const message = currentMessageText()
  const match = message.match(/【状态面板】([\s\S]*?)(?:《\/状态面板[^》]*》|<UpdateVariable>|$)/)
  if (!match) return {}

  const panel: StatusPanelData = {}
  for (const line of match[1].split('\n')) {
    const lineMatch = line.match(/^\s*([^：:]+)[：:]\s*(.*?)\s*$/)
    if (!lineMatch) continue
    const key = lineMatch[1].trim() as keyof StatusPanelData
    if (key in panel || ['当前灵异事件', '鬼域状态', '已知规律', '猜测规律', '风险值', '死亡风险', '复苏风险', '持有拼图/灵异物品'].includes(key)) {
      panel[key] = lineMatch[2].trim()
    }
  }
  return panel
}

const statusPanel = computed(parseStatusPanel)

function textOrFallback(value: unknown, fallback = '无') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function riskNumberFromText(value: unknown) {
  const match = String(value ?? '').match(/\d+(?:\.\d+)?/)
  if (!match) return undefined
  return Math.max(0, Math.min(100, Math.round(Number(match[0]))))
}

function clonePlainData<T>(value: T): T {
  return JSON.parse(JSON.stringify(toRaw(value))) as T
}

function filledGhosts() {
  return ghosts.value
    .filter(ghost => {
      const name = textOrFallback(ghost.厉鬼名称, '')
      const rule = textOrFallback(ghost.杀人规律, '')
      return name || (rule && rule !== '无')
    })
    .map(ghost => ({
      厉鬼名称: textOrFallback(ghost.厉鬼名称, '未命名厉鬼'),
      杀人规律: textOrFallback(ghost.杀人规律),
    }))
}

function filledItems() {
  return items.value
    .filter(item => textOrFallback(item.名称, '') || textOrFallback(item.效果, ''))
    .map(item => ({
      名称: textOrFallback(item.名称, '未命名灵异物品'),
      效果: textOrFallback(item.效果),
      使用限制: textOrFallback(item.使用限制),
    }))
}

function listText(values: unknown, fallback = '无') {
  if (!Array.isArray(values) || values.length === 0) return fallback
  return values.map(value => textOrFallback(value, '')).filter(Boolean).join('；') || fallback
}

function hazardLevelFor(identity: string, ghostCount: number) {
  if (identity === '失控者') return 'B级起步，存在复苏外溢风险'
  if (ghostCount > 1) return 'B级观察，疑似多拼图冲突'
  if (ghostCount === 1 || identity === '驭鬼者' || identity === '民间异类') return 'C级观察，驭鬼者介入'
  return '未知，待第一起死亡案例确认'
}

function filingStateFor(identity: string) {
  if (identity === '总部调查员') return '总部内部记录'
  if (identity === '驭鬼者' || identity === '民间异类') return '待总部备案'
  if (identity === '失控者') return '高危观察'
  return '未备案'
}

function controlledGhostsFrom(ghostList: ReturnType<typeof filledGhosts>) {
  return ghostList.map(ghost => ({
    代号: ghost.厉鬼名称,
    恐怖等级: '未知',
    拼图特征: ghost.厉鬼名称,
    杀人规律: ghost.杀人规律,
    使用能力: textOrFallback(d().特殊能力描述, '未确认'),
    使用代价: textOrFallback(d().消耗代价),
    复苏进度: Number(d().厉鬼复苏程度 ?? 0),
    是否死机: textOrFallback(d().特殊能力描述, '').includes('死机'),
    压制关系: ghostList.length > 1 ? '多只厉鬼存在潜在压制，也可能失衡' : '单拼图，复苏压力直接作用于宿主',
  }))
}

function resourcesFrom(itemList: ReturnType<typeof filledItems>, ghostList: ReturnType<typeof filledGhosts>) {
  return {
    鬼拼图: ghostList.map(ghost => ghost.厉鬼名称),
    灵异物品: itemList.map(item => ({
      名称: item.名称,
      类型: item.名称.includes('鬼烛') ? '鬼烛' : item.名称.includes('黄金') ? '黄金容器' : item.名称.includes('替死') ? '替死娃娃' : '其他',
      剩余次数: '未知',
      效果: item.效果,
      副作用: item.使用限制,
    })),
    黄金储备: itemList.some(item => item.名称.includes('黄金') || item.效果.includes('黄金')) ? '已准备' : '未准备',
  }
}

const resourceSummary = computed(() => {
  const resource = d().灵异资源 ?? defaultResources
  const ghostPieces = listText(resource.鬼拼图)
  const itemNames = Array.isArray(resource.灵异物品)
    ? resource.灵异物品.map(item => textOrFallback(item.名称, '')).filter(Boolean)
    : []
  return `拼图：${ghostPieces}；物品：${itemNames.length ? itemNames.join('、') : '无'}；黄金：${textOrFallback(resource.黄金储备, '未准备')}`
})

function panelValue(value: string | undefined) {
  return value?.replace(/^([^：:]+)[：:]/, '').trim()
}

function splitEventLine(value: string): Partial<Record<'事件代号' | '危害等级' | '处理状态', string>> {
  const parts = value.split(/[；;]/).map(part => panelValue(part.trim())).filter(Boolean)
  return {
    事件代号: parts[0],
    危害等级: parts[1],
    处理状态: parts[2],
  }
}

const displayEvent = computed(() => {
  const panelEvent = statusPanel.value.当前灵异事件 ? splitEventLine(statusPanel.value.当前灵异事件) : {}
  return {
    事件代号: textOrFallback(panelEvent.事件代号, eventFile.value.事件代号),
    危害等级: textOrFallback(panelEvent.危害等级, eventFile.value.危害等级),
    鬼域状态: textOrFallback(statusPanel.value.鬼域状态, eventFile.value.鬼域状态),
    处理状态: textOrFallback(panelEvent.处理状态, eventFile.value.处理状态),
  }
})

const panelDeathRiskValue = computed(() => riskNumberFromText(statusPanel.value.死亡风险 ?? statusPanel.value.风险值))
const panelResurrectionRiskValue = computed(() => riskNumberFromText(statusPanel.value.复苏风险))
const deathRiskValue = computed(() => Math.max(0, Math.min(100, Math.max(Number(d().风险值 ?? 0), panelDeathRiskValue.value ?? 0))))
const resurrectionRiskValue = computed(() => Math.max(0, Math.min(100, Math.max(Number(ghostState.value.总复苏风险 ?? 0), panelResurrectionRiskValue.value ?? 0))))
const isDeathRiskCritical = computed(() => deathRiskValue.value >= 100)
const displayDeathRisk = computed(() => `${deathRiskValue.value}/100`)
const displayKnownLaws = computed(() => textOrFallback(statusPanel.value.已知规律, listText(eventFile.value.已知杀人规律)))
const displaySuspectedLaws = computed(() => textOrFallback(statusPanel.value.猜测规律, listText(eventFile.value.猜测杀人规律)))
const displayResurrectionRisk = computed(() => `${resurrectionRiskValue.value}%`)
const displayResourceSummary = computed(() => textOrFallback(statusPanel.value['持有拼图/灵异物品'], resourceSummary.value))
const displayMainlineStage = computed(() => `${textOrFallback(mainlineProgress.value.当前阶段, '开局接入')} #${mainlineProgress.value.阶段序号 ?? 0}`)
const displayMainlineStatus = computed(() => textOrFallback(mainlineProgress.value.阶段状态, '未启动'))
const archiveCards = computed(() => [
  { icon: '▦', label: '处理状态', value: displayEvent.value.处理状态 },
  { icon: '♜', label: '总部备案', value: factionState.value.总部备案状态 },
  { icon: '◈', label: '鬼域状态', value: displayEvent.value.鬼域状态 },
  { icon: '▤', label: '灵异资源', value: displayResourceSummary.value },
])
const intelligenceNotes = computed(() => [
  { label: '已知规律', value: displayKnownLaws.value },
  { label: '猜测规律', value: displaySuspectedLaws.value },
  { label: '资源档案', value: displayResourceSummary.value },
])

function buildStartMessage() {
  const current = d()
  const ghostList = filledGhosts()
  const itemList = filledItems()
  const event = current.当前灵异事件 ?? defaultEventFile
  const controlledGhosts = current.驭鬼者状态?.已驾驭厉鬼 ?? []
  const resources = current.灵异资源 ?? defaultResources
  const ghostText = ghostList.length
    ? ghostList.map((ghost, index) => `${index + 1}. ${ghost.厉鬼名称}（杀人规律：${ghost.杀人规律}）`).join('\n')
    : '无'
  const controlledGhostText = controlledGhosts.length
    ? controlledGhosts.map((ghost, index) => `${index + 1}. ${ghost.代号}（复苏进度：${ghost.复苏进度}%；死机：${ghost.是否死机 ? '是' : '否'}；压制关系：${ghost.压制关系}）`).join('\n')
    : '无'
  const itemText = itemList.length
    ? itemList.map((item, index) => `${index + 1}. ${item.名称}（效果：${item.效果}；限制：${item.使用限制}）`).join('\n')
    : '无'
  const resourceText = Array.isArray(resources.灵异物品) && resources.灵异物品.length
    ? resources.灵异物品.map((item, index) => `${index + 1}. ${item.名称}（类型：${item.类型}；效果：${item.效果}；副作用：${item.副作用}）`).join('\n')
    : '无'

  return `【开局设定已确认】
姓名：${textOrFallback(current.姓名, '未知')}
性别：${textOrFallback(current.性别, '男')}
初始年龄：${textOrFallback(current.初始年龄, '18岁')}
开局地点：${textOrFallback(current.开局地点, '未知地点')}
身份：${textOrFallback(current.身份, '普通人')}
角色背景：${textOrFallback(current.角色背景, '没有额外背景，由模拟器自行补全合理细节。')}
风险值：${current.风险值 ?? 0}/100（达到100时角色死亡，本次模拟结束）

【灵异事件初始档案】
事件代号：${event.事件代号}
危害等级：${event.危害等级}
发生地点：${event.发生地点}
鬼域状态：${event.鬼域状态}
处理状态：${event.处理状态}
扩散趋势：${event.扩散趋势}

驾驭厉鬼：
${ghostText}

驭鬼者复苏档案：
总复苏风险：${current.驭鬼者状态?.总复苏风险 ?? 0}%
${controlledGhostText}

特殊能力：${textOrFallback(current.特殊能力描述)}
能力代价：${textOrFallback(current.消耗代价)}

灵异物品：
${itemText}

灵异资源档案：
黄金储备：${resources.黄金储备}
${resourceText}

请根据以上设定正式启动“神秘复苏模拟器”的世界线推演：生成我抵达开局地点后的第一段剧情、灵异征兆、事件档案、初步规律线索、状态面板和可行动选项。保持《神秘复苏》式冷峻、危险、因果严密的氛围，不要重新要求我填写设定。

【推演选项】必须按 A/B/C/D 列出，每项末尾附加隐藏风险标签 <risk death="0" revive="0" source="简短原因">。death 是点击该选项时应预先结算的死亡风险增量；revive 是点击该选项时应预先结算的厉鬼复苏风险增量。状态栏会隐藏该标签，只显示选项正文。`
}

function commitStartData() {
  if (!data.value) {
    data.value = { ...defaults }
  }

  const ghostList = filledGhosts()
  const itemList = filledItems()
  const identity = textOrFallback(data.value.身份, '普通人')
  const location = textOrFallback(data.value.开局地点, '未知')
  const controlledGhosts = controlledGhostsFrom(ghostList)
  const resources = resourcesFrom(itemList, ghostList)
  const initialReviveRisk = Number(data.value.驭鬼者状态?.总复苏风险 ?? data.value.厉鬼复苏程度 ?? 0)
  const eventFile = {
    事件代号: `${location}异常接入事件`,
    危害等级: hazardLevelFor(identity, ghostList.length),
    发生地点: location,
    鬼域状态: '未确认',
    已知杀人规律: [],
    猜测杀人规律: ghostList.map(ghost => ghost.杀人规律).filter(rule => rule && rule !== '无'),
    错误推断: [],
    已死亡人数: 0,
    扩散趋势: '未观察',
    处理状态: '初始化',
  }
  Object.assign(data.value, {
    驾驭厉鬼: ghostList,
    所在位置: location,
    状态: textOrFallback(data.value.状态, '健康'),
    风险值: Number(data.value.风险值 ?? 0),
    厉鬼复苏程度: initialReviveRisk,
    持有拼图: ghostList.length ? ghostList.map(ghost => ghost.厉鬼名称).join('、') : '无',
    灵异物品: itemList,
    当前灵异事件: eventFile,
    规律推理记录: [],
    驭鬼者状态: {
      总复苏风险: initialReviveRisk,
      已驾驭厉鬼: controlledGhosts,
    },
    灵异资源: resources,
    势力关系: {
      总部备案状态: filingStateFor(identity),
      所属城市: location.includes('市') ? location.replace(/(市).*/, '市') : '未知',
      联系人: [],
      敌对势力: [],
      可调用资源: resources.黄金储备 === '已准备' ? ['黄金隔绝'] : [],
    },
    世界线记录: [
      {
        时间点: '开局',
        事件: `${textOrFallback(data.value.姓名, '未知个体')}接入${location}`,
        影响: '灵异事件档案建立，等待第一轮现实验证',
      },
    ],
    主线进度: {
      ...defaultMainlineProgress,
      正史锚点: {
        ...defaultMainlineProgress.正史锚点,
        默认走向: `等待${location}首个灵异征兆或开局事件立案`,
      },
    },
    隐藏档案: {
      真实杀人规律: '由首轮灵异事件生成后确定',
      关键生路: '由首轮灵异事件生成后确定',
      误导线索: [],
      鬼的真实位置: '未确认',
    },
  })
  const statData = clonePlainData(data.value)
  updateVariablesWith(variables => {
    _.set(variables, 'stat_data', statData)
    return variables
  }, { type: 'message', message_id: getCurrentMessageId() })
}

function addGhost() {
  if (!data.value) {
    data.value = { ...defaults }
  }
  if (!data.value.驾驭厉鬼) data.value.驾驭厉鬼 = []
  if (data.value.驾驭厉鬼.length >= 3) return
  data.value.驾驭厉鬼.push({ 厉鬼名称: '', 杀人规律: '无' })
}

function removeGhost(idx: number) {
  if (!data.value) return
  if (!data.value.驾驭厉鬼) return
  data.value.驾驭厉鬼.splice(idx, 1)
}

function addItem() {
  if (!data.value) {
    data.value = { ...defaults }
  }
  if (!data.value.灵异物品) data.value.灵异物品 = []
  if (data.value.灵异物品.length >= 5) return
  data.value.灵异物品.push({ 名称: '', 效果: '', 使用限制: '无' })
}

function removeItem(idx: number) {
  if (!data.value) return
  if (!data.value.灵异物品) return
  data.value.灵异物品.splice(idx, 1)
}

async function handleStart() {
  if (isStarting.value) return

  const current = d()
  if (!textOrFallback(current.姓名, '') || !textOrFallback(current.开局地点, '')) {
    toastr.warning('请至少填写姓名和开局地点。', '初始化未完成')
    return
  }

  isStarting.value = true
  try {
    commitStartData()
    const message = buildStartMessage()
    console.info('[MFRS] 开始模拟', message)
    await createChatMessages([{ role: 'user', message }])
    await triggerSlash('/trigger')
    toastr.success('世界线已经开始推演。', '神秘复苏模拟器')
  } catch (error) {
    console.error('[MFRS] 启动模拟失败', error)
    toastr.error(String(error instanceof Error ? error.message : error), '启动模拟失败')
  } finally {
    isStarting.value = false
  }
}

function handleReset() {
  if (!data.value) {
    data.value = { ...defaults }
    return
  }
  Object.assign(data.value, {
    姓名: '', 性别: '男', 开局地点: '', 初始年龄: '18岁',
    角色背景: '', 身份: '', 驾驭厉鬼: [],
    特殊能力描述: '', 消耗代价: '无', 灵异物品: [],
    状态: '健康', 风险值: 0, 厉鬼复苏程度: 0, 持有拼图: '无', 所在位置: '未知',
    当前灵异事件: { ...defaultEventFile },
    规律推理记录: [],
    驭鬼者状态: { 总复苏风险: 0, 已驾驭厉鬼: [] },
    灵异资源: { 鬼拼图: [], 灵异物品: [], 黄金储备: '未准备' },
    势力关系: { ...defaultFactionState },
    世界线记录: [],
    主线进度: { ...defaultMainlineProgress },
    隐藏档案: { ...defaultHiddenFile },
  })
}
</script>

<style scoped>
.horror-card {
  background:
    radial-gradient(circle at 50% 0%, rgba(165, 0, 0, 0.24), transparent 34%),
    radial-gradient(circle at 8% 18%, rgba(120, 0, 0, 0.16), transparent 24%),
    linear-gradient(180deg, #130000 0%, #050000 45%, #020000 100%);
  border: 2px solid #d00000;
  width: min(92vw, 760px);
  max-width: 760px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 0 10px rgba(255, 0, 0, 0.66),
    0 0 34px rgba(155, 0, 0, 0.4),
    0 18px 45px rgba(0, 0, 0, 0.88),
    inset 0 0 64px rgba(120, 0, 0, 0.34),
    inset 0 0 120px rgba(0, 0, 0, 0.94);
}

.runtime-card {
  min-height: 620px;
}

.runtime-card .dossier-module {
  margin-top: 18px;
}

.runtime-card .options-module {
  margin-bottom: 18px;
}

.blood-drip {
  position: absolute;
  top: 0;
  width: 3px;
  background: linear-gradient(180deg, #5a0a0a, #2a0000 40%, transparent);
  z-index: 4;
  pointer-events: none;
  border-radius: 0 0 2px 2px;
}
.blood-drip-1 { left: 15%; height: 60px; }
.blood-drip-2 { left: 55%; height: 40px; }
.blood-drip-3 { right: 20%; height: 50px; }

.crack-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 100%),
    repeating-linear-gradient(180deg, transparent 0 7px, rgba(120, 0, 0, 0.025) 8px, transparent 9px),
    linear-gradient(45deg, transparent 48%, rgba(30, 5, 5, 0.10) 49%, rgba(30, 5, 5, 0.10) 51%, transparent 52%),
    radial-gradient(circle at 75% 18%, rgba(110, 15, 15, 0.08), transparent 22%);
  background-size: 9px 100%, auto, auto, auto;
  pointer-events: none;
  z-index: 1;
}

.card-header {
  padding: 24px 20px 18px;
  text-align: center;
  background:
    linear-gradient(180deg, rgba(100, 0, 0, 0.58) 0%, rgba(12, 0, 0, 0.72) 100%),
    repeating-linear-gradient(90deg, transparent 0 14px, rgba(255, 0, 0, 0.045) 15px, transparent 16px);
  border-bottom: 2px solid #d00000;
  position: relative;
  z-index: 2;
  box-shadow:
    0 0 16px rgba(255, 0, 0, 0.32),
    inset 0 0 32px rgba(0, 0, 0, 0.68);
}

.header-quote {
  color: #8a5a5a;
  font-family: "Noto Serif SC", "SimSun", serif;
  font-size: 11px;
  font-style: italic;
  line-height: 1.7;
  margin: 6px 0;
  opacity: 0.9;
  text-shadow: 0 0 8px rgba(255, 0, 0, 0.24);
}

.quote-mark {
  color: #ff1010;
  font-size: 14px;
  text-shadow: 0 0 8px rgba(255, 0, 0, 0.7);
}

.main-title {
  color: #ff1010;
  font-family: "Noto Serif SC", "SimSun", serif;
  font-size: 25px;
  font-weight: 800;
  letter-spacing: 9px;
  text-shadow:
    0 0 4px rgba(255, 0, 0, 0.98),
    0 0 16px rgba(255, 0, 0, 0.76),
    0 0 38px rgba(160, 0, 0, 0.62),
    0 2px 4px rgba(0, 0, 0, 0.96);
  margin: 10px 0 8px;
  position: relative;
}

.title-deco-line {
  height: 2px;
  background: linear-gradient(90deg, transparent, #8a0000 18%, #ff1010 50%, #8a0000 82%, transparent);
  margin: 8px auto;
  max-width: 320px;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.58);
}

.card-module {
  position: relative;
  z-index: 2;
  margin: 12px 14px;
  background:
    radial-gradient(circle at 50% 0%, rgba(110, 0, 0, 0.14), transparent 34%),
    linear-gradient(180deg, rgba(18, 0, 0, 0.9), rgba(3, 0, 0, 0.82));
  border: 1px solid rgba(210, 0, 0, 0.74);
  box-shadow:
    0 0 8px rgba(255, 0, 0, 0.24),
    0 0 22px rgba(120, 0, 0, 0.16),
    inset 0 0 24px rgba(0, 0, 0, 0.78),
    inset 0 0 42px rgba(70, 0, 0, 0.28);
}

.card-module::before {
  content: '';
  position: absolute;
  top: 6px;
  left: 6px;
  right: 6px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.48), transparent);
  pointer-events: none;
  box-shadow: 0 0 8px rgba(255, 0, 0, 0.45);
}

.module-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px 9px;
  background: linear-gradient(90deg, rgba(100, 0, 0, 0.44), transparent 74%);
}

.module-icon {
  color: #ff1010;
  font-size: 15px;
  text-shadow:
    0 0 5px rgba(255, 0, 0, 0.95),
    0 0 14px rgba(180, 0, 0, 0.6);
}

.module-title {
  color: #ff2020;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 3px;
  white-space: nowrap;
  text-shadow:
    0 0 5px rgba(255, 0, 0, 0.8),
    0 0 14px rgba(160, 0, 0, 0.55);
}

.module-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, #ff1010, rgba(120, 0, 0, 0.45), transparent);
  box-shadow: 0 0 8px rgba(255, 0, 0, 0.48);
}

.module-body {
  padding: 4px 20px 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  color: #9d7373;
  font-family: "Share Tech Mono", "Courier New", monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  text-shadow: 0 0 6px rgba(255, 0, 0, 0.22);
}

.field-label-long {
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: none;
  font-family: "Noto Serif SC", "SimSun", serif;
  font-style: italic;
  color: #9a5c5c;
  line-height: 1.5;
  margin-bottom: 2px;
  text-shadow: 0 0 6px rgba(255, 0, 0, 0.2);
}

.field-input {
  background: linear-gradient(180deg, rgba(18, 0, 0, 0.92), rgba(3, 0, 0, 0.96));
  border: 1px solid rgba(180, 0, 0, 0.58);
  border-radius: 0;
  color: #d6b0b0;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  padding: 8px 10px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  box-shadow:
    inset 0 0 14px rgba(0, 0, 0, 0.78),
    0 0 5px rgba(255, 0, 0, 0.16);
}

.field-input:focus {
  border-color: #ff1010;
  background: linear-gradient(180deg, rgba(30, 0, 0, 0.96), rgba(6, 0, 0, 0.98));
  box-shadow:
    0 0 10px rgba(255, 0, 0, 0.46),
    inset 0 0 10px rgba(80, 0, 0, 0.36);
}

.field-input::placeholder {
  color: #5a3030;
  font-size: 11px;
}

.field-select {
  appearance: none;
  border: 1px solid rgba(180, 0, 0, 0.58);
  border-radius: 0;
  color: #d6b0b0;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  padding: 8px 28px 8px 10px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23ff1010' stroke-width='1.5' fill='none'/%3E%3C/svg%3E"), linear-gradient(180deg, rgba(18, 0, 0, 0.92), rgba(3, 0, 0, 0.96));
  background-repeat: no-repeat, no-repeat;
  background-position: right 8px center, 0 0;
  box-shadow:
    inset 0 0 14px rgba(0, 0, 0, 0.78),
    0 0 5px rgba(255, 0, 0, 0.16);
}

.field-select:focus {
  border-color: #ff1010;
  box-shadow:
    0 0 10px rgba(255, 0, 0, 0.46),
    inset 0 0 10px rgba(80, 0, 0, 0.36);
}

.field-select option {
  background: #080000;
  color: #d6b0b0;
}

.radio-group {
  display: flex;
  gap: 12px;
  padding-top: 4px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8a6a6a;
  font-family: "Noto Sans SC", sans-serif;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, box-shadow 0.2s, background 0.2s;
  padding: 6px 14px;
  border: 1px solid rgba(120, 0, 0, 0.46);
  border-radius: 0;
  background: linear-gradient(180deg, rgba(14, 0, 0, 0.86), rgba(3, 0, 0, 0.92));
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.72);
}

.radio-item:hover {
  border-color: #d00000;
  color: #caa0a0;
  box-shadow:
    0 0 8px rgba(255, 0, 0, 0.28),
    inset 0 0 16px rgba(80, 0, 0, 0.32);
}

.radio-item.active {
  color: #ff3030;
  border-color: #ff1010;
  background: linear-gradient(180deg, rgba(50, 0, 0, 0.86), rgba(8, 0, 0, 0.94));
  text-shadow: 0 0 8px rgba(255, 0, 0, 0.58);
  box-shadow:
    0 0 8px rgba(255, 0, 0, 0.42),
    inset 0 0 18px rgba(100, 0, 0, 0.42);
}

.radio-item.active .radio-dot {
  background: #ff1010;
  box-shadow: 0 0 8px rgba(255, 0, 0, 0.86);
}

.radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #180000;
  border: 1px solid #9a0000;
  transition: background 0.2s, box-shadow 0.2s;
}

.field-textarea {
  background: linear-gradient(180deg, rgba(18, 0, 0, 0.92), rgba(3, 0, 0, 0.96));
  border: 1px solid rgba(180, 0, 0, 0.58);
  border-radius: 0;
  color: #d6b0b0;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  padding: 8px 10px;
  outline: none;
  resize: vertical;
  min-height: 50px;
  line-height: 1.7;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  box-shadow:
    inset 0 0 14px rgba(0, 0, 0, 0.78),
    0 0 5px rgba(255, 0, 0, 0.16);
}

.field-textarea:focus {
  border-color: #ff1010;
  background: linear-gradient(180deg, rgba(30, 0, 0, 0.96), rgba(6, 0, 0, 0.98));
  box-shadow:
    0 0 10px rgba(255, 0, 0, 0.46),
    inset 0 0 10px rgba(80, 0, 0, 0.36);
}

.field-textarea::placeholder {
  color: #5a3030;
  font-size: 11px;
}

.char-count {
  text-align: right;
  color: #7a4040;
  font-family: "Share Tech Mono", monospace;
  font-size: 9px;
  margin-top: 2px;
  text-shadow: 0 0 5px rgba(255, 0, 0, 0.2);
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.item-card {
  background:
    linear-gradient(180deg, rgba(18, 0, 0, 0.78), rgba(4, 0, 0, 0.9));
  border: 1px solid rgba(200, 0, 0, 0.58);
  border-left: 4px solid #d00000;
  padding: 10px 12px;
  border-radius: 0;
  box-shadow:
    0 0 8px rgba(255, 0, 0, 0.2),
    inset 0 0 18px rgba(0, 0, 0, 0.76);
}

.item-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-number {
  color: #ff3030;
  font-family: "Share Tech Mono", monospace;
  font-size: 10px;
  letter-spacing: 1px;
  text-shadow: 0 0 7px rgba(255, 0, 0, 0.56);
}

.item-remove {
  background: rgba(10, 0, 0, 0.7);
  border: 1px solid rgba(180, 0, 0, 0.58);
  color: #9a5555;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 0;
  transition: all 0.2s;
}

.item-remove:hover {
  color: #ff3030;
  border-color: #ff1010;
  background: rgba(80, 0, 0, 0.42);
  box-shadow: 0 0 8px rgba(255, 0, 0, 0.35);
}

.item-add-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.btn-add {
  background: linear-gradient(180deg, rgba(28, 0, 0, 0.76), rgba(4, 0, 0, 0.9));
  border: 1px dashed rgba(220, 0, 0, 0.72);
  color: #ff3030;
  font-family: "Noto Sans SC", sans-serif;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 0;
  transition: all 0.2s;
  letter-spacing: 1px;
  text-shadow: 0 0 7px rgba(255, 0, 0, 0.45);
  box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.78);
}

.btn-add:hover:not(:disabled) {
  border-color: #ff1010;
  color: #ff6666;
  background: linear-gradient(180deg, rgba(70, 0, 0, 0.7), rgba(8, 0, 0, 0.95));
  text-shadow: 0 0 10px rgba(255, 0, 0, 0.62);
  box-shadow:
    0 0 10px rgba(255, 0, 0, 0.38),
    inset 0 0 16px rgba(80, 0, 0, 0.42);
}

.btn-add:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.item-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #7a4a4a;
  font-size: 11px;
  font-style: italic;
  text-shadow: 0 0 5px rgba(255, 0, 0, 0.18);
}

.eye-icon {
  font-size: 16px;
  opacity: 0.4;
  animation: eye-glow 3s ease-in-out infinite;
}

.dossier-module {
  border-color: rgba(220, 0, 0, 0.82);
  background:
    radial-gradient(circle at 50% 0%, rgba(180, 0, 0, 0.18), transparent 30%),
    linear-gradient(180deg, rgba(20, 0, 0, 0.92), rgba(2, 0, 0, 0.96));
}

.death-ended-banner {
  margin: 6px 20px 14px;
  padding: 16px 18px;
  color: #ff1010;
  font-family: "Noto Serif SC", "SimSun", serif;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 5px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 0, 0, 0.22), transparent 58%),
    linear-gradient(180deg, rgba(45, 0, 0, 0.94), rgba(4, 0, 0, 0.98));
  border: 2px solid #ff1010;
  text-shadow:
    0 0 5px rgba(255, 0, 0, 0.98),
    0 0 18px rgba(255, 0, 0, 0.82),
    0 2px 0 rgba(0, 0, 0, 0.95);
  box-shadow:
    0 0 18px rgba(255, 0, 0, 0.58),
    inset 0 0 34px rgba(120, 0, 0, 0.62);
}

.survival-strip {
  display: grid;
  grid-template-columns: 1.2fr repeat(2, 1fr);
  gap: 10px;
  padding-bottom: 8px;
}

.survival-card {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "icon label"
    "icon value";
  column-gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 10px 12px;
  background:
    radial-gradient(circle at 0 0, rgba(255, 0, 0, 0.16), transparent 36%),
    linear-gradient(180deg, rgba(28, 0, 0, 0.88), rgba(5, 0, 0, 0.96));
  border: 1px solid rgba(200, 0, 0, 0.66);
  box-shadow:
    0 0 10px rgba(255, 0, 0, 0.22),
    inset 0 0 22px rgba(0, 0, 0, 0.76);
}

.survival-card-main {
  border-color: #ff1010;
  box-shadow:
    0 0 12px rgba(255, 0, 0, 0.42),
    inset 0 0 24px rgba(80, 0, 0, 0.42);
}

.survival-card-death {
  border-color: rgba(255, 45, 45, 0.88);
}

.survival-card-death.critical {
  background:
    radial-gradient(circle at 0 0, rgba(255, 0, 0, 0.28), transparent 42%),
    linear-gradient(180deg, rgba(78, 0, 0, 0.92), rgba(8, 0, 0, 0.98));
  border-color: #ff1010;
  box-shadow:
    0 0 16px rgba(255, 0, 0, 0.68),
    inset 0 0 30px rgba(120, 0, 0, 0.58);
}

.survival-icon {
  grid-area: icon;
  color: #ff2020;
  font-family: "Share Tech Mono", monospace;
  font-size: 24px;
  text-shadow: 0 0 12px rgba(255, 0, 0, 0.8);
}

.survival-label {
  grid-area: label;
  color: #9b6666;
  font-family: "Share Tech Mono", "Courier New", monospace;
  font-size: 9px;
  letter-spacing: 1.6px;
}

.survival-card strong {
  grid-area: value;
  min-width: 0;
  color: #e8b8b8;
  font-size: 13px;
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-shadow: 0 0 8px rgba(255, 0, 0, 0.26);
}

.archive-layout {
  display: grid;
  grid-template-columns: 1.04fr 1.45fr;
  gap: 12px;
  padding-top: 4px;
}

.event-dossier-card {
  min-width: 0;
  padding: 16px 14px;
  background:
    radial-gradient(circle at 50% 34%, rgba(255, 0, 0, 0.18), transparent 38%),
    repeating-linear-gradient(180deg, transparent 0 9px, rgba(255, 0, 0, 0.035) 10px),
    linear-gradient(180deg, rgba(16, 0, 0, 0.92), rgba(3, 0, 0, 0.96));
  border: 1px solid rgba(210, 0, 0, 0.72);
  text-align: center;
  box-shadow:
    0 0 10px rgba(255, 0, 0, 0.24),
    inset 0 0 34px rgba(0, 0, 0, 0.86);
}

.event-eye {
  width: 48px;
  height: 48px;
  margin: 0 auto 8px;
  color: #ff1515;
  font-size: 33px;
  line-height: 48px;
  text-shadow:
    0 0 8px rgba(255, 0, 0, 0.96),
    0 0 24px rgba(160, 0, 0, 0.78);
}

.event-file-no {
  color: #8b5c5c;
  font-family: "Share Tech Mono", monospace;
  font-size: 9px;
  letter-spacing: 1.2px;
  margin-bottom: 6px;
}

.event-dossier-card h2 {
  margin: 0 0 12px;
  color: #ff2828;
  font-family: "Noto Serif SC", "SimSun", serif;
  font-size: 18px;
  letter-spacing: 2px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  text-shadow:
    0 0 6px rgba(255, 0, 0, 0.72),
    0 0 18px rgba(160, 0, 0, 0.55);
}

.event-state-row {
  display: grid;
  gap: 6px;
  color: #b78a8a;
  font-size: 11px;
  line-height: 1.5;
}

.archive-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.archive-card {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  min-width: 0;
  padding: 10px;
  background:
    linear-gradient(180deg, rgba(14, 0, 0, 0.9), rgba(3, 0, 0, 0.96)),
    repeating-linear-gradient(90deg, rgba(255, 0, 0, 0.05) 0 1px, transparent 1px 12px);
  border: 1px solid rgba(170, 0, 0, 0.56);
  box-shadow:
    inset 0 0 18px rgba(0, 0, 0, 0.78),
    0 0 7px rgba(255, 0, 0, 0.16);
}

.archive-icon {
  width: 32px;
  height: 32px;
  color: #ff2020;
  font-family: "Share Tech Mono", monospace;
  font-size: 19px;
  line-height: 32px;
  text-align: center;
  background: rgba(55, 0, 0, 0.42);
  border: 1px solid rgba(210, 0, 0, 0.58);
  box-shadow: 0 0 9px rgba(255, 0, 0, 0.25);
}

.archive-copy {
  min-width: 0;
}

.archive-copy span {
  display: block;
  color: #9b6666;
  font-family: "Share Tech Mono", "Courier New", monospace;
  font-size: 9px;
  letter-spacing: 1.3px;
  margin-bottom: 4px;
}

.archive-copy strong {
  display: block;
  color: #d8abab;
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  text-shadow: 0 0 7px rgba(255, 0, 0, 0.2);
}

.intel-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 0;
}

.intel-card {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 8px;
  padding: 8px 10px;
  background: linear-gradient(180deg, rgba(12, 0, 0, 0.84), rgba(3, 0, 0, 0.92));
  border: 1px solid rgba(155, 0, 0, 0.48);
  box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.68);
}

.intel-card span {
  color: #ff3030;
  font-family: "Share Tech Mono", "Courier New", monospace;
  font-size: 11px;
  letter-spacing: 1px;
  text-shadow: 0 0 7px rgba(255, 0, 0, 0.4);
}

.intel-card em {
  color: #c8a0a0;
  font-size: 11px;
  font-style: normal;
  line-height: 1.6;
  overflow-wrap: anywhere;
  text-shadow: 0 0 5px rgba(255, 0, 0, 0.16);
}

@keyframes eye-glow {
  0%, 100% { opacity: 0.3; text-shadow: none; }
  50% { opacity: 0.6; text-shadow: 0 0 6px rgba(139, 26, 26, 0.4); }
}

.card-footer {
  padding: 18px 20px 16px;
  margin: 12px 14px 14px;
  background:
    radial-gradient(circle at 50% 0%, rgba(120, 0, 0, 0.16), transparent 40%),
    linear-gradient(180deg, rgba(18, 0, 0, 0.86), rgba(4, 0, 0, 0.94));
  border: 1px solid rgba(210, 0, 0, 0.72);
  position: relative;
  z-index: 2;
  box-shadow:
    0 0 8px rgba(255, 0, 0, 0.24),
    inset 0 0 22px rgba(0, 0, 0, 0.72);
}

.footer-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.btn {
  flex: 1;
  font-family: "Noto Sans SC", sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
  padding: 10px 16px;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
  text-transform: uppercase;
}

.btn:disabled {
  cursor: wait;
  opacity: 0.55;
}

.btn-start {
  background: linear-gradient(180deg, rgba(95, 0, 0, 0.92), rgba(16, 0, 0, 0.98));
  border: 1px solid #ff1010;
  color: #ff3030;
  box-shadow:
    0 0 10px rgba(255, 0, 0, 0.45),
    inset 0 0 18px rgba(0, 0, 0, 0.72);
  text-shadow: 0 0 8px rgba(255, 0, 0, 0.62);
}

.btn-start:hover {
  background: linear-gradient(180deg, rgba(130, 0, 0, 0.96), rgba(24, 0, 0, 1));
  border-color: #ff4a4a;
  color: #ff7777;
  box-shadow:
    0 0 16px rgba(255, 0, 0, 0.62),
    0 0 30px rgba(120, 0, 0, 0.35),
    inset 0 0 18px rgba(120, 0, 0, 0.42);
  text-shadow: 0 0 10px rgba(255, 0, 0, 0.86);
}

.btn-start:active {
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.6);
  transform: translateY(1px);
}

.btn-reset {
  background: linear-gradient(180deg, rgba(12, 0, 0, 0.82), rgba(2, 0, 0, 0.94));
  border: 1px solid rgba(150, 0, 0, 0.5);
  color: #8a6262;
  box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.72);
}

.btn-reset:hover {
  border-color: #d00000;
  color: #c89a9a;
  background: linear-gradient(180deg, rgba(35, 0, 0, 0.86), rgba(6, 0, 0, 0.96));
  box-shadow:
    0 0 9px rgba(255, 0, 0, 0.28),
    inset 0 0 16px rgba(90, 0, 0, 0.34);
}

.btn-reset:active {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  transform: translateY(1px);
}

.footer-warning {
  color: #9a5d5d;
  font-family: "Noto Serif SC", serif;
  font-size: 10px;
  font-style: italic;
  text-align: center;
  letter-spacing: 1px;
  line-height: 1.6;
  text-shadow: 0 0 7px rgba(255, 0, 0, 0.28);
}

.options-module {
  margin-top: 18px;
  padding: 20px 16px 18px;
  background:
    radial-gradient(circle at 50% 0%, rgba(130, 0, 0, 0.18), transparent 32%),
    linear-gradient(180deg, rgba(20, 0, 0, 0.92), rgba(3, 0, 0, 0.96));
  border: 2px solid #e00000;
  box-shadow:
    0 0 10px rgba(255, 0, 0, 0.74),
    0 0 28px rgba(160, 0, 0, 0.38),
    inset 0 0 42px rgba(90, 0, 0, 0.46),
    inset 0 0 90px rgba(0, 0, 0, 0.86);
}

.options-module::before {
  background:
    repeating-linear-gradient(0deg, transparent 0 3px, rgba(255, 0, 0, 0.032) 4px),
    radial-gradient(circle at 12% 0%, rgba(255, 0, 0, 0.16), transparent 18%);
}

.option-status-strip {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 0 auto 18px;
  padding: 10px 12px;
  max-width: 88%;
  background: linear-gradient(90deg, rgba(95, 0, 0, 0.72), rgba(22, 0, 0, 0.66));
  border-left: 7px solid #d80000;
  color: #9d8c8c;
  font-family: "Share Tech Mono", "Courier New", monospace;
  font-size: 12px;
  letter-spacing: 1px;
  text-shadow: 0 0 6px rgba(255, 0, 0, 0.24);
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.7);
}

.option-warning-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin: 4px 0 16px;
  color: #ff1010;
  font-family: "Noto Serif SC", "SimSun", serif;
  font-size: 25px;
  font-weight: 800;
  letter-spacing: 5px;
  text-align: center;
  text-shadow:
    0 0 4px rgba(255, 0, 0, 0.96),
    0 0 15px rgba(255, 0, 0, 0.76),
    0 0 34px rgba(150, 0, 0, 0.64);
}

.warning-cross {
  color: #f20000;
  font-family: "Share Tech Mono", monospace;
  font-size: 27px;
  filter: drop-shadow(0 0 8px rgba(255, 0, 0, 0.88));
}

.option-action-line {
  height: 14px;
  margin: 0 auto 14px;
  max-width: 90%;
  background: linear-gradient(180deg, #111, #050505);
  border: 1px solid #4d0000;
  box-shadow:
    inset 0 0 9px rgba(0, 0, 0, 0.95),
    0 0 8px rgba(120, 0, 0, 0.42);
}

.option-action-text {
  margin-bottom: 18px;
  color: #ff1515;
  font-family: "Share Tech Mono", "Courier New", monospace;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
  text-align: center;
  text-shadow:
    0 0 5px rgba(255, 0, 0, 0.94),
    0 0 18px rgba(180, 0, 0, 0.7);
}

.option-list {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 12px 4px;
}

.option-btn {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 72px;
  padding: 16px 18px;
  background: linear-gradient(180deg, rgba(42, 0, 0, 0.88), rgba(7, 0, 0, 0.96));
  border: 1px solid rgba(210, 0, 0, 0.76);
  color: #d8abab;
  cursor: pointer;
  text-align: left;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.7;
  transition: border-color 0.22s ease, color 0.22s ease, box-shadow 0.22s ease, transform 0.12s ease;
  outline: none;
  text-shadow: 0 0 6px rgba(255, 0, 0, 0.2);
  box-shadow:
    inset 0 0 24px rgba(0, 0, 0, 0.78),
    0 0 8px rgba(180, 0, 0, 0.28),
    0 0 0 1px rgba(0, 0, 0, 0.8);
}

.option-btn:hover {
  border-color: #ff2020;
  color: #ffe0e0;
  text-shadow: 0 0 8px rgba(255, 0, 0, 0.38);
  box-shadow:
    inset 0 0 28px rgba(90, 0, 0, 0.5),
    0 0 12px rgba(255, 0, 0, 0.58),
    0 0 26px rgba(120, 0, 0, 0.34);
}

.option-btn:active {
  transform: translateY(1px) scale(0.995);
  box-shadow:
    inset 0 2px 10px rgba(0, 0, 0, 0.88),
    0 0 8px rgba(180, 0, 0, 0.35);
}

.opt-key {
  flex-shrink: 0;
  min-width: 32px;
  color: #ff3030;
  font-family: "Share Tech Mono", monospace;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 0 8px rgba(255, 0, 0, 0.58);
}

.opt-text {
  flex: 1;
  overflow-wrap: anywhere;
}

@media (max-width: 680px) {
  .horror-card {
    width: 100%;
    max-width: none;
  }

  .runtime-card {
    min-height: 520px;
  }

  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .survival-strip,
  .archive-layout {
    grid-template-columns: 1fr;
  }

  .archive-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .event-dossier-card h2 {
    font-size: 16px;
  }

  .options-module {
    padding: 16px 10px 14px;
  }

  .option-status-strip {
    flex-direction: column;
    gap: 4px;
    max-width: 94%;
    font-size: 10px;
  }

  .option-warning-title {
    gap: 10px;
    font-size: 20px;
    letter-spacing: 3px;
  }

  .option-list {
    padding: 0 4px 2px;
  }

  .option-btn {
    min-height: 64px;
    padding: 13px 12px;
    font-size: 12px;
  }
}

</style>
