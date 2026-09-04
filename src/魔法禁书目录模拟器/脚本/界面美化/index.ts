import { registerMfrsRuntimeBuild } from '../_runtime_identity';

registerMfrsRuntimeBuild('界面美化');

// ===== 变量基线兜底（任意预设下保证能力卡片显示真实开局数据） =====
// 背景：变量初始化依赖模型输出 <UpdateVariable> 协议块；预设切换/锚点失配会导致协议块整块丢失，
// 面板随即用空档案兜底渲染成 Level 0。此层把开局基线由脚本直接写入聊天变量并逐楼层补齐，
// 不依赖模型服从任何文本指令；协议缺失时另有一次性提示。

type MfrsTHLike = {
  getVariables?: (options?: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
  updateVariablesWith?: (
    updater: (vars: Record<string, unknown>) => Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<unknown> | unknown;
  insertOrAssignVariables?: (
    patch: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<unknown> | unknown;
  getChatMessages?: (id: number | string, options?: Record<string, unknown>) => Promise<unknown> | unknown;
  // 直接调用模型生成独立文本（静默、不进聊天、不走角色预设），用于开局能力效果 AI 补全
  generateRaw?: (config: Record<string, unknown>) => Promise<string>;
  // 执行 STScript（TH 官方 API，签名见 JS-Slash-Runner 文档）：选项按钮点击后 /send+|/trigger 发送并触发生成
  triggerSlash?: (command: string) => Promise<string>;
};

declare const eventOn: undefined | ((event: string, handler: (...args: unknown[]) => void) => void);
declare const tavern_events: undefined | Record<string, string>;

const MFRS_BASELINE_KEY = '__mfrs_baseline';
const MFRS_WARN_KEY = '__mfrs_uv_warned';
// initvar.yaml 的非空默认值：MVU 每层初始化会先填入，字段守卫必须把它们视为「空」否则开局表单值永远填不进去
const MFRS_INITVAR_DEFAULTS: Record<string, unknown> = { 性别: '男', 年龄: '18岁' };
const MFRS_RAW_PROTOCOL_KEY = '_mfrs_raw_protocol_message';

/** 读宿主 ctx 中指定楼层被 mvu-protocol-applier 清洗前保存的协议快照（TH extra 拷贝不含该键）。 */
function mfrsReadHostRawProtocolSnapshot(messageId: number): string {
  try {
    const host = window.parent as (Window & {
      SillyTavern?: { getContext?: () => { chat?: Array<{ extra?: Record<string, unknown> }> } };
    }) | null;
    const chat = host?.SillyTavern?.getContext?.().chat;
    const msg = chat && messageId >= 0 ? chat[messageId] : undefined;
    const raw = msg?.extra?.[MFRS_RAW_PROTOCOL_KEY];
    return typeof raw === 'string' ? raw : '';
  } catch {
    return '';
  }
}


function mfrsGetTH(): MfrsTHLike | undefined {
  try {
    const host = (window.parent as (Window & { TavernHelper?: MfrsTHLike }) | null)?.TavernHelper;
    return host ?? (window as unknown as { TavernHelper?: MfrsTHLike }).TavernHelper;
  } catch {
    return (window as unknown as { TavernHelper?: MfrsTHLike }).TavernHelper;
  }
}

function mfrsSetChatBaseline(baseline: Record<string, unknown>): boolean {
  const th = mfrsGetTH();
  if (!th?.insertOrAssignVariables) return false;
  try {
    const result = th.insertOrAssignVariables({ [MFRS_BASELINE_KEY]: baseline }, { type: 'chat' });
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      (result as Promise<unknown>).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

interface MfrsChatMessageLike {
  is_user?: boolean;
  message_id?: number;
  message?: string;
  mes?: string;
}

async function mfrsGetLastChatMessage(): Promise<MfrsChatMessageLike | undefined> {
  const th = mfrsGetTH();
  if (!th?.getChatMessages) return undefined;
  const raw = await th.getChatMessages(-1);
  const last = Array.isArray(raw) ? raw[0] : raw;
  return last as MfrsChatMessageLike | undefined;
}

/** 能力档案 AI 生成：调用 generateRaw 产出「能力效果 + 实战运用」实质内容。
 *  关键设计：不依赖主流程模型输出 <UpdateVariable>（实测为不可靠路径，首轮往往整块缺失），
 *  hotfix-01 起由楼层守卫 mfrsFixAbilityPlaceholders 在开局后的楼层事件中后台调用（时机二主路径）。
 */
async function mfrsSynthAbilityByAi(input: {
  side: string;
  name: string;
  gender: string;
  age: string;
  pers: string;
  supp: string;
  sceneText: string;
  abilityName: string;
  level: string;
  orgLabel: string;
}): Promise<{ 能力效果: string; 实战运用: string } | null> {
  const th = mfrsGetTH();
  const gen = th?.generateRaw?.bind(th);
  if (!gen) return null;
  const sideDesc =
    input.side === 'science'
      ? '「科学侧·超能力」：以 AIM 扩散力场与个人现实为根基'
      : '「魔法侧·术式」：以魔力与偶像崇拜理论驱动';
  const systemPrompt = [
    '你是《魔法禁书目录》世界观的能力档案撰稿人。',
    `体系：${sideDesc}。`,
    '任务：根据玩家开局信息，为其能力撰写档案描述。',
    '严格只输出一行 JSON 对象（不得输出任何其他字符、标签或解释）：',
    '{"能力效果":"30~60 字：能力的原理与表现形式，要具体、有画面感","实战运用":"30~60 字：该能力在战斗与日常中的典型用法"}',
    "要求：贴合能力名与等级；Level 5 可写出学园都市顶尖水准的表现力；严禁出现「依设定与剧情判定」「随剧情展开」等占位句。",
  ].join('\n');
  const userPrompt = [
    `姓名：${input.name}（${input.gender}，${input.age}）`,
    input.pers && input.pers !== '未设定' ? `性格：${input.pers}` : '',
    input.supp ? `补充设定：${input.supp}` : '',
    `能力：${input.abilityName}（${input.level}）`,
    input.orgLabel ? `所属：${input.orgLabel}` : '',
    input.sceneText ? `开场白：${input.sceneText}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  try {
    const task = gen({
      ordered_prompts: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      should_silence: true,
      should_stream: false,
      max_chat_history: 0,
    }) as Promise<string>;
    const result = await Promise.race([task, new Promise<null>(resolve => setTimeout(() => resolve(null), 25000))]);
    if (typeof result !== 'string' || !result) return null;
    const m = result.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as { 能力效果?: unknown; 实战运用?: unknown };
    const effect = typeof parsed.能力效果 === 'string' ? parsed.能力效果.trim() : '';
    const combat = typeof parsed.实战运用 === 'string' ? parsed.实战运用.trim() : '';
    if (!effect || effect === '依设定与剧情判定') return null;
    return {
      能力效果: effect.slice(0, 200),
      实战运用:
        combat && combat !== '随剧情展开；战斗与日常分别描述' ? combat.slice(0, 200) : '随剧情展开；战斗与日常分别描述',
    };
  } catch {
    return null;
  }
}

// 字段级守卫：只填空字段，绝不覆盖模型已写入的非空值。
async function mfrsEnsureLatestFloorBaseline(): Promise<void> {
  const th = mfrsGetTH();
  if (!th?.getVariables || !th?.updateVariablesWith) return;
  try {
    const last = await mfrsGetLastChatMessage();
    if (!last || last.is_user || typeof last.message_id !== 'number') return;
    const floorVars = await th.getVariables({ type: 'message', message_id: last.message_id });
    const statData = ((floorVars?.stat_data as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
    const roster = Array.isArray(statData.能力档案) ? (statData.能力档案 as unknown[]) : [];
    if (roster.length > 0) return; // 已有档案（模型写入或此前已兜底）→ 不动
    const chatVars = await th.getVariables({ type: 'chat' });
    const baseline = chatVars?.[MFRS_BASELINE_KEY] as Record<string, unknown> | undefined;
    if (!baseline) return; // 旧聊天/未经开局表单 → 降级空转
    await th.updateVariablesWith(
      current => {
        const next = { ...((current?.stat_data as Record<string, unknown> | undefined) ?? {}) };
        for (const [key, value] of Object.entries(baseline)) {
          if (key === '能力档案') continue;
          const existing = next[key];
          const isDefault = existing !== undefined && existing === MFRS_INITVAR_DEFAULTS[key];
          if (existing === undefined || existing === null || existing === '' || isDefault) next[key] = value;
        }
        next.能力档案 = baseline.能力档案; // 仅当档案为空时才会走到这里（整组写入）
        return { ...(current ?? {}), stat_data: next };
      },
      { type: 'message', message_id: last.message_id },
    );
  } catch {
    /* 兜底失败不影响主流程 */
  }
}

// —— hotfix-07：能力卡占位污染守卫（hotfix-01 升级版）——
// 触发：楼层事件（渲染/更新/swipe/聊天切换）后错峰调用；幂等，已有实质内容绝不覆盖。
// 分支：名称/等级被占位污染 → 从 chat 层开局基线确定性回填身份字段（不调 AI）；
//       效果/运用占位 → generateRaw 合成，入参一律基线名称优先（修复“风刃”错位）。
// 护栏：in-flight 去重；v2 计数与旧 key 隔离（成功清零、失败计数，上限 3）；写回前二次校验；MVU 所有权边界。
const MFRS_ABILITY_FIX_KEY = '__mfrs_ability_fix_v2_attempts'; // hotfix-07 v2：旧 key __mfrs_ability_fix_attempts 已废弃不读
const MFRS_ABILITY_FIX_MAX = 3;
let mfrsAbilityFixInFlight = false;
let mfrsAbilityFixNoBaselineWarned = false; // 无基线跳过提示每次页面加载最多一次，防楼层事件刷屏

// 严格表（效果/运用长文字段）：不做裸“未知”判定（合法长文常含“未知”二字），只认下方占位文案
function mfrsIsPlaceholderAbilityText(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;
  return (
    s === '依设定与剧情判定' ||
    s === '随剧情展开；战斗与日常分别描述' ||
    s.includes('依设定与剧情判定') ||
    s.includes('随剧情展开') ||
    s.includes('待补全') ||
    s.includes('待揭示') ||
    s.includes('尚未展现') ||
    s.includes('待玩家填写') || // hotfix-07：实机捕获变体（楼层8 AI 凭空编造）
    s.includes('待玩家确认') ||
    s.includes('待剧情展开')
  );
}

// 宽表（hotfix-07 P1-1）：名称/等级短身份字段——在严格表之上放宽：整值“未知”类 + 待玩家/待确认包含
function mfrsIsPlaceholderIdentityText(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;
  if (s === '未知' || s === '未知（待玩家填写）') return true;
  if (s.includes('待玩家') || s.includes('待确认') || s.includes('待填写')) return true;
  return mfrsIsPlaceholderAbilityText(s);
}

async function mfrsFixAbilityPlaceholders(): Promise<void> {
  const th = mfrsGetTH();
  if (!th?.getVariables || !th?.updateVariablesWith || !th?.insertOrAssignVariables) return;
  if (mfrsAbilityFixInFlight) return;
  try {
    const last = await mfrsGetLastChatMessage();
    if (!last || last.is_user || typeof last.message_id !== 'number') return;
    const messageId = last.message_id;
    const floorVars = await th.getVariables({ type: 'message', message_id: messageId });
    const statData = ((floorVars?.stat_data as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
    const roster = Array.isArray(statData.能力档案) ? (statData.能力档案 as Array<Record<string, unknown>>) : [];
    if (roster.length === 0) return; // 档案整组为空 → 归 mfrsEnsureLatestFloorBaseline 兜底
    const entry = roster[0] ?? {};
    // hotfix-07 A2：扫描 2→4 字段（名称/等级用宽判定，效果/运用维持严格判定）
    const nameStale = mfrsIsPlaceholderIdentityText(entry['能力名称']);
    const levelStale = mfrsIsPlaceholderIdentityText(entry['等级或位阶']);
    const effectStale = mfrsIsPlaceholderAbilityText(entry['能力效果']);
    const combatStale = mfrsIsPlaceholderAbilityText(entry['实战运用']);
    if (!nameStale && !levelStale && !effectStale && !combatStale) return;
    const chatVars = await th.getVariables({ type: 'chat' });
    const attempts =
      typeof chatVars?.[MFRS_ABILITY_FIX_KEY] === 'number' ? (chatVars[MFRS_ABILITY_FIX_KEY] as number) : 0;
    if (attempts >= MFRS_ABILITY_FIX_MAX) return; // 失败上限：停手，卡片保持现状等待手填
    const baseline = chatVars?.[MFRS_BASELINE_KEY] as Record<string, unknown> | undefined;
    const baseInfo = (baseline ?? {}) as Record<string, unknown>;
    const baseRoster = Array.isArray(baseInfo['能力档案'])
      ? (baseInfo['能力档案'] as Array<Record<string, unknown>>)
      : [];
    const baseEntry = baseRoster[0] ?? {};
    // hotfix-07 A3 分叉①：身份字段污染但无开局基线 → 保守跳过 + 提示手填（不让 AI 编造玩家能力名）
    if ((nameStale || levelStale) && baseRoster.length === 0) {
      if (!mfrsAbilityFixNoBaselineWarned) {
        mfrsAbilityFixNoBaselineWarned = true;
        const hostWin =
          (window.parent as (Window & { toastr?: { warning?: (message: string, title?: string) => void } }) | null) ?? window;
        hostWin.toastr?.warning?.('能力名称/等级出现占位文本且无开局基线可恢复，请在能力卡中手动填写', '魔法禁书目录');
      }
      return;
    }
    const identityBackfill = (nameStale || levelStale) && baseRoster.length > 0;
    const needSynth = effectStale || combatStale;
    if (needSynth && !th?.generateRaw) {
      if (!identityBackfill) return; // 环境不支持合成且无需身份回填 → 静默放弃
      // 身份回填不依赖 AI，可先做；效果占位留待下次
    }
    // hotfix-07 P1-2 串行第一步：先从基线解析干净身份（基线优先，entry 次之）作合成入参
    //   ——修复旧代码 abilityName: entry ?? base ?? '未觉醒' 把污染名喂给合成器产出“风刃”错位内容
    const synthName = String(baseEntry['能力名称'] ?? entry['能力名称'] ?? '未觉醒');
    const synthLevel = String(
      (levelStale ? baseEntry['等级或位阶'] : undefined) ?? entry['等级或位阶'] ?? baseEntry['等级或位阶'] ?? '未指定',
    );
    mfrsAbilityFixInFlight = true;
    let synth: { 能力效果: string; 实战运用: string } | null = null;
    try {
      if (needSynth && th.generateRaw) {
        synth = await mfrsSynthAbilityByAi({
          side: String(baseInfo['阵营'] ?? '').includes('魔法侧') ? 'magic' : 'science',
          name: String(baseInfo['姓名'] ?? '玩家'),
          gender: String(baseInfo['性别'] ?? ''),
          age: String(baseInfo['年龄'] ?? ''),
          pers: String(baseInfo['性格'] ?? ''),
          supp: String(baseInfo['身份'] ?? ''),
          sceneText: '',
          abilityName: synthName,
          level: synthLevel,
          orgLabel: String(baseInfo['身份'] ?? ''),
        });
        // hotfix-07：合成器实战运用兜底值本身是占位文案，若落到兜底视为合成失败
        if (synth && (mfrsIsPlaceholderAbilityText(synth.能力效果) || mfrsIsPlaceholderAbilityText(synth.实战运用))) {
          synth = null;
        }
      }
      // 写回前二次校验：重读当层，确认占位符仍在（防 swipe/编辑期间被其他写手处理）
      const recheck = await th.getVariables({ type: 'message', message_id: messageId });
      const reStat = ((recheck?.stat_data as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
      const reRoster = Array.isArray(reStat.能力档案) ? (reStat.能力档案 as Array<Record<string, unknown>>) : [];
      const reEntry = reRoster[0] ?? {};
      const stillNameStale = nameStale && mfrsIsPlaceholderIdentityText(reEntry['能力名称']);
      const stillLevelStale = levelStale && mfrsIsPlaceholderIdentityText(reEntry['等级或位阶']);
      const stillCampInvalid =
        identityBackfill && !['超能力', '术式', '灵装'].includes(String(reEntry['阵营类型'] ?? ''));
      const stillEffectStale = effectStale && mfrsIsPlaceholderAbilityText(reEntry['能力效果']);
      const stillCombatStale = combatStale && mfrsIsPlaceholderAbilityText(reEntry['实战运用']);
      const baseName = typeof baseEntry['能力名称'] === 'string' ? (baseEntry['能力名称'] as string) : '';
      const baseLevel = typeof baseEntry['等级或位阶'] === 'string' ? (baseEntry['等级或位阶'] as string) : '';
      const baseCamp = String(baseEntry['阵营类型'] ?? '');
      const campValid = ['超能力', '术式', '灵装'].includes(baseCamp);
      const patchIdentity =
        identityBackfill &&
        ((stillNameStale && !!baseName) || (stillLevelStale && !!baseLevel) || (stillCampInvalid && campValid));
      const synthEffect = synth?.能力效果 ?? '';
      const synthCombat = synth?.实战运用 ?? '';
      const patchEffect = stillEffectStale && !!synthEffect;
      const patchCombat = stillCombatStale && !!synthCombat;
      const synthFailed = needSynth && !!th.generateRaw && !synth;
      // 合成需要但失败 → 计数（即便身份回填已写入，效果仍占位，下次重试）
      if (synthFailed) {
        await th.insertOrAssignVariables({ [MFRS_ABILITY_FIX_KEY]: attempts + 1 }, { type: 'chat' });
        if (attempts + 1 >= MFRS_ABILITY_FIX_MAX) {
          const hostWin =
            (window.parent as (Window & { toastr?: { warning?: (message: string, title?: string) => void } }) | null) ?? window;
          hostWin.toastr?.warning?.('能力描述自动补全失败，请在能力卡中手动补填', '魔法禁书目录');
        }
      }
      if (!patchIdentity && !patchEffect && !patchCombat) return; // 无可写内容（他方已修/基线缺字段）
      await th.updateVariablesWith(
        current => {
          const nextStat = { ...((current?.stat_data as Record<string, unknown> | undefined) ?? {}) };
          const nextRoster = Array.isArray(nextStat.能力档案)
            ? (nextStat.能力档案 as Array<Record<string, unknown>>).map(row => ({ ...(row as Record<string, unknown>) }))
            : [];
          if (nextRoster.length === 0) return current ?? {}; // 档案被清空 → 放弃，不重建
          const target = nextRoster[0];
          // MVU 所有权边界：只替换仍为占位符的字段，其余字段（含模型已写值）一律不动
          if (identityBackfill) {
            if (stillNameStale && baseName && mfrsIsPlaceholderIdentityText(target['能力名称'])) target['能力名称'] = baseName;
            if (stillLevelStale && baseLevel && mfrsIsPlaceholderIdentityText(target['等级或位阶']))
              target['等级或位阶'] = baseLevel;
            if (
              stillCampInvalid &&
              campValid &&
              !['超能力', '术式', '灵装'].includes(String(target['阵营类型'] ?? ''))
            )
              target['阵营类型'] = baseCamp;
          }
          if (patchEffect && mfrsIsPlaceholderAbilityText(target['能力效果'])) target['能力效果'] = synthEffect;
          if (patchCombat && mfrsIsPlaceholderAbilityText(target['实战运用'])) target['实战运用'] = synthCombat;
          nextStat.能力档案 = nextRoster;
          return { ...(current ?? {}), stat_data: nextStat };
        },
        { type: 'message', message_id: messageId },
      );
      // hotfix-07 A4：写回成功 → 清零重计（仅当曾计数过才写，减少无谓写入）
      if (!synthFailed && attempts !== 0) {
        await th.insertOrAssignVariables({ [MFRS_ABILITY_FIX_KEY]: 0 }, { type: 'chat' });
      }
      const hostWin =
        (window.parent as (Window & { toastr?: { success?: (message: string, title?: string) => void } }) | null) ?? window;
      if (patchIdentity && patchEffect) hostWin.toastr?.success?.('能力档案已从开局基线恢复并补全效果 ✓', '魔法禁书目录');
      else if (patchIdentity) hostWin.toastr?.success?.('能力档案已从开局基线恢复 ✓', '魔法禁书目录');
      else hostWin.toastr?.success?.('能力效果已由 AI 补全 ✓', '魔法禁书目录');
    } finally {
      mfrsAbilityFixInFlight = false;
    }
  } catch {
    /* 补写失败不影响主流程 */
  }
}

// MVU 对新楼层初始化 stat_data 的时机与渲染事件存在竞态 → 错峰重试；幂等（档案非空即跳过）。
// hotfix-01：另挂占位符补写守卫（800ms 首试；失败等下一次楼层事件再试，in-flight 去重）。
function mfrsEnsureWithRetry(): void {
  [400, 1600, 3600].forEach(delay => {
    window.setTimeout(() => { void mfrsEnsureLatestFloorBaseline(); }, delay);
  });
  window.setTimeout(() => { void mfrsFixAbilityPlaceholders(); }, 800); // hotfix-01 时机二首试；失败等下一次楼层事件再试
}

async function mfrsWarnIfProtocolMissing(): Promise<void> {
  const th = mfrsGetTH();
  if (!th?.getVariables || !th?.insertOrAssignVariables) return;
  try {
    const last = await mfrsGetLastChatMessage();
    if (!last || last.is_user || typeof last.message_id !== 'number' || last.message_id < 2) return;
    const text = String(last.message ?? last.mes ?? '');
    if (!text) return;
    if (text.includes('<UpdateVariable')) return;
    // mvu-protocol-applier 会把协议块应用后从 mes 清洗进 extra._mfrs_raw_protocol_message 快照：
    // 快照存在即协议存在（已应用），不得误报。TH getChatMessages 的 extra 是白名单拷贝，须读宿主 ctx。
    if (mfrsReadHostRawProtocolSnapshot(last.message_id).includes('<UpdateVariable')) return;
    const chatVars = await th.getVariables({ type: 'chat' });
    if (chatVars?.[MFRS_WARN_KEY]) return; // 每聊天只提示一次
    await th.insertOrAssignVariables({ [MFRS_WARN_KEY]: true }, { type: 'chat' });
    const hostWin = (window.parent as (Window & { toastr?: { warning?: (message: string, title?: string) => void } }) | null) ?? window;
    hostWin.toastr?.warning?.(
      '当前预设/模型未输出变量协议块：动态数据（好感度/任务/认知）可能冻结；能力卡片已由开局基线兜底。建议检查预设或重开聊天后使用开局表单。',
      '魔法禁书目录',
    );
  } catch {
    /* noop */
  }
}

let mfrsBaselineHooksInstalled = false;
function mfrsInstallBaselineHooks(): void {
  if (mfrsBaselineHooksInstalled) return;
  if (typeof eventOn !== 'function' || typeof tavern_events === 'undefined') return;
  const ensureEvents = [
    tavern_events.CHARACTER_MESSAGE_RENDERED,
    tavern_events.MESSAGE_UPDATED,
    tavern_events.MESSAGE_SWIPED,
    tavern_events.CHAT_CHANGED,
  ].filter((value): value is string => typeof value === 'string');
  ensureEvents.forEach(eventName => {
    try {
      eventOn(eventName, () => {
        mfrsEnsureWithRetry();
      });
    } catch {
      /* noop */
    }
  });
  if (typeof tavern_events.GENERATION_ENDED === 'string') {
    try {
      eventOn(tavern_events.GENERATION_ENDED, () => { void mfrsWarnIfProtocolMissing(); });
    } catch {
      /* noop */
    }
  }
  mfrsBaselineHooksInstalled = true;
}
mfrsInstallBaselineHooks();

function getHostDocument() {
  try {
    return window.parent?.document ?? document;
  } catch {
    return document;
  }
}


type HostWindowWithThemeCleanup = Window & {
  __mfrsMjrThemeCleanup__?: () => void;
  __mfrsDatabaseFrontend?: {
    openDashboard?: (options?: { welcome?: boolean }) => void;
  };
  toastr?: {
    info?: (message: string) => void;
  };
};

function getSendTextarea(hostDocument: Document) {
  const candidates = Array.from(
    hostDocument.querySelectorAll<HTMLTextAreaElement>('#send_textarea, textarea[name="text"]'),
  );
  return candidates.find(input => input.offsetParent !== null) ?? candidates[0] ?? null;
}

function setTextareaValue(input: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.focus();
}

function getActionText(rawText: string) {
  const text = rawText.replace(/^[ABCD][.、：:]\s*/, '').trim();
  return text === '自定义行动'
    ? text
    : text.replace(/[。；;]?\s*(?:<risk)[\s\S]*$/i, '').trim();
}

$(() => {
  const style = document.createElement('style');
  style.id = 'mfrs-mjr-theme';
  style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;600;700&family=Noto+Serif+SC:wght@600;800&display=swap');

/* MFRS 主题色变量（不覆盖酒馆主题，仅用于 MFRS 专属组件） */
#chat {
  --mfrs-neon: #66ccff;
  --mfrs-cyan: #00ffaa;
  --mfrs-text: #e8f4ff;
  --mfrs-deep: #0a1230;
}

/* MFRS 滚动条样式（仅限 MFRS 面板内部，不影响酒馆全局） */
.mfrs-msg-panel ::-webkit-scrollbar { width: 8px; }
.mfrs-msg-panel ::-webkit-scrollbar-track { background: rgba(11, 13, 12, 0.72); }
.mfrs-msg-panel ::-webkit-scrollbar-thumb {
  background: rgba(95, 143, 134, 0.48);
  border-radius: 2px;
}
.mfrs-msg-panel ::-webkit-scrollbar-thumb:hover { background: rgba(156, 120, 74, 0.7); }

.mfrs-scifi-options {
  background: #0a1230 !important;
  padding: 20px 24px !important;
  margin: 18px auto !important;
  max-width: 560px !important;
  position: relative !important;
  box-shadow: 0 0 22px rgba(0,0,0,0.45), inset 0 0 24px rgba(10,30,60,0.32), 0 0 6px rgba(40,80,160,0.18) !important;
  clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px) !important;
}

.mfrs-scifi-options::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(20,40,80,0.02) 2px, rgba(20,40,80,0.02) 4px),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E") !important;
  pointer-events: none !important;
}

.mfrs-scifi-options::after {
  content: '' !important;
  position: absolute !important;
  top: 0 !important; right: 0 !important; bottom: 0 !important; width: 40px !important;
  background: linear-gradient(90deg, transparent, rgba(20,40,80,0.06)) !important;
  pointer-events: none !important;
}

.mfrs-scifi-options-title {
  color: #66ccff !important;
  font-family: "Noto Serif SC", "SimSun", serif !important;
  font-size: 17px !important;
  font-weight: 800 !important;
  letter-spacing: 3px !important;
  text-shadow: 0 0 8px rgba(140,20,20,0.5) !important;
  border-bottom: 1px solid #1a3a5c !important;
  padding-bottom: 10px !important;
  margin-bottom: 14px !important;
  text-align: center !important;
  position: relative !important;
}

.mfrs-scifi-options-title::before {
  content: '◆' !important;
  position: absolute !important;
  left: 0 !important;
  color: #00ffaa !important;
  font-size: 14px !important;
}

.mfrs-scifi-options-title::after {
  content: '◇' !important;
  position: absolute !important;
  right: 0 !important;
  color: #00ffaa !important;
  font-size: 14px !important;
}

.mfrs-scifi-options-body {
  color: #e0eaf8 !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 14px !important;
  line-height: 1.9 !important;
  white-space: pre-wrap !important;
  font-weight: 300 !important;
  letter-spacing: 0.5px !important;
}

.mfrs-scifi-panel {
  background: #0a1230 !important;
  border: 1px solid #1a3a5c !important;
  padding: 0 !important;
  margin: 18px auto !important;
  max-width: 480px !important;
  position: relative !important;
  box-shadow: 0 0 22px rgba(0,0,0,0.45), inset 0 0 22px rgba(10,30,60,0.28), 0 0 8px rgba(30,70,140,0.14) !important;
  border-radius: 2px !important;
  overflow: hidden !important;
}

.mfrs-scifi-panel-title {
  color: #66ccff !important;
  font-family: "Noto Serif SC", "SimSun", serif !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  letter-spacing: 4px !important;
  text-shadow: 0 0 10px rgba(140,20,20,0.6) !important;
  text-align: center !important;
}

.mfrs-scifi-panel-text {
  color: #c0d8f0 !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 13px !important;
  line-height: 2 !important;
  white-space: pre-wrap !important;
  font-weight: 300 !important;
  letter-spacing: 0.8px !important;
}

#mfrs-welcome-root .mfrs-dropdown,
.custom-mfrs-welcome-root .mfrs-dropdown {
  position: relative !important;
  grid-column: 1 / -1 !important;
  width: 100% !important;
  min-width: 0 !important;
}

#mfrs-welcome-root .mfrs-dropdown-trigger,
.custom-mfrs-welcome-root .mfrs-dropdown-trigger {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  min-height: 48px !important;
  padding: 12px 14px !important;
  border: 1px solid var(--mfrs-cyan, #00ffaa) !important;
  border-radius: 2px !important;
  background:
    repeating-linear-gradient(0deg, rgba(222,212,189,.018) 0 1px, transparent 1px 4px),
    #101311 !important;
  color: var(--mfrs-text, #e8f4ff) !important;
  cursor: pointer !important;
  font: inherit !important;
}

#mfrs-welcome-root .mfrs-dropdown-trigger:hover,
.custom-mfrs-welcome-root .mfrs-dropdown-trigger:hover {
  border-color: var(--mfrs-neon, #66ccff) !important;
  background: rgba(95, 143, 134, .08) !important;
}

#mfrs-welcome-root .mfrs-dropdown-display,
.custom-mfrs-welcome-root .mfrs-dropdown-display {
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

#mfrs-welcome-root .mfrs-dropdown-arrow,
.custom-mfrs-welcome-root .mfrs-dropdown-arrow {
  flex: 0 0 auto !important;
  color: var(--mfrs-neon, #66ccff) !important;
  font-size: 12px !important;
  transition: transform .2s ease !important;
}

#mfrs-welcome-root .mfrs-dropdown.is-open .mfrs-dropdown-arrow,
.custom-mfrs-welcome-root .mfrs-dropdown.is-open .mfrs-dropdown-arrow {
  transform: rotate(180deg) !important;
}

#mfrs-welcome-root .mfrs-dropdown-menu,
.custom-mfrs-welcome-root .mfrs-dropdown-menu {
  display: none !important;
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  top: calc(100% + 8px) !important;
  max-height: min(420px, 62vh) !important;
  overflow-y: auto !important;
  border: 1px solid var(--mfrs-cyan, #00ffaa) !important;
  border-radius: 2px !important;
  background:
    repeating-linear-gradient(0deg, rgba(222,212,189,.018) 0 1px, transparent 1px 4px),
    #0b0d0c !important;
  box-shadow: 0 16px 42px rgba(0,0,0,.68) !important;
  z-index: 1000 !important;
}

#mfrs-welcome-root .mfrs-dropdown.is-open .mfrs-dropdown-menu,
.custom-mfrs-welcome-root .mfrs-dropdown.is-open .mfrs-dropdown-menu {
  display: block !important;
}

#mfrs-welcome-root .mfrs-dropdown-group,
.custom-mfrs-welcome-root .mfrs-dropdown-group {
  border-bottom: 1px solid rgba(156, 120, 74, .24) !important;
}

#mfrs-welcome-root .mfrs-dropdown-group-title,
.custom-mfrs-welcome-root .mfrs-dropdown-group-title,
#mfrs-welcome-root .mfrs-dropdown-chapter-title,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter-title {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
  width: 100% !important;
  min-height: 44px !important;
  border: 0 !important;
  border-radius: 0 !important;
  text-align: left !important;
  cursor: pointer !important;
  font: inherit !important;
  transition: background .2s ease, color .2s ease !important;
}

#mfrs-welcome-root .mfrs-dropdown-group-title,
.custom-mfrs-welcome-root .mfrs-dropdown-group-title {
  padding: 13px 16px !important;
  color: var(--mfrs-neon, #66ccff) !important;
  background: rgba(95, 143, 134, .07) !important;
  font-weight: 900 !important;
  font-size: 14px !important;
}

#mfrs-welcome-root .mfrs-dropdown-chapter-title,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter-title {
  padding: 11px 16px 11px 26px !important;
  color: var(--mfrs-text, #e8f4ff) !important;
  background: rgba(222, 212, 189, .025) !important;
  border-top: 1px solid rgba(156, 120, 74, .18) !important;
  font-size: 13px !important;
  font-weight: 800 !important;
}

#mfrs-welcome-root .mfrs-dropdown-group-title::after,
.custom-mfrs-welcome-root .mfrs-dropdown-group-title::after,
#mfrs-welcome-root .mfrs-dropdown-chapter-title::after,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter-title::after {
  content: '▾' !important;
  color: var(--mfrs-cyan, #00ffaa) !important;
  font-size: 12px !important;
  transition: transform .2s ease !important;
}

#mfrs-welcome-root .mfrs-dropdown-group.is-open > .mfrs-dropdown-group-title::after,
.custom-mfrs-welcome-root .mfrs-dropdown-group.is-open > .mfrs-dropdown-group-title::after,
#mfrs-welcome-root .mfrs-dropdown-chapter.is-open > .mfrs-dropdown-chapter-title::after,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter.is-open > .mfrs-dropdown-chapter-title::after {
  transform: rotate(180deg) !important;
}

#mfrs-welcome-root .mfrs-dropdown-group-body,
.custom-mfrs-welcome-root .mfrs-dropdown-group-body,
#mfrs-welcome-root .mfrs-dropdown-chapter-body,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter-body {
  display: none !important;
}

#mfrs-welcome-root .mfrs-dropdown-group.is-open > .mfrs-dropdown-group-body,
.custom-mfrs-welcome-root .mfrs-dropdown-group.is-open > .mfrs-dropdown-group-body,
#mfrs-welcome-root .mfrs-dropdown-chapter.is-open > .mfrs-dropdown-chapter-body,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter.is-open > .mfrs-dropdown-chapter-body {
  display: block !important;
}

#mfrs-welcome-root .mfrs-dropdown-item,
.custom-mfrs-welcome-root .mfrs-dropdown-item {
  padding: 10px 16px 10px 40px !important;
  min-height: 44px !important;
  color: var(--mfrs-text, #e8f4ff) !important;
  cursor: pointer !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
}

#mfrs-welcome-root .mfrs-dropdown-item:hover,
.custom-mfrs-welcome-root .mfrs-dropdown-item:hover {
  background: rgba(95, 143, 134, .09) !important;
}

#mfrs-welcome-root .mfrs-dropdown-item-name,
.custom-mfrs-welcome-root .mfrs-dropdown-item-name,
#mfrs-welcome-root .mfrs-dropdown-item-meta,
.custom-mfrs-welcome-root .mfrs-dropdown-item-meta {
  display: block !important;
}

#mfrs-welcome-root .mfrs-dropdown-item-name,
.custom-mfrs-welcome-root .mfrs-dropdown-item-name {
  font-weight: 700 !important;
}

#mfrs-welcome-root .mfrs-dropdown-item-meta,
.custom-mfrs-welcome-root .mfrs-dropdown-item-meta {
  margin-top: 3px !important;
  color: #82928b !important;
  font-size: 12px !important;
}

#mfrs-welcome-root .mfrs-dropdown-trigger:focus-visible,
.custom-mfrs-welcome-root .mfrs-dropdown-trigger:focus-visible,
#mfrs-welcome-root .mfrs-dropdown-group-title:focus-visible,
.custom-mfrs-welcome-root .mfrs-dropdown-group-title:focus-visible,
#mfrs-welcome-root .mfrs-dropdown-chapter-title:focus-visible,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter-title:focus-visible,
#mfrs-welcome-root .mfrs-dropdown-item:focus-visible,
.custom-mfrs-welcome-root .mfrs-dropdown-item:focus-visible {
  outline: 2px solid var(--mfrs-neon, #66ccff) !important;
  outline-offset: -3px !important;
}

.mfrs-choice-list {
  display: grid !important;
  gap: 10px !important;
}

.mfrs-choice-legend {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-bottom: 6px !important;
  font-size: 11px !important;
  color: #a8c4e0 !important;
  letter-spacing: 0.05em !important;
}

.mfrs-choice-legend-item {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 2px 8px !important;
  border: 1px solid rgba(60,120,200,.5) !important;
  border-radius: 999px !important;
  background: rgba(8,20,40,.65) !important;
}

.mfrs-choice-legend-dot {
  display: inline-block !important;
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
}

.mfrs-choice-button {
  width: 100% !important;
  text-align: left !important;
  background: rgba(34,23,23,.9) !important;
  border: 1px solid rgba(60,120,200,.72) !important;
  border-left: 3px solid #1a6bb8 !important;
  color: #e8f4ff !important;
  padding: 10px 12px !important;
  cursor: pointer !important;
  font: inherit !important;
  line-height: 1.65 !important;
  box-shadow: inset 0 0 14px rgba(0,0,0,.2) !important;
  position: relative !important;
  border-radius: 0 !important;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px) !important;
  filter: drop-shadow(0 6px 12px rgba(70,140,220,.5)) drop-shadow(0 12px 24px rgba(70,140,220,.35)) drop-shadow(0 20px 48px rgba(70,140,220,.2)) !important;
  transition: filter 0.25s ease, color 0.25s ease !important;
}

.mfrs-choice-button[data-risk="high"] { border-left-color: #2a7bc8 !important; filter: drop-shadow(0 6px 12px rgba(80,150,230,.5)) drop-shadow(0 12px 24px rgba(80,150,230,.35)) drop-shadow(0 20px 48px rgba(80,150,230,.2)) !important; }
.mfrs-choice-button[data-risk="mid"] { border-left-color: #00b88a !important; filter: drop-shadow(0 6px 12px rgba(0,200,150,.5)) drop-shadow(0 12px 24px rgba(0,200,150,.35)) drop-shadow(0 20px 48px rgba(0,200,150,.2)) !important; }
.mfrs-choice-button[data-risk="low"] { border-left-color: #38a878 !important; filter: drop-shadow(0 6px 12px rgba(50,180,130,.5)) drop-shadow(0 12px 24px rgba(50,180,130,.35)) drop-shadow(0 20px 48px rgba(50,180,130,.2)) !important; }
.mfrs-choice-button[data-risk="unknown"] { border-left-color: #7080b0 !important; filter: drop-shadow(0 6px 12px rgba(120,130,170,.5)) drop-shadow(0 12px 24px rgba(120,130,170,.35)) drop-shadow(0 20px 48px rgba(120,130,170,.2)) !important; }

.mfrs-choice-risk {
  display: inline-block !important;
  margin-left: 6px !important;
  padding: 1px 6px !important;
  border-radius: 4px !important;
  font-size: 10px !important;
  letter-spacing: 0.05em !important;
  vertical-align: middle !important;
}
.mfrs-choice-button[data-risk="high"] .mfrs-choice-risk { background: rgba(50,160,240,.18) !important; color: #66ccff !important; }
.mfrs-choice-button[data-risk="mid"] .mfrs-choice-risk { background: rgba(0,200,150,.18) !important; color: #e7b070 !important; }
.mfrs-choice-button[data-risk="low"] .mfrs-choice-risk { background: rgba(50,180,130,.18) !important; color: #aac57a !important; }
.mfrs-choice-button[data-risk="unknown"] .mfrs-choice-risk { background: rgba(120,130,170,.18) !important; color: #c0a0c0 !important; }

.mfrs-choice-button:hover {
  color: #d0e8ff !important;
  border-color: #1a6bb8 !important;
  box-shadow: 0 0 14px rgba(150,45,45,.22), inset 0 0 14px rgba(0,0,0,.18) !important;
  filter: drop-shadow(0 8px 16px rgba(80,150,230,.65)) drop-shadow(0 16px 32px rgba(80,150,230,.45)) drop-shadow(0 28px 64px rgba(80,150,230,.3)) !important;
}

.mfrs-choice-button[data-risk="high"]:hover { filter: drop-shadow(0 8px 16px rgba(80,150,230,.65)) drop-shadow(0 16px 32px rgba(80,150,230,.45)) drop-shadow(0 28px 64px rgba(80,150,230,.3)) !important; }
.mfrs-choice-button[data-risk="mid"]:hover { filter: drop-shadow(0 8px 16px rgba(0,200,150,.65)) drop-shadow(0 16px 32px rgba(0,200,150,.45)) drop-shadow(0 28px 64px rgba(0,200,150,.3)) !important; }
.mfrs-choice-button[data-risk="low"]:hover { filter: drop-shadow(0 8px 16px rgba(50,180,130,.65)) drop-shadow(0 16px 32px rgba(50,180,130,.45)) drop-shadow(0 28px 64px rgba(50,180,130,.3)) !important; }
.mfrs-choice-button[data-risk="unknown"]:hover { filter: drop-shadow(0 8px 16px rgba(120,130,170,.65)) drop-shadow(0 16px 32px rgba(120,130,170,.45)) drop-shadow(0 28px 64px rgba(120,130,170,.3)) !important; }

.mfrs-choice-key {
  color: #5ab0ff !important;
  font-weight: 800 !important;
  margin-right: 8px !important;
}

.mfrs-choice-item {
  display: block !important;
}
.mfrs-choice-item .mfrs-choice-button {
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px) !important;
}
.mfrs-choice-item:has(> .mfrs-choice-why) .mfrs-choice-button {
  clip-path: polygon(8px 0, 100% 0, 100% 100%, calc(100% - 8px) 100%, 0 100%, 0 8px) !important;
}
.mfrs-choice-why {
  border: 1px solid rgba(60,120,200,.5) !important;
  border-top: none !important;
  background: rgba(20,12,12,.66) !important;
  overflow: hidden !important;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px)) !important;
}
.mfrs-choice-why > summary {
  cursor: pointer !important;
  list-style: none !important;
  padding: 6px 12px !important;
  font-size: 11px !important;
  color: #88a8d0 !important;
  letter-spacing: 0.06em !important;
}
.mfrs-choice-why > summary::-webkit-details-marker { display: none !important; }
.mfrs-choice-why > summary::before { content: '▸ 抉择分析' !important; }
.mfrs-choice-why[open] > summary::before { content: '▾ 抉择分析' !important; }
.mfrs-choice-why > summary:hover { color: #8acaff !important; }
.mfrs-choice-why-body {
  padding: 4px 12px 10px !important;
  border-top: 1px solid rgba(60,120,200,.28) !important;
}
.mfrs-choice-why-row {
  font-size: 12px !important;
  line-height: 1.7 !important;
  color: #a8c4e0 !important;
}
.mfrs-choice-why-key {
  display: inline-block !important;
  min-width: 4.5em !important;
  margin-right: 6px !important;
  font-weight: 700 !important;
  color: #88a8d0 !important;
}
.mfrs-choice-why-key.is-high { color: #ff6b6b !important; }
.mfrs-choice-why-key.is-mid { color: #66ccff !important; }
/* 正文档案：深蓝科幻直角青蓝线框与左侧装订线 */
.mfrs-msg-narrative-wrapper {
  position: relative !important;
  color: var(--mfrs-text) !important;
  background:
    repeating-linear-gradient(0deg, rgba(200,192,174,0.016) 0 1px, transparent 1px 4px),
    linear-gradient(90deg, transparent 0 14px, rgba(61,107,102,0.06) 14px 15px, transparent 15px),
    linear-gradient(115deg, rgba(61,107,102,0.05), transparent 28%),
    rgba(8,10,10,0.96) !important;
  border: 1px solid var(--mfrs-neon) !important;
  border-radius: 0 !important;
  padding: 18px 22px 17px 30px !important;
  margin-bottom: 16px !important;
  box-shadow:
    0 7px 18px rgba(0,0,0,0.34),
    inset 0 0 26px rgba(0,0,0,0.46),
    inset 0 0 0 1px rgba(61,107,102,0.12) !important;
  overflow: hidden !important;
  line-height: 1.9 !important;
}
.mfrs-msg-narrative-wrapper::before {
  content: '' !important;
  position: absolute !important;
  top: 10px !important;
  bottom: 10px !important;
  left: 14px !important;
  width: 1px !important;
  pointer-events: none !important;
  z-index: 0 !important;
  background: repeating-linear-gradient(180deg, var(--mfrs-neon) 0 5px, transparent 5px 10px) !important;
  box-shadow: 4px 0 0 rgba(61,107,102,0.12) !important;
  opacity: 0.48 !important;
}
.mfrs-msg-narrative-wrapper::after {
  content: '' !important;
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  top: -12% !important;
  height: 18% !important;
  pointer-events: none !important;
  z-index: 2 !important;
  opacity: 0 !important;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in srgb, var(--mfrs-deep) 35%, transparent) 45%,
    color-mix(in srgb, var(--mfrs-cyan) 40%, transparent) 50%,
    color-mix(in srgb, var(--mfrs-deep) 35%, transparent) 55%,
    transparent 100%
  ) !important;
}
.mfrs-msg-narrative-wrapper > * {
  position: relative !important;
  z-index: 1 !important;
}
.mes.last_mes[is_user="false"] .mfrs-msg-narrative-wrapper {
  animation: mfrs-frame-breathe 4.2s ease-in-out infinite !important;
}
.mes.last_mes[is_user="false"] .mfrs-msg-narrative-wrapper::before {
  animation: mfrs-grid-pulse 5s ease-in-out infinite !important;
}
.mes.last_mes[is_user="false"] .mfrs-msg-narrative-wrapper::after {
  opacity: 0.45 !important;
  animation: mfrs-scan-h 9s linear infinite !important;
}
@keyframes mfrs-frame-breathe {
  0%, 100% {
    box-shadow:
      0 7px 18px rgba(0,0,0,0.34),
      inset 0 0 26px rgba(0,0,0,0.46),
      inset 0 0 0 1px rgba(61,107,102,0.12) !important;
  }
  50% {
    box-shadow:
      0 8px 20px rgba(0,0,0,0.38),
      inset 0 0 28px rgba(0,0,0,0.5),
      inset 0 0 0 1px rgba(61,107,102,0.22),
      0 0 10px rgba(107,42,38,0.08) !important;
  }
}
@keyframes mfrs-grid-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
@keyframes mfrs-scan-h {
  0% { top: -12%; }
  100% { top: 110%; }
}
@media (prefers-reduced-motion: reduce) {
  .mfrs-msg-narrative-wrapper,
  .mfrs-msg-narrative-wrapper::before,
  .mfrs-msg-narrative-wrapper::after,
  .mes.last_mes[is_user="false"] .mfrs-msg-narrative-wrapper,
  .mes.last_mes[is_user="false"] .mfrs-msg-narrative-wrapper::before,
  .mes.last_mes[is_user="false"] .mfrs-msg-narrative-wrapper::after {
    animation: none !important;
  }
  .mfrs-msg-narrative-wrapper::after { opacity: 0 !important; }
}`;
  const hostDocument = getHostDocument();
  const hostWindow = hostDocument.defaultView as HostWindowWithThemeCleanup | null;
  hostWindow?.__mfrsMjrThemeCleanup__?.();

  const hostStyle = hostDocument.createElement('style');
  hostStyle.id = style.id;
  hostStyle.textContent = style.textContent;

  const ensureStyleMounted = () => {
    const current = hostDocument.getElementById(style.id);
    if (current && current !== hostStyle) {
      current.remove();
    }
    if (!hostStyle.isConnected || hostStyle.parentElement !== hostDocument.head) {
      hostDocument.head.appendChild(hostStyle);
    }
  };

  ensureStyleMounted();

  const HostMutationObserver = hostDocument.defaultView?.MutationObserver ?? MutationObserver;
  const observer = new HostMutationObserver(ensureStyleMounted);
  observer.observe(hostDocument.head, { childList: true });



  const MFRS_INLINE_PROTOCOL_TAG_PATTERN =
    /<\/?\s*(?:choices|sp_[a-z_]+|mfrs_[a-z_]+|UpdateVariable|JSONPatch|Analysis)\b/i;

  const hideRawProtocolParagraphs = () => {
    const protocolPattern =
      /<UpdateVariable|<\/UpdateVariable|<JSONPatch|<\/JSONPatch|StatusPlaceHolderImpl|myactivity\.google\.com\/product\/gemini|No\.7 High School setting locked|"\s*op\s*"\s*:\s*"\s*replace\s*"/;
    hostDocument.querySelectorAll<HTMLElement>('.mes_text p:not([data-mfrs-protocol-hidden])').forEach(paragraph => {
      const text = paragraph.innerText || paragraph.textContent || '';
      if (!protocolPattern.test(text) && !MFRS_INLINE_PROTOCOL_TAG_PATTERN.test(text)) return;
      paragraph.dataset.mfrsProtocolHidden = 'true';
      paragraph.hidden = true;
      paragraph.setAttribute('aria-hidden', 'true');
      paragraph.style.display = 'none';
    });
  };


  const fillWelcomeStart = (root: HTMLElement) => {
    // 魔法禁书目录模拟器·开局设定生成（对齐 schema.ts 字段与 JSONPatch 合法路径）
    const getValue = (selector: string) =>
      root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)?.value.trim() ?? '';
    const getSelectedCamp = () => {
      const card = root.querySelector<HTMLElement>('.mfrs-camp-card.is-selected');
      return card?.dataset.camp ?? '';
    };
    const getSelectedLevel = (camp: string) => {
      const containerId = camp === '科学侧' ? '#mfrs-level-science' : camp === '魔法侧' ? '#mfrs-level-magic' : '';
      if (!containerId) return '';
      const btn = root.querySelector<HTMLElement>(`${containerId} .mfrs-level-btn.is-selected`);
      return btn?.dataset.level ?? '';
    };
    const name = getValue('#mfrs-name');
    const gender = getValue('#mfrs-gender');
    const age = getValue('#mfrs-age');
    if (!name || !gender || !age) {
      hostWindow?.toastr?.warning?.('请填写姓名、性别与年龄', '魔法禁书目录');
      return;
    }
    const camp = getSelectedCamp();
    if (!camp) {
      hostWindow?.toastr?.warning?.('请选择阵营（科学侧或魔法侧）', '魔法禁书目录');
      return;
    }
    const personality = getValue('#mfrs-personality');
    const appearance = getValue('#mfrs-appearance');
    const background = getValue('#mfrs-background');
    const levelOrRank = getSelectedLevel(camp);
    let identity = '';
    let abilityName = '';
    let abilityDesc = '';
    let campDetail = '';
    if (camp === '科学侧') {
      identity = getValue('#mfrs-identity-science');
      const school = getValue('#mfrs-school');
      abilityName = getValue('#mfrs-ability-name-science');
      abilityDesc = getValue('#mfrs-ability-desc-science');
      campDetail = school ? `所属学校：${school}` : '';
    } else {
      identity = getValue('#mfrs-identity-magic');
      const org = getValue('#mfrs-org');
      abilityName = getValue('#mfrs-ability-name-magic');
      abilityDesc = getValue('#mfrs-ability-desc-magic');
      campDetail = org ? `所属组织：${org}` : '';
    }
    const anchor = getValue('#mfrs-anchor-value') ||
      '未选择节点|由当前剧情节点决定||自定义阶段|由玩家背景决定事件强度|玩家只能获得所在地点、身份权限和已掌握情报允许的信息|按背景和已知信息限制剧透|';
    const anchorParts = anchor.split('|');
    const anchorName = anchorParts[0] || '未选择节点';
    const storyTime = anchorParts[1] || '由当前剧情节点决定';
    const storyLocation = anchorParts[2] || '由当前剧情节点决定';
    const storyPhase = anchorParts[3] || '未定阶段';
    const eventPressure = anchorParts[4] || '请根据身份与剧情节点判断接入边界';
    const visibleIntel = anchorParts[5] || '仅依据当前选择与背景设定';
    const spoilerBoundary = anchorParts[6] || '不得直接揭露后期角色身份与重大真相';
    const abilityLine = abilityName
      ? `   - 能力名称：${abilityName}（${levelOrRank || '未指定等级/位阶'}）\n   - 能力效果：${abilityDesc || '由AI依据设定与现场判定'}`
      : `   - 能力名称：未觉醒/未指定（${levelOrRank || '未指定等级/位阶'}）`;
    const message =
      `【魔法禁书目录·开局设定】\n\n` +
      `1. 基本信息\n` +
      `   - 姓名：${name}\n` +
      `   - 性别：${gender}\n` +
      `   - 年龄：${age}\n` +
      `   - 性格：${personality || '由AI依据身份与背景自行演绎'}\n` +
      `   - 外貌：${appearance || '由AI依据身份与背景自行演绎'}\n` +
      `   - 剧情节点：${anchorName}\n` +
      `   - 节点时间（仅叙事参考，勿写非法 MVU 路径）：${storyTime}\n` +
      `   - 开局地点：${storyLocation || '由当前剧情节点决定'}\n` +
      `   - 原著阶段：${storyPhase}\n` +
      `   - 事件强度：${eventPressure}\n` +
      `   - 玩家可见情报：${visibleIntel}\n` +
      `   - 禁止泄露边界：${spoilerBoundary}\n\n` +
      `2. 阵营与身份\n` +
      `   - 阵营：${camp}（本局锁定）\n` +
      `   - 身份：${identity || '未指定'}\n` +
      (campDetail ? `   - ${campDetail}\n` : '') +
      `3. 能力档案\n` +
      `${abilityLine}\n\n` +
      `4. 背景设定\n` +
      `   ${background || '无补充；由AI依据身份与原著阶段推演'}\n\n` +
      `5. 推演边界与初始化建议\n` +
      `   - 可见信息层级：请依据身份、背景、当前证据和剧情节点动态判断；没有证据时只给眼前现象、传闻或不确定推断。\n` +
      `   - JSONPatch 目标（合法路径）：/姓名、/性别、/年龄、/性格、/外貌、/开局地点、/所在位置、/原著阶段、/剧情锚点、/角色背景、/身份、/阵营、/能力档案、/剧情阶段、/势力关系/所属阵营、/势力关系/所属组织。勿发明 schema 不存在路径；节点时间只可写入叙事文本。\n` +
      `   - 建议初值：姓名=${name}；性别=${gender}；年龄=${age}；身份=${identity || '未指定'}；阵营=${camp}；开局地点/所在位置=${storyLocation || '由剧情节点决定'}；原著阶段=${storyPhase}；剧情锚点=${anchorName}；角色背景=表单背景或未指定；剧情阶段=序章。\n` +
      `   - 调查起点：从当前剧情节点的「序章/遭遇」切入，不直接跳到后期主线高潮或最终真相。\n` +
      `   - 能力判定：能力档案为玩家独有设定，对玩家自身按声明效果生效；若声明为 Level 6 绝对能力者、圣人、神之右席或魔神等高位阶，AI 可适度提高其强度但不自动无敌；原著中科学与魔法互斥，但玩家享有「主角光环豁免」可兼用两体系，科学与魔法自由混用、不设反噬与限制，偶尔的麻烦以搞笑受挫/出糗/体力透支呈现，不判死亡、不设数值惩罚。\n` +
      `   - 隐藏边界：后期角色真实身份、核心真相、幕后动机、终局走向只随剧情推进逐步揭示，不进入正文、状态栏或开局选项。`;
    const input = getSendTextarea(hostDocument);
    if (!input) return;
    setTextareaValue(input, message);
    hostWindow?.toastr?.info?.('已填入魔法禁书目录开局设定');
  };


  const welcomeRootSelector = '#mfrs-welcome-root, .mfrs-welcome-root, .custom-mfrs-welcome-root';
  const inWelcomeRoots = (childSelector: string) =>
    welcomeRootSelector
      .split(',')
      .map(selector => `${selector.trim()} ${childSelector}`)
      .join(', ');
  const isHostSelectElement = (element: Element | null): element is HTMLSelectElement => {
    if (!element || element.tagName !== 'SELECT') return false;
    const HostHTMLSelectElement = hostWindow?.HTMLSelectElement;
    return !HostHTMLSelectElement || element instanceof HostHTMLSelectElement || 'options' in element;
  };

  const setWelcomeAccordionOpen = (node: Element, titleSelector: string, open: boolean) => {
    node.classList.toggle('is-open', open);
    node.querySelector<HTMLElement>(`:scope > ${titleSelector}`)?.setAttribute('aria-expanded', String(open));
  };

  const closeSiblingAccordions = (node: HTMLElement, selector: string, titleSelector: string) => {
    Array.from(node.parentElement?.children ?? []).forEach(sibling => {
      if (sibling !== node && sibling.matches(selector)) setWelcomeAccordionOpen(sibling, titleSelector, false);
    });
  };

  type WelcomeAnchorOption = {
    group: string;
    chapter: string;
    name: string;
    time: string;
    loc: string;
    value: string;
  };

  const enhanceWelcomeAnchors = () => {
    hostDocument.querySelectorAll<Element>(inWelcomeRoots('select[data-mfrs="anchor"]')).forEach(element => {
      if (!isHostSelectElement(element)) return;
      const select = element;
      if (select.dataset.mfrsAnchorEnhanced === 'true') return;
      const root = select.closest<HTMLElement>(welcomeRootSelector);
      if (!root) return;
      const optionElements = Array.from(select.querySelectorAll<HTMLOptionElement>('option'));
      const options = optionElements
        .filter(option => option.value.trim())
        .map(option => {
          const parts = option.value.split('|');
          return {
            group: option.dataset.group || '剧情节点',
            chapter: option.dataset.chapter || '默认入口',
            name: option.dataset.name || parts[0] || option.textContent?.trim() || '未命名节点',
            time: option.dataset.time || parts[1] || '由当前剧情节点决定',
            loc: option.dataset.loc || parts[2] || '由当前剧情节点决定',
            value: option.value,
          };
        });
      if (!options.length) return;

      select.dataset.mfrsAnchorEnhanced = 'true';
      select.style.display = 'none';

      const dropdown = hostDocument.createElement('div');
      dropdown.className = 'mfrs-dropdown';
      dropdown.dataset.mfrsAnchorDropdown = 'true';

      const trigger = hostDocument.createElement('button');
      trigger.type = 'button';
      trigger.className = 'mfrs-dropdown-trigger';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-label', '选择剧情节点');

      const display = hostDocument.createElement('span');
      display.className = 'mfrs-dropdown-display';
      const selectedOption = optionElements.find(option => option.selected && option.value.trim());
      display.textContent = selectedOption ? selectedOption.textContent?.trim() || '选择剧情节点' : '选择剧情节点';
      trigger.appendChild(display);

      const arrow = hostDocument.createElement('span');
      arrow.className = 'mfrs-dropdown-arrow';
      arrow.textContent = '▾';
      trigger.appendChild(arrow);
      dropdown.appendChild(trigger);

      const menu = hostDocument.createElement('div');
      menu.className = 'mfrs-dropdown-menu';
      menu.setAttribute('role', 'listbox');
      const menuId = `mfrs-anchor-menu-${Array.from(hostDocument.querySelectorAll(inWelcomeRoots('select[data-mfrs="anchor"]'))).indexOf(select)}`;
      menu.id = menuId;
      trigger.setAttribute('aria-controls', menuId);

      const grouped = new Map<string, Map<string, WelcomeAnchorOption[]>>();
      options.forEach(option => {
        if (!grouped.has(option.group)) grouped.set(option.group, new Map());
        const chapters = grouped.get(option.group)!;
        if (!chapters.has(option.chapter)) chapters.set(option.chapter, []);
        chapters.get(option.chapter)!.push(option);
      });

      let groupIndex = 0;
      grouped.forEach((chapters, groupName) => {
        const groupDiv = hostDocument.createElement('div');
        groupDiv.className = 'mfrs-dropdown-group';
        if (groupIndex === 0) groupDiv.classList.add('is-open');

        const groupTitle = hostDocument.createElement('button');
        groupTitle.type = 'button';
        groupTitle.className = 'mfrs-dropdown-group-title';
        groupTitle.textContent = groupName;
        const groupBodyId = `${menuId}-group-${groupIndex}`;
        groupTitle.setAttribute('aria-controls', groupBodyId);
        groupTitle.setAttribute('aria-expanded', String(groupIndex === 0));
        groupTitle.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          closeSiblingAccordions(groupDiv, '.mfrs-dropdown-group', '.mfrs-dropdown-group-title');
          setWelcomeAccordionOpen(groupDiv, '.mfrs-dropdown-group-title', !groupDiv.classList.contains('is-open'));
        });
        groupDiv.appendChild(groupTitle);

        const groupBody = hostDocument.createElement('div');
        groupBody.className = 'mfrs-dropdown-group-body';
        groupBody.id = groupBodyId;

        let chapterIndex = 0;
        chapters.forEach((items, chapterName) => {
          const chapterDiv = hostDocument.createElement('div');
          chapterDiv.className = 'mfrs-dropdown-chapter';
          if (groupIndex === 0 && chapterIndex === 0) chapterDiv.classList.add('is-open');

          const chapterTitle = hostDocument.createElement('button');
          chapterTitle.type = 'button';
          chapterTitle.className = 'mfrs-dropdown-chapter-title';
          chapterTitle.textContent = chapterName;
          const chapterBodyId = `${groupBodyId}-chapter-${chapterIndex}`;
          chapterTitle.setAttribute('aria-controls', chapterBodyId);
          chapterTitle.setAttribute('aria-expanded', String(groupIndex === 0 && chapterIndex === 0));
          chapterTitle.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            closeSiblingAccordions(chapterDiv, '.mfrs-dropdown-chapter', '.mfrs-dropdown-chapter-title');
            setWelcomeAccordionOpen(
              chapterDiv,
              '.mfrs-dropdown-chapter-title',
              !chapterDiv.classList.contains('is-open'),
            );
          });
          chapterDiv.appendChild(chapterTitle);

          const chapterBody = hostDocument.createElement('div');
          chapterBody.className = 'mfrs-dropdown-chapter-body';
          chapterBody.id = chapterBodyId;

          items.forEach(item => {
            const itemDiv = hostDocument.createElement('div');
            itemDiv.className = 'mfrs-dropdown-item';
            itemDiv.setAttribute('role', 'option');
            itemDiv.setAttribute('aria-selected', String(select.value === item.value));
            itemDiv.tabIndex = 0;

            const nameSpan = hostDocument.createElement('span');
            nameSpan.className = 'mfrs-dropdown-item-name';
            nameSpan.textContent = item.name;
            itemDiv.appendChild(nameSpan);

            const metaSpan = hostDocument.createElement('span');
            metaSpan.className = 'mfrs-dropdown-item-meta';
            metaSpan.textContent = `${item.time} · ${item.loc || '自定义地点'}`;
            itemDiv.appendChild(metaSpan);

            const choose = () => {
              select.value = item.value;
              display.textContent = `${item.group} · ${item.chapter} · ${item.name}`;
              menu.querySelectorAll<HTMLElement>('[role="option"]').forEach(option => {
                option.setAttribute('aria-selected', String(option === itemDiv));
              });
              dropdown.classList.remove('is-open');
              trigger.setAttribute('aria-expanded', 'false');
              select.dispatchEvent(new Event('input', { bubbles: true }));
              select.dispatchEvent(new Event('change', { bubbles: true }));
              trigger.focus();
            };
            itemDiv.addEventListener('click', event => {
              event.preventDefault();
              event.stopPropagation();
              choose();
            });
            itemDiv.addEventListener('keydown', event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                choose();
                return;
              }
              if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
              const visibleOptions = Array.from(menu.querySelectorAll<HTMLElement>('[role="option"]')).filter(
                option => option.offsetParent !== null,
              );
              const currentIndex = visibleOptions.indexOf(itemDiv);
              const nextIndex =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? visibleOptions.length - 1
                    : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + visibleOptions.length) %
                      visibleOptions.length;
              event.preventDefault();
              visibleOptions[nextIndex]?.focus();
            });
            chapterBody.appendChild(itemDiv);
          });

          chapterDiv.appendChild(chapterBody);
          groupBody.appendChild(chapterDiv);
          chapterIndex += 1;
        });

        groupDiv.appendChild(groupBody);
        menu.appendChild(groupDiv);
        groupIndex += 1;
      });

      dropdown.appendChild(menu);
      select.insertAdjacentElement('afterend', dropdown);

      trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const willOpen = !dropdown.classList.contains('is-open');
        root
          .querySelectorAll<HTMLElement>('.mfrs-dropdown.is-open, .custom-mfrs-dropdown.is-open')
          .forEach(openDropdown => {
            if (openDropdown !== dropdown) openDropdown.classList.remove('is-open');
          });
        dropdown.classList.toggle('is-open', willOpen);
        trigger.setAttribute('aria-expanded', String(willOpen));
      });
      menu.addEventListener('click', event => event.stopPropagation());
      menu.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        dropdown.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      });
    });
  };



  // ===== 魔法禁书目录·开局页 data-act 交互（方案B：迁自 inline onclick，绕过 DOMPurify sanitize）=====
  // 背景：SillyTavern messageFormatting 用 DOMPurify MESSAGE_SANITIZE 模式处理消息 HTML，
  // 会移除 inline onclick 且给所有 class 加 custom- 前缀。原 inline onclick 方案因此全部失效。
  // 这里用事件委托（capture 阶段）接管开局页所有 data-act 点击，不依赖 inline 事件属性。
  // 注意：class 前缀化后元素 class 是 custom-mw-x custom-active/custom-selected/custom-show 等。
  // 脚本里 classList 操作必须用 custom- 前缀状态类（custom-selected/custom-active/custom-show/custom-locked/custom-open/custom-playing）
  // 才能与 DOMPurify 前缀化后的 CSS 选择器一致。

  const MFRS_WELCOME_DATA_ABILITY_DESC: Record<string, string> = {
    '幻想杀手':
      '右手触碰即消除一切异能（超能力+魔法+神迹），与生俱来非开发所得，无法被检测故测为Level 0；副作用是无意识消除好运，导致不幸缠身。魔法与科学两侧共同的钥匙。',
    '矢量操作':
      '控制一切矢量（力、速度、动能等有方向的量）。接触身体的矢量自动反射，只接收生存所需最低限度；可重力反转飞行、制造风暴、压缩空气成等离子体球、夺取地球自转能量发射。Level 5 第1位。',
    '未元物质':
      '创造世界上从一开始就不存在的物质，更改已存在物质的法则。背展六片白翼可飞行/防御/打击，反弹原子崩坏与超电磁炮；可无限增殖人体细胞量产未元物质。Level 5 第2位。',
    '超电磁炮':
      '发电系能力最高者。游戏币经电磁力以3倍音速射出贯穿楼房；雷击之枪最大10亿伏特；可召唤落雷、操纵地下铁沙成剑、移动含铁物质组盾、操纵电子仪器。Level 5 第3位。',
    '原子崩坏':
      '强制操纵介于波与粒子之间暧昧状况的电子，发射电子射线连同遮蔽物一起贯穿；暧昧电子撞击物体滞留形成拟似障壁护盾。单论破坏力在第三位之上，但难控准星故排第四。Level 5 第4位。',
    '心理掌握':
      '精神操控系最强，以液体/体液为切入点操控大脑。九大表现：行为控制、人格操作、记忆篡改、强制读心/自白、认知操作等；精密操纵十几人，赋予指令可操控三位数人。Level 5 第5位。',
    '念动炮弹':
      '世界最大原石（Gemstone，天生超能力者），能力正体不明连学园都市科学家都解释不了。不可视之力将10米外对手殴飞（自称强拳），可二倍音速移动、弹开子弹、随手拍落雷击。Level 5 第7位。',
  };

  const MFRS_WELCOME_DATA_MAGIC_DESC: Record<string, string> = {
    '符文魔法':
      '刻/贴在周围的带有力量的文字，写火焰符文即冒火；符文消失则魔法消失，施术者被打倒魔法亦消失。可召唤猎杀魔女之王（3000℃火焰巨人，符文内无限复活）、炎剑、闲人驱散。史提尔的招牌体系。',
    '蕾丝编织术式':
      '以钢丝勾勒魔法阵，发动切割与封印术式。招牌七闪操纵七条钢丝看不见的速度撕裂对手，一瞬间杀人七次故称瞬杀；唯闪用七天七刀在不同宗教术式间互补弱点，连天使也能切断。神裂火织的体系。',
    '灵装操作':
      '使用传导与增幅魔力的灵装（器具/装备）发动术式。灵装如阿斯卡隆圣剑（理论可斩50英尺恶龙）、伊西丝-德墨忒尔（操纵巨大植物藤蔓控制伦敦地下）。魔法师标配，损坏会失效。',
    '天使术式':
      '神之右席四人继承十字教四大天使性质，能用不完全威力的天使术式。如天罚术式（不限距离剥夺对己有敌意者的意识）、神圣之右（粉碎行星级力量）、光之处刑（改变事物优先顺序）。代价是无法使用普通魔法。',
    '魔道书解读':
      '解读记载术式与魔法知识的魔道书。奥索拉擅长魔法暗号解读；但《法之书》解读法实为陷阱，只会把解读者引入歧途。魔道书普通人阅读会精神崩溃，Index脑中存有103000册是各方争夺核心。',
  };

  // 选择器助手：开局页内 class 经 DOMPurify 前缀化为 custom-mw-x / custom-selected 等。
  // 优先用 #id 与 [data-act]（不被前缀化），class 操作显式带 custom- 前缀。
  const mfrsWelcomeStepMap: Record<string, string> = {
    side: '#secSide',
    science: '#chainScience',
    magic: '#chainMagic',
    opening: '#secOpening',
  };

  const mfrsWelcomeStep = (root: HTMLElement, step: string) => {
    const dynamicChain = root.dataset.side === 'science' ? '#chainScience' : '#chainMagic';
    const sel = step === 'chain' ? dynamicChain : mfrsWelcomeStepMap[step];
    if (!sel) return;
    const q = (s: string) => root.querySelector<HTMLElement>(s);
    const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
    // .mw-step 经前缀化后 class 变 custom-mw-step，用 [class~=custom-mw-step] 兼容
    qa('[class~="custom-mw-step"], [class~="mw-step"]').forEach(p => {
      p.classList.remove('custom-active', 'active');
      p.style.display = 'none';
    });
    const cur = q(sel);
    if (!cur) return;
    cur.classList.add('custom-active', 'active');
    cur.style.display = 'block';
    hostWindow?.setTimeout?.(() => cur.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const mfrsWelcomeOnly = (root: HTMLElement, selector: string, el: HTMLElement | null) => {
    Array.from(root.querySelectorAll<HTMLElement>(selector)).forEach(x => {
      x.classList.toggle('custom-selected', x === el);
      x.classList.toggle('selected', x === el); // 双写兼容未前缀化场景
    });
  };

  const mfrsWelcomeEventBadges = (root: HTMLElement) => {
    // 折叠态选中可见性：全量重算每个事件组的 data-has-selected 徽章（O(30)，选择变化时调用）
    Array.from(root.querySelectorAll<HTMLElement>('.custom-mw-event-group, .mw-event-group')).forEach(grp => {
      const has = !!grp.querySelector<HTMLElement>('[data-act="scene"].custom-selected, [data-act="scene"].selected');
      const btn = grp.querySelector<HTMLElement>('.custom-mw-event, .mw-event');
      if (!btn) return;
      if (has) btn.setAttribute('data-has-selected', '');
      else btn.removeAttribute('data-has-selected');
    });
  };

  const mfrsWelcomeToast = (root: HTMLElement, msg: string, type?: number | string) => {
    const toast = root.querySelector<HTMLElement>('.custom-mw-toast, .mw-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('custom-err', 'err', 'custom-ok', 'ok', 'custom-warn', 'warn');
    if (type === 1 || type === 'err') {
      toast.classList.add('custom-err', 'err');
    } else if (type === 2 || type === 'ok') {
      toast.classList.add('custom-ok', 'ok');
    } else if (type === 3 || type === 'warn') {
      toast.classList.add('custom-warn', 'warn');
    }
    toast.classList.add('custom-show', 'show');
    const w = hostWindow as (typeof window) | undefined;
    const prev = (root as HTMLElement & { _mfrsToastTimer?: number })._mfrsToastTimer;
    if (prev) w?.clearTimeout?.(prev);
    (root as HTMLElement & { _mfrsToastTimer?: number })._mfrsToastTimer = w?.setTimeout?.(() => {
      toast.classList.remove('custom-show', 'show');
    }, 2200) ?? 0;
  };

  const mfrsWelcomeValOf = (root: HTMLElement, sel: string) => {
    const el = root.querySelector<HTMLElement>(`${sel} [data-act="pick"].custom-selected, ${sel} [data-act="pick"].selected`);
    return el?.dataset.val ?? '';
  };

  const mfrsWelcomeValOrCustom = (root: HTMLElement, sel: string, btnId: string, inputId: string) => {
    const q = (s: string) => root.querySelector<HTMLElement>(s);
    const b = q(`#${btnId}`);
    if (b && (b.classList.contains('custom-selected') || b.classList.contains('selected'))) {
      const i = q(`#${inputId}`) as HTMLInputElement | null;
      return i?.value.trim() ?? '';
    }
    const p = root.querySelector<HTMLElement>(`${sel} [data-act="pick"].custom-selected, ${sel} [data-act="pick"].selected`);
    return p?.dataset.val ?? '';
  };

  const mfrsWelcomeCustomDesc = (root: HTMLElement, descId: string) => {
    const t = root.querySelector<HTMLTextAreaElement | HTMLInputElement>(`#${descId}`);
    return t?.value.trim() ?? '';
  };

  const mfrsWelcomeRefresh = (root: HTMLElement) => {
    const q = (s: string) => root.querySelector<HTMLElement>(s);
    const ok =
      root.dataset.side === 'science'
        ? mfrsWelcomeValOrCustom(root, '#optSchool', 'schoolCustomBtn', 'schoolCustomInput') &&
          mfrsWelcomeValOrCustom(root, '#optAbility', 'abilityCustomBtn', 'abilityCustomInput') &&
          !!root.querySelector<HTMLElement>('#optLevel [data-act="pick"].custom-selected, #optLevel [data-act="pick"].selected')
        : mfrsWelcomeValOrCustom(root, '#optOrg', 'orgCustomBtn', 'orgCustomInput') &&
          mfrsWelcomeValOrCustom(root, '#optMagic', 'magicCustomBtn', 'magicCustomInput') &&
          !!mfrsWelcomeValOf(root, '#optRealm');
    const so = q('#secOpening');
    if (so) {
      if (ok) {
        if (so.style.display === 'none') mfrsWelcomeStep(root, 'opening');
      } else {
        so.style.display = 'none';
      }
    }
    const sc = root.querySelector<HTMLElement>('#sceneList [data-act="scene"].custom-selected, #sceneList [data-act="scene"].selected');
    const customSel = q('#sceneCustomBtn');
    const customOn = customSel && (customSel.classList.contains('custom-selected') || customSel.classList.contains('selected'));
    const cu = customOn && (q('#sceneCustomInput') as HTMLInputElement | null)?.value.trim();
    const btn = q('#btnGenerate') as HTMLButtonElement | null;
    if (btn) btn.disabled = !(sc || cu);
    mfrsWelcomeEventBadges(root); // 选中变化后刷新事件折叠徽章
  };

  const handleMfrsWelcomeDataAct = async (root: HTMLElement, target: HTMLElement, event: Event) => {
    const q = (s: string) => root.querySelector<HTMLElement>(s);
    const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
    const D = target.dataset;
    event.preventDefault();
    event.stopPropagation();
    switch (D.act) {
      case 'tab': {
        qa('.custom-mw-page, .mw-page').forEach(p => {
          p.classList.remove('custom-active', 'active');
        });
        const pg = q('#page-' + D.page);
        if (pg) { pg.classList.add('custom-active', 'active'); }
        qa('[data-act="tab"]').forEach(b => {
          b.classList.toggle('custom-active', b === target);
          b.classList.toggle('active', b === target);
        });
        break;
      }
      case 'side': {
        root.dataset.side = D.side ?? '';
        qa('[data-act="side"]').forEach(c => {
          c.classList.toggle('custom-selected', c === target);
          c.classList.toggle('selected', c === target);
        });
        mfrsWelcomeStep(root, D.side ?? '');
        mfrsWelcomeRefresh(root);
        break;
      }
      case 'back': {
        mfrsWelcomeStep(root, D.to ?? '');
        if (D.to === 'side') {
          root.querySelectorAll<HTMLElement>('[class~="custom-mw-step"], [class~="mw-step"]').forEach(p => {
            if (p.dataset.step !== 'side') {
              p.querySelectorAll<HTMLElement>('.custom-selected, .selected').forEach(x => {
                x.classList.remove('custom-selected', 'selected');
              });
              p.querySelectorAll<HTMLElement>('.custom-mw-custom-box, .mw-custom-box').forEach(b => {
                (b as HTMLElement).style.display = 'none';
              });
              p.querySelectorAll<HTMLInputElement>('.custom-mw-custom-box input, .mw-custom-box input').forEach(i => {
                i.value = '';
              });
              p.querySelectorAll<HTMLElement>('.custom-locked, .locked').forEach(x => {
                x.classList.remove('custom-locked', 'locked');
              });
            }
          });
          const so = q('#secOpening');
          if (so) so.style.display = 'none';
        }
        break;
      }
      case 'pick': {
        const grp = target.closest<HTMLElement>('.custom-mw-opts, .mw-opts');
        if (!grp) break;
        mfrsWelcomeOnly(root, `#${grp.id} [data-act="pick"]`, target);
        const cb = grp.parentElement?.querySelector<HTMLElement>('.custom-mw-custom-box, .mw-custom-box');
        if (cb) cb.style.display = 'none';
        const cbBtn = grp.querySelector<HTMLElement>('[data-act="custom"]');
        if (cbBtn) { cbBtn.classList.remove('custom-selected', 'selected'); }
        let dp: HTMLElement | null = null;
        if (grp.id === 'optAbility') dp = q('#abilityDescPanel');
        else if (grp.id === 'optMagic') dp = q('#magicDescPanel');
        if (dp) {
          const table = grp.id === 'optAbility' ? MFRS_WELCOME_DATA_ABILITY_DESC : MFRS_WELCOME_DATA_MAGIC_DESC;
          const d = table[D.val ?? ''];
          if (d) {
            dp.innerHTML = `<div class="custom-mw-desc-title mw-desc-title">${D.val}</div><div class="custom-mw-desc-body mw-desc-body">${d}</div>`;
            dp.classList.add('custom-show', 'show');
          } else {
            dp.classList.remove('custom-show', 'show');
            dp.innerHTML = '';
          }
        }
        if (grp.id === 'optAbility') {
          if (D.val === '幻想杀手') {
            let lv0 = root.querySelector<HTMLElement>('#optLevel [data-act="pick"]');
            while (lv0 && !lv0.dataset.val?.startsWith('Level 0')) lv0 = lv0.nextElementSibling as HTMLElement | null;
            if (lv0) mfrsWelcomeOnly(root, '#optLevel [data-act="pick"]', lv0);
            qa('#optLevel [data-act="pick"]').forEach(x => {
              x.classList.toggle('custom-locked', x !== lv0);
              x.classList.toggle('locked', x !== lv0);
            });
            mfrsWelcomeToast(root, '幻想杀手：能力等级锁定 Level 0');
          } else {
            qa('#optLevel [data-act="pick"]').forEach(x => {
              x.classList.remove('custom-locked', 'locked');
            });
          }
        }
        mfrsWelcomeRefresh(root);
        break;
      }
      case 'custom': {
        const box = q(D.target ?? '');
        if (!box) break;
        const openNow = box.style.display !== 'block';
        box.style.display = openNow ? 'block' : 'none';
        target.classList.toggle('custom-selected', openNow);
        target.classList.toggle('selected', openNow);
        if (openNow) {
          const cgrp = target.closest<HTMLElement>('.custom-mw-opts, .mw-opts');
          if (cgrp) mfrsWelcomeOnly(root, `#${cgrp.id} [data-act="pick"]`, null);
          const ii = box.querySelector<HTMLInputElement>('input');
          if (ii) hostWindow?.setTimeout?.(() => ii.focus(), 60);
          if (cgrp) {
            let cdp: HTMLElement | null = null;
            if (cgrp.id === 'optAbility') cdp = q('#abilityDescPanel');
            else if (cgrp.id === 'optMagic') cdp = q('#magicDescPanel');
            if (cdp) { cdp.classList.remove('custom-show', 'show'); cdp.innerHTML = ''; }
          }
        }
        mfrsWelcomeRefresh(root);
        break;
      }
      case 'event': {
        // 事件折叠：互斥 + toggle（点击已展开的收起，允许全收起态）；不碰 .mw-scene 选中态（折叠是纯视觉）
        const group = target.closest<HTMLElement>('.custom-mw-event-group, .mw-event-group');
        if (!group) break;
        const wasOpen = group.classList.contains('custom-open') || group.classList.contains('open');
        qa('.custom-mw-event-group, .mw-event-group').forEach(g => {
          g.classList.remove('custom-open', 'open');
          const b = g.querySelector<HTMLElement>('.custom-mw-event, .mw-event');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          group.classList.add('custom-open', 'open');
          target.setAttribute('aria-expanded', 'true');
          // 展开后视口对齐：标题栏对齐到滚动容器可见位置
          hostWindow?.setTimeout?.(() => target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
        }
        break;
      }
      case 'scene': {
        mfrsWelcomeOnly(root, '#sceneList [data-act="scene"]', target);
        const btn = q('#sceneCustomBtn');
        if (btn) { btn.classList.remove('custom-selected', 'selected'); }
        const cbox = q('#sceneCustomBox');
        if (cbox) cbox.style.display = 'none';
        mfrsWelcomeRefresh(root);
        break;
      }
      case 'scenecustom': {
        const on = !target.classList.contains('custom-selected') && !target.classList.contains('selected');
        target.classList.toggle('custom-selected', on);
        target.classList.toggle('selected', on);
        if (on) {
          qa('#sceneList [data-act="scene"].custom-selected, #sceneList [data-act="scene"].selected').forEach(x => {
            x.classList.remove('custom-selected', 'selected');
          });
        }
        const cbox = q('#sceneCustomBox');
        if (cbox) cbox.style.display = on ? 'block' : 'none';
        if (on) hostWindow?.setTimeout?.(() => (q('#sceneCustomInput') as HTMLInputElement | null)?.focus(), 60);
        mfrsWelcomeRefresh(root);
        break;
      }
      case 'generate': {
        const gv = (id: string) => {
          const e = root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id);
          return e ? e.value.trim() : '';
        };
        const side = root.dataset.side;
        if (!side) { mfrsWelcomeToast(root, '请先选择阵营（科学侧或魔法侧）', 1); break; }
        const name = gv('#pName') || '未命名';
        const gender = ((q('#pGender') as HTMLInputElement | null)?.value ?? '').trim() || '未设定';
        const age = gv('#pAge') || '未知';
        const pers = gv('#pPersonality') || '未设定';
        const look = gv('#pLook') || '未描述';
        const supp = gv('#pSupplement');
        const sc = root.querySelector<HTMLElement>('#sceneList [data-act="scene"].custom-selected, #sceneList [data-act="scene"].selected');
        const sceneText = sc
          ? `【${sc.dataset.date} · ${sc.dataset.tag}】${sc.dataset.desc}`
          : (q('#sceneCustomInput') as HTMLTextAreaElement | null)?.value.trim() ?? '';
        if (!sceneText) { mfrsWelcomeToast(root, '请先选择一个开场白', 1); break; }
        const school = mfrsWelcomeValOrCustom(root, '#optSchool', 'schoolCustomBtn', 'schoolCustomInput') || '未选择学校';
        const ability = mfrsWelcomeValOrCustom(root, '#optAbility', 'abilityCustomBtn', 'abilityCustomInput') || '未选择能力';
        const levelEl = root.querySelector<HTMLElement>('#optLevel [data-act="pick"].custom-selected, #optLevel [data-act="pick"].selected');
        const level = levelEl?.dataset.val ?? '未选择等级';
        const org = mfrsWelcomeValOrCustom(root, '#optOrg', 'orgCustomBtn', 'orgCustomInput') || '未选择组织';
        const magic = mfrsWelcomeValOrCustom(root, '#optMagic', 'magicCustomBtn', 'magicCustomInput') || '未选择魔法';
        const realm = mfrsWelcomeValOf(root, '#optRealm') || '未选择境界';
        const schoolD = mfrsWelcomeCustomDesc(root, 'schoolDescInput');
        const abilityD = mfrsWelcomeCustomDesc(root, 'abilityDescInput');
        const orgD = mfrsWelcomeCustomDesc(root, 'orgDescInput');
        const magicD = mfrsWelcomeCustomDesc(root, 'magicDescInput');
        const L = ['【玩家信息】', '姓名：' + name, '性别：' + gender, '年龄：' + age + '岁', '性格：' + pers, '外貌：' + look];
        if (supp) L.push('补充设定：' + supp);
        if (side === 'science') {
          L.push('阵营：科学侧（学园都市）', '就读学校：' + school + (schoolD ? '（' + schoolD + '）' : ''), '超能力：' + ability + (abilityD ? '（' + abilityD + '）' : ''), '能力等级：' + level);
        } else {
          L.push('阵营：魔法侧', '隶属组织：' + org + (orgD ? '（' + orgD + '）' : ''), '魔法术式：' + magic + (magicD ? '（' + magicD + '）' : ''), '魔法境界：' + realm);
        }
        L.push('', '【开场白】', sceneText);
        const cfg = L.join('\n');
        // 开局基线：由脚本直接写入聊天变量，不依赖模型协议块（变量基线兜底层）
        const isScienceSide = side === 'science';
        const mfrsBaseline: Record<string, unknown> = {
          姓名: name,
          性别: gender,
          年龄: age + '岁',
          性格: pers,
          外貌: look,
          阵营: isScienceSide ? '科学侧（学园都市）' : '魔法侧',
          身份:
            supp ||
            (isScienceSide
              ? school && school !== '未选择学校'
                ? school + '学生'
                : ''
              : org && org !== '未选择组织'
                ? org + '成员'
                : ''),
          能力档案: [
            {
              能力名称: (isScienceSide ? ability : magic) || '未觉醒',
              阵营类型: isScienceSide ? '超能力' : '术式',
              等级或位阶: (isScienceSide ? level : realm) || '未指定',
              能力效果: (isScienceSide ? abilityD : magicD) || '依设定与剧情判定',
              是否稳定: true,
              实战运用: '随剧情展开；战斗与日常分别描述',
            },
          ],
        };
        // hotfix-01：不在开局表单阻塞等待 AI 生成（原逻辑最多卡 25 秒，影响开局动线）。
        // 占位符照常进基线，由楼层守卫 mfrsFixAbilityPlaceholders 在第一轮回复后后台补写。
        {
          const userEffect = ((isScienceSide ? abilityD : magicD) || '').trim();
          if (!userEffect) {
            const thProbe = mfrsGetTH();
            if (!thProbe?.generateRaw) {
              mfrsWelcomeToast(root, '当前环境不支持 AI 生成，建议手填能力描述', 2);
            }
          }
        }
        (root as HTMLElement & { _pendingCfg?: string; _pendingBaseline?: Record<string, unknown> })._pendingBaseline =
          mfrsBaseline;
        (root as HTMLElement & { _pendingCfg?: string })._pendingCfg = cfg;
        const cfgOut = q('#cfgOut') as HTMLTextAreaElement | null;
        if (cfgOut) cfgOut.value = cfg;
        const mask = q('#copyMask');
        if (mask) mask.classList.add('custom-open', 'open');
        mfrsWelcomeToast(root, '已生成配置，请预览确认', 2);
        break;
      }
      case 'confirmcfg': {
        const cfg2 = (root as HTMLElement & { _pendingCfg?: string })._pendingCfg;
        if (!cfg2) break;
        try {
          const input = getSendTextarea(hostDocument);
          if (!input) throw new Error('no textarea');
          setTextareaValue(input, cfg2);
          const pendingBaseline = (root as HTMLElement & { _pendingBaseline?: Record<string, unknown> })._pendingBaseline;
          if (pendingBaseline) {
            const stored = mfrsSetChatBaseline(pendingBaseline);
            mfrsWelcomeToast(
              root,
              stored ? '开局配置已填入发送框，基线已落盘，点击发送开始冒险！' : '开局配置已填入发送框，点击发送开始冒险！（基线落盘失败，将依赖模型协议初始化）',
              stored ? 2 : 1,
            );
          } else {
            mfrsWelcomeToast(root, '开局配置已填入发送框，点击发送开始冒险！', 2);
          }
          const mask = q('#copyMask');
          if (mask) mask.classList.remove('custom-open', 'open');
        } catch {
          mfrsWelcomeToast(root, '填入发送框失败，请复制后手动粘贴', 1);
        }
        break;
      }
      case 'copycfg': {
        const ta = q('#cfgOut') as HTMLTextAreaElement | null;
        if (ta) {
          ta.focus();
          ta.select();
          try { hostDocument.execCommand('copy'); mfrsWelcomeToast(root, '已复制到剪贴板', 2); } catch { /* noop */ }
        }
        break;
      }
      case 'char': {
        const mFace = q('#mFace');
        if (mFace) {
          const fb = D.init || (D.name ?? '').slice(0, 1);
          const imgFile = typeof D.img === 'string' ? D.img : '';
          const safeImg = /^[a-z0-9]+_v2\.webp$/.test(imgFile) ? imgFile : '';
          if (safeImg) {
            let img = mFace.querySelector('img');
            if (!img) {
              mFace.textContent = '';
              const fbSpan = hostDocument.createElement('span');
              fbSpan.className = 'mw-fallback custom-mw-fallback';
              fbSpan.textContent = fb;
              const newImg = hostDocument.createElement('img');
              newImg.decoding = 'async';
              newImg.alt = D.name ?? '';
              mFace.appendChild(fbSpan);
              mFace.appendChild(newImg);
              img = newImg;
            }
            img.src = 'https://testingcf.jsdelivr.net/gh/linlangliehu/mfrs-img@d86c74d/' + safeImg;
          } else {
            mFace.textContent = fb;
          }
        }
        const mName = q('#mName'); if (mName) mName.textContent = D.name ?? '';
        const mTag = q('#mTag'); if (mTag) mTag.textContent = D.tag ?? '';
        const mRows = q('#mRows');
        if (mRows) {
          // ST 渲染管线会把「」转换为 <q> 标签；属性值里的转换产物按字面剥离
          const cleanAttr = (s: string) => s.replace(/<\/?q>/g, '');
          const profileFields: Array<[string, string]> = [
            ['性别', cleanAttr(D.gender ?? '')],
            ['年龄', cleanAttr(D.age ?? '')],
            ['外貌', cleanAttr(D.look ?? '')],
            ['能力', cleanAttr(D.ability ?? '')],
            ['性格', cleanAttr(D.persona ?? '')],
            ['背景', cleanAttr(D.bg ?? '')],
          ];
          mRows.textContent = '';
          for (const [lab, val] of profileFields) {
            if (!val) continue;
            const row = hostDocument.createElement('div');
            row.className = 'mw-modal-row custom-mw-modal-row';
            const labEl = hostDocument.createElement('div');
            labEl.className = 'mw-modal-lab custom-mw-modal-lab';
            labEl.textContent = lab;
            const valEl = hostDocument.createElement('div');
            valEl.className = 'mw-modal-val custom-mw-modal-val';
            valEl.textContent = val;
            row.appendChild(labEl);
            row.appendChild(valEl);
            mRows.appendChild(row);
          }
        }
        const modal = q('#charModal'); if (modal) modal.classList.add('custom-open', 'open');
        break;
      }
      case 'modalclose': {
        const modal = q('#charModal'); if (modal) modal.classList.remove('custom-open', 'open');
        const mask = q('#copyMask'); if (mask) mask.classList.remove('custom-open', 'open');
        break;
      }
      case 'music': {
        const a = q('#bgm') as HTMLAudioElement | null;
        if (!a) break;
        if (a.paused) {
          a.play().then(() => target.classList.add('custom-playing', 'playing')).catch(() => mfrsWelcomeToast(root, '音频加载失败，请稍后重试', 1));
        } else {
          a.pause();
          target.classList.remove('custom-playing', 'playing');
        }
        break;
      }
    }
  };

  const handleWelcomeClick = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.mfrs-dropdown, .custom-mfrs-dropdown')) {
      hostDocument
        .querySelectorAll<HTMLElement>('.mfrs-dropdown.is-open, .custom-mfrs-dropdown.is-open')
        .forEach(dropdown => {
          dropdown.classList.remove('is-open');
          dropdown
            .querySelector<HTMLElement>('.mfrs-dropdown-trigger, .custom-mfrs-dropdown-trigger')
            ?.setAttribute('aria-expanded', 'false');
        });
    }

    // 魔禁开局页 data-act 事件委托（方案B）
    const dataActTarget = target?.closest<HTMLElement>('[data-act]');
    if (dataActTarget) {
      const root = dataActTarget.closest<HTMLElement>('#mfrs-welcome-root, .mfrs-welcome-root, .custom-mfrs-welcome-root');
      if (root) {
        handleMfrsWelcomeDataAct(root, dataActTarget, event);
        return;
      }
    }

    const button = target?.closest('.mfrs-submit, .custom-mfrs-submit');
    if (!button) return;
    const root = button.closest<HTMLElement>('#mfrs-welcome-root, .mfrs-welcome-root, .custom-mfrs-welcome-root');
    if (!root) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    fillWelcomeStart(root);
  };



  // 魔禁卡无数据库面板，此处保留为 no-op（避免调用不存在的面板对象）
  const openDashboardForWelcome = () => {};

  const enhancePanels = () => {
    enhanceWelcomeAnchors();
    hideRawProtocolParagraphs();
  };

  const timeoutIds = [0, 250, 1000, 2500].map(delay => hostWindow?.setTimeout(enhancePanels, delay));
  timeoutIds.push(...[0, 500, 1500, 3000].map(delay => hostWindow?.setTimeout(openDashboardForWelcome, delay)));
  const bodyObserver = new HostMutationObserver(() => {
    enhancePanels();
    openDashboardForWelcome();
  });
  bodyObserver.observe(hostDocument.body, { childList: true, subtree: true });

  // 魔禁开局页键盘快捷键（迁自 welcome.txt 底部 <script>，绕过 DOMPurify 对 script 的 strip）
  const handleMfrsWelcomeKeydown = (event: KeyboardEvent) => {
    const root = hostDocument.getElementById('mfrs-welcome-root');
    if (!root) return;
    if (event.key === 'Escape') {
      const mask = hostDocument.querySelector<HTMLElement>('.custom-mw-modal-mask.custom-open, .mw-modal-mask.open');
      if (mask) {
        const btn = mask.querySelector<HTMLElement>('.custom-mw-modal-close, .mw-modal-close');
        btn?.click();
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      const g = root.querySelector<HTMLButtonElement>('#btnGenerate');
      if (g && !g.disabled) g.click();
    }
  };
  hostDocument.addEventListener('keydown', handleMfrsWelcomeKeydown, true);

  hostDocument.addEventListener('click', handleWelcomeClick, true);

  // 魔禁开局页图片兜底：镜像重试一次 → 终态隐藏露单字（error 不冒泡，捕获阶段委托 + init 补扫竞态）
  const mfrsImgFallback = (img: HTMLImageElement) => {
    if (img.dataset.mfrsTried === '1') {
      img.style.display = 'none';
      return;
    }
    img.dataset.mfrsTried = '1';
    const src = img.getAttribute('src') ?? '';
    if (src.includes('testingcf.jsdelivr.net')) {
      img.setAttribute('src', src.replace('testingcf.jsdelivr.net', 'cdn.jsdelivr.net'));
    } else {
      img.style.display = 'none';
    }
  };
  const handleMfrsImgError = (event: Event) => {
    const t = event.target as HTMLElement | null;
    if (t && t.tagName === 'IMG' && t.closest('#mfrs-welcome-root, .mfrs-welcome-root, .custom-mfrs-welcome-root')) {
      mfrsImgFallback(t as HTMLImageElement);
    }
  };
  hostDocument.addEventListener('error', handleMfrsImgError, true);
  const sweepMfrsImages = () => {
    hostDocument
      .querySelectorAll<HTMLImageElement>('#mfrs-welcome-root img, .mfrs-welcome-root img, .custom-mfrs-welcome-root img')
      .forEach(img => {
        if (img.style.display !== 'none' && img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
          mfrsImgFallback(img);
        }
      });
  };
  [0, 250, 1000, 2500].forEach(delay => timeoutIds.push(hostWindow?.setTimeout(sweepMfrsImages, delay)));
  const cleanup = () => {
    observer.disconnect();
    bodyObserver.disconnect();
    hostDocument.removeEventListener('click', handleWelcomeClick, true);
    hostDocument.removeEventListener('keydown', handleMfrsWelcomeKeydown, true);
    hostDocument.removeEventListener('error', handleMfrsImgError, true);
    timeoutIds.forEach(id => {
      if (id !== undefined) hostWindow?.clearTimeout(id);
    });
    hostDocument.querySelectorAll<HTMLElement>('[data-mfrs-anchor-dropdown="true"]').forEach(dropdown => {
      dropdown.remove();
    });
    hostDocument
      .querySelectorAll<HTMLSelectElement>(inWelcomeRoots('select[data-mfrs-anchor-enhanced="true"]'))
      .forEach(select => {
        delete select.dataset.mfrsAnchorEnhanced;
        select.style.removeProperty('display');
      });
    hostStyle.remove();
    if (hostWindow?.__mfrsMjrThemeCleanup__ === cleanup) {
      delete hostWindow.__mfrsMjrThemeCleanup__;
    }
  };

  if (hostWindow) {
    hostWindow.__mfrsMjrThemeCleanup__ = cleanup;
  }

  // 脚本卸载时清理样式
  window.addEventListener('pagehide', cleanup, { once: true });

  console.info('[界面美化] 魔法禁书目录模拟器主题已注入');
});
