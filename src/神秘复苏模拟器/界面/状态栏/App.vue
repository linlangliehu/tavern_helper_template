<template>
  <div class="horror-card">
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
        <span class="module-icon">☠</span>
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
        <span class="module-icon">👁</span>
        <span class="module-title">驾驭厉鬼</span>
        <div class="module-line"></div>
      </div>
      <div class="module-body">
        <div class="item-list" v-if="ghosts.length > 0">
          <div class="item-card" v-for="(ghost, idx) in ghosts" :key="idx">
            <div class="item-card-header">
              <span class="item-number">厉鬼 #{{ idx + 1 }}</span>
              <button class="item-remove" @click="removeGhost(idx)">✕</button>
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
            <div class="eye-icon">👁</div>
            <span>暂无驾驭厉鬼</span>
          </div>
        </div>
      </div>
    </section>

    <section class="card-module">
      <div class="module-header">
        <span class="module-icon">⚡</span>
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
        <span class="module-icon">⚰</span>
        <span class="module-title">灵异物品</span>
        <div class="module-line"></div>
      </div>
      <div class="module-body">
        <div class="item-list" v-if="items.length > 0">
          <div class="item-card" v-for="(item, idx) in items" :key="idx">
            <div class="item-card-header">
              <span class="item-number">物品 #{{ idx + 1 }}</span>
              <button class="item-remove" @click="removeItem(idx)">✕</button>
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
            <div class="eye-icon">👁</div>
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
      <div class="module-body dossier-grid">
        <div class="dossier-item">
          <span class="dossier-label">事件代号</span>
          <strong>{{ eventFile.事件代号 }}</strong>
        </div>
        <div class="dossier-item">
          <span class="dossier-label">危害等级</span>
          <strong>{{ eventFile.危害等级 }}</strong>
        </div>
        <div class="dossier-item">
          <span class="dossier-label">鬼域状态</span>
          <strong>{{ eventFile.鬼域状态 }}</strong>
        </div>
        <div class="dossier-item">
          <span class="dossier-label">处理状态</span>
          <strong>{{ eventFile.处理状态 }}</strong>
        </div>
        <div class="dossier-item">
          <span class="dossier-label">复苏风险</span>
          <strong>{{ ghostState.总复苏风险 }}%</strong>
        </div>
        <div class="dossier-item">
          <span class="dossier-label">总部备案</span>
          <strong>{{ factionState.总部备案状态 }}</strong>
        </div>
      </div>
      <div class="module-body dossier-notes">
        <div class="note-line">
          <span>已知规律</span>
          <em>{{ listText(eventFile.已知杀人规律) }}</em>
        </div>
        <div class="note-line">
          <span>猜测规律</span>
          <em>{{ listText(eventFile.猜测杀人规律) }}</em>
        </div>
        <div class="note-line">
          <span>灵异资源</span>
          <em>{{ resourceSummary }}</em>
        </div>
      </div>
    </section>

    <section v-if="options.length" class="card-module options-module">
      <div class="module-header">
        <span class="module-icon">▷</span>
        <span class="module-title">推演选项</span>
        <div class="module-line"></div>
      </div>
      <div class="module-body">
        <button
          v-for="opt in options"
          :key="opt.key"
          class="option-btn"
          type="button"
          @click="pickOption(opt)"
        >
          <span class="opt-key">{{ opt.key }}</span>
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
      <div class="footer-warning">⚠ 注意：模拟器中的一切选择，皆会影响你的生死。</div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRaw } from 'vue'
import { useDataStore } from './store'

const store = useDataStore()
const data = store.data
const isStarting = ref(false)

// 开局表单（基本信息 / 背景设定 / 驾驭厉鬼 / 特殊能力 / 灵异物品 / 底部按钮）
// 只在开场白（楼 0）显示；楼 1+ 只渲染"灵异档案"动态状态面板。
const isFirstFloor = getCurrentMessageId() === 0

// 解析当前楼 AI 文本里的「推演选项」并渲染为按钮，点击后把选项文本填进酒馆输入框。
type OptionItem = { key: string; text: string }

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
        const lm = line.match(/^\s*([A-Z])[.、:：]\s*\[?(.+?)\]?\s*$/)
        if (lm) out.push({ key: lm[1], text: lm[2].trim() })
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

function pickOption(opt: OptionItem) {
  const ta = window.parent.document.querySelector('#send_textarea') as HTMLTextAreaElement | null
  if (!ta) {
    toastr.warning('找不到酒馆输入框 #send_textarea', '推演选项')
    return
  }
  ta.value = opt.text
  ta.dispatchEvent(new Event('input', { bubbles: true }))
  ta.focus()
  toastr.success(`已填入选项 ${opt.key}`, '推演选项')
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
  厉鬼复苏程度: 0,
  持有拼图: '无',
  所在位置: '未知',
  当前灵异事件: defaultEventFile,
  规律推理记录: [],
  驭鬼者状态: defaultGhostState,
  灵异资源: defaultResources,
  势力关系: defaultFactionState,
  世界线记录: [],
  隐藏档案: defaultHiddenFile,
}

function d() {
  return data.value ?? defaults
}

function bindField(key: string, def: string | number = '') {
  return computed({
    get: () => d()[key] ?? def,
    set: (val: string | number) => {
      if (!data.value) data.value = { ...defaults }
      data.value[key] = val
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

function textOrFallback(value: unknown, fallback = '无') {
  const text = String(value ?? '').trim()
  return text || fallback
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

请根据以上设定正式启动“神秘复苏模拟器”的世界线推演：生成我抵达开局地点后的第一段剧情、灵异征兆、事件档案、初步规律线索、状态面板和可行动选项。保持《神秘复苏》式冷峻、危险、因果严密的氛围，不要重新要求我填写设定。`
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
    厉鬼复苏程度: Number(data.value.厉鬼复苏程度 ?? 0),
    持有拼图: ghostList.length ? ghostList.map(ghost => ghost.厉鬼名称).join('、') : '无',
    灵异物品: itemList,
    当前灵异事件: eventFile,
    规律推理记录: [],
    驭鬼者状态: {
      总复苏风险: Number(data.value.厉鬼复苏程度 ?? 0),
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
    状态: '健康', 厉鬼复苏程度: 0, 持有拼图: '无', 所在位置: '未知',
    当前灵异事件: { ...defaultEventFile },
    规律推理记录: [],
    驭鬼者状态: { 总复苏风险: 0, 已驾驭厉鬼: [] },
    灵异资源: { 鬼拼图: [], 灵异物品: [], 黄金储备: '未准备' },
    势力关系: { ...defaultFactionState },
    世界线记录: [],
    隐藏档案: { ...defaultHiddenFile },
  })
}
</script>

<style scoped>
.horror-card {
  background: #050505;
  border: 1px solid #2a0a0a;
  max-width: 560px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 40px rgba(80, 0, 0, 0.15), inset 0 0 80px rgba(0, 0, 0, 0.9);
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
    linear-gradient(45deg, transparent 48%, rgba(30, 5, 5, 0.08) 49%, rgba(30, 5, 5, 0.08) 51%, transparent 52%),
    linear-gradient(-30deg, transparent 48%, rgba(20, 0, 0, 0.05) 49%, rgba(20, 0, 0, 0.05) 51%, transparent 52%);
  pointer-events: none;
  z-index: 1;
}

.card-header {
  padding: 24px 20px 18px;
  text-align: center;
  background: linear-gradient(180deg, rgba(40, 0, 0, 0.5) 0%, transparent 100%);
  border-bottom: 1px solid #3a0808;
  position: relative;
  z-index: 2;
}

.header-quote {
  color: #5a3030;
  font-family: "Noto Serif SC", "SimSun", serif;
  font-size: 11px;
  font-style: italic;
  line-height: 1.7;
  margin: 6px 0;
  opacity: 0.8;
}

.quote-mark {
  color: #6a1a1a;
  font-size: 14px;
}

.main-title {
  color: #8b1a1a;
  font-family: "Noto Serif SC", "SimSun", serif;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 8px;
  text-shadow: 0 0 10px rgba(139, 26, 26, 0.5), 0 0 30px rgba(80, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.8);
  margin: 10px 0 8px;
  position: relative;
}

.title-deco-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, #4a0a0a 20%, #6a1a1a 50%, #4a0a0a 80%, transparent);
  margin: 8px auto;
  max-width: 300px;
}

.card-module {
  position: relative;
  z-index: 2;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px 8px;
}

.module-icon {
  color: #6a1a1a;
  font-size: 13px;
  text-shadow: 0 0 6px rgba(100, 20, 20, 0.4);
}

.module-title {
  color: #7a1a1a;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 3px;
  white-space: nowrap;
  text-shadow: 0 0 6px rgba(100, 20, 20, 0.3);
}

.module-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, #3a0808, transparent);
}

.module-body {
  padding: 4px 20px 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  color: #6a4040;
  font-family: "Share Tech Mono", "Courier New", monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.field-label-long {
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: none;
  font-family: "Noto Serif SC", "SimSun", serif;
  font-style: italic;
  color: #5a3030;
  line-height: 1.5;
  margin-bottom: 2px;
}

.field-input {
  background: #0a0505;
  border: 1px solid #2a1010;
  border-radius: 2px;
  color: #c0a0a0;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  padding: 8px 10px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-input:focus {
  border-color: #5a1a1a;
  box-shadow: 0 0 8px rgba(80, 20, 20, 0.2), inset 0 0 4px rgba(40, 0, 0, 0.3);
}

.field-input::placeholder {
  color: #3a2020;
  font-size: 11px;
}

.field-select {
  appearance: none;
  background: #0a0505;
  border: 1px solid #2a1010;
  border-radius: 2px;
  color: #c0a0a0;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  padding: 8px 28px 8px 10px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%235a1a1a' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

.field-select:focus {
  border-color: #5a1a1a;
  box-shadow: 0 0 8px rgba(80, 20, 20, 0.2);
}

.field-select option {
  background: #0a0505;
  color: #c0a0a0;
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
  color: #5a4040;
  font-family: "Noto Sans SC", sans-serif;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s;
  padding: 6px 14px;
  border: 1px solid #1a0a0a;
  border-radius: 2px;
  background: #080505;
}

.radio-item:hover {
  border-color: #3a1515;
  color: #8a6060;
}

.radio-item.active {
  color: #aa3030;
  border-color: #4a1515;
  background: #0d0505;
  text-shadow: 0 0 4px rgba(150, 30, 30, 0.3);
}

.radio-item.active .radio-dot {
  background: #8b1a1a;
  box-shadow: 0 0 5px rgba(139, 26, 26, 0.5);
}

.radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1a0a0a;
  border: 1px solid #3a1515;
  transition: background 0.2s, box-shadow 0.2s;
}

.field-textarea {
  background: #0a0505;
  border: 1px solid #2a1010;
  border-radius: 2px;
  color: #c0a0a0;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  padding: 8px 10px;
  outline: none;
  resize: vertical;
  min-height: 50px;
  line-height: 1.7;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-textarea:focus {
  border-color: #5a1a1a;
  box-shadow: 0 0 8px rgba(80, 20, 20, 0.2), inset 0 0 4px rgba(40, 0, 0, 0.3);
}

.field-textarea::placeholder {
  color: #3a2020;
  font-size: 11px;
}

.char-count {
  text-align: right;
  color: #3a2020;
  font-family: "Share Tech Mono", monospace;
  font-size: 9px;
  margin-top: 2px;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.item-card {
  background: rgba(20, 5, 5, 0.4);
  border: 1px solid #2a0a0a;
  border-left: 2px solid #4a1010;
  padding: 10px 12px;
  border-radius: 2px;
}

.item-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-number {
  color: #5a2020;
  font-family: "Share Tech Mono", monospace;
  font-size: 10px;
  letter-spacing: 1px;
}

.item-remove {
  background: none;
  border: 1px solid #2a0a0a;
  color: #5a2020;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 2px;
  transition: all 0.2s;
}

.item-remove:hover {
  color: #aa3030;
  border-color: #5a1515;
  background: rgba(80, 10, 10, 0.2);
}

.item-add-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.btn-add {
  background: none;
  border: 1px dashed #4a1010;
  color: #8b1a1a;
  font-family: "Noto Sans SC", sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
  letter-spacing: 1px;
}

.btn-add:hover:not(:disabled) {
  border-color: #6a1a1a;
  color: #bb3030;
  background: rgba(80, 10, 10, 0.1);
  text-shadow: 0 0 6px rgba(150, 30, 30, 0.3);
}

.btn-add:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.item-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3a2020;
  font-size: 11px;
  font-style: italic;
}

.eye-icon {
  font-size: 16px;
  opacity: 0.4;
  animation: eye-glow 3s ease-in-out infinite;
}

.dossier-module {
  border-top: 1px solid rgba(70, 10, 10, 0.35);
}

.dossier-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding-bottom: 8px;
}

.dossier-item {
  background: rgba(12, 5, 5, 0.72);
  border: 1px solid #241010;
  border-left: 2px solid #4a1010;
  padding: 8px 10px;
  min-width: 0;
}

.dossier-label {
  display: block;
  color: #583030;
  font-family: "Share Tech Mono", "Courier New", monospace;
  font-size: 9px;
  letter-spacing: 1.2px;
  margin-bottom: 4px;
}

.dossier-item strong {
  display: block;
  color: #a06060;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.dossier-notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 0;
}

.note-line {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
  color: #6a4040;
  font-size: 11px;
  line-height: 1.6;
}

.note-line span {
  color: #7a2525;
  font-family: "Share Tech Mono", "Courier New", monospace;
  letter-spacing: 1px;
}

.note-line em {
  color: #8d7474;
  font-style: normal;
  overflow-wrap: anywhere;
}

@keyframes eye-glow {
  0%, 100% { opacity: 0.3; text-shadow: none; }
  50% { opacity: 0.6; text-shadow: 0 0 6px rgba(139, 26, 26, 0.4); }
}

.card-footer {
  padding: 18px 20px 16px;
  background: linear-gradient(180deg, transparent, rgba(30, 0, 0, 0.3));
  border-top: 1px solid #2a0808;
  position: relative;
  z-index: 2;
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
  font-weight: 600;
  letter-spacing: 2px;
  padding: 10px 16px;
  border-radius: 2px;
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
  background: linear-gradient(180deg, #3a0a0a 0%, #200505 100%);
  border: 1px solid #5a1515;
  color: #cc4040;
  box-shadow: 0 0 10px rgba(100, 20, 20, 0.15);
}

.btn-start:hover {
  background: linear-gradient(180deg, #4a0a0a 0%, #2a0505 100%);
  border-color: #7a2020;
  color: #ee5050;
  box-shadow: 0 0 16px rgba(120, 20, 20, 0.25);
  text-shadow: 0 0 8px rgba(200, 50, 50, 0.3);
}

.btn-start:active {
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.6);
  transform: translateY(1px);
}

.btn-reset {
  background: #080808;
  border: 1px solid #1a1a1a;
  color: #5a5a5a;
}

.btn-reset:hover {
  border-color: #2a2a2a;
  color: #7a7a7a;
  background: #0c0c0c;
}

.btn-reset:active {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  transform: translateY(1px);
}

.footer-warning {
  color: #4a2020;
  font-family: "Noto Serif SC", serif;
  font-size: 10px;
  font-style: italic;
  text-align: center;
  letter-spacing: 1px;
  line-height: 1.6;
}

.options-module .module-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-btn {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(20, 5, 5, 0.5);
  border: 1px solid #2a0a0a;
  border-left: 2px solid #4a1010;
  color: #b8a0a0;
  cursor: pointer;
  text-align: left;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  line-height: 1.55;
  transition: all 0.2s;
  border-radius: 2px;
  outline: none;
}

.option-btn:hover {
  background: rgba(80, 10, 10, 0.18);
  border-color: #6a1a1a;
  border-left-color: #aa3030;
  color: #d8b0b0;
  text-shadow: 0 0 4px rgba(150, 30, 30, 0.2);
  box-shadow: 0 0 10px rgba(80, 20, 20, 0.15);
}

.option-btn:active {
  transform: translateY(1px);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5);
}

.opt-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: #aa3030;
  background: #0a0505;
  border: 1px solid #4a1010;
  border-radius: 50%;
  font-family: "Share Tech Mono", monospace;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 0;
}

.opt-text {
  flex: 1;
  overflow-wrap: anywhere;
}
</style>
