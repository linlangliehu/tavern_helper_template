(function () {
    'use strict';
    
    const SCRIPT_ID = 'acu_visualizer_ui_v20_pagination';
    const STORAGE_KEY_TABLE_ORDER = 'acu_table_order';
    const STORAGE_KEY_ACTION_ORDER = 'acu_action_order';
    const STORAGE_KEY_ACTIVE_TAB = 'acu_active_tab';
    const STORAGE_KEY_UI_CONFIG = 'acu_ui_config_v18';
    const STORAGE_KEY_LAST_SNAPSHOT = 'acu_data_snapshot_v18_5'; 
    const STORAGE_KEY_UI_COLLAPSE = 'acu_ui_collapse_state';
    const STORAGE_KEY_TABLE_HEIGHTS = 'acu_table_heights';
    const STORAGE_KEY_REVERSE_TABLES = 'acu_reverse_tables';
    const STORAGE_KEY_HIDDEN_TABLES = 'acu_hidden_tables';
    const STORAGE_KEY_TABLE_STYLES = 'acu_table_styles';
    const STORAGE_KEY_MFRS_CRUD_MIGRATION = 'acu_mfrs_visualizer_crud_migration';
    
    const TAB_DASHBOARD = 'acu_tab_dashboard_home';
    const STORAGE_KEY_DASH_CONFIG = 'acu_dash_config_v1';
    const MFRS_DASHBOARD_SLOTS = [
        { id: 'slot_2_1', kw: '玩家状态', title: '玩家状态', rule: 'kv' },
        { id: 'slot_3_1', kw: '全局状态', title: '全局状态', rule: 'kv' },
        { id: 'slot_4_1', kw: '人物', title: '人物', rule: 'capsule', col: 1 },
        { id: 'slot_5_1', kw: '灵异物品', title: '灵异物品', rule: 'capsule', col: 1 },
        { id: 'slot_5_2', kw: '厉鬼档案', title: '厉鬼档案', rule: 'capsule', col: 1 },
        { id: 'slot_6_1', kw: '灵异事件', title: '灵异事件', rule: 'capsule', col: 1, capCols: 2 },
        { id: 'slot_6_2', kw: '地点', title: '地点', rule: 'capsule', col: 1, capCols: 2 }
    ];
    const MFRS_LEGACY_DASHBOARD_KEYWORDS = ['主角信息', '全局数据', '全局数据表', '重要人物', '重要人物表', '背包', '背包物品', '背包物品表', '技能', '主角任务栏', '任务'];
    let isDashEditing = false;


    let isInitialized = false;
    let isSaving = false;
    let isEditingOrder = false;
    let currentDiffMap = new Set();
    let pendingDeletes = new Set();
    let observer = null;
    let isCollapsed = localStorage.getItem(STORAGE_KEY_UI_COLLAPSE) === 'true';
    let globalScrollTop = 0;
    let currentPage = 1;
    let currentSearchTerm = '';
    
    let hideOptionsUntilUpdate = false;
    let lastOptionDataCheck = '';

    const UpdateController = {
        _suppressNext: false,
        _resetTimer: null,
        runSilently: async (action) => {
            UpdateController._suppressNext = true;
            try {
                await action();
            } catch (e) {
                UpdateController._suppressNext = false;
                console.error(e);
            }
            setTimeout(() => { UpdateController._suppressNext = false; }, 2000);
        },
        handleUpdate: () => {
            if (UpdateController._suppressNext) {
                clearTimeout(UpdateController._resetTimer);
                UpdateController._resetTimer = setTimeout(() => {
                    UpdateController._suppressNext = false; 
                }, 500);
                return;
            }
            if (isEditingOrder) return;
            renderInterface();
        }
    };

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const getHost = () => {
        try { return window.parent || window; } catch (e) { return window; }
    };

    const getPath = (source, path, fallback = undefined) => {
        try {
            return path.split('.').reduce((obj, key) => obj && obj[key] !== undefined ? obj[key] : undefined, source) ?? fallback;
        } catch (e) {
            return fallback;
        }
    };

    const textValue = (value, fallback = '未知') => {
        if (Array.isArray(value)) {
            const text = value.map(item => textValue(item, '')).filter(Boolean).join('；');
            return text || fallback;
        }
        if (value && typeof value === 'object') {
            const text = Object.entries(value).map(([k, v]) => `${k}：${textValue(v, '')}`).filter(Boolean).join('；');
            return text || fallback;
        }
        const text = String(value ?? '').trim();
        return text || fallback;
    };

    const riskValue = (value, suffix) => {
        const text = textValue(value, '0');
        return text.includes('/') || text.includes('%') ? text : `${text}${suffix}`;
    };

    const readMfrsState = () => {
        const host = getHost();
        const readers = [
            () => host.getVariables && host.getVariables({ type: 'message', message_id: 'latest' }),
            () => window.getVariables && window.getVariables({ type: 'message', message_id: 'latest' }),
            () => host.getVariables && host.getVariables({ type: 'chat' }),
            () => window.getVariables && window.getVariables({ type: 'chat' }),
        ];
        for (const read of readers) {
            try {
                const variables = read();
                const stat = variables && variables.stat_data;
                if (stat && typeof stat === 'object') return stat;
            } catch (e) {}
        }
        return null;
    };

    const statusLine = (label, value, fallback = '未知') => `
        <div class="acu-dash-stat-row mfrs-status-row" style="display:flex; justify-content:flex-start; align-items:flex-start; gap:8px; padding:8px 10px; background:var(--acu-btn-bg); border-radius:8px; border:1px solid transparent; width:100%; box-sizing:border-box;">
            <span class="acu-dash-stat-label" style="color:var(--acu-title-color); font-size:1em; flex:0 0 92px; white-space:normal; overflow-wrap:break-word;">${escapeHtml(label)}</span>
            <span class="acu-dash-stat-val" style="color:var(--acu-text-main); font-weight:bold; font-size:1em; white-space:pre-wrap; word-break:break-word; text-align:left;">${escapeHtml(textValue(value, fallback))}</span>
        </div>`;
    const renderReadOnlyFallbackRows = (title, rows) => {
        const rowHtml = rows
            .filter(row => row && textValue(row.value, '') !== '')
            .map(row => statusLine(row.label, row.value, row.fallback || '未知'))
            .join('');
        return `
            <div class="acu-dash-char-info mfrs-readonly-fallback" style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; height:100%; padding-right:4px;">
                <div style="padding:8px 10px; color:var(--acu-text-sub); font-size:12px; line-height:1.7; border:1px dashed var(--acu-border); border-radius:8px;">
                    ${escapeHtml(title)}：数据库尚未落盘，以下为 MVU / 状态面板只读摘要。
                </div>
                ${rowHtml || statusLine('摘要', '暂无可读状态')}
            </div>`;
    };

    const renderMfrsTableFallback = (keyword) => {
        const stat = readMfrsState();
        if (!stat) return '';
        const key = String(keyword || '');
        const event = stat.当前灵异事件 || {};
        const ghostState = stat.驭鬼者状态 || {};
        const mainline = stat.主线进度 || {};
        const resources = stat.灵异资源 || {};
        if (key.includes('玩家状态')) {
            return renderReadOnlyFallbackRows('玩家状态', [
                { label: '姓名', value: stat.姓名 },
                { label: '身份', value: stat.身份 },
                { label: '所在地点', value: stat.所在位置 || event.发生地点 },
                { label: '当前状态', value: stat.状态 },
                { label: '死亡风险', value: riskValue(stat.风险值, '/100') },
                { label: '复苏风险', value: riskValue(ghostState.总复苏风险 ?? stat.厉鬼复苏程度, '%') },
                { label: '灵异资源', value: resources },
                { label: '最近行动', value: getPath(stat, '最近行动判定.行动', '无') },
            ]);
        }
        if (key.includes('全局状态')) {
            return renderReadOnlyFallbackRows('全局状态', [
                { label: '当前时间', value: stat.当前时间 || stat.game_time },
                { label: '当前地点', value: stat.所在位置 || event.发生地点 },
                { label: '当前城市', value: stat.当前城市 || stat.城市 },
                { label: '原著阶段', value: stat.原著阶段 },
                { label: '剧情锚点', value: stat.剧情锚点 },
                { label: '主线阶段', value: mainline.当前阶段 },
                { label: '世界压力', value: stat.世界压力 },
            ]);
        }
        if (key.includes('灵异事件')) {
            return renderReadOnlyFallbackRows('灵异事件', [
                { label: '事件代号', value: event.事件代号 },
                { label: '危害等级', value: event.危害等级 },
                { label: '发生地点', value: event.发生地点 || stat.所在位置 },
                { label: '鬼域状态', value: event.鬼域状态 },
                { label: '已知规律', value: event.已知杀人规律 },
                { label: '猜测规律', value: event.猜测杀人规律 },
                { label: '处理状态', value: event.处理状态 },
                { label: '可见摘要', value: event.可见摘要 || getPath(stat, '最近行动判定.可见结论', '') },
            ]);
        }
        if (key.includes('线索')) {
            return renderReadOnlyFallbackRows('线索', [
                { label: '关联事件', value: event.事件代号 },
                { label: '来源', value: '当前剧情/MVU' },
                { label: '内容', value: event.可见摘要 || getPath(stat, '最近行动判定.可见结论', '') },
                { label: '推断', value: event.猜测杀人规律 || event.已知杀人规律 },
                { label: '验证状态', value: '未验证' },
                { label: '可见性', value: '玩家可见' },
            ]);
        }
        return '';
    };
    const tableHasEffectiveRows = (table) => {
        const headers = Array.isArray(table?.headers) ? table.headers : [];
        const rows = Array.isArray(table?.rows) ? table.rows : [];
        return rows.some(row => Array.isArray(row) && row.some((cell, index) => {
            const header = String(headers[index] || '').trim().toLowerCase();
            if (header === 'row_id' || header === '行号') return false;
            return String(cell ?? '').trim() !== '';
        }));
    };

    const renderMfrsStatusModule = () => {
        const stat = readMfrsState();
        if (!stat) {
            return `
                <div id="mfrs-current-status-card" class="acu-dash-card" style="width:100%; box-sizing:border-box; margin-bottom:8px; padding:14px 16px;">
                    <div class="acu-dash-title">当前状态</div>
                    <div style="color:var(--acu-text-sub); font-size:12px; line-height:1.8;">即时状态未加载。这里读取 MVU 的 <code>stat_data</code>，不会反写数据库表。</div>
                </div>`;
        }

        const event = stat.当前灵异事件 || {};
        const ghostState = stat.驭鬼者状态 || {};
        const faction = stat.势力关系 || {};
        const mainline = stat.主线进度 || {};
        const action = stat.最近行动判定 || {};
        const suggestions = Array.isArray(stat.行动建议) ? stat.行动建议 : [];
        const suggestionHtml = suggestions.length
            ? suggestions.slice(0, 4).map(item => statusLine(textValue(item.选项, '建议'), `${textValue(item.思路, '')}｜风险：${textValue(item.主要风险, '未知')}｜收益：${textValue(item.预期收益, '未知')}`, '无')).join('')
            : statusLine('行动建议', '暂无');

        return `
            <div id="mfrs-current-status-card" class="acu-dash-card" style="width:100%; box-sizing:border-box; margin-bottom:8px; padding:0; overflow:hidden;">
                <div class="acu-tab-header" style="padding:10px 16px 0 16px; margin-bottom:0;">
                    <div class="acu-tab-btn active" data-target="mfrs-status-risk">风险</div>
                    <div class="acu-tab-btn" data-target="mfrs-status-action">行动</div>
                    <div class="acu-tab-btn" data-target="mfrs-status-file">档案</div>
                </div>
                <div class="acu-no-scrollbar" style="padding:10px 16px 16px 16px; max-height:260px; overflow-y:auto;">
                    <div id="mfrs-status-risk" class="acu-tab-pane active">
                        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px;">
                            ${statusLine('事件代号', event.事件代号, '未立案灵异事件')}
                            ${statusLine('危害等级', event.危害等级)}
                            ${statusLine('所在位置', stat.所在位置 || event.发生地点)}
                            ${statusLine('死亡风险', riskValue(stat.风险值, '/100'))}
                            ${statusLine('复苏风险', riskValue(ghostState.总复苏风险 ?? stat.厉鬼复苏程度, '%'))}
                            ${statusLine('当前状态', stat.状态, '健康')}
                        </div>
                    </div>
                    <div id="mfrs-status-action" class="acu-tab-pane">
                        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px;">
                            ${statusLine('行动类型', action.类型, '未判定')}
                            ${statusLine('行动内容', action.行动, '无')}
                            ${statusLine('结算结果', action.结果, '未结算')}
                            ${statusLine('可见结论', action.可见结论, '无')}
                            ${suggestionHtml}
                        </div>
                    </div>
                    <div id="mfrs-status-file" class="acu-tab-pane">
                        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px;">
                            ${statusLine('处理状态', event.处理状态, '未接触')}
                            ${statusLine('鬼域状态', event.鬼域状态, '未确认')}
                            ${statusLine('已知规律', event.已知杀人规律, '无')}
                            ${statusLine('猜测规律', event.猜测杀人规律, '无')}
                            ${statusLine('总部备案', faction.总部备案状态, '未备案')}
                            ${statusLine('主线阶段', `${textValue(mainline.当前阶段, '开局接入')} #${textValue(mainline.阶段序号, '0')}`)}
                        </div>
                        <div style="margin-top:8px; color:var(--acu-text-sub); font-size:11px; line-height:1.7;">即时状态来自 MVU / stat_data；数据库表只作为长期档案与辅助展示，不覆盖 MVU。</div>
                    </div>
                </div>
            </div>`;
    };

    const DEFAULT_CONFIG = {
        theme: 'aurora',
        fontFamily: 'default',
        cardWidth: 280,
        fontSize: 13,
        optionFontSize: 13,
        dashboardFontSize: 13,
        itemsPerPage: 20, 
        highlightNew: false,
        highlightColor: 'red',
        layout: 'vertical',
        limitLongText: false,
        showDashboard: true,
        checkConsistency: true,
        customTitleColor: false,
        titleColor: 'orange',
        gridColumns: (window.innerWidth <= 768 ? 4 : 0),
        showOptionPanel: false,
        clickOptionToAutoSend: false,
        collapseStyle: 'bar',
        collapsePosition: 'center',
        frontendPosition: 'bottom',
        dashboardPosition: 'embedded',
        dbTheme: 'default',
        dbTransparentMap: {}
    };

    const THEMES = [
        { id: 'retro', name: '复古羊皮' },
        { id: 'dark', name: '极夜深空' },
        { id: 'modern', name: '现代清爽' },
        { id: 'forest', name: '森之物语' },
        { id: 'ocean', name: '深海幽蓝' },
        { id: 'cyber', name: '赛博霓虹' },
        { id: 'sakura', name: '浅粉落樱' },
        { id: 'aurora', name: '极光幻境' },
        { id: 'sunset', name: '日落沙滩' },
        { id: 'starship', name: '星际迷航' },
        { id: 'sky', name: '天空之境' }
    ];

        const FONTS = [
        { id: 'default', name: '系统默认', val: `'Segoe UI', 'Microsoft YaHei', sans-serif` },
        { id: 'noto-sans', name: '思源黑体', val: `'Noto Sans SC', sans-serif` },
        { id: 'noto-serif', name: '思源宋体', val: `'Noto Serif SC', serif` },
        { id: 'mashanzheng', name: '古风书法', val: `'Ma Shan Zheng', cursive` },
        { id: 'zcool', name: '快乐圆体', val: `'ZCOOL KuaiLe', cursive` },
        { id: 'longcang', name: '行书手写', val: `'Long Cang', cursive` },
        { id: 'mono', name: '代码等宽', val: `'Consolas', 'Monaco', monospace` },
        { id: 'kaiti', name: '清雅楷体', val: `'KaiTi', 'STKaiti', '楷体', serif` },
    ];

    const HIGHLIGHT_COLORS = {
        orange: { main: '#d35400', bg: 'rgba(211, 84, 0, 0.1)', name: '活力橙' },
        red:    { main: '#8f2a24', bg: 'rgba(143, 42, 36, 0.16)', name: '绯红' },
        blue:   { main: '#2196f3', bg: 'rgba(33, 150, 243, 0.1)', name: '海蓝' },
        green:  { main: '#27ae60', bg: 'rgba(39, 174, 96, 0.1)', name: '翠绿' },
        purple: { main: '#9b59b6', bg: 'rgba(155, 89, 182, 0.1)', name: '梦幻紫' },
        cyan:   { main: '#00bcd4', bg: 'rgba(0, 188, 212, 0.1)', name: '青空蓝' },
        teal:   { main: '#1abc9c', bg: 'rgba(26, 188, 156, 0.1)', name: '青绿' }
    };

    const THEME_VARS = {
        retro: { bgNav: '#e6e2d3', bgPanel: '#e6e2d3', border: '#bfb29e', textMain: '#5e4b35', textSub: '#888', btnBg: '#d6ccbc', btnHover: '#cbbba8', btnActiveBg: '#8d7b6f', btnActiveText: '#fdfaf5', tableHead: '#efebe4', tableHover: '#f0ebe0', shadow: 'rgba(0,0,0,0.1)', menuBg: '#fff', menuText: '#333', cardBg: '#fffef9', badgeBg: '#efebe4', inputBg: 'rgba(255,255,255,0.5)', overlayBg: 'rgba(94, 75, 53, 0.4)' },
        dark: { bgNav: 'rgba(30, 30, 30, 0.95)', bgPanel: 'rgba(25, 25, 25, 0.95)', border: '#555', textMain: '#eee', textSub: '#aaa', btnBg: '#3a3a3a', btnHover: '#4a4a4a', btnActiveBg: '#6a5acd', btnActiveText: '#fff', tableHead: 'rgba(40, 40, 40, 0.9)', tableHover: 'rgba(58, 58, 58, 0.5)', shadow: 'rgba(0,0,0,0.6)', cardBg: 'rgba(35, 35, 35, 0.9)', badgeBg: '#3a3f4b', menuBg: '#333', menuText: '#eee', inputBg: 'rgba(0,0,0,0.3)', overlayBg: 'rgba(0,0,0,0.75)' },
        modern: { bgNav: '#ffffff', bgPanel: '#f8f9fa', border: '#dee2e6', textMain: '#333', textSub: '#6c757d', btnBg: '#e9ecef', btnHover: '#dee2e6', btnActiveBg: '#0d6efd', btnActiveText: '#fff', tableHead: '#f8f9fa', tableHover: '#e9ecef', shadow: 'rgba(0,0,0,0.08)', cardBg: '#ffffff', badgeBg: '#f1f3f5', menuBg: '#fff', menuText: '#333', inputBg: '#ffffff', overlayBg: 'rgba(0,0,0,0.3)' },
        forest: { bgNav: '#e8f5e9', bgPanel: '#e8f5e9', border: '#a5d6a7', textMain: '#333333', textSub: '#555555', uiColor: '#1b5e20', btnBg: '#c8e6c9', btnHover: '#a5d6a7', btnActiveBg: '#2e7d32', btnActiveText: '#fff', tableHead: '#dcedc8', tableHover: '#f1f8e9', shadow: 'rgba(0,0,0,0.1)', cardBg: '#ffffff', badgeBg: '#dcedc8', menuBg: '#fff', menuText: '#2e7d32', inputBg: 'rgba(255,255,255,0.7)', overlayBg: 'rgba(27, 94, 32, 0.2)' },
        ocean: { bgNav: '#f0f9ff', bgPanel: '#f0f9ff', border: '#bae6fd', textMain: '#333333', textSub: '#555555', uiColor: '#0369a1', btnBg: '#e0f2fe', btnHover: '#bae6fd', btnActiveBg: '#0ea5e9', btnActiveText: '#fff', tableHead: '#e0f2fe', tableHover: '#f0f9ff', shadow: 'rgba(3, 105, 161, 0.15)', cardBg: '#ffffff', badgeBg: '#e0f2fe', menuBg: '#fff', menuText: '#0369a1', inputBg: 'rgba(255,255,255,0.75)', overlayBg: 'rgba(3, 105, 161, 0.2)' },
        cyber: { bgNav: '#050505', bgPanel: '#0a0a0a', border: '#444', textMain: '#00ffcc', textSub: '#ff00ff', btnBg: '#1f1f1f', btnHover: '#333', btnActiveBg: '#ff00ff', btnActiveText: '#fff', tableHead: '#111', tableHover: '#1a1a1a', shadow: '0 0 10px rgba(0,255,204,0.3)', cardBg: '#050505', badgeBg: '#222', menuBg: '#111', menuText: '#00ffcc', inputBg: '#111', overlayBg: 'rgba(0,0,0,0.85)' },
        sakura: { bgNav: '#fff9fb', bgPanel: '#fff9fb', border: '#f0d4df', textMain: '#333333', textSub: '#555555', uiColor: '#a85876', btnBg: '#fff0f5', btnHover: '#f8deea', btnActiveBg: '#e090ad', btnActiveText: '#fff', tableHead: '#fff0f5', tableHover: '#fff5fa', shadow: 'rgba(168, 88, 118, 0.1)', cardBg: '#ffffff', badgeBg: '#fff0f5', menuBg: '#fff', menuText: '#a85876', inputBg: 'rgba(255,255,255,0.8)', overlayBg: 'rgba(168, 88, 118, 0.15)' },
        aurora: { bgNav: 'linear-gradient(135deg, rgba(15, 14, 13, 0.97), rgba(48, 29, 28, 0.93))', bgPanel: 'linear-gradient(180deg, rgba(18, 17, 16, 0.98) 0%, rgba(38, 34, 31, 0.95) 58%, rgba(22, 13, 13, 0.96) 100%)', border: 'rgba(128, 39, 36, 0.72)', textMain: '#ded7c9', textSub: '#9a9186', btnBg: 'linear-gradient(135deg, rgba(91, 30, 29, 0.32), rgba(54, 49, 44, 0.24))', btnHover: 'linear-gradient(135deg, rgba(128, 39, 36, 0.42), rgba(77, 68, 59, 0.30))', btnActiveBg: 'linear-gradient(135deg, #6f1f1c, #3b1918)', btnActiveText: '#f3ead8', tableHead: 'linear-gradient(90deg, rgba(111, 31, 28, 0.22), rgba(59, 52, 45, 0.18))', tableHover: 'rgba(128, 39, 36, 0.13)', shadow: '0 8px 32px rgba(0, 0, 0, 0.42), 0 0 18px rgba(111, 31, 28, 0.16)', cardBg: 'linear-gradient(145deg, rgba(34, 31, 28, 0.97), rgba(18, 17, 16, 0.99))', badgeBg: 'rgba(111, 31, 28, 0.26)', menuBg: '#211d1a', menuText: '#ded7c9', inputBg: 'rgba(12, 11, 10, 0.58)', overlayBg: 'rgba(8, 7, 7, 0.82)' },
        sunset: { bgNav: 'linear-gradient(135deg, #fffaf0 0%, #fff9e6 50%, #fff5fa 100%)', bgPanel: 'linear-gradient(180deg, #fffcf5 0%, #fffafa 100%)', border: 'rgba(251, 146, 60, 0.85)', textMain: '#8a4a3b', textSub: '#d97757', btnBg: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(244, 114, 182, 0.1))', btnHover: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(244, 114, 182, 0.2))', btnActiveBg: 'linear-gradient(135deg, #ffab73, #f48fb1)', btnActiveText: '#fff', tableHead: 'linear-gradient(90deg, rgba(251, 191, 36, 0.1), rgba(251, 113, 133, 0.1))', tableHover: 'rgba(251, 146, 60, 0.05)', shadow: '0 8px 32px rgba(251, 146, 60, 0.15), 0 4px 16px rgba(244, 114, 182, 0.1)', cardBg: 'linear-gradient(145deg, #fffcf7, #fffafa)', badgeBg: '#fffaf5', menuBg: '#fff', menuText: '#8a4a3b', inputBg: 'rgba(255,255,255,0.7)', overlayBg: 'rgba(124, 45, 18, 0.1)' },
        starship: { bgNav: 'radial-gradient(ellipse at top, rgba(30, 27, 75, 0.98), rgba(15, 23, 42, 0.95)), linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)', bgPanel: 'linear-gradient(180deg, rgba(30, 27, 75, 0.98) 0%, rgba(49, 46, 129, 0.95) 100%)', border: 'rgba(199, 210, 254, 0.6)', textMain: '#e0e7ff', textSub: '#a5b4fc', btnBg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(236, 72, 153, 0.15), rgba(34, 211, 238, 0.1))', btnHover: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(236, 72, 153, 0.25), rgba(34, 211, 238, 0.2))', btnActiveBg: 'linear-gradient(135deg, #6366f1, #ec4899, #22d3ee)', btnActiveText: '#fff', tableHead: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15), rgba(236, 72, 153, 0.1))', tableHover: 'rgba(99, 102, 241, 0.1)', shadow: '0 8px 40px rgba(99, 102, 241, 0.2), 0 4px 20px rgba(236, 72, 153, 0.1)', cardBg: 'linear-gradient(145deg, rgba(30, 27, 75, 0.95), rgba(49, 46, 129, 0.9))', badgeBg: 'rgba(99, 102, 241, 0.2)', menuBg: '#1e1b4b', menuText: '#e0e7ff', inputBg: 'rgba(0,0,0,0.4)', overlayBg: 'rgba(0,0,0,0.85)' },
        sky: { bgNav: 'linear-gradient(135deg, rgba(224, 242, 254, 0.95), rgba(238, 242, 255, 0.95))', bgPanel: 'linear-gradient(180deg, rgba(240, 249, 255, 0.95) 0%, rgba(230, 240, 255, 0.9) 100%)', border: 'rgba(56, 189, 248, 0.6)', textMain: '#0f172a', textSub: '#3b82f6', uiColor: '#3b82f6', btnBg: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(129, 140, 248, 0.15))', btnHover: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(129, 140, 248, 0.25))', btnActiveBg: 'linear-gradient(135deg, #38bdf8, #818cf8)', btnActiveText: '#fff', tableHead: 'linear-gradient(90deg, rgba(56, 189, 248, 0.1), rgba(129, 140, 248, 0.1))', tableHover: 'rgba(56, 189, 248, 0.08)', shadow: '0 8px 32px rgba(56, 189, 248, 0.15), 0 4px 16px rgba(129, 140, 248, 0.1)', cardBg: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(240, 249, 255, 0.95))', badgeBg: 'rgba(56, 189, 248, 0.2)', menuBg: '#f0f9ff', menuText: '#0f172a', inputBg: 'rgba(255, 255, 255, 0.6)', overlayBg: 'rgba(15, 23, 42, 0.15)' }
    };

    
    const bindScrollFade = ($els) => {
        if (!$els || !$els.length) return;
        $els.each(function() {
            const $t = $(this);
            $t.off('scroll.fade').on('scroll.fade', function() {
                $t.addClass('acu-show-scroll');
                clearTimeout($t.data('fadeT'));
                $t.data('fadeT', setTimeout(() => {
                    $t.removeClass('acu-show-scroll');
                }, 500));
            });
        });
    };

    const getCore = () => {
        const w = window.parent || window;
        return {
            $: window.jQuery || w.jQuery,
            getDB: () => w.AutoCardUpdaterAPI || window.AutoCardUpdaterAPI
        };
    };

    const getMysteryFrontendApi = () => {
        try {
            const w = window.parent || window;
            return w.MysteryDatabaseFrontend || window.MysteryDatabaseFrontend || null;
        } catch (e) {
            return window.MysteryDatabaseFrontend || null;
        }
    };

    const isMfrsCrudMigrationEnabled = () => {
        try {
            const w = window.parent || window;
            const value = (w.localStorage || window.localStorage).getItem(STORAGE_KEY_MFRS_CRUD_MIGRATION);
            return value !== 'false';
        } catch (e) {
            return true;
        }
    };

    const formatTableChangeErrors = (errors) => {
        if (!Array.isArray(errors) || errors.length === 0) return '未知错误';
        return errors.map(error => {
            const column = error.column ? ` / ${error.column}` : '';
            return `${error.code || 'ERROR'}${column}: ${error.message || ''}`;
        }).join('；');
    };

    const applyMfrsCrudPlan = async (plan, fallbackLabel = '旧保存路径') => {
        if (!isMfrsCrudMigrationEnabled()) return false;
        const api = getMysteryFrontendApi();
        if (!api || typeof api.applyTableChangePlan !== 'function') return false;
        try {
            const result = await api.applyTableChangePlan(plan);
            if (result && result.ok) return true;
            console.warn('[MFRS Visualizer] CRUD 写入预检/执行失败，回退旧保存路径。', { plan, result });
            if (window.toastr) window.toastr.warning(`CRUD 写入未通过，已回退${fallbackLabel}：${formatTableChangeErrors(result?.errors)}`);
        } catch (error) {
            console.warn('[MFRS Visualizer] CRUD 写入异常，回退旧保存路径。', { plan, error });
            if (window.toastr) window.toastr.warning(`CRUD 写入异常，已回退${fallbackLabel}`);
        }
        return false;
    };

    const previewMfrsCrudPlan = async (plan) => {
        if (!isMfrsCrudMigrationEnabled()) return null;
        const api = getMysteryFrontendApi();
        if (!api || typeof api.previewTableChangePlan !== 'function') return null;
        try {
            return await api.previewTableChangePlan(plan);
        } catch (error) {
            console.warn('[MFRS Visualizer] CRUD 预检异常。', { plan, error });
            return null;
        }
    };

    const getIconForTableName = (name) => {
        if (!name) return 'fa-table';
        const n = name.toLowerCase();
        if (n.includes('主角') || n.includes('角色')) return 'fa-user-circle';
        if (n.includes('通用') || n.includes('全局') || n.includes('世界') || n.includes('设定')) return 'fa-globe-asia';
        if (n.includes('背包') || n.includes('物品') || n.includes('资源') || n.includes('物资')) return 'fa-briefcase';
        if (n.includes('技能') || n.includes('武魂') || n.includes('功法') || n.includes('能力') || n.includes('神通') || n.includes('法术')) return 'fa-dragon';
        if (n.includes('势力') || n.includes('阵营') || n.includes('门派') || n.includes('组织')) return 'fa-flag';
        if (n.includes('关系') || n.includes('周边') || n.includes('npc') || n.includes('人物')) return 'fa-address-book';
        if (n.includes('任务') || n.includes('日志')) return 'fa-scroll';
        if (n.includes('地点') || n.includes('位置')) return 'fa-map-marker-alt';
        if (n.includes('总结') || n.includes('大纲')) return 'fa-book-reader';
        if (n.includes('装备') || n.includes('武器')) return 'fa-shield-alt';
        if (n.includes('事件') || n.includes('备忘') || n.includes('记录') || n.includes('日程')) return 'fa-clipboard-list';
        return 'fa-table';
    };

    const getBadgeStyle = (text) => { return ''; };

    const getActiveTabState = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVE_TAB)); } catch (e) { return null; } };
    const saveActiveTabState = (tableName) => { try { localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, JSON.stringify(tableName)); } catch (e) { console.error(e); } };
    const getSavedTableOrder = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_TABLE_ORDER)); } catch (e) { return null; } };
    const saveTableOrder = (tableNames) => { try { localStorage.setItem(STORAGE_KEY_TABLE_ORDER, JSON.stringify(tableNames)); } catch (e) { console.error(e); } };
    const getSavedActionOrder = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_ACTION_ORDER)); } catch (e) { return null; } };
    const saveActionOrder = (list) => { try { localStorage.setItem(STORAGE_KEY_ACTION_ORDER, JSON.stringify(list)); } catch (e) { console.error(e); } };
    const getConfig = () => { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_UI_CONFIG)); return { ...DEFAULT_CONFIG, ...saved }; } catch (e) { return DEFAULT_CONFIG; } };
    const saveConfig = (newConfig) => { const current = getConfig(); const merged = { ...current, ...newConfig }; try { localStorage.setItem(STORAGE_KEY_UI_CONFIG, JSON.stringify(merged)); } catch (e) { console.error(e); } applyConfigStyles(merged); };
    
    const getTableHeights = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_TABLE_HEIGHTS)) || {}; } catch (e) { return {}; } };
    const saveTableHeights = (heights) => { try { localStorage.setItem(STORAGE_KEY_TABLE_HEIGHTS, JSON.stringify(heights)); } catch (e) { console.error(e); } };

    const getTableStyles = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_TABLE_STYLES)) || {}; } catch (e) { return {}; } };
    const saveTableStyles = (styles) => { try { localStorage.setItem(STORAGE_KEY_TABLE_STYLES, JSON.stringify(styles)); } catch (e) { console.error(e); } };
    const getDashConfig = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_DASH_CONFIG)) || {}; } catch (e) { return {}; } };
    const saveDashConfig = (cfg) => { try { localStorage.setItem(STORAGE_KEY_DASH_CONFIG, JSON.stringify(cfg)); } catch (e) { console.error(e); } };
    const hasLegacyMfrsDashConfig = (cfg) => Object.values(cfg || {}).some(slot => {
        if (!slot || slot.isEmpty) return false;
        const text = String(slot.text || '');
        const title = String(slot.title || '');
        return MFRS_LEGACY_DASHBOARD_KEYWORDS.some(keyword => text.includes(keyword) || title.includes(keyword));
    });


    const getReverseOrderTables = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_REVERSE_TABLES)) || []; } catch (e) { return []; } };
    const saveReverseOrderTables = (list) => { try { localStorage.setItem(STORAGE_KEY_REVERSE_TABLES, JSON.stringify(list)); } catch (e) { console.error(e); } };

    const getHiddenTables = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_HIDDEN_TABLES)) || []; } catch (e) { return []; } };
    const saveHiddenTables = (list) => { try { localStorage.setItem(STORAGE_KEY_HIDDEN_TABLES, JSON.stringify(list)); } catch (e) { console.error(e); } };

    const loadSnapshot = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY_LAST_SNAPSHOT)); } catch (e) { return null; } };
    const saveSnapshot = (data) => { try { localStorage.setItem(STORAGE_KEY_LAST_SNAPSHOT, JSON.stringify(data)); } catch (e) { console.error(e); } };

    const generateDiffMap = (currentData) => {
        const lastData = loadSnapshot();
        const diffSet = new Set();
        if (!lastData) return diffSet;
        for (const sheetId in currentData) {
            const newSheet = currentData[sheetId];
            const oldSheet = lastData[sheetId];
            if (!newSheet || !newSheet.name) continue;
            const tableName = newSheet.name;
            if (!oldSheet) {
                if (newSheet.content) {
                     newSheet.content.forEach((row, rIdx) => { if (rIdx > 0) diffSet.add(`${tableName}-row-${rIdx-1}`); });
                }
                continue;
            }
            const newRows = newSheet.content || [];
            const oldRows = oldSheet.content || [];
            newRows.forEach((row, rIdx) => {
                if (rIdx === 0) return; 
                const oldRow = oldRows[rIdx];
                if (!oldRow) { diffSet.add(`${tableName}-row-${rIdx-1}`); } else {
                    row.forEach((cell, cIdx) => {
                        if (cIdx === 0) return; 
                        const oldCell = oldRow[cIdx];
                        if (String(cell) !== String(oldCell)) { diffSet.add(`${tableName}-${rIdx-1}-${cIdx}`); }
                    });
                }
            });
        }
        return diffSet;
    };

    const injectDatabaseStyles = (config) => {
        const { $ } = getCore();
        if (!$) return;
        const $style = $('#acu-db-beautify');
        if (config.dbTheme && config.dbTheme !== 'default') {
            const t = THEME_VARS[config.dbTheme] || THEME_VARS.aurora;
            let h = HIGHLIGHT_COLORS[config.highlightColor];
            if (!h && config.highlightColor && String(config.highlightColor).startsWith('#')) {
                h = { main: config.highlightColor, bg: config.highlightColor + '1a' };
            }
            h = h || HIGHLIGHT_COLORS.orange;
            const fontVal = FONTS.find(f => f.id === config.fontFamily)?.val || FONTS[0].val;
            
            let finalBg0 = t.bgPanel;
            let finalBg1 = t.bgNav;
            
            const transMap = config.dbTransparentMap || {};
            const isTrans = transMap[config.dbTheme] === true;

            if (isTrans && (['aurora', 'starship', 'sky'].includes(config.dbTheme))) {
                finalBg0 = 'transparent';
                finalBg1 = 'transparent';
            }

            const css = `
                <style id="acu-db-beautify">
                    
                    html body .auto-card-updater-popup .button-group.acu-data-mgmt-buttons button,
                    html body .auto-card-updater-popup .button-group.acu-data-mgmt-buttons .button,
                    :not(#z):not(#z) .auto-card-updater-popup .acu-data-mgmt-buttons button,
                    :not(#z):not(#z) .auto-card-updater-popup .acu-data-mgmt-buttons .button {
                        background: ${t.btnBg} !important;
                        color: ${t.textMain} !important;
                        border: 1px solid ${t.border} !important;
                        opacity: 1 !important;
                        box-shadow: none !important;
                    }
                    :not(#z):not(#z) .auto-card-updater-popup .acu-data-mgmt-buttons button:hover,
                    :not(#z):not(#z) .auto-card-updater-popup .acu-data-mgmt-buttons .button:hover {
                        background: ${t.btnHover} !important;
                    }

                    
                    .auto-card-updater-popup .acu-header {
                        box-shadow: none !important;
                        background: ${t.bgNav} !important;
                        border-bottom: 1px solid ${t.border} !important;
                    }

                    
                    .acu-window {
                        background: ${t.bgPanel} !important;
                        box-shadow: ${t.shadow} !important;
                        border: 1px solid ${t.border} !important;
                    }
                    
                    .acu-window .acu-window-header {
                        background: ${t.bgNav} !important;
                        border-bottom: 1px solid ${t.border} !important;
                    }
                    
                    .acu-window .acu-window-title {
                        color: ${t.textMain} !important;
                    }
                    .acu-window .acu-window-title i {
                        color: ${h.main} !important;
                    }
                    .acu-window .acu-window-btn {
                        background: ${t.btnBg} !important;
                        color: ${t.textSub} !important;
                        border: 1px solid ${t.border} !important;
                    }
                    .acu-window .acu-window-btn:hover {
                        background: ${t.btnHover} !important;
                        color: ${t.textMain} !important;
                    }

                    
                    html body .auto-card-updater-popup .acu-tabs-nav,
                    .auto-card-updater-popup .acu-tabs-nav {
                        background: ${t.bgNav} !important;
                        border-color: ${t.border} !important;
                        
                        opacity: 1 !important;
                    }

                    
                    .auto-card-updater-popup .acu-tab-button {
                        color: ${t.textSub} !important;
                        border-radius: 8px !important;
                    }
                    .auto-card-updater-popup .acu-tab-button:hover {
                        background: ${t.btnHover} !important;
                        color: ${t.textMain} !important;
                    }
                    .auto-card-updater-popup .acu-tab-button.active {
                        background: ${t.btnActiveBg} !important;
                        color: ${t.btnActiveText} !important;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important; 
                        border-color: transparent !important;
                    }

                    .acu-window-overlay {
                        background-color: ${t.overlayBg} !important;
                        backdrop-filter: blur(5px) !important;
                    }
                    .auto-card-updater-popup {
                        --acu-bg-0: ${finalBg0} !important;
                        --acu-bg-1: ${finalBg1} !important;
                        --acu-bg-2: ${t.btnBg} !important;
                        --acu-border: ${t.border} !important;
                        --acu-border-2: ${t.border} !important;
                        --acu-text-1: ${t.textMain} !important;
                        --acu-text-2: ${t.textSub} !important;
                        --acu-text-3: ${t.textSub} !important;
                        --acu-accent: ${h.main} !important;
                        --acu-accent-glow: ${h.bg} !important;
                        font-family: ${fontVal} !important;
                    }
                                        .auto-card-updater-popup button, .auto-card-updater-popup .button {
                        border-radius: 8px !important;
                        background: ${t.btnBg} !important;
                        color: ${t.textMain} !important;
                        border: 1px solid ${t.border} !important;
                    }
                    .auto-card-updater-popup button:hover, .auto-card-updater-popup .button:hover {
                        background: ${t.btnHover} !important;
                    }
                    .auto-card-updater-popup button.primary, .auto-card-updater-popup .button.primary {
                        background: ${t.btnActiveBg} !important;
                        color: ${t.btnActiveText} !important;
                    }
                    :not(#z):not(#z) .auto-card-updater-popup input:not([type="checkbox"]):not([type="radio"]),
                    :not(#z):not(#z) .auto-card-updater-popup textarea {
                        background-color: ${t.inputBg} !important;
                        color: ${t.textMain} !important;
                        border-color: ${t.border} !important;
                    }
                    /* 修复：下拉框使用主题搭配色边框 (t.border) */
                    :not(#z):not(#z) .auto-card-updater-popup select {
                        background-color: ${t.inputBg} !important;
                        color: ${t.textMain} !important;
                        border: 1px solid ${t.border} !important;
                    }
                    /* 修复：强制设置下拉选项背景色，防止透明导致看不清 */
                    :not(#z):not(#z) .auto-card-updater-popup select option {
                        background-color: ${t.cardBg} !important;
                        color: ${t.textMain} !important;
                    }
                    /* 修复：强制设置输入框占位符颜色，防止美化后说明文字消失 */
                    :not(#z):not(#z) .auto-card-updater-popup input::placeholder,
                    :not(#z):not(#z) .auto-card-updater-popup textarea::placeholder {
                        color: ${t.textSub} !important;
                        opacity: 0.7 !important;
                    }
                    .auto-card-updater-popup [style*="lightgreen"] {
                        color: ${h.main} !important;
                    }
                    /* --- 1. 通用容器美化 --- */
                    .auto-card-updater-popup .acu-card,
                    .auto-card-updater-popup .settings-section {
                        background: ${t.cardBg} !important;
                        border-color: ${t.border} !important;
                        color: ${t.textMain} !important;
                        box-shadow: ${t.shadow} !important;
                    }

                    /* --- 2. 输入组与列表容器美化 --- */
                    .auto-card-updater-popup .prompt-segment,
                    .auto-card-updater-popup .plot-prompt-segment,
                    .auto-card-updater-popup .qrf_worldbook_list, 
                    .auto-card-updater-popup .qrf_worldbook_entry_list,
                    .auto-card-updater-popup .checkbox-group,
                    .auto-card-updater-popup .qrf_radio_group {
                        background: ${t.bgNav} !important;
                        border-color: ${t.border} !important;
                        color: ${t.textMain} !important;
                    }

                    /* --- 3. 针对性修复：状态显示框与底部栏 --- */
                    /* 使用属性选择器匹配 ID 结尾，覆盖数据库脚本硬编码的背景色 */
                    .auto-card-updater-popup [id$="-card-update-status-display"],
                    .auto-card-updater-popup [id$="-status-message"],
                    .auto-card-updater-popup [id$="-loop-status-indicator"] {
                        background: ${t.bgNav} !important;
                        border: 1px solid ${t.border} !important;
                        color: ${t.textMain} !important;
                        box-shadow: inset 0 1px 4px rgba(0,0,0,0.05) !important;
                    }

                    /* --- 4. 文本颜色修正 --- */
                    .auto-card-updater-popup .acu-header-sub,
                    .auto-card-updater-popup .notes, 
                    .auto-card-updater-popup small.notes,
                    .auto-card-updater-popup label {
                        color: ${t.textSub} !important;
                    }
                    .auto-card-updater-popup h3, 
                    .auto-card-updater-popup h4 {
                        color: ${t.textMain} !important;
                        border-bottom-color: ${t.border} !important;
                    }

                    /* 修复表格内的状态文本颜色 */
                    .auto-card-updater-popup [id$="-granular-status-table-body"] td {
                        color: ${t.textMain} !important;
                    }

                    /* 修复 Toggle Switch (0TK开关) 可见性 */
                    .auto-card-updater-popup .toggle-switch .slider {
                        background-color: ${t.border} !important;
                        border: 1px solid ${t.border} !important;
                        opacity: 0.6 !important;
                    }
                    .auto-card-updater-popup .toggle-switch input:checked + .slider {
                        background-color: ${h.main} !important;
                        border-color: ${h.main} !important;
                        opacity: 1 !important;
                    }
                    .auto-card-updater-popup .toggle-switch .slider:before {
                        background-color: #fff !important;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
                    }
                    
                    /* --- 5. 复选框美化 (Checkboxes) - Theme Adaptive (Gradient Fix) --- */
                    :not(#z) .auto-card-updater-popup input[type="checkbox"] {
                        background-color: ${t.inputBg} !important;
                        border: 1px solid ${t.border} !important;
                        width: 18px !important;
                        height: 18px !important;
                        border-radius: 4px !important;
                        appearance: none !important;
                        -webkit-appearance: none !important;
                        cursor: pointer !important;
                        box-shadow: inset 0 1px 2px rgba(0,0,0,0.1) !important;
                    }
                    :not(#z) .auto-card-updater-popup input[type="checkbox"]:checked {
                        /* 修复：使用 background 简写以支持渐变色主题 (如 Aurora/Sunset) */
                        /* 图标在上层，主题色(t.btnActiveBg)在下层 */
                        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 10'%3E%3Cpath fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M1 5l3 3 7-7'/%3E%3C/svg%3E") center / 12px 10px no-repeat, ${t.btnActiveBg} !important;
                        border-color: transparent !important;
                    }
                    :not(#z) .auto-card-updater-popup input[type="checkbox"]:hover {
                        border-color: ${t.textMain} !important;
                    }
!important;
                    }


                </style>
            `;
            if ($style.length) $style.replaceWith(css); else $('head').append(css);
        } else {
            $style.remove();
        }
    };

    const applyConfigStyles = (config) => {
        const { $ } = getCore();
        if (!$) return;
        const $wrapper = $('.acu-wrapper');
        const $embedded = $('.acu-embedded-options-container .acu-option-panel');
        const fontVal = FONTS.find(f => f.id === config.fontFamily)?.val || FONTS[0].val;
        $('#acu-dynamic-font').remove();
        $('head').append(`
            <style id="acu-dynamic-font">
                .acu-wrapper, .acu-edit-dialog, .acu-cell-menu, .acu-nav-container, .acu-data-card, .acu-panel-title, .acu-settings-label, .acu-checkbox-label, .acu-btn-block, .acu-nav-btn, .acu-dash-card, .acu-quick-view-card, .acu-option-panel, .acu-opt-btn, .acu-opt-header, .acu-nice-select, .acu-edit-dialog select, .acu-edit-dialog input, .acu-edit-dialog textarea, .acu-close-pill, .acu-embedded-dashboard-container, .acu-embedded-options-container {
                    font-family: ${fontVal} !important;
                }
            </style>
        `);
        
        let colorVal = HIGHLIGHT_COLORS[config.highlightColor];
        if (!colorVal && config.highlightColor && String(config.highlightColor).startsWith('#')) {
            colorVal = { main: config.highlightColor, bg: config.highlightColor + '1a' };
        }
        colorVal = colorVal || HIGHLIGHT_COLORS.orange;
        let titleColorVal = 'var(--acu-text-main)';
        if (config.customTitleColor) {
             const tRaw = config.titleColor;
             if (tRaw && String(tRaw).startsWith('#')) {
                 titleColorVal = tRaw;
             } else {
                 titleColorVal = (HIGHLIGHT_COLORS[tRaw] || HIGHLIGHT_COLORS.orange).main;
             }
        }
        const gridCols = config.gridColumns > 0 ? `repeat(${config.gridColumns}, 1fr)` : 'repeat(auto-fill, minmax(110px, 1fr))';
        
        const cssProps = { 
            '--acu-card-width': `${config.cardWidth}px`, 
            '--acu-font-size': `${config.fontSize}px`,
            '--acu-opt-font-size': `${config.optionFontSize || 13}px`,
            '--acu-dash-font-size': `${config.dashboardFontSize || 13}px`,
            '--acu-highlight': colorVal.main,
            '--acu-highlight-bg': colorVal.bg,
            '--acu-accent': colorVal.main,
            '--acu-title-color': titleColorVal,
            '--acu-nav-cols': gridCols
        };
        
        if ($wrapper.length) {
            $wrapper.removeClass(THEMES.map(t => `acu-theme-${t.id}`).join(' '));
            $wrapper.addClass(`acu-theme-${config.theme}`);
            $wrapper.css(cssProps);
            const $display = $('.acu-data-display');
            $display.removeClass('acu-layout-vertical acu-layout-horizontal').addClass(`acu-layout-${config.layout}`);
        }

        if ($embedded.length) {
             $embedded.removeClass(THEMES.map(t => `acu-theme-${t.id}`).join(' '));
             $embedded.addClass(`acu-theme-${config.theme}`);
             $embedded.css(cssProps);
        }
        const $embDash = $('.acu-embedded-dashboard-container');
        if ($embDash.length) {
             $embDash.removeClass(THEMES.map(t => `acu-theme-${t.id}`).join(' '));
             $embDash.addClass(`acu-theme-${config.theme}`);
             $embDash.css(cssProps);
        }

        injectDatabaseStyles(config);
    };

    const addStyles = () => {
        const { $ } = getCore();
        if (!$) return;
        $(`#${SCRIPT_ID}-styles`).remove();
        let themeCss = '';
        Object.keys(THEME_VARS).forEach(k => {
            const t = THEME_VARS[k];
            themeCss += `.acu-theme-${k} { --acu-bg-nav: ${t.bgNav}; --acu-bg-panel: ${t.bgPanel}; --acu-border: ${t.border}; --acu-text-main: ${t.textMain}; --acu-ui-color: ${t.uiColor || t.textMain}; --acu-text-sub: ${t.textSub}; --acu-btn-bg: ${t.btnBg}; --acu-btn-hover: ${t.btnHover}; --acu-btn-active-bg: ${t.btnActiveBg}; --acu-btn-active-text: ${t.btnActiveText}; --acu-table-head: ${t.tableHead}; --acu-table-hover: ${t.tableHover}; --acu-shadow: ${t.shadow}; --acu-card-bg: ${t.cardBg}; --acu-badge-bg: ${t.badgeBg}; --acu-menu-bg: ${t.menuBg}; --acu-menu-text: ${t.menuText}; --acu-input-bg: ${t.inputBg}; --acu-overlay-bg: ${t.overlayBg}; }\n`;
        });

        const styles = `
            <style id="${SCRIPT_ID}-styles">
                /* 国内镜像字体源，无需VPN */
                @import url('https://fonts.loli.net/css2?family=Long+Cang&family=Ma+Shan+Zheng&family=Noto+Sans+SC:wght@400;700&family=Noto+Serif+SC:wght@400;700&family=ZCOOL+KuaiLe&family=Zhi+Mang+Xing&display=swap');

                .acu-wrapper { --acu-highlight: #d35400; --acu-highlight-bg: rgba(211, 84, 0, 0.1); --acu-title-color: var(--acu-text-main); z-index: 20000; }
                ${themeCss}
                .acu-wrapper { position: relative; width: 100%; margin: 10px 0 10px 0; z-index: 20000; display: flex; flex-direction: column; contain: layout; }
                .acu-nav-container { display: flex; gap: 0; padding: 6px; background: var(--acu-bg-nav); border: 1px solid var(--acu-border); border-radius: 14px; box-shadow: 0 4px 15px var(--acu-shadow); position: relative; z-index: 20001; backdrop-filter: blur(5px); flex-direction: column; }
                .acu-nav-tabs-area { display: grid; grid-template-columns: var(--acu-nav-cols, repeat(auto-fill, minmax(110px, 1fr))); gap: 6px; width: 100%; }
                .acu-nav-separator { width: 100%; height: 1px; border-top: 1px dashed var(--acu-border); margin: 6px 0 6px 0; opacity: 0.6; }
                .acu-nav-actions-area { display: flex; gap: 6px; width: 100%; justify-content: center; align-items: center; background: transparent; padding-top: 4px; }
                .acu-nav-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 5px 2px; border: 1px solid var(--acu-border); background-origin: border-box; border-radius: 8px; background: var(--acu-btn-bg); color: var(--acu-text-main); font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s ease; user-select: none; text-align: center; white-space: nowrap; overflow: hidden; } .acu-nav-btn i { font-size: 0.85em; }
                .acu-nav-btn span { overflow: hidden; text-overflow: ellipsis; }
                .acu-nav-btn:hover { background: var(--acu-btn-hover); transform: translateY(-2px); }
                .acu-nav-btn.active { background: var(--acu-btn-active-bg); color: var(--acu-btn-active-text); box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
                .acu-action-btn { flex: 1; height: 30px; display: flex; align-items: center; justify-content: center; background: var(--acu-btn-bg); border-radius: 8px; color: var(--acu-text-sub); cursor: pointer; border: 1px solid var(--acu-border); transition: all 0.2s; font-size: 10px; }
                .acu-action-btn:hover { background: var(--acu-btn-hover); color: var(--acu-text-main); transform: scale(1.1); border-color: var(--acu-border); }
                #acu-btn-save-global:hover { background: var(--acu-btn-active-bg); color: var(--acu-btn-active-text); }

                .acu-option-panel { display: grid; grid-template-columns: var(--acu-opt-cols, repeat(4, 1fr)); gap: 8px; padding: 8px; background: var(--acu-bg-nav); border: 1px solid var(--acu-border); border-radius: 12px; margin-bottom: 8px; backdrop-filter: blur(5px); width: 100%; box-sizing: border-box; z-index: 20001; contain: layout style; transition: opacity 0.15s ease-out; opacity: 1; }
                .acu-opt-btn { background: var(--acu-card-bg); border: 1px solid var(--acu-border); box-shadow: 0 2px 5px var(--acu-shadow); padding: 8px 15px; border-radius: 8px; cursor: pointer; color: var(--acu-text-main); font-size: var(--acu-opt-font-size); transition: all 0.2s; font-weight: 500; user-select: none; text-align: left; width: 100%; overflow: hidden; white-space: pre-wrap; word-break: break-word; min-height: 38px; display: flex; align-items: center; }
                .acu-opt-btn:focus { outline: none; scroll-margin: 0; }
                .acu-opt-btn:hover { background: var(--acu-highlight); color: #fff; transform: translateY(-2px); border-color: var(--acu-highlight); box-shadow: 0 4px 10px var(--acu-highlight-bg); }
                .acu-opt-btn:active { transform: translateY(0); opacity: 0.8; }
                .acu-opt-header { grid-column: 1 / -1; text-align: center; font-size: 12px; font-weight: bold; color: var(--acu-title-color); padding: 2px 0; border-bottom: 1px dashed var(--acu-border); margin-bottom: 4px; opacity: 0.9; }

                .acu-data-display { position: absolute; bottom: calc(100% +  8px); left: 0; right: 0; max-height: 95vh; height: auto; background: var(--acu-bg-panel); border: 1px solid var(--acu-border); border-radius: 12px; box-shadow: 0 12px 40px var(--acu-shadow); display: none; flex-direction: column; z-index: 20002; animation: popUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); backdrop-filter: blur(8px); overflow: hidden; }
                .acu-data-display.visible { display: flex; }
                .acu-no-anim { animation: none !important; transform: none !important; }
                @keyframes popUp { from { opacity: 0; transform: translateY(15px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

                .acu-wrapper *:focus { scroll-margin: 0 !important; scroll-padding: 0 !important; outline: none !important; }
                .acu-nav-btn, .acu-action-btn, .acu-opt-btn, .acu-page-btn, .acu-header-btn, .acu-btn-block, .acu-dialog-btn, .acu-dash-interactive, .acu-grid-item, .acu-full-item, .acu-inline-item, .acu-editable-title, .acu-tab-btn, .acu-close-pill, .acu-cell-menu-item, .acu-slot-setting-btn { -webkit-tap-highlight-color: transparent; }
                .acu-data-display { contain: layout style; }
                .acu-data-display:not(.visible) { visibility: hidden; pointer-events: none; position: absolute; }

                .acu-panel-header { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--acu-table-head); border-bottom: 1px solid var(--acu-border); border-radius: 12px 12px 0 0; }
                .acu-panel-title { font-weight: bold; color: var(--acu-text-main); display: flex; align-items: center; gap: 8px; white-space: nowrap; font-size: calc(var(--acu-font-size) + 1px); }
                .acu-header-actions { display: flex; align-items: center; gap: 6px; }
                .acu-search-wrapper { position: relative; display: flex; align-items: center; }
                .acu-search-input { height: 32px; box-sizing: border-box; background: var(--acu-btn-bg); border: 1px solid var(--acu-border); color: var(--acu-text-main); padding: 0 10px; border-radius: 8px; font-size: 12px; width: 100px; transition: all 0.2s; }
                .acu-search-input:focus { width: 140px; outline: none; border-color: var(--acu-highlight); background: var(--acu-input-bg); }
                .acu-search-icon { position: absolute; left: 10px; font-size: 10px; color: var(--acu-text-sub); pointer-events: none; }
                
                .acu-header-btn { width:  28px; height:  28px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid var(--acu-border); background: var(--acu-btn-bg); color: var(--acu-text-sub); cursor: pointer; transition: all 0.2s; font-size:  12px; flex-shrink: 0; }
                .acu-header-btn:hover { background: var(--acu-btn-hover); color: var(--acu-text-main); transform: translateY(-1px); border-color: var(--acu-highlight); box-shadow: 0 2px 6px var(--acu-shadow); }
                .acu-header-btn:active { background: var(--acu-btn-active-bg); color: var(--acu-btn-active-text); transform: translateY(0); border-color: transparent; }
                .acu-header-btn#acu-btn-close:hover, .acu-header-btn#qv-close:hover { color: #e74c3c; border-color: #e74c3c; background: var(--acu-btn-hover); }
                .acu-header-btn#acu-btn-close i { transform: scale(1.3); transition: transform 0.2s; }

                .acu-panel-content { flex: 1; padding: 15px; padding-bottom: 10px; background: transparent;  overflow-y: auto; overflow-x: hidden; }
                .acu-panel-content::-webkit-scrollbar, .acu-dash-container::-webkit-scrollbar, .acu-edit-textarea::-webkit-scrollbar, .acu-card-edit-input::-webkit-scrollbar, .acu-settings-content::-webkit-scrollbar, .acu-quick-view-body::-webkit-scrollbar, .acu-dash-npc-grid::-webkit-scrollbar { width: 6px; height: 6px; } 
                
                .acu-panel-content::-webkit-scrollbar-thumb, 
                .acu-dash-container::-webkit-scrollbar-thumb, 
                .acu-edit-textarea::-webkit-scrollbar-thumb, 
                .acu-card-edit-input::-webkit-scrollbar-thumb, 
                .acu-settings-content::-webkit-scrollbar-thumb, 
                .acu-quick-view-body::-webkit-scrollbar-thumb, 
                .acu-dash-npc-grid::-webkit-scrollbar-thumb { 
                    background-color: transparent; 
                    border-radius: 3px; 
                    transition: background-color 0.2s; 
                }
                .acu-show-scroll::-webkit-scrollbar-thumb { 
                    background-color: var(--acu-text-sub) !important; 
                }

                

                .acu-panel-footer { flex: 0 0 auto; padding: 8px; border-top: 1px dashed var(--acu-border); background: var(--acu-table-head); display: flex; justify-content: center; align-items: center; gap: 5px; flex-wrap: wrap; }
                .acu-page-btn { padding: 4px 10px; min-width: 32px; height: 28px; border-radius: 4px; border: 1px solid var(--acu-border); background: var(--acu-btn-bg); color: var(--acu-text-main); cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .acu-page-btn:hover:not(:disabled):not(.active) { background: var(--acu-btn-hover); color: var(--acu-text-main); transform: translateY(-1px); }
                .acu-page-btn.active { background: var(--acu-btn-active-bg); color: var(--acu-btn-active-text); border-color: transparent; box-shadow: 0 2px 6px rgba(0,0,0,0.15); font-weight: bold; }
                .acu-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .acu-page-info { font-size: 12px; color: var(--acu-text-sub); margin: 0 10px; }

                .acu-dash-container { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; height: 100%; padding: 0; overflow: hidden; box-sizing: border-box; font-size: var(--acu-dash-font-size, var(--acu-font-size)); } .acu-dash-col { display: flex; flex-direction: column; gap: 0; height: 100%; overflow: hidden; }
                @media (max-width: 768px) { .acu-dash-container { grid-template-columns: 1fr; overflow-y: auto; display: flex; flex-direction: column; height: auto; } .acu-dash-col { height: auto; flex: none; overflow: visible; } }
                .acu-dash-card { background: var(--acu-card-bg); border-radius: 0; border: none; padding: 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: none; }
                .acu-dash-title { font-size: var(--acu-dash-font-size, var(--acu-font-size)); font-weight: bold; color: var(--acu-highlight); border-bottom: 1px dashed var(--acu-border); padding-bottom: 8px; margin-bottom: 4px; display: flex; justify-content: center; align-items: center; }
                .acu-dash-char-info { display: flex; flex-direction: column; gap: 10px; } @media (min-width: 769px) { .acu-dash-top-kv { display: grid !important; grid-template-columns: 1fr 1fr; } }
                .acu-dash-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--acu-btn-bg); border-radius: 8px; }
                .acu-dash-stat-label { color: var(--acu-text-sub); font-size: 0.9em; }
                .acu-dash-stat-val { color: var(--acu-text-main); font-weight: bold; font-size: 1.1em; }
                .acu-dash-npc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; height: 100%; overflow-y: auto; padding-right: 4px; scrollbar-width: thin; align-content: start; }
                
                
                .acu-dash-npc-item { background: var(--acu-table-head); padding: 10px; border-radius: 8px; cursor: default; text-align: center; border: 1px solid transparent; transition: all 0.2s; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--acu-text-main); font-size: 1em; }
                .acu-dash-npc-item:hover { border-color: var(--acu-highlight); color: var(--acu-highlight); background: var(--acu-btn-bg); }
                .acu-dash-sub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: auto; }
                .acu-dash-list-item { padding: 6px 0; border-bottom: 1px solid var(--acu-border); color: var(--acu-text-sub); font-size: 1em; display: flex; align-items: center; gap: 6px; cursor: default; }
                .acu-dash-list-item:hover { color: var(--acu-text-main); padding-left: 4px; }
                .acu-dash-list-item i { font-size: 0.8em; color: var(--acu-highlight); }
                
                .acu-dash-interactive { cursor: pointer !important; position: relative; }
                
                
                .acu-tab-header { display: flex; gap: 5px; border-bottom: 1px solid var(--acu-border); margin-bottom: 10px; }
                .acu-tab-btn { padding: 6px 12px; cursor: pointer; font-size: var(--acu-dash-font-size, var(--acu-font-size)); font-weight: bold; color: var(--acu-text-sub); border-bottom: none; transition: all 0.2s; flex: 1; text-align: center; }
                .acu-tab-btn:hover { color: var(--acu-text-main); background: var(--acu-table-hover); border-radius: 4px 4px 0 0; }
                .acu-tab-btn.active { color: var(--acu-highlight);  }
                .acu-tab-pane { display: none; animation: fadeIn 0.3s; }
                .acu-tab-pane.active { display: block; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .acu-quick-view-overlay { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; background: var(--acu-overlay-bg) !important; z-index: 2147483648 !important; display: flex !important; justify-content: center !important; align-items: center !important; backdrop-filter: blur(4px); }
                .acu-quick-view-card { background: var(--acu-card-bg); border-radius: 12px; border: 1px solid var(--acu-border); box-shadow: 0 15px 50px var(--acu-shadow); width: 90%; max-width: 450px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; animation: popUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); color: var(--acu-text-main); }
                .acu-quick-view-header { padding: 5px; background: var(--acu-table-head); border-bottom: 1px solid var(--acu-border); font-weight: bold; display: flex; justify-content: space-between; align-items: center; font-size: 1.1em; color: var(--acu-highlight); }
                .acu-quick-view-body { padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; scrollbar-width: thin; }
                
                

                .acu-layout-vertical .acu-card-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; }
                .acu-layout-vertical .acu-data-card { flex: 0 0 var(--acu-card-width, 280px); width: var(--acu-card-width, 280px); }
                .acu-layout-horizontal .acu-panel-content { display: block; white-space: nowrap; overflow-x: auto !important; overflow-y: hidden; }
                .acu-layout-horizontal .acu-card-grid { display: inline-flex; flex-wrap: nowrap; gap: 14px; height: 100%; align-items: flex-start; padding-bottom: 10px; min-width: 100%; }
                .acu-layout-horizontal .acu-data-card { flex: 0 0 var(--acu-card-width, 280px); width: var(--acu-card-width, 280px); max-height: 98%; overflow-y: auto; white-space: normal; }

                .acu-data-card { background: var(--acu-card-bg); border: 1px solid var(--acu-border); box-shadow: 0 2px 8px var(--acu-shadow); border-radius: 12px; transition: all 0.25s ease; display: flex; flex-direction: column; position: relative; overflow: hidden; }
                
                .acu-layout-vertical .acu-data-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px var(--acu-shadow); z-index: 5; }
                .acu-card-header { padding: 6px 10px; background: var(--acu-table-head); border-bottom: 1px dashed var(--acu-border); border-radius: 12px 12px 0 0; font-weight: bold; color: var(--acu-title-color); font-size: 14px; display: flex; justify-content: center; align-items: center; position: relative; flex: 0 0 auto; }
                .acu-editable-title { cursor: pointer; border-bottom: 1px dashed transparent; transition: all 0.2s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: calc(var(--acu-font-size) + 1px); font-weight: 800; text-align: center; width: 100%; padding: 2px 5px; border-radius: 4px; }
                .acu-editable-title:hover { background: var(--acu-table-hover); color: var(--acu-highlight); }
                .acu-card-index { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 10px; color: var(--acu-text-sub); font-weight: normal; background: var(--acu-badge-bg); padding: 1px 6px; border-radius: 8px; opacity: 0.8; }
                .acu-card-body { padding: 0; display: flex; flex-direction: column; gap: 0; font-size: var(--acu-font-size, 13px); }
                .acu-card-main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px; }
                .acu-grid-item { display: flex; flex-direction: column; gap: 2px; padding: 4px 6px; border-radius: 6px; cursor: pointer; overflow: hidden; border: 1px solid var(--acu-border); background: rgba(0,0,0,0.02); }
                .acu-grid-item:hover { background: var(--acu-table-hover); }
                .acu-grid-label { font-size: var(--acu-font-size, 13px); color: var(--acu-title-color); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .acu-grid-value { font-size: var(--acu-font-size, 13px); color: var(--acu-text-main); font-weight: 500; white-space: pre-wrap; word-break: break-word; line-height: 1.35; }
                .acu-card-full-area { display: flex; flex-direction: column; gap: 0; padding: 0 12px 10px 12px; }
                .acu-full-item { display: flex; flex-direction: column; gap: 2px; padding: 4px 6px; border-radius: 6px; border: 1px solid var(--acu-border); background: rgba(0,0,0,0.02); cursor: pointer; margin-top: 4px; }
                .acu-full-item:hover { background: var(--acu-table-hover); }
                .acu-full-label { font-size: var(--acu-font-size, 13px); color: var(--acu-title-color); font-weight: bold; }
                .acu-full-value { font-size: var(--acu-font-size, 13px); color: var(--acu-text-main); line-height: 1.4; word-break: break-all; white-space: pre-wrap; max-height: var(--acu-text-max-height, 80px); overflow-y: var(--acu-text-overflow, auto); scrollbar-width: none; }
                
                .acu-inline-item { display: block; padding: 2px 8px; border-bottom: 1px dashed var(--acu-border); cursor: pointer; max-height: var(--acu-text-max-height, 80px); overflow-y: var(--acu-text-overflow, auto); scrollbar-width: none; }
                .acu-inline-item:last-child { border-bottom: none; }
                .acu-inline-item:hover { background: var(--acu-table-hover); }
                .acu-inline-label { display: inline; color: var(--acu-title-color); font-weight: bold; font-size: var(--acu-font-size, 13px); line-height: 1.4; margin-right: 4px; }
                .acu-inline-label::after { content: '：'; }
                .acu-inline-value { display: inline; color: var(--acu-text-main); font-size: var(--acu-font-size, 13px); line-height: 1.4; word-break: break-word; white-space: pre-wrap; }
                .acu-inline-value.acu-highlight-changed { display: inline; }

                .acu-highlight-changed { color: var(--acu-highlight) !important; background-color: var(--acu-highlight-bg); border-radius: 4px; padding: 0 4px; font-weight: bold; animation: pulse-highlight 2s infinite; display: inline-block; }
                .acu-badge-pending { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); width: 80px; height: 80px; border: 4px solid #e74c3c; border-radius: 50%; color: #e74c3c; font-size: 20px; font-weight: 900; display: flex; align-items: center; justify-content: center; z-index: 50; pointer-events: none; opacity: 0.6; box-shadow: inset 0 0 10px rgba(231, 76, 60, 0.2); background: rgba(255,255,255,0.1); }
                @keyframes pulse-highlight { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
                @keyframes acu-shake { 0% { transform: rotate(0deg); } 25% { transform: rotate(10deg); } 50% { transform: rotate(0deg); } 75% { transform: rotate(-10deg); } 100% { transform: rotate(0deg); } }
                .acu-save-alert { animation: acu-shake 0.4s ease-in-out infinite; color: #fff !important; background-color: #e74c3c !important; text-shadow: 0 0 5px rgba(231, 76, 60, 0.5); border-color: #c0392b !important; }
                
                .acu-menu-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: transparent; z-index: 2147483640; }
                .acu-cell-menu { position: fixed !important; background: var(--acu-menu-bg) !important; border: 1px solid var(--acu-border) !important; color: var(--acu-text-main) !important; box-shadow: 0 6px 20px var(--acu-shadow) !important; z-index: 2147483647 !important; border-radius: 8px; overflow: hidden; min-width: 150px; backdrop-filter: blur(5px); }
                .acu-cell-menu-item { padding: 12px 16px; cursor: pointer; font-size: 14px; display: flex; gap: 12px; align-items: center; color: var(--acu-text-main); font-weight: 500; background: transparent; }
                .acu-cell-menu-item:hover { background-color: var(--acu-table-hover); }
                .acu-cell-menu-item#act-delete { color: #e74c3c; }
                .acu-cell-menu-item#act-restore { color: #27ae60; }

                .acu-edit-overlay { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; background: var(--acu-overlay-bg) !important; z-index: 2147483646 !important; display: flex !important; justify-content: center !important; align-items: center !important; backdrop-filter: blur(2px); }
                .acu-edit-dialog { background-color: var(--acu-bg-panel) !important; width: 90%; max-width: 900px; max-height: 85vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 15px 50px var(--acu-shadow); color: var(--acu-text-main) !important; border: 1px solid var(--acu-border); margin: auto !important; overflow: hidden; padding: 0; }
                .acu-edit-title { flex: 0 0 auto; margin: 0; padding: 20px 24px; font-size: 16px; font-weight: bold; color: var(--acu-text-main); border-bottom: 1px solid var(--acu-border); }
                .acu-settings-content { flex: 1; overflow-y: auto; padding: 20px 24px; display: block; }
                .acu-edit-textarea { width: 100%; height: 500px; padding: 12px; border: 1px solid var(--acu-border); background-color: var(--acu-input-bg) !important; color: var(--acu-text-main) !important; border-radius: 6px; resize: vertical; box-sizing: border-box; font-size: 14px; line-height: 1.5; font-family: monospace; }
                .acu-dialog-btns { flex: 0 0 auto; display: flex; justify-content: center; gap: 20px; padding: 16px 24px; border-top: 1px solid var(--acu-border); background: var(--acu-bg-panel); }
                .acu-dialog-btn { background: none; border: none; cursor: pointer; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 6px; color: var(--acu-text-sub); transition: color 0.2s; }
                .acu-order-controls { display: none; width: 100%; text-align: center; background: var(--acu-table-head); padding: 5px; margin-bottom: 5px; border-radius: 4px; border: 1px dashed var(--acu-border); }
                .acu-order-controls.visible { display: block; }
                .acu-nav-container.editing-order .acu-nav-btn, .acu-nav-container.editing-order .acu-action-btn { border: 1px dashed #f0ad4e; cursor: grab; opacity: 0.8; }
                .acu-divider { width: 1px; height: 18px; background: var(--acu-border); margin: 0 6px; }
                .acu-nav-container.collapsed > *:not(#acu-btn-toggle):not(.acu-collapsed-text) { display: none !important; }
                .acu-nav-container.collapsed { width: 100%; justify-content: center; cursor: pointer; padding: 8px 0; flex-direction: column; gap: 0; height: auto; transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1); }
                .acu-nav-container.collapsed.acu-collapse-pill { width: auto !important; border-radius: 50px; padding: 8px 25px; margin-top: 5px; box-shadow: 0 5px 15px var(--acu-shadow); background: var(--acu-bg-nav); border: 1px solid var(--acu-border); }
                .acu-nav-container.collapsed.acu-collapse-pill.acu-pill-center { align-self: center; }
                .acu-nav-container.collapsed.acu-collapse-pill.acu-pill-left { align-self: flex-start; margin-left: 15px; }
                .acu-nav-container.collapsed.acu-collapse-pill.acu-pill-right { align-self: flex-end; margin-right: 15px; }
                .acu-nav-container.collapsed.acu-collapse-pill:hover { transform: scale(1.05); border-color: var(--acu-highlight); color: var(--acu-highlight); }
                .acu-nav-container.collapsed.acu-collapse-pill #acu-btn-toggle { display: none !important; }
                .acu-nav-container.collapsed.acu-collapse-pill .acu-collapsed-text { display: block; font-size: 12px; margin: 0; font-weight: bold; }
                .acu-nav-container.collapsed #acu-btn-toggle { background: transparent; border: none; width: 100%; pointer-events: none; height: 24px; }
                .acu-collapsed-text { display: none; font-size: 12px; color: var(--acu-text-sub); margin-top: 2px; text-align: center; width: 100%; pointer-events: none; font-weight: bold; letter-spacing: 1px; }
                .acu-nav-container.collapsed .acu-collapsed-text { display: block; }

                .acu-height-drag-handle { cursor: ns-resize !important; touch-action: none; }
                .acu-height-drag-handle.active { color: var(--acu-highlight); background: var(--acu-table-hover); }
                
                .acu-btn-block { width: 100%; padding: 10px; background: var(--acu-table-head); color: var(--acu-text-main); border: 1px solid var(--acu-border); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; }
                
                

                

                .acu-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; -webkit-tap-highlight-color: transparent; }
                .acu-switch input { opacity: 0; width: 0; height: 0; }
                .acu-switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .3s; border-radius: 22px; }
                .acu-switch-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
                .acu-switch input:checked + .acu-switch-slider { background-color: var(--acu-highlight); opacity: 1; box-shadow: 0 0 8px var(--acu-highlight); filter: brightness(1.3); }
                .acu-switch input:checked + .acu-switch-slider:before { transform: translateX(18px); }
                
                .acu-card-edit-field { margin-bottom: 10px; }
                .acu-card-edit-label { display: block; font-size: 12px; color: var(--acu-highlight); font-weight: bold; margin-bottom: 4px; }
                .acu-card-edit-input { width: 100%; min-height: 38px; padding: 8px; border: 1px solid var(--acu-border); background: var(--acu-input-bg); color: var(--acu-text-main); border-radius: 6px; resize: none; overflow-y: hidden; line-height: 1.4; font-family: inherit; font-size: 14px; box-sizing: border-box; }
                .acu-card-edit-input:focus { border-color: var(--acu-highlight); outline: none; }
                .acu-cell-menu-item#act-edit-card { color: var(--acu-highlight); }
                .acu-cell-menu-item#act-insert { color: #2980b9; }
                .acu-wrapper button:focus, .acu-edit-dialog button:focus, .acu-cell-menu button:focus { outline: none !important; }
                
                
                .acu-nav-container {
                    backdrop-filter: blur(16px) saturate(150%);
                    -webkit-backdrop-filter: blur(16px) saturate(150%);
                }
                .acu-data-display {
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                }
                
                .acu-theme-aurora .acu-data-card::before, .acu-theme-sunset .acu-data-card::before, .acu-theme-starship .acu-data-card::before, .acu-theme-sky .acu-data-card::before {
                    content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(135deg, var(--acu-highlight), var(--acu-text-sub));
                    border-radius: inherit; z-index: -1; opacity: 0; transition: opacity 0.3s ease; filter: blur(8px);
                }
                .acu-data-card:hover::before { opacity: 0.3; }
                
                @media (max-width: 768px) {
                    .acu-nav-btn {
                        padding: 8px 1px !important;
                        font-size: 11px !important;
                    } .acu-nav-btn i { font-size: 0.85em; }
                    .acu-nav-actions-area {
                         padding-top: 2px !important;
                         gap: 8px !important;
                         display: flex !important;
                         width: 100% !important;
                    }
                    .acu-action-btn {
                         width: auto !important;
                         flex: 1 !important;
                         height: 30px !important;
                         border-radius: 8px !important;
                         background: var(--acu-btn-bg);
                         margin: 0 !important;
                    }
                    .acu-option-panel {
                         grid-template-columns: 1fr !important;
                    }
                    .acu-opt-btn {
                         white-space: normal !important;
                         height: auto !important;
                    }
                }

                
                .acu-edit-dialog.acu-theme-aurora, .acu-edit-dialog.acu-theme-starship, .acu-edit-dialog.acu-theme-sunset, .acu-edit-dialog.acu-theme-sky {
                     background-image: none !important;
                }
                .acu-edit-dialog.acu-theme-aurora { background-color: #141210 !important; }
                .acu-edit-dialog.acu-theme-aurora textarea, .acu-edit-dialog.acu-theme-aurora input { background-color: #211d1a !important; border-color: rgba(128, 39, 36, 0.55) !important; color: #ded7c9 !important; }
                
                .acu-edit-dialog.acu-theme-starship { background-color: #0b0f19 !important; }
                .acu-edit-dialog.acu-theme-starship textarea, .acu-edit-dialog.acu-theme-starship input { background-color: #1e293b !important; }

                .acu-edit-dialog.acu-theme-sunset { background-color: #fffbf0 !important; }
                .acu-edit-dialog.acu-theme-sunset textarea, .acu-edit-dialog.acu-theme-sunset input { background-color: #ffffff !important; border-color: #fed7aa !important; }
                .acu-edit-dialog.acu-theme-sky { background-color: #f0f9ff !important; }
                .acu-edit-dialog.acu-theme-sky textarea, .acu-edit-dialog.acu-theme-sky input { background-color: #ffffff !important; border-color: #bae6fd !important; }
                
                .acu-edit-dialog.acu-theme-neon textarea input { background-color: #1a1a1a !important; border-color: #d946ef !important; color: #00ffcc !important; }
                
                .acu-theme-modern .acu-opt-btn { background: var(--acu-btn-bg) !important; }
                
                .acu-full-value::-webkit-scrollbar, 
                .acu-inline-item::-webkit-scrollbar, 
                .acu-no-scrollbar::-webkit-scrollbar, .acu-data-card::-webkit-scrollbar { 
                    display: none !important; 
                    width: 0 !important; 
                    height: 0 !important; 
                    background: transparent !important;
                }
    
            .acu-embedded-dashboard-container .acu-dash-container { gap: 0 !important; padding: 0 !important; }
                .acu-embedded-dashboard-container .acu-dash-col { gap: 0 !important; }
                .acu-embedded-dashboard-container .acu-dash-card { border-radius: 0 !important; box-shadow: none !important; border: none !important; margin: 0 !important; } @media (max-width: 768px) { .acu-embedded-dashboard-container .acu-dash-container { overflow: visible !important; height: auto !important; } } /* 全局隐藏仪表盘卡槽滚动条 (嵌入+悬浮) */ .acu-dash-npc-grid::-webkit-scrollbar, .acu-dash-char-info::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; background: transparent !important; } .acu-dash-npc-grid, .acu-dash-char-info { scrollbar-width: none !important; -ms-overflow-style: none !important; } .acu-theme-aurora .acu-dash-card { background: rgba(34, 31, 28, 0.97) !important; } .acu-theme-starship .acu-dash-card { background: rgba(30, 27, 75, 0.95) !important; } .acu-theme-sky .acu-dash-card { background: rgba(240, 249, 255, 0.95) !important; } 
            </style>
        `;
        $('head').append(styles);
    };

    const getTableData = () => { const api = getCore().getDB(); return api && api.exportTableAsJson ? api.exportTableAsJson() : null; };
    
    const updateSaveBtnState = () => {
        const { $ } = getCore();
        if (!$) return;
        const $btn = $('#acu-btn-save-global');
        if (pendingDeletes.size > 0) {
            $btn.addClass('acu-save-alert');
        } else {
            $btn.removeClass('acu-save-alert');
        }
    };

    const saveDataToDatabase = async (tableData, skipRender = false, commitDeletes = false) => {
        if (isSaving) return false;
        if (tableData && typeof tableData === 'object') {
            if (!tableData.mate) {
                tableData.mate = { type: 'chatSheets', version: 1 };
            }
            if (!Object.keys(tableData).some(k => k.startsWith('sheet_'))) {
                if (tableData.content && tableData.name) {
                    const tempKey = tableData.uid || ('sheet_' + Math.random().toString(36).substr(2, 9));
                    const wrapper = { mate: { type: 'chatSheets', version: 1 } };
                    wrapper[tempKey] = tableData;
                    tableData = wrapper;
                }
            }
        }
        const { $ } = getCore();
        const $saveBtn = $('#acu-btn-save-global');
        let originalIcon = '';

        const executeCoreSave = async () => {
            isSaving = true;

            if (commitDeletes && pendingDeletes.size > 0) {
                 for (const sheetId in tableData) {
                      const sheet = tableData[sheetId];
                     if (!sheet || !sheet.name || !sheet.content) continue;
                     const newContent = [sheet.content[0]];
                     for (let i = 1; i < sheet.content.length; i++) {
                         const realIdx = i - 1;
                         if (!pendingDeletes.has(`${sheet.name}-row-${realIdx}`)) {
                             newContent.push(sheet.content[i]);
                          }
                     }
                     sheet.content = newContent;
                 }
            }

            const api = getCore().getDB();
            let injectedDirectly = false;

            try {
                let ST = window.SillyTavern || (window.parent ? window.parent.SillyTavern : null);
                if (!ST && window.top && window.top.SillyTavern) ST = window.top.SillyTavern;

                let isolationKey = '';
                const STORAGE_KEY_V5_SETTINGS = 'shujuku_v34_allSettings_v2';
                try {
                    let storage = window.localStorage;
                    if (!storage.getItem(STORAGE_KEY_V5_SETTINGS) && window.parent) {
                        try { storage = window.parent.localStorage; } catch(e){}
                    }
                    const settingsStr = storage.getItem(STORAGE_KEY_V5_SETTINGS);
                    if (settingsStr) {
                        const settings = JSON.parse(settingsStr);
                        if (settings.dataIsolationEnabled && settings.dataIsolationCode) {
                            isolationKey = settings.dataIsolationCode;
                        }
                    }
                } catch (e) { }

                if (ST && ST.chat && ST.chat.length > 0) {
                    let targetMsg = null;
                    for (let i = ST.chat.length - 1; i >= 0; i--) {
                        if (!ST.chat[i].is_user) {
                            targetMsg = ST.chat[i];
                            break;
                        }
                    }

                    if (targetMsg) {
                        if (!targetMsg.TavernDB_ACU_IsolatedData) targetMsg.TavernDB_ACU_IsolatedData = {};
                        if (!targetMsg.TavernDB_ACU_IsolatedData[isolationKey]) {
                            targetMsg.TavernDB_ACU_IsolatedData[isolationKey] = {
                                independentData: {},
                                modifiedKeys: [],
                                updateGroupKeys: []
                            };
                        }

                        const tagData = targetMsg.TavernDB_ACU_IsolatedData[isolationKey];
                        if (!tagData.independentData) tagData.independentData = {};

                        const sheetsToSave = Object.keys(tableData).filter(k => k.startsWith('sheet_'));
                        sheetsToSave.forEach(k => {
                            tagData.independentData[k] = JSON.parse(JSON.stringify(tableData[k]));
                        });

                        const existingKeys = tagData.modifiedKeys || [];
                        tagData.modifiedKeys = [...new Set([...existingKeys, ...sheetsToSave])];

                        if (ST.saveChat) {
                            await ST.saveChat();
                            injectedDirectly = true;
                        }
                    }
                }
            } catch (directErr) { console.error(directErr); }

            let apiSuccess = false;
            if (api && api.importTableAsJson) {
                apiSuccess = await api.importTableAsJson(JSON.stringify(tableData));
            }

            return apiSuccess || injectedDirectly;
        };

        try {
            if (!skipRender) {
                originalIcon = $saveBtn.html();
                $saveBtn.html('<i class="fa-solid fa-spinner fa-spin"></i>').prop('disabled', true);
            }

            await UpdateController.runSilently(executeCoreSave);

            if (!skipRender) {
                if (window.toastr) window.toastr.success('保存成功！');
                $('.acu-highlight-changed').removeClass('acu-highlight-changed');
                currentDiffMap.clear();
                if (commitDeletes) { pendingDeletes.clear(); updateSaveBtnState(); }
                saveSnapshot(tableData);
                renderInterface();
            }
            return true;
        } catch (e) {
            console.error("Save failed:", e);
            if (!skipRender && window.toastr) window.toastr.error('保存失败');
            return false;
        } finally {
            isSaving = false;
            if (!skipRender && $saveBtn.length) {
                $saveBtn.html(originalIcon || '<i class="fa-solid fa-save"></i>').prop('disabled', false);
            }
        }
    };

    const applyCellEditWithCrud = async (tableName, rowIndex, columnName, value) => {
        if (!tableName || !columnName) return false;
        return applyMfrsCrudPlan({
            action: 'updateCell',
            table: tableName,
            match: { rowIndex: rowIndex + 1 },
            column: columnName,
            value: value ?? '',
            reason: 'v10.2 可视化器单元格编辑',
            confidence: 1
        }, '单元格快照保存');
    };

    const applyRowEditWithCrud = async (tableName, rowIndex, changes) => {
        if (!tableName || !changes || Object.keys(changes).length === 0) return false;
        return applyMfrsCrudPlan({
            action: 'updateCell',
            table: tableName,
            match: { rowIndex: rowIndex + 1 },
            set: changes,
            reason: 'v10.2 可视化器整体编辑',
            confidence: 1
        }, '整行快照保存');
    };

    const buildPendingDeletePlans = (tableData) => {
        const plans = [];
        if (!tableData || !pendingDeletes.size) return plans;
        for (const sheetId in tableData) {
            const sheet = tableData[sheetId];
            if (!sheet || !sheet.name || !Array.isArray(sheet.content)) continue;
            const prefix = `${sheet.name}-row-`;
            for (const deleteKey of pendingDeletes) {
                if (!String(deleteKey).startsWith(prefix)) continue;
                const realIndex = Number(String(deleteKey).slice(prefix.length));
                if (!Number.isInteger(realIndex) || realIndex < 0) continue;
                const contentIndex = realIndex + 1;
                const row = sheet.content[contentIndex];
                if (!Array.isArray(row)) continue;
                plans.push({
                    action: 'deleteRow',
                    table: sheet.name,
                    match: row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== ''
                        ? { row_id: row[0] }
                        : { rowIndex: contentIndex },
                    reason: 'v10.2 可视化器待删除行提交',
                    confidence: 1
                });
            }
        }
        return plans;
    };

    const commitPendingDeletesWithCrud = async (tableData) => {
        if (!isMfrsCrudMigrationEnabled() || pendingDeletes.size === 0) return false;
        const plans = buildPendingDeletePlans(tableData);
        if (plans.length !== pendingDeletes.size) return false;
        for (const plan of plans) {
            const preview = await previewMfrsCrudPlan(plan);
            if (!preview || !preview.ok) {
                console.warn('[MFRS Visualizer] 删除行 CRUD 预检失败，回退旧保存路径。', { plan, preview });
                if (window.toastr) window.toastr.warning(`删除行 CRUD 预检失败，已回退旧保存路径：${formatTableChangeErrors(preview?.errors)}`);
                return false;
            }
        }
        for (const plan of plans) {
            const ok = await applyMfrsCrudPlan(plan, '删除快照保存');
            if (!ok) return false;
        }
        pendingDeletes.clear();
        updateSaveBtnState();
        currentDiffMap.clear();
        $('.acu-highlight-changed').removeClass('acu-highlight-changed');
        const latestData = getTableData();
        if (latestData) saveSnapshot(latestData);
        renderInterface();
        if (window.toastr) window.toastr.success('已通过 CRUD 删除选中行。');
        return true;
    };

    const processJsonData = (json) => {
        const tables = {};
        if (!json || typeof json !== 'object') return {};
        for (const sheetId in json) {
            if (json[sheetId]?.name) {
                 const sheet = json[sheetId];
                tables[sheet.name] = { key: sheetId, headers: sheet.content[0] || [], rows: sheet.content.slice(1) };
            }
        }
        return Object.keys(tables).length > 0 ? tables : null;
    };
    
    const showSettingsModal = () => {
        const { $ } = getCore();
        $('.acu-edit-overlay').remove();
        const config = getConfig();
        const rawData = getTableData();
        const allTableNames = rawData ? Object.keys(processJsonData(rawData)) : [];
        const reversedTables = getReverseOrderTables();
        const hiddenTables = getHiddenTables();
        
        const modalStyles = `
        <style>
            .acu-edit-overlay { 
                position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0, 0, 0, 0.5) !important; 
                backdrop-filter: blur(3px); 
                z-index: 2147483647 !important; 
                display: flex !important; 
                align-items: center; justify-content: center;
                opacity: 0; animation: acuFadeIn 0.2s forwards;
            }
            .acu-edit-dialog { 
                background: var(--acu-bg-panel) !important; 
                color: var(--acu-text-main) !important; 
                border: 1px solid var(--acu-border) !important; 
                display: flex; flex-direction: column;
                box-shadow: 0 10px 50px rgba(0,0,0,0.3) !important;
                transition: background 0.3s, box-shadow 0.3s, opacity 0.3s, transform 0.3s;
                overflow: hidden;
            }
            @media (min-width: 769px) {
                .acu-edit-dialog { 
                    width: 60% !important; max-width: 800px !important; min-width: 400px;
                    height: auto !important; max-height: 70vh !important;
                    border-radius: 16px !important;
                    margin: auto !important;
                }
            }
            @media (max-width: 768px) {
                .acu-edit-overlay {
                    display: block !important;
                    height: 100vh !important;
                    height: 100dvh !important;
                }
                .acu-edit-dialog {
                    position: absolute !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    margin: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    height: 70vh !important;
                    border-radius: 20px 20px 0 0 !important;
                    animation: acuSlideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
                    transform-origin: bottom center;
                }
            }
            @keyframes acuFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes acuSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .acu-control-row {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 0;
                border-bottom: 1px dashed var(--acu-border);
            }
            .acu-control-row:last-child { border-bottom: none; }
            .acu-label-col { display: flex; flex-direction: column; gap: 4px; max-width: 60%; }
            .acu-label-main { font-size: 12px; font-weight: bold; color: var(--acu-text-main); }
            .acu-label-sub { font-size: 10px; color: var(--acu-text-sub); }
            .acu-input-col { width: 40%; display: flex; justify-content: flex-end; align-items: center; }
			.acu-switch {
				position: relative; display: inline-block; width: 40px; height: 20px;
                -webkit-tap-highlight-color: transparent;
			}
			.acu-switch input { opacity: 0; width: 0; height: 0; }
            .acu-slider-switch {
                position: absolute; cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: var(--acu-border);
                transition: .4s; border-radius: 34px;
                border: 1px solid rgba(0,0,0,0.15);
                box-sizing: border-box;
            }
            .acu-slider-switch:before {
                position: absolute; content: "";
                height: 16px; width: 16px; left: 1px; bottom: 1px;
                background-color: white; transition: .4s; border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
			input:checked + .acu-slider-switch { background-color: var(--acu-ui-color) !important; border: 1px solid var(--acu-ui-color) !important; opacity: 1 !important; }
			input:checked + .acu-slider-switch:before { transform: translateX(20px); background-color: #ffffff !important; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
            .acu-sub-setting {
                background: rgba(0,0,0,0.02);
                padding-left: 20px !important;
                display: none;
            }
            .acu-color-row {
                display: flex; gap: 8px; justify-content: flex-end; flex-wrap: nowrap;
            }
            .acu-color-circle {
                width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
                border: 2px solid transparent; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                position: relative;
                flex-shrink: 0;
                -webkit-tap-highlight-color: transparent;
                outline: none;
            }
            .acu-color-circle:hover { transform: scale(1.15); }
            .acu-color-circle:active { transform: scale(0.9); }
            .acu-color-circle.selected {
                border-color: var(--acu-ui-color);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                transform: scale(1.25);
            }
            .acu-color-circle.selected::after {
                content: ''; position: absolute; top: 50%; left: 50%;
                width: 6px; height: 6px; background: var(--acu-ui-color);
                border-radius: 50%; transform: translate(-50%, -50%);
                opacity: 0.7;
            }
            .acu-nice-select {
                appearance: none !important; border: 1px solid var(--acu-border) !important; background-color: var(--acu-btn-bg) !important;
                color: var(--acu-text-main) !important; padding: 6px 24px 6px 10px !important; border-radius: 8px !important;
                font-size: 12px !important; text-align: center !important; font-weight: bold !important; outline: none !important; box-shadow: none !important;
                background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") !important;
                background-repeat: no-repeat !important; background-position: right 8px center !important; background-size: 10px !important;
                min-width: 100px !important;
            }
            .acu-nice-slider { width: 100% !important; height: 6px !important; background: var(--acu-text-sub) !important; opacity: 0.5; border-radius: 3px !important; outline: none !important; appearance: none !important; }
            .acu-nice-slider::-webkit-slider-thumb { appearance: none !important; width: 20px !important; height: 20px !important; background: var(--acu-text-main) !important; border: 2px solid var(--acu-highlight) !important; border-radius: 50% !important; cursor: pointer !important; box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important; }
            .acu-settings-group { background: var(--acu-table-head); border-radius: 12px; padding: 0 15px; margin-bottom: 10px; border: 1px solid rgba(0,0,0,0.05); }
            .acu-edit-header { padding: 10px 20px; border-bottom: 1px solid var(--acu-border); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.02); }
            .acu-close-pill {
                background-color: var(--acu-ui-color) !important;
                color: var(--acu-menu-bg) !important;
                border: none !important;
                padding: 6px 20px;
                border-radius: 20px;
                font-weight: bold; font-size: 12px;
                cursor: pointer;
                box-shadow: 0 4px 10px var(--acu-highlight-bg);
                transition: transform 0.2s, filter 0.2s;
                display: inline-flex; align-items: center; justify-content: center;
            }
            .acu-close-pill:hover {
                filter: brightness(0.85);
                transform: scale(1.05);
            }
            .acu-btn-block {
                width: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                background: var(--acu-btn-bg);
                color: var(--acu-text-main);
                border: 1px solid var(--acu-border);
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.2s;
                text-align: center;
            }
            .acu-btn-block:hover {
                background: var(--acu-btn-hover);
            }
            

            .acu-edit-overlay.acu-transparent-mode { background: transparent !important; backdrop-filter: none !important; }
            .acu-edit-overlay.acu-transparent-mode .acu-edit-dialog { background: transparent !important; box-shadow: none !important; border: none !important; }
            .acu-edit-overlay.acu-transparent-mode .acu-edit-dialog > *:not(.acu-settings-content) { opacity: 0; pointer-events: none; }
            .acu-edit-overlay.acu-transparent-mode .acu-settings-group { background: transparent !important; border: none !important; }
            .acu-edit-overlay.acu-transparent-mode .acu-control-row { opacity: 0; pointer-events: none; }
            .acu-edit-overlay.acu-transparent-mode .acu-settings-content > div:not(.acu-settings-group) { opacity: 0; pointer-events: none; }
            .acu-edit-overlay.acu-transparent-mode .acu-control-row.acu-active-control { opacity: 1; pointer-events: auto; background: var(--acu-bg-panel); border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); border: 1px solid var(--acu-border); }
            
            .acu-theme-aurora .acu-slider-switch { background-color: rgba(226, 232, 240, 0.2) !important; border-color: rgba(226, 232, 240, 0.2) !important; opacity: 1 !important; }
            .acu-theme-aurora input:checked + .acu-slider-switch { background-color: var(--acu-border) !important; border-color: var(--acu-border) !important; opacity: 1 !important; }
        
            
            .acu-edit-dialog ::-webkit-scrollbar { width: 6px; height: 6px; }
            .acu-edit-dialog ::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 3px; transition: background-color 0.2s; } 
            
            .acu-stepper { display: flex; align-items: center; border: 1px solid var(--acu-border); border-radius: 8px; background: var(--acu-btn-bg); overflow: hidden; width: 100%; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
            .acu-step-btn { background: transparent; border: none; color: var(--acu-text-main); width: 36px; height: 32px; flex: 0 0 36px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; font-size: 14px; }
            .acu-step-btn:hover { background: var(--acu-btn-hover); color: var(--acu-highlight); }
            .acu-step-btn:active { background: var(--acu-btn-active-bg); color: var(--acu-btn-active-text); }
            .acu-step-val { flex: 1; text-align: center; font-weight: bold; font-size: 14px; color: var(--acu-text-main); user-select: none; border-left: 1px solid var(--acu-border); border-right: 1px solid var(--acu-border); height: 32px; display: flex; align-items: center; justify-content: center; background: var(--acu-input-bg); }
.acu-edit-dialog .acu-show-scroll::-webkit-scrollbar-thumb { background-color: var(--acu-text-sub); }
        
            .acu-custom-color-btn { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); position: relative; flex-shrink: 0; -webkit-tap-highlight-color: transparent; outline: none; box-sizing: content-box; overflow: hidden; }
            .acu-custom-color-btn:hover { transform: scale(1.15); }
            .acu-custom-color-btn:active { transform: scale(0.9); }
            .acu-custom-color-btn.selected { border-color: var(--acu-ui-color); box-shadow: 0 4px 12px rgba(0,0,0,0.2); transform: scale(1.25); }
            .acu-custom-color-btn.selected::after { content: ''; position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; background: var(--acu-ui-color); border-radius: 50%; transform: translate(-50%, -50%); opacity: 0.7; pointer-events: none; z-index: 3; }
            .acu-custom-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; z-index: 1; }
            .acu-custom-color-btn input[type="color"] { position: absolute; top: -10px; left: -10px; width: 200%; height: 200%; opacity: 0; cursor: pointer; z-index: 2; padding: 0; margin: 0; border: none; outline: none; }
            .acu-settings-content::-webkit-scrollbar { display: none !important; width: 0 !important; }
            .acu-section-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--acu-btn-bg); border: 1px solid var(--acu-border); border-radius: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; user-select: none; -webkit-tap-highlight-color: transparent; outline: none; }
            .acu-section-header:hover { background: var(--acu-btn-hover); transform: translateY(-1px); }
            .acu-section-header.active { background: var(--acu-table-head); border-radius: 12px 12px 0 0; border-bottom: 1px solid var(--acu-border); margin-bottom: 0; box-shadow: none; }
            .acu-section-header.active:hover { transform: none; }
            .acu-section-title { font-weight: bold; font-size: 13px; color: var(--acu-text-main); display: flex; align-items: center; gap: 10px; } .acu-section-title i { color: var(--acu-ui-color); }
            .acu-section-desc { font-size: 11px; color: var(--acu-text-sub); font-weight: normal; margin-left: 5px; display: none; } .acu-section-header.active .acu-section-desc { display: inline; }
            .acu-section-icon { color: var(--acu-text-sub); transition: transform 0.3s; font-size: 12px; }
            .acu-section-header.active .acu-section-icon { transform: rotate(90deg); }
            .acu-section-content { display: none; background: var(--acu-table-head); border: 1px solid var(--acu-border); border-top: none; border-radius: 0 0 12px 12px; padding: 0 15px 15px 15px; margin-bottom: 8px; }
            .acu-section-content .acu-settings-group { border: none !important; background: transparent !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; }

        </style>

        `;

        const transMap = config.dbTransparentMap || {};
        const isTrans = transMap[config.dbTheme] === true;

        const dialog = $(`
            <div class="acu-edit-overlay">
                ${modalStyles}
                <div class="acu-edit-dialog acu-theme-${config.theme}">
                     <div class="acu-edit-header">
                        <span style="font-size:13px; font-weight:bold;">设置选项</span>
                        <button id="dlg-close" class="acu-close-pill">完成</button>
                     </div>
                    <div class="acu-settings-content" style="flex: 1; overflow-y: auto; padding: 20px;">
                        
                        <div class="acu-section-header" data-target="sec-appearance"><div class="acu-section-title"><i class="fa-solid fa-palette"></i> 主题与外观</div><i class="fa-solid fa-chevron-right acu-section-icon"></i></div><div class="acu-section-content" id="sec-appearance"><div class="acu-settings-group">
                            <div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">背景主题</span></div>
                                <div class="acu-input-col">
                                    <select id="cfg-theme" class="acu-nice-select">
                                        ${THEMES.map(t => `<option value="${t.id}" ${t.id === config.theme ? 'selected' : ''}>${t.name}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">数据库主题</span></div>
                                <div class="acu-input-col" style="gap:5px">
                                    <select id="cfg-db-transparent" class="acu-nice-select" style="display:${(['aurora', 'starship', 'sky'].includes(config.dbTheme)) ? 'block' : 'none'}; width:auto; min-width:80px;">
                                        <option value="false" ${!isTrans ? 'selected' : ''}>不透明</option>
                                        <option value="true" ${isTrans ? 'selected' : ''}>透明</option>
                                    </select>
                                    <select id="cfg-db-theme" class="acu-nice-select">
                                        <option value="default" ${config.dbTheme === 'default' ? 'selected' : ''}>默认主题</option>
                                        ${THEMES.map(t => `<option value="${t.id}" ${t.id === config.dbTheme ? 'selected' : ''}>${t.name}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            
                             
                            <div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">字体样式</span></div>
                                <div class="acu-input-col">
                                    <select id="cfg-font-family" class="acu-nice-select">
                                        ${FONTS.map(f => `<option value="${f.id}" ${f.id === config.fontFamily ? 'selected' : ''}>${f.name}</option>`).join('')}
                                    </select>
                                </div>
                            </div><div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">字体大小</span></div>
                                <div class="acu-input-col">
                                    <div class="acu-stepper">
                                        <button class="acu-step-btn minus" data-key="fontSize" data-step="1" data-min="10" data-max="20"><i class="fa-solid fa-minus"></i></button>
                                        <div class="acu-step-val" id="val-fontSize">${config.fontSize}</div>
                                        <button class="acu-step-btn plus" data-key="fontSize" data-step="1" data-min="10" data-max="20"><i class="fa-solid fa-plus"></i></button>
                                    </div>
                                </div>
                            </div><div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">卡片宽度</span></div>
                                <div class="acu-input-col">
                                    <div class="acu-stepper">
                                        <button class="acu-step-btn minus" data-key="cardWidth" data-step="10" data-min="220" data-max="500"><i class="fa-solid fa-minus"></i></button>
                                        <div class="acu-step-val" id="val-cardWidth">${config.cardWidth}</div>
                                        <button class="acu-step-btn plus" data-key="cardWidth" data-step="10" data-min="220" data-max="500"><i class="fa-solid fa-plus"></i></button>
                                    </div>
                                </div>
                            </div>
                            
                            
                        <div class="acu-control-row" style="border-bottom:none; ${config.highlightNew ? 'padding-bottom:5px' : ''}">
                                <div class="acu-label-col">
                                    <span class="acu-label-main">新增内容高亮 <span id="hint-new" style="font-size:11px;color:var(--acu-text-sub);font-weight:normal;margin-left:5px;display:${config.highlightNew ? 'inline' : 'none'}">下方选择高亮颜色</span></span>
                                </div>
                                <div class="acu-input-col">
                                    <label class="acu-switch">
                                        <input type="checkbox" id="cfg-new" ${config.highlightNew ? 'checked' : ''}>
                                        <span class="acu-slider-switch"></span>
                                    </label>
                                </div>
                            </div><div class="acu-control-row" id="row-highlight-color" style="display:${config.highlightNew ? 'flex' : 'none'}; border-top:none; border-bottom:none; padding-top:8px;">
                                  <div style="width:100%">
                                      <div class="acu-color-row" id="cfg-color-opts" style="justify-content: flex-start; align-items: center;">
                                        ${Object.keys(HIGHLIGHT_COLORS).map(k => `<div class="acu-color-circle ${config.highlightColor === k ? 'selected' : ''}" data-val="${k}" data-type="highlight" title="${HIGHLIGHT_COLORS[k].name}" style="background-color:${HIGHLIGHT_COLORS[k].main}"></div>`).join('')}
                                      <div style="width:1px;height:20px;background:var(--acu-border);margin:0 8px;"></div>
                                      <div class="acu-custom-color-btn ${(config.highlightColor && !HIGHLIGHT_COLORS[config.highlightColor] && String(config.highlightColor).startsWith('#')) ? 'selected' : ''}" title="自定义颜色">
                                          <div class="acu-custom-bg" style="background:${(config.highlightColor && !HIGHLIGHT_COLORS[config.highlightColor] && String(config.highlightColor).startsWith('#')) ? config.highlightColor : 'conic-gradient(red, orange, yellow, green, blue, indigo, violet, red)'}"></div>
                                          <input type="color" id="cfg-highlight-custom" value="${(config.highlightColor && String(config.highlightColor).startsWith('#')) ? config.highlightColor : '#d35400'}">
                                      </div>
                                      </div>
                                </div>
                            </div><div class="acu-nav-separator"></div><div class="acu-control-row" style="${config.customTitleColor ? 'border-bottom:none; padding-bottom:5px' : ''}">
                                <div class="acu-label-col">
                                    <span class="acu-label-main">标题颜色自定义 <span id="hint-title" style="font-size:11px;color:var(--acu-text-sub);font-weight:normal;margin-left:5px;display:${config.customTitleColor ? 'inline' : 'none'}">下方选择标题颜色</span></span>
                                </div>
                                <div class="acu-input-col">
                                    <label class="acu-switch">
                                        <input type="checkbox" id="cfg-custom-title" ${config.customTitleColor ? 'checked' : ''}>
                                        <span class="acu-slider-switch"></span>
                                    </label>
                                </div>
                            </div><div class="acu-control-row" id="row-title-color" style="display:${config.customTitleColor ? 'flex' : 'none'}; border-top:none; padding-top:8px;">
                                  <div style="width:100%">
                                      <div class="acu-color-row" id="cfg-title-color-opts" style="justify-content: flex-start; align-items: center;">
                                        ${Object.keys(HIGHLIGHT_COLORS).map(k => `<div class="acu-color-circle ${config.titleColor === k ? 'selected' : ''}" data-val="${k}" data-type="title" title="${HIGHLIGHT_COLORS[k].name}" style="background-color:${HIGHLIGHT_COLORS[k].main}"></div>`).join('')}
                                      <div style="width:1px;height:20px;background:var(--acu-border);margin:0 8px;"></div>
                                      <div class="acu-custom-color-btn ${(config.titleColor && !HIGHLIGHT_COLORS[config.titleColor] && String(config.titleColor).startsWith('#')) ? 'selected' : ''}" title="自定义颜色">
                                          <div class="acu-custom-bg" style="background:${(config.titleColor && !HIGHLIGHT_COLORS[config.titleColor] && String(config.titleColor).startsWith('#')) ? config.titleColor : 'conic-gradient(red, orange, yellow, green, blue, indigo, violet, red)'}"></div>
                                          <input type="color" id="cfg-title-custom" value="${(config.titleColor && String(config.titleColor).startsWith('#')) ? config.titleColor : '#d35400'}">
                                      </div>
                                      </div>
                                </div>
                            </div><div class="acu-control-row">
                                <div class="acu-label-col" style="flex-direction:row;align-items:center;gap:8px"><span class="acu-label-main">长文本折叠</span><span class="acu-label-sub" style="font-weight:normal;margin-top:2px">限制卡片内文本高度</span></div>
                                <div class="acu-input-col">
                                    <label class="acu-switch">
                                        <input type="checkbox" id="cfg-limit-height" ${config.limitLongText !== false ? 'checked' : ''}>
                                        <span class="acu-slider-switch"></span>
                                    </label>
                                </div>
                            </div></div></div><div class="acu-section-header" data-target="sec-layout"><div class="acu-section-title"><i class="fa-solid fa-layer-group"></i> 布局与样式</div><i class="fa-solid fa-chevron-right acu-section-icon"></i></div><div class="acu-section-content" id="sec-layout"><div class="acu-settings-group"><div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">页面布局</span></div>
                                <div class="acu-input-col">
                                    <select id="cfg-layout" class="acu-nice-select">
                                       <option value="vertical" ${config.layout === 'vertical' ? 'selected' : ''}>竖向布局</option>
                                        <option value="horizontal" ${config.layout === 'horizontal' ? 'selected' : ''}>横向布局</option>
                                    </select>
                                </div>
                            </div><div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">前端位置</span></div>
                                <div class="acu-input-col">
                                    <select id="cfg-frontend-pos" class="acu-nice-select">
                                        <option value="bottom" ${config.frontendPosition === 'bottom' ? 'selected' : ''}>上下文底部</option>
                                        <option value="message" ${config.frontendPosition === 'message' ? 'selected' : ''}>最新消息内</option>
                                    </select>
                                </div>
                            </div><div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">底部按钮列数</span></div>
                                 <div class="acu-input-col">
                                     <select id="cfg-grid-cols" class="acu-nice-select">
                                        <option value="0" ${!config.gridColumns ? 'selected' : ''}>自动</option>
                                        <option value="2" ${config.gridColumns == 2 ? 'selected' : ''}>2 列</option>
                                        <option value="3" ${config.gridColumns == 3 ? 'selected' : ''}>3 列</option>
                                        <option value="4" ${config.gridColumns == 4 ? 'selected' : ''}>4 列</option>
                                    </select>
                                </div>
                            </div><div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">收起样式</span></div>
                                <div class="acu-input-col" style="gap:5px">
                                    <select id="cfg-collapse-pos" class="acu-nice-select" style="display:${config.collapseStyle === 'pill' ? 'block' : 'none'}; width:auto; min-width:80px;">
                                        <option value="left" ${config.collapsePosition === 'left' ? 'selected' : ''}>左侧</option>
                                        <option value="center" ${config.collapsePosition === 'center' ? 'selected' : ''}>居中</option>
                                        <option value="right" ${config.collapsePosition === 'right' ? 'selected' : ''}>右侧</option>
                                    </select>
                                    <select id="cfg-collapse-style" class="acu-nice-select">
                                        <option value="bar" ${config.collapseStyle === 'bar' ? 'selected' : ''}>全宽窄条</option>
                                        <option value="pill" ${config.collapseStyle === 'pill' ? 'selected' : ''}>胶囊按钮</option>
                                    </select>
                                </div>
                            </div><div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">每页卡片数</span></div>
                                <div class="acu-input-col">
                                    <div class="acu-stepper">
                                        <button class="acu-step-btn minus" data-key="itemsPerPage" data-step="5" data-min="5" data-max="100"><i class="fa-solid fa-minus"></i></button>
                                        <div class="acu-step-val" id="val-itemsPerPage">${config.itemsPerPage || 20}</div>
                                        <button class="acu-step-btn plus" data-key="itemsPerPage" data-step="5" data-min="5" data-max="100"><i class="fa-solid fa-plus"></i></button>
                                    </div>
                                </div>
                            </div></div></div><div class="acu-section-header" data-target="sec-actions"><div class="acu-section-title"><i class="fa-solid fa-list-check"></i> 选项面板 ${!allTableNames.some(n => n.includes('选项')) ? '<span class="acu-section-desc" style="color:#e74c3c !important;">未检测到选项表</span>' : ''}</div><i class="fa-solid fa-chevron-right acu-section-icon"></i></div><div class="acu-section-content" id="sec-actions"><div class="acu-settings-group">
<div class="acu-control-row" >
                                <div class="acu-label-col"><span class="acu-label-main">选项面板开关</span></div>
                                <div class="acu-input-col">
                                    <label class="acu-switch">
                                        <input type="checkbox" id="cfg-show-option" ${config.showOptionPanel !== false ? 'checked' : ''}>
                                        <span class="acu-slider-switch"></span>
                                    </label>
                                </div>
                            </div>
<div class="acu-control-row" id="row-auto-send" >
                                <div class="acu-label-col"><span class="acu-label-main">点击选项直接发送</span></div>
                                <div class="acu-input-col">
                                    <label class="acu-switch">
                                        <input type="checkbox" id="cfg-auto-send" ${config.clickOptionToAutoSend ? 'checked' : ''}>
                                        <span class="acu-slider-switch"></span>
                                    </label>
                                </div>
                            </div>
<!-- 选项字体大小 -->
                            <div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">选项字体大小</span></div>
                                <div class="acu-input-col">
                                    <div class="acu-stepper">
                                        <button class="acu-step-btn minus" data-key="optionFontSize" data-step="1" data-min="10" data-max="20"><i class="fa-solid fa-minus"></i></button>
                                        <div class="acu-step-val" id="val-optionFontSize">${config.optionFontSize || 13}</div>
                                        <button class="acu-step-btn plus" data-key="optionFontSize" data-step="1" data-min="10" data-max="20"><i class="fa-solid fa-plus"></i></button>
                                    </div>
                                </div>
                            </div>
</div></div><div class="acu-section-header" data-target="sec-dashboard"><div class="acu-section-title"><i class="fa-solid fa-tachometer-alt"></i> 仪表盘</div><i class="fa-solid fa-chevron-right acu-section-icon"></i></div><div class="acu-section-content" id="sec-dashboard"><div class="acu-settings-group">
<div class="acu-control-row" >
                                <div class="acu-label-col"><span class="acu-label-main">仪表盘开关</span></div>
                                <div class="acu-input-col">
                                    <label class="acu-switch">
                                        <input type="checkbox" id="cfg-show-dash" ${config.showDashboard !== false ? 'checked' : ''}>
                                        <span class="acu-slider-switch"></span>
                                    </label>
                                </div>
                            </div>
<div class="acu-control-row" id="row-dash-pos" >
                                <div class="acu-label-col"><span class="acu-label-main">仪表盘位置</span></div>
                                <div class="acu-input-col">
                                    <select id="cfg-dash-pos" class="acu-nice-select">
                                        <option value="embedded" ${config.dashboardPosition === 'embedded' ? 'selected' : ''}>最新消息内</option>
                                        <option value="panel" ${config.dashboardPosition === 'panel' ? 'selected' : ''}>导航悬浮窗</option>
                                    </select>
                                </div>
                            </div>
                            <div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">仪表盘字体大小</span></div>
                                <div class="acu-input-col">
                                    <div class="acu-stepper">
                                        <button class="acu-step-btn minus" data-key="dashboardFontSize" data-step="1" data-min="10" data-max="20"><i class="fa-solid fa-minus"></i></button>
                                        <div class="acu-step-val" id="val-dashboardFontSize">${config.dashboardFontSize || 13}</div>
                                        <button class="acu-step-btn plus" data-key="dashboardFontSize" data-step="1" data-min="10" data-max="20"><i class="fa-solid fa-plus"></i></button>
                                    </div>
                                </div>
                            </div>
</div></div><div class="acu-section-header" data-target="sec-features"><div class="acu-section-title"><i class="fa-solid fa-universal-access"></i> 辅助功能</div><i class="fa-solid fa-chevron-right acu-section-icon"></i></div><div class="acu-section-content" id="sec-features"><div class="acu-settings-group">
                             
                            
                            
                            
                            <div class="acu-control-row">
                                <div class="acu-label-col"><span class="acu-label-main">总结大纲一致性检测</span></div>
                                <div class="acu-input-col">
                                    <label class="acu-switch">
                                        <input type="checkbox" id="cfg-consistency-check" ${config.checkConsistency !== false ? 'checked' : ''}>
                                        <span class="acu-slider-switch"></span>
                                    </label>
                                </div>
                            </div>
                           
                            
                             
                            
                            
                        </div></div><div class="acu-section-header" data-target="sec-tables"><div class="acu-section-title"><i class="fa-solid fa-table"></i> 表格管理 <span class="acu-section-desc">点击眼睛显隐，开启开关倒序</span></div><i class="fa-solid fa-chevron-right acu-section-icon"></i></div><div class="acu-section-content" id="sec-tables"><div class="acu-settings-group" id="list-reverse-tables" style="padding: 0;">
                            <div style="max-height: 200px; overflow-y: auto;">
                                ${allTableNames.length > 0 ? allTableNames.filter(n => !n.includes('选项')).map(name => `
                                    <div class="acu-control-row" style="padding: 10px 15px;">
                                        <div class="acu-label-col" style="max-width:70%; display:flex; flex-direction:row; align-items:center; gap:8px;">
                                            <i class="fa-solid ${hiddenTables.includes(name) ? 'fa-eye-slash' : 'fa-eye'} acu-visibility-toggle" data-table="${name}" style="cursor:pointer; color:var(--acu-text-sub); width:20px; text-align:center; outline:none; -webkit-tap-highlight-color:transparent;"></i>
                                            <span class="acu-label-main" style="font-weight:normal;">${name}</span>
                                        </div>
                                        <div class="acu-input-col">
                                            <label class="acu-switch">
                                                <input type="checkbox" class="acu-reverse-check" value="${name}" ${reversedTables.includes(name) ? 'checked' : ''}>
                                                <span class="acu-slider-switch"></span>
                                            </label>
                                        </div>
                                    </div>
                                `).join('') : '<div style="padding:20px; text-align:center; color:var(--acu-text-sub)">暂无表格数据</div>'}
                            </div>
                        </div></div><div style="display:flex; gap:10px; margin: 10px 0;">
                            <button class="acu-btn-block" id="btn-enter-sort" style="margin:0; flex:1; justify-content:center; font-weight:bold; padding:12px;">进入表格排序模式</button>
                        </div>
                        
                    </div>
                </div>
            </div>
        `);
        $('body').append(dialog); bindScrollFade(dialog.find('.acu-settings-content, .acu-dash-npc-grid'));
        dialog.find('.acu-section-header').on('click', function() {
            const $this = $(this);
            const $target = dialog.find('#' + $this.data('target'));
            const isOpen = $this.hasClass('active');
            dialog.find('.acu-section-header.active').not(this).removeClass('active');
            dialog.find('.acu-section-content:visible').not($target).slideUp(200);
            if (isOpen) { $this.removeClass('active'); $target.slideUp(200); } 
            else { $this.addClass('active'); $target.slideDown(200); }
        });

        dialog.find('#cfg-theme').on('change', function() { 
              const newTheme = $(this).val();
            const allThemes = THEMES.map(t => 'acu-theme-' + t.id).join(' ');
            dialog.find('.acu-edit-dialog').removeClass(allThemes).addClass('acu-theme-' + newTheme);
            saveConfig({ theme: newTheme });
        });
        dialog.find('#cfg-layout').on('change', function() { saveConfig({ layout: $(this).val() }); renderInterface(); });
        dialog.find('#cfg-frontend-pos').on('change', function() { saveConfig({ frontendPosition: $(this).val() }); renderInterface(); });
        dialog.find('#cfg-font-family').on('change', function() { saveConfig({ fontFamily: $(this).val() }); });
        
        dialog.find('#cfg-highlight-custom').on('input change', function() {
            const hex = $(this).val();
            dialog.find('#cfg-color-opts .acu-color-circle').removeClass('selected');
            const $btn = $(this).closest('.acu-custom-color-btn');
            $btn.addClass('selected').find('.acu-custom-bg').css('background', hex);
            saveConfig({ highlightColor: hex });
        });
        dialog.find('#cfg-title-custom').on('input change', function() {
            const hex = $(this).val();
            dialog.find('#cfg-title-color-opts .acu-color-circle').removeClass('selected');
            const $btn = $(this).closest('.acu-custom-color-btn');
            $btn.addClass('selected').find('.acu-custom-bg').css('background', hex);
            saveConfig({ titleColor: hex });
        });
        dialog.find('.acu-color-circle').on('click', function() {
            const type = $(this).data('type');
            $(this).siblings().removeClass('selected'); $(this).addClass('selected');
            $(this).parent().find('.acu-custom-color-btn').removeClass('selected').find('.acu-custom-bg').css('background', 'conic-gradient(red, orange, yellow, green, blue, indigo, violet, red)');
            if (type === 'highlight') {
                 saveConfig({ highlightColor: $(this).data('val') });
            } else if (type === 'title') {
                 saveConfig({ titleColor: $(this).data('val') });
            }
        });
        
        

        
        dialog.find('.acu-step-btn').on('click', function() {
            const $btn = $(this);
            const key = $btn.data('key');
            const step = parseInt($btn.data('step'));
            const min = parseInt($btn.data('min'));
            const max = parseInt($btn.data('max'));
            const isPlus = $btn.hasClass('plus');
            const $disp = dialog.find('#val-' + key);

            let val = parseInt($disp.text());
            if (isNaN(val)) val = min;

            if (isPlus) val += step; else val -= step;

            if (val < min) val = min;
            if (val > max) val = max;

            $disp.text(val);

            const cfg = {};
            cfg[key] = val;
            saveConfig(cfg);

            if (key === 'itemsPerPage') renderInterface();
        });

        dialog.find('#cfg-show-dash').on('change', function() { 
            const checked = $(this).is(':checked');
            saveConfig({ showDashboard: checked }); 
            renderInterface(); 
        });
        dialog.find('#cfg-dash-pos').on('change', function() { saveConfig({ dashboardPosition: $(this).val() }); renderInterface(); });
        dialog.find('#cfg-consistency-check').on('change', function() { saveConfig({ checkConsistency: $(this).is(':checked') }); renderInterface(); });
        dialog.find('#cfg-show-option').on('change', function() { 
            const checked = $(this).is(':checked');
            saveConfig({ showOptionPanel: checked }); 
            renderInterface(); 
        });
        dialog.find('#cfg-auto-send').on('change', function() { saveConfig({ clickOptionToAutoSend: $(this).is(':checked') }); });
        dialog.find('#cfg-new').on('change', function() { 
            const checked = $(this).is(':checked');
            saveConfig({ highlightNew: checked }); 
            const $row = dialog.find('#row-highlight-color');
            const $hint = dialog.find('#hint-new');
            const $parent = $(this).closest('.acu-control-row');
            if(checked) { 
                $row.slideDown(200).css('display', 'flex');
                $hint.fadeIn(200).css('display', 'inline');
                $parent.css({'border-bottom': 'none', 'padding-bottom': '5px'});
            } else { 
                $row.slideUp(200); 
                $hint.fadeOut(200);
                $parent.css({'border-bottom': 'none', 'padding-bottom': '12px'});
            }
            renderInterface(); 
        });
        dialog.find('#cfg-grid-cols').on('change', function () { saveConfig({ gridColumns: parseInt($(this).val()) }); renderInterface(); });
        
        dialog.find('#cfg-collapse-style').on('change', function() { 
            const val = $(this).val();
            saveConfig({ collapseStyle: val }); 
            const $posSelect = dialog.find('#cfg-collapse-pos');
            if (val === 'pill') {
                $posSelect.fadeIn(200);
            } else {
                $posSelect.fadeOut(200);
            }
            renderInterface(); 
        });
        dialog.find('#cfg-collapse-pos').on('change', function() { saveConfig({ collapsePosition: $(this).val() }); renderInterface(); });
        
        dialog.find('#cfg-limit-height').on('change', function() { saveConfig({ limitLongText: $(this).is(':checked') }); renderInterface(); });
        dialog.find('#cfg-custom-title').on('change', function() { 
            const checked = $(this).is(':checked');
            saveConfig({ customTitleColor: checked }); 
            const $row = dialog.find('#row-title-color');
            const $hint = dialog.find('#hint-title');
            const $parent = $(this).closest('.acu-control-row');
            if(checked) { 
                $row.slideDown(200).css('display', 'flex');
                $hint.fadeIn(200).css('display', 'inline');
                $parent.css({'border-bottom': 'none', 'padding-bottom': '5px'});
            } else { 
                $row.slideUp(200);
                $hint.fadeOut(200);
                $parent.css({'border-bottom': '', 'padding-bottom': '12px'});
            }
        });

        dialog.find('#cfg-db-theme').on('change', function() {
            const val = $(this).val();
            const currentConfig = getConfig();
            const map = currentConfig.dbTransparentMap || {};
            const isTrans = map[val] === true;
            dialog.find('#cfg-db-transparent').val(isTrans ? 'true' : 'false');

            const $trans = dialog.find('#cfg-db-transparent');
            if (['aurora', 'starship', 'sky'].includes(val)) {
                $trans.fadeIn(200);
            } else {
                $trans.fadeOut(200);
            }
            saveConfig({ dbTheme: val });
        });
        dialog.find('#cfg-db-transparent').on('change', function() {
            const val = $(this).val() === 'true';
            const currentConfig = getConfig();
            const theme = dialog.find('#cfg-db-theme').val();
            const map = currentConfig.dbTransparentMap || {};
            map[theme] = val;
            saveConfig({ dbTransparentMap: map });
        });

        dialog.find('.acu-reverse-check').on('change', function() {
            const tName = $(this).val();
            const checked = $(this).is(':checked');
            let currentList = getReverseOrderTables();
            if (checked) { if (!currentList.includes(tName)) currentList.push(tName); }
            else { currentList = currentList.filter(n => n !== tName); }
            saveReverseOrderTables(currentList);
            const activeTab = getActiveTabState();
            if (activeTab === tName) renderInterface();
        });
        dialog.find('.acu-visibility-toggle').on('click', function() {
            const tName = $(this).data('table');
            let currentList = getHiddenTables();
            if (currentList.includes(tName)) {
                currentList = currentList.filter(n => n !== tName);
                $(this).removeClass('fa-eye-slash').addClass('fa-eye');
            } else {
                currentList.push(tName);
                $(this).removeClass('fa-eye').addClass('fa-eye-slash');
            }
            saveHiddenTables(currentList);
            renderInterface();
        });
        dialog.find('#btn-enter-sort').click(() => { dialog.remove(); toggleOrderEditMode(); });
        dialog.find('#dlg-close').click(() => { dialog.remove(); renderInterface(); });
        dialog.on('click', function(e) { if ($(e.target).hasClass('acu-edit-overlay')) dialog.remove(); });
    };

        
    const injectEmbeddedDashboard = (htmlContent, themeClass, cssVars) => {
        const { $ } = getCore();
        if (!htmlContent) {
            $('.acu-embedded-dashboard-container').remove();
            return;
        }

        const getTargetContainer = () => {
            const $allMes = $('#chat .mes');
            const $aiMes = $allMes.filter(function() {
                const $this = $(this);
                if ($this.attr('is_user') === 'true' || $this.attr('is_system') === 'true' || $this.hasClass('sys_mes')) return false;
                if ($this.find('.name_text').text().trim() === 'System') return false; 
                if ($this.css('display') === 'none') return false;
                return true;
            });
            if ($aiMes.length === 0) return null;
            const $targetMes = $aiMes.last();
            const $targetBlock = $targetMes.find('.mes_block');
            return $targetBlock.length ? $targetBlock : $targetMes;
        };

        const $target = getTargetContainer();
        if ($target && $target.length) {
            const $existing = $('.acu-embedded-dashboard-container');
            let shouldUpdate = false;
            // 检查是否存在且在正确的位置
            if ($existing.length && $existing.parent()[0] === $target[0]) {
                shouldUpdate = true;
            } else {
                $existing.remove();
            }

            if (shouldUpdate) {
                // 原地更新，避免滚动条跳动
                const $container = $('.acu-embedded-dashboard-container');
                $container.removeClass().addClass(`acu-embedded-dashboard-container ${themeClass}`);
                // 保留基本样式并更新变量
                $container.attr('style', 'margin-top: 6px; width: 100%; clear: both; ' + cssVars);

                const $wrapper = $container.find('.acu-dash-content-wrapper');
                $wrapper.html(htmlContent);

                // 处理编辑模式下的状态同步
                const $editBtn = $container.find('#acu-btn-dash-edit-emb');
                const $editIcon = $editBtn.find('i');
                const $header = $container.find('.acu-dash-ctrl-bar');

                if (isDashEditing) {
                    // 编辑模式强制展开
                    if ($wrapper.css('height') === '0px' || $wrapper.css('opacity') === '0') {
                        $wrapper.css({ 'height': (window.innerWidth <= 768 ? 'auto' : '500px'), 'opacity': '1', 'padding': '0' });
                        $header.css({ 'border-radius': '12px 12px 0 0', 'margin-bottom': '-1px' });
                    }
                    $editBtn.css('display', 'inline-flex');
                    $editIcon.removeClass('fa-edit').addClass('fa-check').css('color', 'var(--acu-highlight)');
                } else {
                    $editIcon.removeClass('fa-check').addClass('fa-edit').css('color', '');
                    // 非编辑模式下，根据折叠状态显示/隐藏编辑按钮
                    if ($wrapper.css('height') === '0px' || $wrapper.css('opacity') === '0') {
                        $editBtn.hide();
                    } else {
                        $editBtn.css('display', 'inline-flex');
                    }
                }
            } else {
                // 首次创建或位置变更
                let isCollapsed = true; 
                if (isDashEditing) isCollapsed = false;

                const $container = $('<div class="acu-embedded-dashboard-container" style="margin-top: 6px; width: 100%; clear: both;"></div>');
                $container.addClass(themeClass).attr('style', $container.attr('style') + '; ' + cssVars);

                const headerHtml = `
                    <div class="acu-dash-ctrl-bar" style="
                        display: flex; justify-content: space-between; align-items: center;
                        padding: 10px 12px;
                        background: var(--acu-bg-nav);
                        border: 1px solid var(--acu-border);
                        border-radius: ${isCollapsed ? '12px' : '12px 12px 0 0'};
                        cursor: pointer;
                        user-select: none;
                        transition: all 0.2s;
                        margin-bottom: ${isCollapsed ? '0' : '-1px'};
                        position: relative; z-index: 2;
                        backdrop-filter: blur(5px);
                        -webkit-tap-highlight-color: transparent;
                    ">
                        <div style="display:flex; align-items:center; gap:8px;">
                             <i class="fa-solid fa-tachometer-alt" style="color:var(--acu-highlight);"></i>
                             <span style="font-weight: bold; color: var(--acu-title-color); font-size: 13px;">仪表盘</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button id="acu-btn-dash-edit-emb" title="编辑布局" style="background:transparent; border:none; color:var(--acu-text-sub); cursor:pointer; padding:0 4px; height:16px; display:${isCollapsed ? 'none' : 'inline-flex'}; align-items:center;"><i class="fa-solid ${isDashEditing ? 'fa-check' : 'fa-edit'}" style="${isDashEditing ? 'color:var(--acu-highlight)' : ''}"></i></button>
                        </div>
                    </div>
                `;

                const contentStyle = isCollapsed ? 'height: 0; opacity: 0; padding: 0; overflow: hidden;' : (window.innerWidth <= 768 ? 'height: auto; opacity: 1; padding: 0; overflow: hidden;' : 'height: 500px; opacity: 1; padding: 0; overflow: hidden;');
                const contentWrapperHtml = `
                    <div class="acu-dash-content-wrapper" style="
                        overflow: hidden;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        background: var(--acu-bg-nav);
                        border: 1px solid var(--acu-border);
                        border-top: none;
                        border-radius: 0 0 12px 12px;
                        backdrop-filter: blur(5px);
                        ${contentStyle}
                    ">
                        ${htmlContent}
                    </div>
                `;

                $container.append(headerHtml);
                $container.append(contentWrapperHtml);

                const $header = $container.find('.acu-dash-ctrl-bar');
                const $wrapper = $container.find('.acu-dash-content-wrapper');

                $header.on('click', function(e) {
                    if ($(e.target).closest('button').length) return;
                    e.stopPropagation();

                    const currentOpacity = $wrapper.css('opacity');
                    const isCurrentlyCollapsed = (currentOpacity === '0' || $wrapper.css('height') === '0px');

                    if (isCurrentlyCollapsed) {
                        $wrapper.css({ 'height': (window.innerWidth <= 768 ? 'auto' : '500px'), 'opacity': '1', 'padding': '0' });
                        $header.css({ 'border-radius': '12px 12px 0 0', 'margin-bottom': '-1px' });
                        $container.find('#acu-btn-dash-edit-emb').css('display', 'inline-flex');
                    } else {
                        $wrapper.css({ 'height': '0', 'opacity': '0', 'padding': '0' });
                        $header.css({ 'border-radius': '12px', 'margin-bottom': '0' });
                        $container.find('#acu-btn-dash-edit-emb').hide();
                    }
                });

                const $opts = $target.find('.acu-embedded-options-container');
                if ($opts.length) { $opts.before($container); } else { $target.append($container); }
            }
        } else {
            $('.acu-embedded-dashboard-container').remove();
        }
    };


    const injectIndependentOptions = (htmlContent, themeClass, cssVars) => {
        const { $ } = getCore();
        if (!htmlContent) {
            $('.acu-embedded-options-container').remove();
            return;
        }

        const getTargetContainer = () => {
            const $allMes = $('#chat .mes');
            const $aiMes = $allMes.filter(function() {
                const $this = $(this);
                if ($this.attr('is_user') === 'true' || $this.attr('is_system') === 'true' || $this.hasClass('sys_mes')) return false;
                if ($this.find('.name_text').text().trim() === 'System') return false; 
                if ($this.css('display') === 'none') return false;
                return true;
            });
            if ($aiMes.length === 0) return null;

            const $targetMes = $aiMes.last();
            const $targetBlock = $targetMes.find('.mes_block');
            return $targetBlock.length ? $targetBlock : $targetMes;
        };

        const $target = getTargetContainer();
        if ($target && $target.length) {
            const $existing = $('.acu-embedded-options-container');
            let shouldUpdate = false;
            if ($existing.length && $existing.parent()[0] === $target[0]) {
                shouldUpdate = true;
            } else {
                $existing.remove();
            }

            if (shouldUpdate) {
                const $container = $('.acu-embedded-options-container');
                $container.removeClass().addClass(`acu-embedded-options-container ${themeClass}`);
                $container.attr('style', 'margin-top: 6px; width: 100%; clear: both; ' + cssVars);

                const $panel = $container.find('.acu-option-panel');
                $panel.html(htmlContent);
            } else {
                const STORAGE_KEY_OPT_COLLAPSE = 'acu_opt_collapse_state';
                const isCollapsed = localStorage.getItem(STORAGE_KEY_OPT_COLLAPSE) === 'true';

                const $container = $('<div class="acu-embedded-options-container" style="margin-top: 6px; width: 100%; clear: both;"></div>');
                $container.addClass(themeClass).attr('style', $container.attr('style') + '; ' + cssVars);

                const headerHtml = `
                    <div class="acu-opt-ctrl-bar" style="
                        display: flex; justify-content: center; align-items: center;
                        padding: 10px 12px;
                        background: var(--acu-bg-nav);
                        border: 1px solid var(--acu-border);
                        border-radius: ${isCollapsed ? '12px' : '12px 12px 0 0'};
                        cursor: pointer;
                        user-select: none;
                        transition: all 0.2s;
                        margin-bottom: ${isCollapsed ? '0' : '-1px'};
                        position: relative; z-index: 2;
                        backdrop-filter: blur(5px);
                        -webkit-tap-highlight-color: transparent;
                    ">
                        <span style="font-weight: bold; color: var(--acu-title-color); font-size: 13px;">行动选项</span>
                    </div>
                `;

                const contentStyle = isCollapsed ? 'max-height: 0; opacity: 0; padding: 0;' : 'max-height: 1000px; opacity: 1; padding: 8px;';
                const contentWrapperHtml = `
                    <div class="acu-opt-content-wrapper" style="
                        overflow: hidden;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        background: var(--acu-bg-nav);
                        border: 1px solid var(--acu-border);
                        border-top: none;
                        border-radius: 0 0 12px 12px;
                        backdrop-filter: blur(5px);
                        ${contentStyle}
                    ">
                        <div class="acu-option-panel" style="display: grid; padding: 0; border: none; background: transparent; box-shadow: none; margin: 0;">
                            ${htmlContent}
                        </div>
                    </div>
                `;

                $container.append(headerHtml);
                $container.append(contentWrapperHtml);

                const $header = $container.find('.acu-opt-ctrl-bar');
                const $wrapper = $container.find('.acu-opt-content-wrapper');

                $header.on('click', function(e) {
                    e.stopPropagation();
                    const currentIsCollapsed = localStorage.getItem(STORAGE_KEY_OPT_COLLAPSE) === 'true';

                    if (currentIsCollapsed) {
                        $wrapper.css({ 'max-height': '1000px', 'opacity': '1', 'padding': '8px' });
                        $header.css({ 'border-radius': '12px 12px 0 0', 'margin-bottom': '-1px' });
                        localStorage.setItem(STORAGE_KEY_OPT_COLLAPSE, 'false');
                    } else {
                        $wrapper.css({ 'max-height': '0', 'opacity': '0', 'padding': '0' });
                        $header.css({ 'border-radius': '12px', 'margin-bottom': '0' });
                        localStorage.setItem(STORAGE_KEY_OPT_COLLAPSE, 'true');
                    }
                });

                $target.append($container);
            }
        } else {
             $('.acu-embedded-options-container').remove();
        }
    };

    const renderInterface = () => {
        const { $ } = getCore();
        if (!$) return;
        try {
             const $lastPanel = $('.acu-panel-content');
            if ($lastPanel.length) { globalScrollTop = $lastPanel.scrollTop(); }

            const rawData = getTableData() || {};
            const allTables = processJsonData(rawData);
            const tables = {};
            const optionTables = [];

            const config = getConfig();

            if(allTables) {
                 Object.keys(allTables).forEach(k => {
                     if (k.includes('选项')) {
                         if (config.showOptionPanel !== false) {
                             optionTables.push(allTables[k]);
                         }
                     } else {
                         tables[k] = allTables[k];
                     }
                 });
            }

            const consistencyWarnings = new Set();
            if (config.checkConsistency !== false) {
                const indexedTables = [];
                Object.keys(tables).forEach(tName => {
                    const tData = tables[tName];
                    if (tData.headers) {
                        const idx = tData.headers.findIndex(h => String(h).includes('编码索引'));
                        if (idx !== -1) {
                             const indices = new Set();
                             if(tData.rows) tData.rows.forEach(r => { if(r[idx]) indices.add(String(r[idx]).trim()); });
                             indexedTables.push({ name: tName, indices: indices, count: indices.size });
                        }
                    }
                });
                if (indexedTables.length > 1) {
                    indexedTables.sort((a, b) => b.count - a.count);
                    const baseSet = indexedTables[0].indices;
                    indexedTables.forEach(item => {
                        if (item.count < baseSet.size) {
                            consistencyWarnings.add(item.name);
                            for (const id of baseSet) {
                                if (!item.indices.has(id)) {
                                    if(tables[item.name]) tables[item.name]._missingInfo = id;
                                    break;
                                }
                            }
                        }
                    });
                }
                Object.keys(tables).forEach(k => { if(tables[k]) tables[k]._hasWarning = consistencyWarnings.has(k); });
            }

            currentDiffMap = generateDiffMap(rawData);
            const savedOrder = getSavedTableOrder();
            let orderedNames = Object.keys(tables);
            if (savedOrder) orderedNames = savedOrder.filter(n => tables[n]).concat(orderedNames.filter(n => !savedOrder.includes(n)));

            const hiddenTables = getHiddenTables();
            const showDash = config.showDashboard !== false;
            const activeTab = getActiveTabState();
            let currentTabName = activeTab;

            if (isEditingOrder) currentTabName = null;

            if (currentTabName === TAB_DASHBOARD && config.dashboardPosition !== 'panel') currentTabName = null;
            if (currentTabName && currentTabName !== TAB_DASHBOARD && !tables[currentTabName]) currentTabName = null;

            let colorVal = HIGHLIGHT_COLORS[config.highlightColor];
        if (!colorVal && config.highlightColor && String(config.highlightColor).startsWith('#')) {
            colorVal = { main: config.highlightColor, bg: config.highlightColor + '1a' };
        }
        colorVal = colorVal || HIGHLIGHT_COLORS.orange;
            let titleColorVal = 'var(--acu-text-main)';
        if (config.customTitleColor) {
             const tRaw = config.titleColor;
             if (tRaw && String(tRaw).startsWith('#')) {
                 titleColorVal = tRaw;
             } else {
                 titleColorVal = (HIGHLIGHT_COLORS[tRaw] || HIGHLIGHT_COLORS.orange).main;
             }
        }
            const showPanel = !isCollapsed && currentTabName !== null;
            const tableHeights = getTableHeights();
            let styleHeight = 'height:auto; max-height:500px;';

            if (currentTabName && (tables[currentTabName] || currentTabName === TAB_DASHBOARD)) {
                const h = tableHeights[currentTabName];
                styleHeight = h ? `height:${h}px; max-height:95vh;` : `height:60vh; max-height:95vh;`;
            }

            const gridCols = config.gridColumns > 0 ? `repeat(${config.gridColumns}, 1fr)` : 'repeat(auto-fill, minmax(110px, 1fr))';
            const collapseStyle = config.collapseStyle || 'bar';
            const collapsePos = config.collapsePosition || 'center';

            const isAlreadyVisible = $('#acu-data-area').hasClass('visible');

            const actionBtns = {
                'acu-btn-gacha': `<button class="acu-action-btn" id="acu-btn-gacha" title="抽卡系统"><i class="fa-solid fa-gift"></i></button>`,
                'acu-btn-save-global': `<button class="acu-action-btn" id="acu-btn-save-global" title="保存所有修改"><i class="fa-solid fa-save"></i></button>`,
                'acu-btn-open-native': `<button class="acu-action-btn" id="acu-btn-open-native" title="打开原生编辑器"><i class="fa-solid fa-external-link-alt"></i></button>`,
                'acu-btn-manual-update': `<button class="acu-action-btn" id="acu-btn-manual-update" title="立即手动更新"><i class="fa-solid fa-bolt"></i></button>`,
                'acu-btn-settings': `<button class="acu-action-btn" id="acu-btn-settings" title="全能设置"><i class="fa-solid fa-cog"></i></button>`,
                'acu-btn-toggle': `<button class="acu-action-btn" id="acu-btn-toggle" title="${isCollapsed ? '展开' : '收起'}"><i class="fa-solid ${isCollapsed ? 'fa-chevron-up' : 'fa-chevron-down'}"></i></button>`
            };

            const savedActionOrder = getSavedActionOrder() || Object.keys(actionBtns);
            let finalActionOrder = savedActionOrder.filter(k => actionBtns[k]);
            Object.keys(actionBtns).forEach(k => { if (!finalActionOrder.includes(k)) finalActionOrder.push(k); });

            let navActionsHtml = '';
            finalActionOrder.forEach(k => { navActionsHtml += actionBtns[k]; });

            const orderControlsHtml = isEditingOrder 
                ? `<div class="acu-order-controls visible" id="acu-order-hint" style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--acu-title-color);font-weight:bold;">点击表格调整位置</span><div><button id="acu-btn-cancel-mode" style="margin-right:5px;cursor:pointer;background:var(--acu-btn-bg);border:1px solid var(--acu-border);padding:3px 8px;border-radius:4px;color:var(--acu-title-color)">取消</button><button id="acu-btn-save-mode" style="cursor:pointer;background:var(--acu-btn-active-bg);border:none;padding:3px 8px;border-radius:4px;color:var(--acu-btn-active-text);font-weight:bold">保存</button></div></div>`
                : `<div class="acu-order-controls" id="acu-order-hint"></div>`;

            let contentHtml = '';
            if (currentTabName === TAB_DASHBOARD) {
                contentHtml = renderDashboard(tables);
            } else if (currentTabName && tables[currentTabName]) {
                contentHtml = renderTableContent(tables[currentTabName], currentTabName);
            }

            const currentOptionStr = JSON.stringify(optionTables);
            if (currentOptionStr !== lastOptionDataCheck) {
                hideOptionsUntilUpdate = false;
                lastOptionDataCheck = currentOptionStr;
            }

            let optionBtnContent = '';
            let optBtnCount = 0; if (optionTables.length > 0 && !hideOptionsUntilUpdate) {
                let buttonsHtml = '';
                let hasBtns = false;
                optionTables.forEach(table => {
                    if(table.rows) {
                         table.rows.forEach(row => {
                              row.forEach((cell, idx) => {
                                   if(idx > 0 && cell) {
                                       buttonsHtml += `<button class="acu-opt-btn" data-val="${encodeURIComponent(cell)}">${cell}</button>`;
                                       hasBtns = true; optBtnCount++;
                                   }
                              });
                         });
                    }
                });
                if (hasBtns) {
                    optionBtnContent = buttonsHtml;
                }
            }


            let optGridCols = 4;
            if (optBtnCount > 0) {
                 if (optBtnCount <= 4) optGridCols = optBtnCount;
                 else if (optBtnCount % 4 === 0) optGridCols = 4;
                 else if (optBtnCount % 3 === 0) optGridCols = 3;
                 else optGridCols = 4;
            }
            const cssVars = `--acu-opt-cols:repeat(${optGridCols}, 1fr); --acu-card-width:${config.cardWidth}px; --acu-font-size:${config.fontSize}px; --acu-opt-font-size:${config.optionFontSize || 13}px; --acu-dash-font-size:${config.dashboardFontSize || 13}px; --acu-highlight:${colorVal.main}; --acu-highlight-bg:${colorVal.bg}; --acu-accent:${colorVal.main}; --acu-title-color:${titleColorVal}; --acu-nav-cols:${gridCols}; --acu-text-max-height:${config.limitLongText!==false?'80px':'none'}; --acu-text-overflow:${config.limitLongText!==false?'auto':'visible'}`;

            let html = `
                <div class="acu-wrapper acu-theme-${config.theme}" style="${cssVars}">
                    <div class="acu-data-display acu-layout-${config.layout} ${showPanel ? 'visible' : ''} ${isAlreadyVisible ? 'acu-no-anim' : ''}" id="acu-data-area" style="${styleHeight}">
                        ${contentHtml}
                    </div>
                    <div class="acu-nav-container ${isCollapsed ? 'collapsed' : ''} ${isEditingOrder ? 'editing-order' : ''} acu-collapse-${collapseStyle} acu-pill-${collapsePos}" id="acu-nav-bar" style="${consistencyWarnings.size > 0 && isCollapsed ? 'border: 2px solid #e74c3c !important; box-shadow: 0 0 10px rgba(231, 76, 60, 0.5) !important;' : ''}">
                        ${orderControlsHtml}
                        <div class="acu-nav-tabs-area">
                            ${(showDash && config.dashboardPosition === 'panel') ? `<button class="acu-nav-btn ${currentTabName === TAB_DASHBOARD ? 'active' : ''}" data-table="${TAB_DASHBOARD}"><i class="fa-solid fa-tachometer-alt"></i><span>仪表盘</span></button>` : ''}
            `;
            orderedNames.forEach(name => {
                if (hiddenTables.includes(name)) return;
                let iconClass = getIconForTableName(name);
                let btnStyle = '';
                let iconStyle = '';

                if (consistencyWarnings.has(name)) {
                     iconClass = 'fa-exclamation-circle';
                     btnStyle = 'border: 1px solid #e74c3c !important;';
                     iconStyle = 'color: #e74c3c;';
                }

                const isActive = currentTabName === name ? 'active' : '';
                html += `<button class="acu-nav-btn ${isActive}" data-table="${name}" style="${btnStyle}"><i class="fa-solid ${iconClass}" style="${iconStyle}"></i><span>${name}</span></button>`;
              });
            html += `   </div>
                        <div class="acu-nav-separator"></div>
                        <div class="acu-nav-actions-area">
                            ${navActionsHtml}
                        </div>
                        <div class="acu-collapsed-text">展开面板</div>
                    </div>
                </div>`;
            insertHtmlToPage(html); 

            if (showDash && config.dashboardPosition === 'embedded') {
                 const dashHtml = renderDashboard(tables, true);
                 injectEmbeddedDashboard(dashHtml, `acu-theme-${config.theme}`, cssVars);
            } else {
                 $('.acu-embedded-dashboard-container').remove();
            }

            if (optionBtnContent) {
                injectIndependentOptions(optionBtnContent, `acu-theme-${config.theme}`, cssVars);
            } else {
                $('.acu-embedded-options-container').remove();
            }

            bindEvents(tables);
            if (globalScrollTop > 0) {
                $('.acu-panel-content').scrollTop(globalScrollTop);
            }
            updateSaveBtnState();
            if (isEditingOrder) initSortable();
        } catch(e) { console.error("UI Render Error:", e); }
    };

    
    const renderDashboard = (tables, isEmbedded = false) => {
        const config = getConfig();
        const dashConfig = getDashConfig() || {};
        if (hasLegacyMfrsDashConfig(dashConfig)) {
            MFRS_DASHBOARD_SLOTS.forEach(s => { delete dashConfig[s.id]; });
        }

        const defaults = {
            'slot_1_1': {isEmpty:true}, 'slot_1_2': {isEmpty:true}, 
            'slot_2_1': {isEmpty:true}, 'slot_2_2': {isEmpty:true}, 
            'slot_3_1': {isEmpty:true}, 'slot_3_2': {isEmpty:true}, 
            'slot_4_1': {isEmpty:true}, 'slot_4_2': {isEmpty:true}, 
            'slot_5_1': {isEmpty:true}, 'slot_5_2': {isEmpty:true}, 
            'slot_6_1': {isEmpty:true}, 'slot_6_2': {isEmpty:true}
        };

        const getSlotCfg = (id) => ({ ...defaults[id], ...(dashConfig[id] || {}) });

        const findKey = (keyword, exact = false) => {
            if (!keyword) return null;
            return Object.keys(tables).find(k => exact ? k === keyword : k.includes(keyword));
        };

        let _cfgChanged = false;
        const _autoSetup = MFRS_DASHBOARD_SLOTS;
        _autoSetup.forEach(s => {
            if (!dashConfig[s.id]) {
                const k = findKey(s.kw);
                if (k && tables[k]) {
                    const t = tables[k];
                    const entry = { isEmpty: false, title: s.title || (k.endsWith('表') ? k.slice(0, -1) : k), text: k, rule: s.rule };
                    let valid = false;
                    if (s.rule === 'kv') {
                        if (t.rows && t.rows.length) { entry.card = t.rows[0][1]; }
                        if (s.cols) entry.showCols = s.cols;
                        valid = true;
                    } else if (s.rule === 'capsule') {
                        entry.capCol = s.col;
                        if (s.capCols) entry.capCols = s.capCols;
                        valid = true;
                    }
                    if (valid) { dashConfig[s.id] = entry; _cfgChanged = true; }
                }
            }
        });
        if (_cfgChanged) saveDashConfig(dashConfig);

        const renderFirstRowAllCols = (slotId) => {
            const cfg = getSlotCfg(slotId);
            const keyword = cfg.text;
            const key = findKey(keyword);
            const table = key ? tables[key] : null;

            if (!table || !table.rows || table.rows.length === 0 || !tableHasEffectiveRows(table)) {
                const fallbackHtml = renderMfrsTableFallback(keyword);
                if (fallbackHtml) return fallbackHtml;
                return `<div style="padding:15px; color:var(--acu-text-sub); font-size:12px; text-align:center;">未找到表格: ${keyword}</div>`;
            }

            const headers = table.headers || [];
            let targetRow = table.rows[0];

            if (cfg.card) {
                const found = table.rows.find(r => r[1] === cfg.card);
                if (found) targetRow = found;
            }

            let itemsHtml = '';
            const colsToShow = (cfg.showCols && cfg.showCols.length > 0) ? cfg.showCols.map(Number) : null;

            targetRow.forEach((cell, idx) => {
                if (idx === 0) return; 
                if (colsToShow && !colsToShow.includes(idx)) return;

                const label = headers[idx] || `列${idx}`;
                if (cell !== undefined && cell !== null && String(cell).trim() !== '') {
                    itemsHtml += `
                        <div class="acu-dash-stat-row" style="display:flex; justify-content:flex-start; align-items:center; padding:8px 10px; background:var(--acu-btn-bg); border-radius:8px; border:1px solid transparent; width:100%; box-sizing:border-box;">
                            <span class="acu-dash-stat-label" style="color:var(--acu-title-color); font-size:1em; margin-right:8px; white-space:normal; overflow-wrap:break-word; flex-shrink:0; width:90px;">${label}</span>
                            <span class="acu-dash-stat-val" style="color:var(--acu-text-main); font-weight:bold; font-size:1em; white-space:pre-wrap; word-break:break-word; text-align:left;">${cell}</span>
                        </div>
                    `;
                }
            });

            return `<div class="acu-dash-char-info" style="display:flex; flex-direction:column; gap:8px; overflow-y: auto; height: 100%; padding-right: 4px;">${itemsHtml}</div>`;
        };

        const renderSecondColCapsules = (slotId) => {
            const cfg = getSlotCfg(slotId);
            const keyword = cfg.text;
            const key = findKey(keyword);
            const table = key ? tables[key] : null;

            if (!table || !table.rows || table.rows.length === 0 || !tableHasEffectiveRows(table)) {
                 const fallbackHtml = renderMfrsTableFallback(keyword);
                 if (fallbackHtml) return fallbackHtml;
                 return `<div style="padding:15px; color:var(--acu-text-sub); font-size:12px; text-align:center;">未找到表格: ${keyword}</div>`;
            }

            const targetColIdx = (cfg.capCol !== undefined && cfg.capCol !== null) ? parseInt(cfg.capCol) : 1;
            const capCols = cfg.capCols || 0;

            let gridStyleOverride = '';
            if (capCols > 0) {
                gridStyleOverride = `grid-template-columns: repeat(${capCols}, 1fr) !important;`;
            }

            let iconHtml = '';
            if (capCols === 2) {
                const iconClass = getIconForTableName(key);
                iconHtml = `<i class="fa-solid ${iconClass}" style="margin-right:6px; opacity:0.7; font-size:0.9em;"></i>`;
            }

            let itemsHtml = '';
            table.rows.forEach((row, rIdx) => {
                const val = row[targetColIdx] !== undefined ? row[targetColIdx] : '';
                if (val && String(val).trim() !== '') {
                    const flexStyle = capCols === 2 ? 'display:flex; align-items:center; justify-content:center;' : '';
                    itemsHtml += `<div class="acu-dash-npc-item acu-dash-interactive" data-tname="${key}" data-row="${rIdx}" data-col="${targetColIdx}" style="cursor:pointer; padding:10px 10px; background:var(--acu-table-head); border-radius:8px; border:1px solid transparent; font-size:0.9em; font-weight:500; transition:all 0.2s; ${flexStyle}">${iconHtml}${val}</div>`;
                }
            });

            const noLimitSlots = ['slot_tab1', 'slot_tab1_2', 'slot_tab1_3'];
            const customStyle = 'height: 100%; ' + gridStyleOverride + (window.innerWidth <= 768 ? 'max-height: 200px;' : '');

            return `<div class="acu-dash-npc-grid acu-no-scrollbar" style="${customStyle}">${itemsHtml}</div>`;
        };

        const renderSlotContent = (slotId) => {
            const cfg = getSlotCfg(slotId);
            if (cfg.isEmpty) {
                return `<div style="width:100%; height:100%; min-height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0.6;">
                    <button class="acu-slot-setting-btn" data-slot="${slotId}" style="width:40px; height:40px; border-radius:50%; background:transparent; color:var(--acu-text-sub); border:2px dashed var(--acu-text-sub); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; transition:all 0.2s;">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                    <div style="margin-top:8px; font-size:12px; color:var(--acu-text-sub);">点击配置</div>
                </div>`;
            }
            if (cfg.rule === 'kv') return renderFirstRowAllCols(slotId);
            return renderSecondColCapsules(slotId);
        };

        const getSlotTitle = (slotId) => {
            const cfg = getSlotCfg(slotId);
            return cfg.isEmpty ? '未配置' : cfg.title;
        };

        const renderSlotWrapper = (slotId, contentHtml) => {
             const cfg = getSlotCfg(slotId);
             if (cfg.isEmpty) {
                 return `<div class="acu-dash-card" style="position:relative; border: 2px dashed var(--acu-border); background: rgba(0,0,0,0.02); box-shadow:none;">
                    ${contentHtml}
                 </div>`;
             }
             const editBtn = isDashEditing ? 
                `<button class="acu-slot-setting-btn" data-slot="${slotId}" style="position:absolute; top:8px; right:8px; z-index:10; width:24px; height:24px; border-radius:50%; background:var(--acu-btn-active-bg); color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.2);"><i class="fa-solid fa-cog" style="font-size:12px;"></i></button>` : '';

             return `
                <div class="acu-dash-card" style="position:relative; width:100%; box-sizing:border-box; flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
                    ${editBtn}
                    <div class="acu-dash-title">${cfg.title || '未命名'}</div>
                    ${contentHtml}
                </div>
             `;
        };

        const getTabEditBtn = (sid) => isDashEditing ? 
             `<button class="acu-slot-setting-btn" data-slot="${sid}" style="margin-left:5px; width:20px; height:20px; border-radius:50%; background:var(--acu-btn-active-bg); color:#fff; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;"><i class="fa-solid fa-cog" style="font-size:10px;"></i></button>` : '';

        const render3In1Group = (groupId, slotIds, minHeight, isAutoHeight) => {
            let visibleIds = slotIds.filter(id => !getSlotCfg(id).isEmpty);
            if (isDashEditing) visibleIds = slotIds; 

            if (visibleIds.length === 0) return '';

            let header = '<div class="acu-tab-header">';
            let body = '<div class="acu-tab-content-container" style="flex:1;">';

            visibleIds.forEach((sid, i) => {
                const active = i === 0 ? 'active' : '';
                const title = getSlotTitle(sid);
                const tabId = `${groupId}-${sid}`;
                header += `<div class="acu-tab-btn ${active}" data-target="${tabId}">${title} ${getTabEditBtn(sid)}</div>`;
                body += `<div id="${tabId}" class="acu-tab-pane ${active}">${renderSlotContent(sid)}</div>`;
            });
            header += '</div>';
            body += '</div>';

                const flexStyle = 'flex: 1 1 auto;';

            return `<div class="acu-dash-card" style="${minHeight ? 'min-height:'+minHeight+';' : ''} width:100%; box-sizing:border-box; display:flex; flex-direction:column; padding:0; overflow:hidden; gap:0; ${flexStyle} min-height: 0;">
                <div style="padding:10px 16px 0 16px;">${header}</div>
                <div class="acu-no-scrollbar" style="padding:6px 16px 16px 16px; flex:1; overflow-y:auto;">${body}</div>
            </div>`;
        };

                const c1Ids = ['slot_1_1', 'slot_1_2', 'slot_2_1', 'slot_2_2'];
        const c2Ids = ['slot_3_1', 'slot_3_2', 'slot_4_1', 'slot_4_2'];
        const c3Ids = ['slot_5_1', 'slot_5_2', 'slot_6_1', 'slot_6_2'];

        const hasC1 = isDashEditing || c1Ids.some(id => !getSlotCfg(id).isEmpty);
        const hasC2 = isDashEditing || c2Ids.some(id => !getSlotCfg(id).isEmpty);
        const hasC3 = isDashEditing || c3Ids.some(id => !getSlotCfg(id).isEmpty);

        let activeCols = 0;
        if (hasC1) activeCols++;
        if (hasC2) activeCols++;
        if (hasC3) activeCols++;

        const gridStyle = activeCols > 0 ? `grid-template-columns: repeat(${activeCols}, 1fr) !important;` : 'display: flex; flex-direction: column;';

        const content = `
            ${renderMfrsStatusModule()}
            <div class="acu-dash-container" style="${gridStyle}">
                ${hasC1 ? `<div class="acu-dash-col">
                    ${render3In1Group('grp_1', ['slot_1_1', 'slot_1_2'], null, true)}
                    ${render3In1Group('grp_2', ['slot_2_1', 'slot_2_2'], null, false)}
                </div>` : ''}
                ${hasC2 ? `<div class="acu-dash-col">
                    ${render3In1Group('grp_3', ['slot_3_1', 'slot_3_2'], null, true)}
                    ${render3In1Group('grp_4', ['slot_4_1', 'slot_4_2'], null, false)}
                </div>` : ''}
                ${hasC3 ? `<div class="acu-dash-col">
                    ${render3In1Group('grp_5', ['slot_5_1', 'slot_5_2'], null, true)}
                    ${render3In1Group('grp_6', ['slot_6_1', 'slot_6_2'], null, false)}
                </div>` : ''}
            </div>
        `;

        if (isEmbedded) {
            return content;
        }

        const html = `
            <div class="acu-panel-header">
                <div class="acu-panel-title">
                    <i class="fa-solid fa-tachometer-alt"></i> 仪表盘
                    ${isDashEditing ? '<span style="font-size:12px; margin-left:10px; color:var(--acu-highlight); background:var(--acu-highlight-bg); padding:2px 8px; border-radius:4px;">编辑模式</span>' : ''}
                </div>
                <div class="acu-header-actions">
                    <div class="acu-header-btn-group" style="display:flex; gap:6px; align-items:center;">
                        <button class="acu-header-btn" id="acu-btn-dash-edit" title="${isDashEditing ? '退出编辑' : '编辑仪表盘'}">
                            <i class="fa-solid ${isDashEditing ? 'fa-check' : 'fa-edit'}" style="${isDashEditing ? 'color:var(--acu-highlight)' : ''}"></i>
                        </button>
                        <button class="acu-header-btn acu-height-drag-handle" data-table="acu_tab_dashboard_home" title="按住拖动调整高度">
                            <i class="fa-solid fa-arrows-up-down"></i>
                        </button>
                        
                        <button class="acu-header-btn" id="acu-btn-close" title="关闭">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="acu-panel-content acu-no-scrollbar" style="overflow-y:auto; padding:0;">
                ${content}
            </div>
        `;
        return html;
    };

    const insertHtmlToPage = (html) => {
        const { $ } = getCore();
        const $chat = $('#chat');
        const config = getConfig();
        
        $('.acu-wrapper').remove();
        
        const $newContent = $(html);
        
        if (config.frontendPosition === 'message') {
             const $lastMes = $chat.find('.mes').last();
             if ($lastMes.length) {
                 const $targetBlock = $lastMes.find('.mes_block').length ? $lastMes.find('.mes_block') : $lastMes;
                 $targetBlock.append($newContent);
             } else {
                 if ($chat.length) $chat.append($newContent); else $('body').append($newContent);
             }
        } else {
            if ($chat.length) { $chat.append($newContent); } else { $('body').append($newContent); }
        }

        if (observer) observer.disconnect();
        observer = new MutationObserver((mutations) => {
            const currentConfig = getConfig();
            const $chatNode = $('#chat');
            const $wrapper = $('.acu-wrapper');
            
            if (!$chatNode.length || !$wrapper.length) return;

            if (currentConfig.frontendPosition === 'message') {
                const $lastMes = $chatNode.find('.mes').last();
                if ($lastMes.length) {
                    const $targetBlock = $lastMes.find('.mes_block').length ? $lastMes.find('.mes_block') : $lastMes;
                    if (!$targetBlock.find('.acu-wrapper').length) {
                         $targetBlock.append($wrapper);
                    }
                    else if ($targetBlock.children().last()[0] !== $wrapper[0]) {
                         $targetBlock.append($wrapper);
                    }
                }
            } else {
                const children = $chatNode.children();
                const lastChild = children.last()[0];
                if (lastChild && lastChild !== $wrapper[0]) {
                    if ($(lastChild).hasClass('mes') || $(lastChild).hasClass('message-body')) {
                        $chatNode.append($wrapper);
                    }
                }
            }
        });
        
        if ($chat.length) { 
            observer.observe($chat[0], { childList: true, subtree: true }); 
        }
    };

    const renderTableContent = (tableData, tableName) => {
        if (!tableData || !tableData.rows.length) return `<div class="acu-panel-header"><div class="acu-panel-title">${tableName} ${(tableData && tableData._missingInfo) ? '<span style="color:#e74c3c;font-weight:bold;">缺少' + tableData._missingInfo + '</span>' : ((tableData && tableData._hasWarning) ? '<span style="color:#e74c3c;font-weight:bold;">数量异常</span>' : '<span style="color:var(--acu-text-sub);font-weight:normal;">0</span>')}</div><div class="acu-header-actions"><button class="acu-header-btn" id="acu-btn-close" title="关闭"><i class="fa-solid fa-times"></i></button></div></div><div class="acu-panel-content"><div style="text-align:center;color:var(--acu-text-sub);padding:40px 20px;"><i class="fa-solid fa-inbox" style="font-size:48px;opacity:0.3;margin-bottom:15px;"></i><div style="font-size:16px;margin-bottom:8px;">暂无数据</div><div style="font-size:12px;opacity:0.7;">该表格当前没有任何记录</div></div></div>`;

        const headers = tableData.headers.slice(1);
        let titleColIndex = 1;const codeIdx = tableData.headers.findIndex(h => h && (String(h).includes('编码') || String(h).includes('索引')));if (codeIdx > 0) titleColIndex = codeIdx;
        
        const config = getConfig();
        const itemsPerPage = config.itemsPerPage || 20;
        
        const savedStyles = getTableStyles();
        const currentStyle = savedStyles[tableName] || 'list';
        const isListMode = currentStyle === 'list';

        const checkRowChanged = (realIdx, row) => {
            if (currentDiffMap.has(`${tableName}-row-${realIdx}`)) return true;
            if (pendingDeletes.has(`${tableName}-row-${realIdx}`)) return true;
            for (let c = 1; c < row.length; c++) {
                if (currentDiffMap.has(`${tableName}-${realIdx}-${c}`)) return true;
            }
            return false;
        };

        let processedRows = tableData.rows.map((row, index) => ({
            data: row,
            originalIndex: index,
            hasChange: checkRowChanged(index, row)
        }));

        if (currentSearchTerm) {
               processedRows = processedRows.filter(item => item.data.some(cell => String(cell).toLowerCase().includes(currentSearchTerm)));
        }

        const reverseTables = getReverseOrderTables();
        const isReversed = reverseTables.includes(tableName);
        const isSortModified = true;
        
        processedRows.sort((a, b) => {
            if (isSortModified) {
                if (a.hasChange && !b.hasChange) return -1;
                if (!a.hasChange && b.hasChange) return 1;
            }
            if (isReversed) {
                return b.originalIndex - a.originalIndex;
            } else {
                return a.originalIndex - b.originalIndex;
            }
        });

        const displayTotal = processedRows.length;
        const totalPages = Math.ceil(displayTotal / itemsPerPage) || 1;
        const displayPages = Math.ceil(displayTotal / itemsPerPage) || 1;
        
        if (currentPage > totalPages) currentPage = 1;
        if (currentPage < 1) currentPage = 1;
        
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const slicedRows = processedRows.slice(startIdx, endIdx);

        let html = `
            <div class="acu-panel-header">
                  <div class="acu-panel-title">
                    ${tableName} ${(tableData && tableData._missingInfo) ? '<span style="color:#e74c3c;font-weight:bold;">缺少' + tableData._missingInfo + '</span>' : ((tableData && tableData._hasWarning) ? '<span style="color:#e74c3c;font-weight:bold;">数量异常</span>' : '<span style="color:var(--acu-text-sub);font-weight:normal;">' + displayTotal + '</span>')}
                </div>
                <div class="acu-header-actions">
                    <div class="acu-header-btn-group" style="display:flex; gap:6px; align-items:center;">
                        <button class="acu-header-btn" id="acu-btn-search-toggle" title="搜索" style="${currentSearchTerm ? 'display:none' : ''}">
                            <i class="fa-solid fa-search"></i>
                        </button>
                        <input type="text" class="acu-search-input" id="acu-search-input" placeholder="搜索..." value="${currentSearchTerm}" style="${currentSearchTerm ? '' : 'display:none'}; width: 120px; margin-right: 4px; padding-left: 10px;" />
                        <button class="acu-header-btn" id="acu-btn-switch-style" data-table="${tableName}" title="切换视图 (当前: ${isListMode?'单列':'双列'})">
                            <i class="fa-solid ${isListMode ? 'fa-list' : 'fa-th-large'}"></i>
                        </button>
                        <button class="acu-header-btn acu-height-drag-handle" data-table="${tableName}" title="按住拖动调整高度 (双击重置)">
                            <i class="fa-solid fa-arrows-up-down"></i>
                        </button>
                        <button class="acu-header-btn" id="acu-btn-refresh" title="刷新数据">
                            <i class="fa-solid fa-sync-alt"></i>
                        </button>
                        
                        <button class="acu-header-btn" id="acu-btn-close" title="关闭">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="acu-panel-content">
                <div class="acu-card-grid">`;

        slicedRows.forEach((item) => {
            const row = item.data;
            const realIndex = item.originalIndex;
             const cardTitle = row[titleColIndex] || '未命名';
            const showDefaultIndex = (titleColIndex === 1);
            const isRowNew = currentDiffMap.has(`${tableName}-row-${realIndex}`);
            const isPendingDelete = pendingDeletes.has(`${tableName}-row-${realIndex}`);
            const rowClass = isRowNew && config.highlightNew ? 'acu-highlight-changed' : '';

            html += `<div class="acu-data-card">
                        ${isPendingDelete ? '<div class="acu-badge-pending">待删除</div>' : ''}
                        <div class="acu-card-header">
                            <span class="acu-card-index">${showDefaultIndex ? '#' + (realIndex + 1) : ''}</span>
                            <span class="acu-cell acu-editable-title" data-key="${tableData.key}" data-tname="${tableName}" data-row="${realIndex}" data-col="${titleColIndex}" data-val="${encodeURIComponent(cardTitle)}" title="点击编辑标题">${cardTitle}</span>
                        </div>
                        <div class="acu-card-body">`;
            let gridHtml = ''; let fullHtml = '';
            row.forEach((cell, cIdx) => {
                if (cIdx > 0 && cIdx !== titleColIndex) {
                    const headerName = headers[cIdx - 1] || `属性${cIdx}`;
                    const cellStr = String(cell);
                    const displayCell = cellStr.trim();
                    if (displayCell === 'auto_merged') return;
                    const badgeStyle = getBadgeStyle(displayCell);
                    const isCellChanged = currentDiffMap.has(`${tableName}-${realIndex}-${cIdx}`);
                    const cellHighlight = isCellChanged && config.highlightNew ? 'acu-highlight-changed' : '';
                    const dataAttrs = `data-key="${tableData.key}" data-tname="${tableName}" data-row="${realIndex}" data-col="${cIdx}" data-val="${encodeURIComponent(cell)}"`;
                    const contentHtml = badgeStyle ? `<span class="acu-badge ${badgeStyle}">${displayCell}</span>` : displayCell;

                    if (isListMode) {
                         fullHtml += `<div class="acu-cell acu-inline-item" ${dataAttrs}><div class="acu-inline-label">${headerName}</div><div class="acu-inline-value ${cellHighlight}">${contentHtml}</div></div>`;
                    } else {
                         if (codeIdx > 0) {
                             fullHtml += `<div class="acu-cell acu-full-item" ${dataAttrs}><div class="acu-full-label">${headerName}</div><div class="acu-full-value ${cellHighlight}">${displayCell}</div></div>`;
                         } else {
                            if (cellStr.length > 50) {
                                fullHtml += `<div class="acu-cell acu-full-item" ${dataAttrs}><div class="acu-full-label">${headerName}</div><div class="acu-full-value ${cellHighlight}">${displayCell}</div></div>`;
                            }
                            else {
                                gridHtml += `<div class="acu-cell acu-grid-item" ${dataAttrs}><div class="acu-grid-label">${headerName}</div><div class="acu-grid-value ${cellHighlight}">${contentHtml}</div></div>`;
                            }
                         }
                    }
                }
            });
            if (gridHtml) html += `<div class="acu-card-main-grid">${gridHtml}</div>`;
            if (fullHtml) html += `<div class="acu-card-full-area">${fullHtml}</div>`;
            html += `   </div></div>`;
        });
        html += `</div></div>`;
        if (displayPages > 1) {
             html += `<div class="acu-panel-footer"><button class="acu-page-btn" data-page="${currentPage - 1}" ${currentPage===1?'disabled':''}><i class="fa-solid fa-angle-left"></i></button>`;
             const range = [];
             if (displayPages <= 7) { for (let i = 1; i <= displayPages; i++) range.push(i); }
             else { if (currentPage <= 4) range.push(1, 2, 3, 4, 5, '...', displayPages); else if (currentPage >= displayPages - 3) range.push(1, '...', displayPages - 4, displayPages - 3, displayPages - 2, displayPages - 1, displayPages); else range.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', displayPages); }
             range.forEach(p => { if (p === '...') html += `<span class="acu-page-info">...</span>`; else html += `<button class="acu-page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`; });
             html += `<button class="acu-page-btn" data-page="${currentPage + 1}" ${currentPage===displayPages?'disabled':''}><i class="fa-solid fa-angle-right"></i></button></div>`;
        }
        return html;
    };

    const closePanel = () => {
        const { $ } = getCore();
        if (!$) return;

        const $chat = $('#chat');
        const config = getConfig();
        const currentScroll = $chat.length ? $chat.scrollTop() : 0;

        $('#acu-data-area').removeClass('visible');
        $('.acu-nav-btn').removeClass('active');
        saveActiveTabState(null);
        pendingDeletes.clear();
        updateSaveBtnState();

        if ($chat.length) {
            setTimeout(() => {
                 $chat.scrollTop(currentScroll);
            }, 10);
        }
    };

    const bindEvents = (tables) => {
        const { $ } = getCore();
        const stopSelectors = '.acu-data-display, .acu-nav-container, .acu-wrapper, .acu-edit-overlay, .acu-quick-view-overlay, .acu-cell-menu';
        $('body').off('wheel touchstart touchmove touchend click', stopSelectors).on('wheel touchstart touchmove touchend click', stopSelectors, function(e) {
            e.stopPropagation();
        });
        
        $('body').off('click.acu_autoclose').on('click.acu_autoclose', function(e) {
            if (isEditingOrder) return;
            
            if (!$('#acu-data-area').hasClass('visible')) return;

            const $target = $(e.target);
            
            if ($target.closest('.acu-wrapper').length) return;

            if ($target.closest('.acu-cell-menu').length) return;
            if ($target.closest('.acu-edit-overlay').length) return;
            if ($target.closest('.acu-popup-overlay').length) return;
            if ($target.closest('.acu-quick-view-overlay').length) return;
            
            if ($target.closest('#send_textarea, #send_but, #send_form, .bottom_bar_container').length) return;
            if ($target.is('input, textarea') || $target.prop('isContentEditable')) return;

            closePanel();
        });

        const switchTab = (tableName) => {
            currentPage = 1;
            currentSearchTerm = '';
            globalScrollTop = 0;
            
            if (tableName === TAB_DASHBOARD) {
                $('#acu-data-area').html(renderDashboard(tables)).addClass('visible');
                const h = getTableHeights()[TAB_DASHBOARD];
                $('#acu-data-area').css({height: h ? h + 'px' : '60vh', maxHeight: '95vh'});
                bindDataAreaEvents();
            } else if (tables[tableName]) {
                $('#acu-data-area').html(renderTableContent(tables[tableName], tableName)).addClass('visible');
                const h = getTableHeights()[tableName];
                $('#acu-data-area').css({height: h ? h + 'px' : '60vh', maxHeight: '95vh'});
                bindDataAreaEvents();
            }
            $('.acu-nav-btn').removeClass('active');
            $(`.acu-nav-btn[data-table="${tableName}"]`).addClass('active');
            saveActiveTabState(tableName);
            bindDataAreaEvents();
          };

        $('.acu-nav-btn').off('click').on('click', function(e) {
            e.stopPropagation(); 
            if (isEditingOrder) return;
            const tableName = $(this).data('table');
            if ($(this).hasClass('active')) { closePanel(); } else { switchTab(tableName); }
        });
        
        const bindDynamicContentEvents = () => {
            $('.acu-cell').off('click').on('click', function(e) { e.stopPropagation(); showCellMenu(e, this); });
             $('.acu-dash-interactive').off('click').on('click', function(e) {
                e.stopPropagation();
                const tableName = $(this).data('tname');
                const rowIdx = $(this).data('row'); const colIdx = $(this).data('col');
                if (tableName && tables[tableName]) {
                     const table = tables[tableName];
                     const row = table.rows[rowIdx];
                     if (row) showQuickView(row, table.headers, tableName, colIdx);
                }
            });
            $('.acu-tab-btn').off('click').on('click', function(e) {
                 e.stopPropagation();

                 const $container = $(this).closest('.acu-dash-card');
                 const index = $(this).index(); 

                 $container.find('.acu-tab-btn').removeClass('active');
                 $(this).addClass('active');

                 const $panes = $container.find('.acu-tab-pane');
                 $panes.removeClass('active');
                 if ($panes.length > index) {
                     $panes.eq(index).addClass('active');
                 }
            });
            $('.acu-page-btn').off('click').on('click', function(e) {
                e.stopPropagation();
                if ($(this).hasClass('disabled') || $(this).attr('disabled') || $(this).hasClass('active')) return;
                const p = parseInt($(this).data('page'));
                if (!p) return;
                currentPage = p;
                globalScrollTop = 0;
                const tableName = $('.acu-nav-btn.active').data('table');
                if (tableName && tables[tableName]) {
                    $('#acu-data-area').html(renderTableContent(tables[tableName], tableName));
                    bindDataAreaEvents();
                }
            });
        };
        
        const bindDataAreaEvents = () => {
            $('#acu-btn-close').off('click').on('click', function(e) { e.stopPropagation(); closePanel(); });
            
            $('#acu-btn-search-toggle').off('click').on('click', function(e) {
                e.stopPropagation();
                $(this).hide();
                $('#acu-search-input').show().focus();
            });
            
            $('#acu-search-input').off('blur').on('blur', function() {
                 if (!$(this).val()) {
                     $(this).hide();
                     $('#acu-btn-search-toggle').show();
                 }
            });

            let searchDebounceTimer = null;
            $('.acu-search-input').off('input').on('input', function() {
                const inputValue = $(this).val().toLowerCase();
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    currentSearchTerm = inputValue;
                    currentPage = 1;
                    globalScrollTop = 0;
                    const tableName = $('.acu-nav-btn.active').data('table');
                    if (tableName && tables[tableName]) {
                        const fullHtml = renderTableContent(tables[tableName], tableName);
                        const $temp = $('<div>').html(fullHtml);

                        $('.acu-panel-content').html($temp.find('.acu-panel-content').html());
                        $('.acu-panel-title').html($temp.find('.acu-panel-title').html());

                        bindDynamicContentEvents(); bindScrollFade($('.acu-panel-content, .acu-dash-container, .acu-dash-npc-grid'));
                    }
                }, 300);
            });

            $('.acu-height-drag-handle').off('pointerdown').on('pointerdown', function(e) {
                if (e.button !== 0) return;
                e.preventDefault(); e.stopPropagation();
                const handle = this;
                handle.setPointerCapture(e.pointerId);
                $(handle).addClass('active');
                const $panel = $('#acu-data-area');
                const startHeight = $panel.height();
                const startY = e.clientY;
                const tableName = $(handle).data('table');
                
                const onMove = function(moveE) {
                    const dy = moveE.clientY - startY;
                    let newHeight = startHeight - dy;
                    if (newHeight < 200) newHeight = 200;
                    if (newHeight > 1500) newHeight = 1500;
                    $panel.css('height', newHeight + 'px');
                };

                const onEnd = function(upE) {
                    $(handle).removeClass('active');
                    try { handle.releasePointerCapture(upE.pointerId); } catch(err){}
                    handle.removeEventListener('pointermove', onMove);
                    handle.removeEventListener('pointerup', onEnd);
                    handle.removeEventListener('pointercancel', onEnd);
                    if (tableName) {
                         const h = parseInt($panel.css('height'));
                         const heights = getTableHeights();
                         heights[tableName] = h;
                         saveTableHeights(heights);
                    }
                };

                handle.addEventListener('pointermove', onMove);
                handle.addEventListener('pointerup', onEnd);
                handle.addEventListener('pointercancel', onEnd);
            });
            
            $('.acu-panel-header').off('dblclick').on('dblclick', function(e) {
                if ($(e.target).closest('button, input, .acu-height-drag-handle, .acu-search-wrapper').length) return;
                e.preventDefault(); e.stopPropagation();
                
                const activeBtn = $('.acu-nav-btn.active');
                const tableName = activeBtn.data('table');
                
                if (tableName) {
                     const heights = getTableHeights();
                     delete heights[tableName];
                     saveTableHeights(heights);
                     if (window.toastr) window.toastr.info('已重置为默认高度');
                     
                     if (tableName === TAB_DASHBOARD) {
                         $('#acu-data-area').css({height: '60vh', maxHeight: '95vh'});
                     } else {
                         $('#acu-data-area').css({height: '60vh', maxHeight: '95vh'});
                     }
                }
            });
            
            $('#acu-btn-switch-style').off('click').on('click', function(e) {
                e.preventDefault(); e.stopPropagation();
                const tableName = $(this).data('table');
                const styles = getTableStyles();
                const current = styles[tableName] || 'list';
                styles[tableName] = current === 'grid' ? 'list' : 'grid';
                saveTableStyles(styles);
                
                 if (tableName && tables[tableName]) {
                     const fullHtml = renderTableContent(tables[tableName], tableName);
                     const $temp = $('<div>').html(fullHtml);
                     $('.acu-panel-content').html($temp.find('.acu-panel-content').html());
                     $('.acu-panel-header').replaceWith($temp.find('.acu-panel-header'));
                     bindDataAreaEvents(); 
               }
            });

            $('#acu-btn-refresh, #acu-btn-refresh-emb').off('click').on('click', function(e) {
                e.stopPropagation();
                const $btn = $(this);
                const originalHtml = $btn.html();
                $btn.html('<i class="fa-solid fa-spinner fa-spin"></i>').prop('disabled', true);
                setTimeout(() => {
                    renderInterface();
                    $btn.html(originalHtml).prop('disabled', false);
                    if (window.toastr) window.toastr.info('已刷新');
                }, 100);
            });

            $('#acu-btn-dash-edit, #acu-btn-dash-edit-emb').off('click').on('click', (e) => { e.stopPropagation(); isDashEditing = !isDashEditing; renderInterface(); });
            $('.acu-slot-setting-btn').off('click').on('click', function(e) { e.stopPropagation(); showDashSlotSettings($(this).data('slot')); });

              
              bindDynamicContentEvents(); bindScrollFade($('.acu-panel-content, .acu-dash-container, .acu-dash-npc-grid'));
        };

        const toggleUI = () => { isCollapsed = !isCollapsed; localStorage.setItem(STORAGE_KEY_UI_COLLAPSE, isCollapsed); renderInterface(); };
        $('#acu-btn-toggle').off('click').on('click', (e) => { e.stopPropagation(); toggleUI(); });
        if (isCollapsed) { $('.acu-nav-container').off('click').on('click', (e) => { e.stopPropagation(); toggleUI(); }); }

        $('#acu-btn-gacha').off('click').on('click', (e) => { e.stopPropagation(); showGachaPanel(); });
        $('#acu-btn-settings').off('click').on('click', (e) => { e.stopPropagation(); if (isEditingOrder) { toggleOrderEditMode(); } else { showSettingsModal(); } });
        $('#acu-btn-cancel-mode').off('click').on('click', (e) => { e.stopPropagation(); isEditingOrder = false; renderInterface(); });
        $('#acu-btn-save-mode').off('click').on('click', (e) => { e.stopPropagation(); toggleOrderEditMode(); });
        $('#acu-btn-save-global').off('click').on('click', async function(e) {
            e.stopPropagation();
            const rawData = getTableData();
            if (!rawData) return;
            if (pendingDeletes.size > 0 && await commitPendingDeletesWithCrud(rawData)) return;
            await saveDataToDatabase(rawData, false, true);
        });
        $('#acu-btn-open-native').off('click').on('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const $btn = $(this);
            const originalHtml = $btn.html();
            const api = getCore().getDB();
            if (api && api.openVisualizer) {
                $btn.html('<i class="fa-solid fa-spinner fa-spin"></i>').prop('disabled', true);
                try {
                    api.openVisualizer();
                    setTimeout(() => {
                        $btn.html(originalHtml).prop('disabled', false);
                    }, 500);
                } catch (err) {
                    $btn.html(originalHtml).prop('disabled', false);
                    if (window.toastr) window.toastr.error('打开原生编辑器失败：' + err.message);
                }
            } else {
                if (window.toastr) window.toastr.error('无法调用原生编辑器 API，请检查数据库脚本是否正确加载');
            }
        });
        $('#acu-btn-manual-update').off('click').on('click', async function(e) {
            e.preventDefault(); e.stopPropagation();
            const $btn = $(this);
            const originalHtml = $btn.html();
            const api = getCore().getDB();
            if (api && api.manualUpdate) {
                $btn.html('<i class="fa-solid fa-spinner fa-spin"></i>').prop('disabled', true);
                try {
                    await api.manualUpdate();
                    $btn.html(originalHtml).prop('disabled', false);
                    if (window.toastr) window.toastr.success('数据库更新成功');
                } catch (err) {
                    $btn.html(originalHtml).prop('disabled', false);
                    if (window.toastr) window.toastr.error('数据库更新失败：' + (err.message || '未知错误'));
                }
            } else {
                if (window.toastr) window.toastr.error('无法调用数据库更新接口，请检查 API 是否可用');
            }
        });

        $('#send_but').off('click.acu_opt_hide').on('click.acu_opt_hide', function() {
             hideOptionsUntilUpdate = true;
             $('.acu-embedded-options-container').hide();
        });
        $('#send_textarea').off('keydown.acu_opt_hide').on('keydown.acu_opt_hide', function(e) {
             if (e.key === 'Enter' && !e.shiftKey) {
                 hideOptionsUntilUpdate = true;
                 $('.acu-embedded-options-container').hide();
             }
        });
        
        $('.acu-opt-btn').on('click', function(e) {
             e.preventDefault(); e.stopPropagation();
             $(this).blur();
             const val = decodeURIComponent($(this).data('val'));
             const config = getConfig();
             
             let win = window.parent || window;
             let parentDoc = win.document;
             let ta = parentDoc.getElementById('send_textarea');

             if(ta) {
                 ta.value = (ta.value || '') + val;
                 ta.dispatchEvent(new Event('input', { bubbles: true }));
                 ta.dispatchEvent(new Event('change', { bubbles: true }));
                 if (!config.clickOptionToAutoSend) ta.focus();
                 
                 if (config.clickOptionToAutoSend) {
                     hideOptionsUntilUpdate = true;
                     $('.acu-embedded-options-container').hide();
                 

                     const sendBtn = parentDoc.getElementById('send_but');
                     if(sendBtn) sendBtn.click();
                 }
             }
        });

        bindDataAreaEvents();
    };
    
    const showQuickView = (row, headers, tableName, titleColIdx) => {
        const { $ } = getCore();
        const config = getConfig();
        $('.acu-quick-view-overlay').remove();
        const codeIdx = headers.findIndex(h => h && (String(h).includes('编码') || String(h).includes('索引')));
        const savedStyles = getTableStyles();
        const currentStyle = savedStyles[tableName] || 'list';

        let gridHtml = ''; let fullHtml = '';
        row.forEach((cell, cIdx) => {
             if (cIdx > 0) {
                const headerName = headers[cIdx] || `属性${cIdx}`;
                const cellStr = String(cell);
                const displayCell = cellStr.trim();
                if (displayCell === 'auto_merged') return;
                const badgeStyle = getBadgeStyle(displayCell);
                const contentHtml = badgeStyle ? `<span class="acu-badge ${badgeStyle}">${displayCell}</span>` : displayCell;
                
                if (currentStyle === 'list' || codeIdx > 0) {
                     fullHtml += `<div class="acu-cell acu-inline-item" style="cursor:default"><div class="acu-inline-label">${headerName}</div><div class="acu-inline-value">${contentHtml}</div></div>`;
                } else {
                     if (cellStr.length > 50) {
                        fullHtml += `<div class="acu-cell acu-full-item" style="cursor:default"><div class="acu-full-label">${headerName}</div><div class="acu-full-value">${displayCell}</div></div>`;
                     } else {
                        gridHtml += `<div class="acu-cell acu-grid-item" style="cursor:default"><div class="acu-grid-label">${headerName}</div><div class="acu-grid-value">${contentHtml}</div></div>`;
                     }
                }
             }
        });
        
        const html = `
            <div class="acu-quick-view-overlay">
                <div class="acu-quick-view-card acu-theme-${config.theme}" style="--acu-font-size: ${config.fontSize}px; font-size: ${config.fontSize}px;; --acu-text-max-height:${config.limitLongText!==false?'80px':'none'}; --acu-text-overflow:${config.limitLongText!==false?'auto':'visible'}">
                     <div class="acu-quick-view-header">
                        <span><i class="fa-solid ${getIconForTableName(tableName)}"></i> ${row[(titleColIdx !== undefined && titleColIdx !== null) ? titleColIdx : 1] || '详情'}</span>
                        <button class="acu-header-btn" id="qv-close"><i class="fa-solid fa-times"></i></button>
                     </div>
                     <div class="acu-quick-view-body">
                          ${gridHtml ? `<div class="acu-card-main-grid">${gridHtml}</div>` : ''}
                          ${fullHtml ? `<div class="acu-card-full-area">${fullHtml}</div>` : ''}
                     </div>
                </div>
            </div>
        `;
        $('body').append(html); bindScrollFade($('.acu-quick-view-body'));
        
        const close = () => $('.acu-quick-view-overlay').remove();
        $('#qv-close').click(close);
        $('.acu-quick-view-overlay').click((e) => {
             if ($(e.target).hasClass('acu-quick-view-overlay')) close();
        });
    };

    const toggleOrderEditMode = () => {
        if (isEditingOrder) {
            const { $ } = getCore();
            const newOrder = []; 
            $('.acu-nav-tabs-area .acu-nav-btn').each(function() { const t = $(this).data('table'); if(t && t!==TAB_DASHBOARD) newOrder.push(t); });
            saveTableOrder(newOrder);
            const newActionOrder = [];
            $('.acu-nav-actions-area .acu-action-btn').each(function() { if(this.id) newActionOrder.push(this.id); });
            saveActionOrder(newActionOrder);
            isEditingOrder = false;
        } else {
            isEditingOrder = true;
        }
        renderInterface();
    };

    const initSortable = () => {
        const { $ } = getCore();
        let selectedEl = null;

        const setup = (selector) => {
             const $items = $(selector);

             $items.attr('draggable', false);
             $items.css('cursor', 'pointer');

             $items.off('dragstart dragend dragover drop touchstart touchmove touchend click.swap');

             $items.on('click.swap', function(e) { 
                 e.preventDefault();
                 e.stopPropagation();

                 const $this = $(this);

                 if (selectedEl === this) {
                     $this.css({ 'border-color': '', 'box-shadow': '', 'transform': '' }); 
                     selectedEl = null;
                     return;
                 }

                 if (!selectedEl) {

                     selectedEl = this;
                     $this.css({ 'border-color': '#e74c3c', 'box-shadow': '0 0 8px rgba(231, 76, 60, 0.4)', 'transform': 'scale(1.05)' });
                 } else {

                     const $src = $(selectedEl);
                     const $dest = $this;

                     if ($src.parent()[0] === $dest.parent()[0]) {
                        const $siblings = $dest.parent().children();
                        const srcIdx = $siblings.index($src);
                        const targetIdx = $siblings.index($dest);

                        if (srcIdx < targetIdx) {
                            $dest.after($src);
                        } else {
                            $dest.before($src);
                        }
                     }

                     $src.css({ 'border-color': '', 'box-shadow': '', 'transform': '' });
                     selectedEl = null;
                 }
             });
        };

        setup('.acu-nav-tabs-area .acu-nav-btn');
        setup('.acu-nav-actions-area .acu-action-btn');
    };

    const showCellMenu = (e, cell) => {
        const { $ } = getCore();
        $('.acu-cell-menu, .acu-menu-backdrop').remove();
        const backdrop = $('<div class="acu-menu-backdrop"></div>');
        $('body').append(backdrop);
        const rowIdx = parseInt($(cell).data('row'));
        const colIdx = parseInt($(cell).data('col'));
        const tableKey = $(cell).data('key');
        const tableName = $(cell).data('tname');
        const content = decodeURIComponent($(cell).data('val'));
        const config = getConfig();
        
        const deleteKey = `${tableName}-row-${rowIdx}`;
        const isPending = pendingDeletes.has(deleteKey);

        const menu = $(`
            <div class="acu-cell-menu acu-theme-${config.theme}">
                <div class="acu-cell-menu-item" id="act-edit"><i class="fa-solid fa-pen"></i> 编辑内容</div>
                <div class="acu-cell-menu-item" id="act-edit-card"><i class="fa-solid fa-edit"></i> 整体编辑</div>
                <div class="acu-cell-menu-item" id="act-insert" style="color:#2980b9"><i class="fa-solid fa-plus"></i> 插入新行</div>
                
                ${isPending 
                    ? `<div class="acu-cell-menu-item" id="act-restore"><i class="fa-solid fa-undo"></i> 整行恢复</div>` 
                    : `<div class="acu-cell-menu-item" id="act-delete"><i class="fa-solid fa-trash"></i> 删除整行</div>`
                }
                <div class="acu-cell-menu-item" id="act-close"><i class="fa-solid fa-times"></i> 关闭菜单</div>
            </div>
        `);
        $('body').append(menu);
        const mWidth = menu.outerWidth();
        const mHeight = menu.outerHeight();
        const winWidth = $(window).width();
        const winHeight = $(window).height();

        let left = e.clientX + 5;
        let top = e.clientY + 5;

        if (left + mWidth > winWidth) {
            left = e.clientX - mWidth - 5;
        }

        if (top + mHeight > winHeight) {
            top = e.clientY - mHeight - 5;
        }
        
        if (left < 0) left = 0;
        if (top < 0) top = 0;

        menu.css({ top: top + 'px', left: left + 'px' });
        const closeAll = () => { menu.remove(); backdrop.remove(); };
        backdrop.on('click', function(e) { e.stopPropagation(); closeAll(); });
        menu.find('#act-close').click(closeAll);
        
        
        
        menu.find('#act-delete').click(() => {
            pendingDeletes.add(deleteKey);
            const $card = $(cell).closest('.acu-data-card');
            if ($card.length && $card.find('.acu-badge-pending').length === 0) {
                $card.append('<div class="acu-badge-pending">待删除</div>');
            }
            updateSaveBtnState();
            closeAll();
        });
        
        menu.find('#act-restore').click(() => {
            pendingDeletes.delete(deleteKey);
            const $card = $(cell).closest('.acu-data-card');
            $card.find('.acu-badge-pending').remove();
            updateSaveBtnState();
            closeAll();
        });

        menu.find('#act-edit').click(() => { 
            closeAll();
            showEditDialog(content, async (newVal) => { 
                const $cell = $(cell);
                $cell.attr('data-val', encodeURIComponent(newVal));
                $cell.data('val', encodeURIComponent(newVal));

                let $displayTarget = $cell;
                if ($cell.hasClass('acu-grid-item')) $displayTarget = $cell.find('.acu-grid-value');
                else if ($cell.hasClass('acu-full-item')) $displayTarget = $cell.find('.acu-full-value');
                else if ($cell.hasClass('acu-inline-item')) $displayTarget = $cell.find('.acu-inline-value');
                else if ($cell.hasClass('acu-editable-title')) $displayTarget = $cell;

                const badgeStyle = getBadgeStyle(newVal);
                if (badgeStyle && !$cell.hasClass('acu-editable-title')) {
                     $displayTarget.html(`<span class="acu-badge ${badgeStyle}">${newVal}</span>`);
                } else {
                     $displayTarget.text(newVal);
                }
                $displayTarget.addClass('acu-highlight-changed');

                const rawData = getTableData();
                if (rawData && rawData[tableKey]?.content[rowIdx + 1]) {
                    const columnName = rawData[tableKey].content[0]?.[colIdx];
                    const savedByCrud = await applyCellEditWithCrud(tableName, rowIdx, columnName, newVal);
                    if (!savedByCrud) {
                        rawData[tableKey].content[rowIdx + 1][colIdx] = newVal;
                        await saveDataToDatabase(rawData, true);
                    }
                }
            });
        });
        menu.find('#act-insert').click(async () => {
            closeAll();
            const rawData = getTableData();
            if (rawData && rawData[tableKey]?.content) {
                const sheet = rawData[tableKey];
                const colCount = sheet.content[0] ? sheet.content[0].length : 2;
                const newRow = new Array(colCount).fill('');
                if (colCount > 0) newRow[0] = String(sheet.content.length);
                sheet.content.splice(rowIdx + 2, 0, newRow);
                if (window.toastr) window.toastr.info('正在插入新行...');
                await saveDataToDatabase(rawData, false, true);
            }
        });

        menu.find('#act-edit-card').click(() => {
            closeAll();
            const rawData = getTableData();
            if (rawData && rawData[tableKey]) {
                const headers = rawData[tableKey].content[0];
                const row = rawData[tableKey].content[rowIdx + 1];
                if (row) {
                    showCardEditModal(row, headers, tableName, rowIdx, tableKey);
                }
            }
        });
    };

    const showCardEditModal = (row, headers, tableName, rowIndex, tableKey) => {
        const { $ } = getCore();
        const config = getConfig();
        const rawData = getTableData();
        let displayRow = row;
        if (rawData && rawData[tableKey] && rawData[tableKey].content[rowIndex + 1]) {
            displayRow = rawData[tableKey].content[rowIndex + 1];
        }

        const inputsHtml = displayRow.map((cell, idx) => {
            if (idx === 0) return '';
            const headerName = headers[idx] || `Column ${idx}`;
            const val = cell || '';
            return `
                <div class="acu-card-edit-field">
                    <label class="acu-card-edit-label">${headerName}</label>
                    <textarea class="acu-card-edit-input" data-col="${idx}" spellcheck="false">${val}</textarea>
                </div>`;
        }).join('');

        const dialog = $(`
            <div class="acu-edit-overlay">
                <div class="acu-edit-dialog acu-theme-${config.theme}">
                    <div class="acu-edit-title">整体编辑 (#${rowIndex + 1})</div>
                    <div class="acu-settings-content" style="flex:1; overflow-y:auto;">
                        ${inputsHtml}
                    </div>
                     <div class="acu-dialog-btns">
                        <button class="acu-dialog-btn" id="dlg-card-cancel"><i class="fa-solid fa-times"></i> 取消</button>
                        <button class="acu-dialog-btn acu-btn-confirm" id="dlg-card-save" style="color:var(--acu-highlight)"><i class="fa-solid fa-check"></i> 保存</button>
                    </div>
                </div>
            </div>
        `);
        $('body').append(dialog); bindScrollFade(dialog.find('.acu-card-edit-input'));

        dialog.find('textarea').each(function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight + 2) + 'px';
        }).on('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight + 2) + 'px';
        });

        const closeDialog = () => dialog.remove();
        dialog.find('#dlg-card-cancel').click(closeDialog);

        dialog.find('#dlg-card-save').click(async () => {
            const currentData = getTableData(); 
            if (currentData && currentData[tableKey]) {
                const currentRow = currentData[tableKey].content[rowIndex + 1];
                let hasChanges = false;
                const changes = {};
                dialog.find('textarea').each(function () {
                    const colIdx = parseInt($(this).data('col'));
                    const newVal = $(this).val();
                    if (String(currentRow[colIdx]) !== String(newVal)) {
                        hasChanges = true;
                        const columnName = currentData[tableKey].content[0]?.[colIdx];
                        if (columnName) changes[columnName] = newVal ?? '';
                    }
                });
                if (hasChanges) {
                    const savedByCrud = await applyRowEditWithCrud(tableName, rowIndex, changes);
                    if (!savedByCrud) {
                        dialog.find('textarea').each(function () {
                            const colIdx = parseInt($(this).data('col'));
                            currentRow[colIdx] = $(this).val();
                        });
                        await saveDataToDatabase(currentData, false);
                    }
                }
            }
            closeDialog();
        });
        dialog.on('click', function(e) { if ($(e.target).hasClass('acu-edit-overlay')) closeDialog(); });
    };

    const showEditDialog = (content, onSave) => {
        const { $ } = getCore();
        const config = getConfig();
        const dialog = $(`
            <div class="acu-edit-overlay">
                <div class="acu-edit-dialog acu-theme-${config.theme}">
                    <div class="acu-edit-title">编辑单元格内容</div>
                    <textarea class="acu-edit-textarea">${content}</textarea>
                     <div class="acu-dialog-btns">
                        <button class="acu-dialog-btn" id="dlg-cancel"><i class="fa-solid fa-times"></i> 取消</button>
                        <button class="acu-dialog-btn acu-btn-confirm" id="dlg-save"><i class="fa-solid fa-check"></i> 保存</button>
                    </div>
                </div>
            </div>
        `);
        $('body').append(dialog); bindScrollFade(dialog.find('.acu-edit-textarea'));
        const closeDialog = () => dialog.remove();
        dialog.find('#dlg-cancel').click(closeDialog);
        dialog.find('#dlg-save').click(() => { onSave(dialog.find('textarea').val()); closeDialog(); });
        dialog.on('click', function(e) { if ($(e.target).hasClass('acu-edit-overlay')) closeDialog(); });
    };

    
    
    const showDashSlotSettings = (slotId) => {
        const { $ } = getCore();
        const config = getConfig();
        const currentDashCfg = getDashConfig() || {};

        const defaults = {
            'slot_1_1': {isEmpty:true}, 'slot_1_2': {isEmpty:true}, 
            'slot_2_1': {isEmpty:true}, 'slot_2_2': {isEmpty:true}, 
            'slot_3_1': {isEmpty:true}, 'slot_3_2': {isEmpty:true}, 
            'slot_4_1': {isEmpty:true}, 'slot_4_2': {isEmpty:true}, 
            'slot_5_1': {isEmpty:true}, 'slot_5_2': {isEmpty:true}, 
            'slot_6_1': {isEmpty:true}, 'slot_6_2': {isEmpty:true}
        };
        const currentSlotCfg = { ...defaults[slotId], ...(currentDashCfg[slotId] || {}) };

        const rawData = getTableData();
        const processedTables = rawData ? processJsonData(rawData) : {};
        const tableNames = Object.keys(processedTables);

        let activeTableName = currentSlotCfg.text;
        if (!tableNames.includes(activeTableName)) {
            const fuzzyMatch = tableNames.find(k => k.includes(activeTableName));
            if (fuzzyMatch) activeTableName = fuzzyMatch;
            else activeTableName = '';
        }

        const dialog = $(`
            <div class="acu-edit-overlay">
                <div class="acu-edit-dialog acu-theme-${config.theme}" style="max-width: 400px; height: auto; max-height: 90vh; overflow: hidden;">
                    <div class="acu-edit-title" style="display:flex; justify-content:space-between; align-items:center; padding:15px;">
                        <button id="dlg-slot-reset" style="background:transparent; border:none; color:var(--acu-text-sub); cursor:pointer; font-size:12px; display:flex; align-items:center; gap:4px; padding:5px; border-radius:4px; transition:background 0.2s;">
                            <i class="fa-solid fa-undo"></i> 重置
                        </button>
                        <span style="font-weight:bold;">配置</span>
                        <div style="width:40px;"></div>
                    </div>
                    <div class="acu-settings-content" style="padding: 20px; display: flex; flex-direction: column; gap: 15px; overflow-y:auto;">

                        <div>
                            <label style="font-weight:bold; display:block; margin-bottom:5px;">显示标题</label>
                            <input type="text" id="slot-title" value="${currentSlotCfg.title || ''}" class="acu-card-edit-input">
                        </div>

                        <div>
                            <label style="font-weight:bold; display:block; margin-bottom:5px;">绑定表格</label>
                            <select id="slot-table" class="acu-nice-select" style="width:100%">
                                <option value="" ${!activeTableName ? "selected" : ""}>-- 请选择 --</option>
                                ${tableNames.map(n => `<option value="${n}" ${n === activeTableName ? 'selected' : ''}>${n}</option>`).join('')}
                            </select>
                        </div>

                        <div>
                            <label style="font-weight:bold; display:block; margin-bottom:5px;">展示规则</label>
                            <select id="slot-rule" class="acu-nice-select" style="width:100%">
                                <!-- 2. 重命名列表模式为卡片展示，胶囊模式为表格总览 -->
                                <option value="kv" ${currentSlotCfg.rule === 'kv' ? 'selected' : ''}>卡片展示</option>
                                <option value="capsule" ${currentSlotCfg.rule === 'capsule' ? 'selected' : ''}>表格总览</option>
                            </select>
                        </div>

                        <!-- 3. 卡片展示自定义设置 -->
                        <div id="set-kv-area" style="display:none; flex-direction:column; gap:15px;">
                            <div>
                                <label style="font-weight:bold; display:block; margin-bottom:5px;">选择卡片</label>
                                <select id="slot-kv-card" class="acu-nice-select" style="width:100%"></select>
                            </div>
                            <div>
                                <label style="font-weight:bold; display:block; margin-bottom:5px;">选择展示列 (多选)</label>
                                <div id="slot-kv-cols" style="display:flex; flex-direction:column; gap:5px; max-height:150px; overflow-y:auto; background:var(--acu-input-bg); padding:5px; border-radius:4px; border:1px solid var(--acu-border);"></div>
                            </div>
                        </div>

                        <!-- 4. 表格总览自定义设置 -->
                        <div id="set-cap-area" style="display:none; flex-direction:column; gap:15px;">
                            <div>
                                <label style="font-weight:bold; display:block; margin-bottom:5px;">选择展示列</label>
                                <select id="slot-cap-col" class="acu-nice-select" style="width:100%"></select>
                            </div>
                            <div>
                                <label style="font-weight:bold; display:block; margin-bottom:5px;">卡槽列数</label>
                                <select id="slot-cap-cols-count" class="acu-nice-select" style="width:100%">
                                    <option value="0">自动</option>
                                    <option value="2">2列 (带图标)</option>
                                    <option value="3">3列</option>
                                    <option value="4">4列</option>
                                </select>
                            </div>
                        </div>

                    </div>
                    <div class="acu-dialog-btns">
                        <button class="acu-dialog-btn" id="dlg-slot-cancel"><i class="fa-solid fa-times"></i> 取消</button>
                        <button class="acu-dialog-btn acu-btn-confirm" id="dlg-slot-save"><i class="fa-solid fa-check"></i> 保存</button>
                    </div>
                </div>
            </div>
        `);
        $('body').append(dialog);

        const refreshOptions = () => {
            const tableName = dialog.find('#slot-table').val();
            const rule = dialog.find('#slot-rule').val();

            if (!tableName) {
                dialog.find('#slot-kv-card').empty();
                dialog.find('#slot-kv-cols').empty();
                dialog.find('#slot-cap-col').empty();
                dialog.find('#set-kv-area').hide();
                dialog.find('#set-cap-area').hide();
                return;
            }

            

            const table = processedTables[tableName];
            if (!table) return;

            const $cardSel = dialog.find('#slot-kv-card');
            const $colsDiv = dialog.find('#slot-kv-cols');
            $cardSel.empty();
            $colsDiv.empty();

            
            if (table.rows) {
                table.rows.forEach(r => {
                    const txt = r[1] || '未命名';
                    const sel = (currentSlotCfg.card === txt) ? 'selected' : '';
                    $cardSel.append(`<option value="${txt}" ${sel}>${txt}</option>`);
                });
            }

            if (table.headers) {
                table.headers.forEach((h, idx) => {
                    if (idx === 0) return;

                    const finalChecked = (currentSlotCfg.showCols === undefined || (currentSlotCfg.showCols && currentSlotCfg.showCols.includes(idx))) ? 'checked' : '';
                    $colsDiv.append(`
                        <label style="display:flex; align-items:center; gap:8px; font-size:12px;">
                            <input type="checkbox" class="acu-kv-col-check" value="${idx}" ${finalChecked}>
                            <span>${h}</span>
                        </label>
                    `);
                });
            }

            const $capColSel = dialog.find('#slot-cap-col');
            $capColSel.empty();
            dialog.find('#slot-cap-cols-count').val(currentSlotCfg.capCols || 0);
            if (table.headers) {
                table.headers.forEach((h, idx) => {
                    if (idx === 0) return;
                    const isSel = (currentSlotCfg.capCol == idx) ? 'selected' : (idx === 1 && currentSlotCfg.capCol === undefined ? 'selected' : '');
                    $capColSel.append(`<option value="${idx}" ${isSel}>${h}</option>`);
                });
            }

            if (rule === 'kv') {
                dialog.find('#set-kv-area').show();
                dialog.find('#set-cap-area').hide();
            } else {
                dialog.find('#set-kv-area').hide();
                dialog.find('#set-cap-area').show();
            }
        };

        dialog.find('#slot-table').on('change', function() { 
            refreshOptions();
            const val = $(this).val();
            if (val) {
                let t = val;
                if (t.endsWith('表')) t = t.slice(0, -1);
                dialog.find('#slot-title').val(t);
            }
        });
        dialog.find('#slot-rule').on('change', refreshOptions);
        refreshOptions();

        const close = () => dialog.remove();
        dialog.find('#dlg-slot-reset').click(() => {
            if(confirm('确定要重置此卡槽吗？')) {
                currentDashCfg[slotId] = { isEmpty: true };
                saveDashConfig(currentDashCfg);
                renderInterface();
                close();
            }
        }).hover(function(){$(this).css('background','var(--acu-btn-hover)')}, function(){$(this).css('background','transparent')});

        dialog.find('#dlg-slot-cancel').click(close);

        dialog.find('#dlg-slot-save').click(() => {
            const newTitle = dialog.find('#slot-title').val();
            const newText = dialog.find('#slot-table').val();
            const newRule = dialog.find('#slot-rule').val();

            if (!currentDashCfg[slotId]) currentDashCfg[slotId] = {};
            currentDashCfg[slotId].isEmpty = false;
            currentDashCfg[slotId].title = newTitle;
            currentDashCfg[slotId].text = newText;
            currentDashCfg[slotId].rule = newRule;

            if (newRule === 'kv') {
                currentDashCfg[slotId].card = dialog.find('#slot-kv-card').val();
                const selectedCols = [];
                dialog.find('.acu-kv-col-check:checked').each(function() {
                    selectedCols.push(parseInt($(this).val()));
                });
                currentDashCfg[slotId].showCols = selectedCols;
                delete currentDashCfg[slotId].capCol;
            } else {
                currentDashCfg[slotId].capCol = parseInt(dialog.find('#slot-cap-col').val());
                currentDashCfg[slotId].capCols = parseInt(dialog.find('#slot-cap-cols-count').val());
                 delete currentDashCfg[slotId].card;
                 delete currentDashCfg[slotId].showCols;
            }

            saveDashConfig(currentDashCfg);

            renderInterface();
            close();
        });
        dialog.on('click', function(e) { if ($(e.target).hasClass('acu-edit-overlay')) close(); });
    };

    const init = () => {
        if (isInitialized) return;
        addStyles();
        applyConfigStyles(getConfig());
        document.addEventListener('mfrs:open-status', () => {
            renderInterface();
            setTimeout(() => {
                const card = document.getElementById('mfrs-current-status-card');
                if (card) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 120);
        });
        const loop = () => {
             const { $ } = getCore();
             if (getCore().getDB()?.exportTableAsJson && $) {
                  renderInterface();
                 const host = getHost();
                 host.MysteryAcuVisualizer = {
                     ...(host.MysteryAcuVisualizer || {}),
                     renderInterface,
                 };
                 const api = getCore().getDB();
                 if (api.registerTableUpdateCallback) {
                     api.registerTableUpdateCallback(UpdateController.handleUpdate);
                     if (api.registerTableFillStartCallback) { api.registerTableFillStartCallback(() => { const c = api.exportTableAsJson(); if (c) saveSnapshot(c); }); }
                 }
                 isInitialized = true;
             } else setTimeout(loop, 1000);
        };
        loop();
    };
    // ==================== 抽卡系统 ====================

    // 稀有度枚举
    const GACHA_RARITY = {
        MYTHIC: { level: 6, name: '神话', stars: '★★★★★★', color: '#ff6b6b', probability: 0.005 },
        LEGENDARY: { level: 5, name: '传说', stars: '★★★★★', color: '#ffd93d', probability: 0.02 },
        EPIC: { level: 4, name: '史诗', stars: '★★★★', color: '#a855f7', probability: 0.05 },
        RARE: { level: 3, name: '稀有', stars: '★★★', color: '#6bceff', probability: 0.15 },
        COMMON: { level: 2, name: '普通', stars: '★★', color: '#95d5b2', probability: 0.30 },
        BASIC: { level: 1, name: '常见', stars: '★', color: '#d4d4d4', probability: 0.475 }
    };

    // 物品类型
    const GACHA_ITEM_TYPE = {
        SUPERNATURAL: 'supernatural', // 灵异物品
        CLUE: 'clue',                 // 线索（提升档案进度）
        KNOWLEDGE: 'knowledge'        // 知识（提升规律进度）
    };

    // 注意：旧的 SUPERNATURAL_ITEMS / CLUE_ITEMS / KNOWLEDGE_ITEMS 已迁移到 BUILTIN_GACHA_ITEMS
    // 通过 getAllGachaItemDefinitions() 获取合并后的完整物品列表

    // 抽卡货币系统
    const GACHA_CURRENCY = {
        name: '调查点',
        key: 'investigation_points',
        icon: '🔍',
        earn: {
            message: 1,      // 每条消息
            clue: 5,         // 发现线索
            event: 10,       // 完成事件
            ghost: 15        // 对抗厉鬼
        },
        cost: {
            single: 10,      // 单抽
            ten: 90          // 十连（9折优惠）
        }
    };

    // localStorage 键
    const STORAGE_KEY_GACHA_CURRENCY = 'mfrs_gacha_currency';
    const STORAGE_KEY_GACHA_PITY = 'mfrs_gacha_pity';
    const STORAGE_KEY_GACHA_HISTORY = 'mfrs_gacha_history';

    // 获取货币余额
    const getGachaCurrency = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_GACHA_CURRENCY);
            return stored ? parseInt(stored, 10) : 0;
        } catch (e) {
            return 0;
        }
    };

    // 设置货币余额
    const setGachaCurrency = (amount) => {
        try {
            localStorage.setItem(STORAGE_KEY_GACHA_CURRENCY, String(amount));
        } catch (e) {
            console.error('Failed to save currency:', e);
        }
    };

    // 增加货币
    const addGachaCurrency = (amount) => {
        const current = getGachaCurrency();
        setGachaCurrency(current + amount);
        return current + amount;
    };

    // 扣除货币
    const deductGachaCurrency = (amount) => {
        const current = getGachaCurrency();
        if (current < amount) return false;
        setGachaCurrency(current - amount);
        return true;
    };

    // 获取保底计数
    const getGachaPity = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_GACHA_PITY);
            return stored ? JSON.parse(stored) : { total: 0, rare: 0, epic: 0 };
        } catch (e) {
            return { total: 0, rare: 0, epic: 0 };
        }
    };

    // 设置保底计数
    const setGachaPity = (pity) => {
        try {
            localStorage.setItem(STORAGE_KEY_GACHA_PITY, JSON.stringify(pity));
        } catch (e) {
            console.error('Failed to save pity:', e);
        }
    };

    // 增加保底计数
    const incrementGachaPity = () => {
        const pity = getGachaPity();
        pity.total += 1;
        pity.rare += 1;
        pity.epic += 1;
        setGachaPity(pity);
        return pity;
    };

    // 重置保底计数（修复未定义 bug）
    const resetGachaPity = (type) => {
        const pity = getGachaPity();
        if (type === 'rare') {
            pity.rare = 0;
        } else if (type === 'epic') {
            pity.epic = 0;
        } else if (type === 'mythic') {
            pity.total = 0;
            pity.epic = 0;
            pity.rare = 0;
        }
        setGachaPity(pity);
        return pity;
    };

    // ==================== 物品目录双层架构 ====================

    // localStorage 键：自定义物品覆盖层
    const STORAGE_KEY_CUSTOM_GACHA_ITEMS = 'mfrs_custom_gacha_items';

    // 内置物品目录（只读，source-of-truth）
    // 以 JS 对象字面量内嵌，因 visualizer 经 CDN script-link 加载无法加载外部 JSON
    const BUILTIN_GACHA_ITEMS = {
        rarity: GACHA_RARITY,
        itemType: GACHA_ITEM_TYPE,
        items: {
            supernatural: [
                // ★★★★★★ 神话（0.5%）
                { id: 'item_mythic_1', name: '源头碎片', rarity: 'MYTHIC', type: 'supernatural', icon: '🔮', description: '神秘复苏源头的碎片，蕴含改写规则的力量', effect: '可改写厉鬼杀人规律', effectDetail: '能够修改厉鬼的杀人规律，但无法让厉鬼死机或消失', usageLimit: 1, duration: '永久' },
                // ★★★★★ 传说（2%）
                { id: 'item_legendary_1', name: '鬼域', rarity: 'LEGENDARY', type: 'supernatural', icon: '🌫️', description: '厉鬼的杀人领域，可关押其他厉鬼', effect: '可关押厉鬼', effectDetail: '在鬼域内可以关押其他厉鬼，阻止其复苏和杀人', usageLimit: 'unlimited', duration: '持续' },
                { id: 'item_legendary_2', name: '鬼差制服', rarity: 'LEGENDARY', type: 'supernatural', icon: '🧥', description: '沾染了鬼差灵异的制服，拥有强大防护能力', effect: '可抵御厉鬼袭击', effectDetail: '穿着制服可以抵御大部分厉鬼的直接袭击', usageLimit: 'unlimited', duration: '持续' },
                // ★★★★ 史诗（5%）
                { id: 'item_epic_1', name: '黄金手掌', rarity: 'EPIC', type: 'supernatural', icon: '✋', description: '沾染了灵异能力的黄金手掌，可击退厉鬼', effect: '可击退厉鬼', effectDetail: '使用时可以暂时击退厉鬼，阻止其杀人规律触发', usageLimit: 3, duration: '每次使用持续数分钟' },
                { id: 'item_epic_2', name: '饿死鬼的香烟', rarity: 'EPIC', type: 'supernatural', icon: '🚬', description: '饿死鬼遗留的香烟，可暂时压制厉鬼', effect: '可暂时压制厉鬼', effectDetail: '点燃后可以暂时压制厉鬼的杀人规律', usageLimit: 7, duration: '每支持续一段时间' },
                { id: 'item_epic_3', name: '鬼邮件', rarity: 'EPIC', type: 'supernatural', icon: '✉️', description: '可以传递信息的灵异邮件', effect: '可传递信息', effectDetail: '可以向任何地点的人传递信息，不受距离限制', usageLimit: 5, duration: '即时' },
                { id: 'item_epic_4', name: '鬼奴隶', rarity: 'EPIC', type: 'supernatural', icon: '👤', description: '被灵异力量控制的鬼奴隶，可执行简单任务', effect: '可使役执行任务', effectDetail: '可以命令鬼奴隶执行简单任务，如侦查、传信等', usageLimit: 'unlimited', duration: '持续' },
                // ★★★ 稀有（15%）
                { id: 'item_rare_1', name: '红色鬼烛', rarity: 'RARE', type: 'supernatural', icon: '🕯️', description: '红色的鬼烛，可以照亮鬼域', effect: '照亮鬼域，驱散黑暗', effectDetail: '点燃后可以照亮鬼域范围，驱散厉鬼制造的黑暗', usageLimit: 3, duration: '每支持续数小时' },
                { id: 'item_rare_2', name: '鬼钱', rarity: 'RARE', type: 'supernatural', icon: '💴', description: '沾染了灵异的钞票，可用于交易', effect: '购买灵异物品或服务', effectDetail: '可以在驭鬼者圈子中购买灵异物品或雇佣帮助', usageLimit: 'stack', duration: '永久' },
                { id: 'item_rare_3', name: '卫星定位手机', rarity: 'RARE', type: 'supernatural', icon: '📱', description: '可以定位厉鬼的特殊手机', effect: '定位厉鬼或驭鬼者', effectDetail: '可以定位特定厉鬼或驭鬼者的位置', usageLimit: 10, duration: '每次使用即时' },
                { id: 'item_rare_4', name: '压制类灵异物品', rarity: 'RARE', type: 'supernatural', icon: '⛓️', description: '可以压制特定厉鬼的物品', effect: '压制特定厉鬼', effectDetail: '针对特定厉鬼的压制物品，可以暂时限制其能力', usageLimit: 5, duration: '每次使用持续一段时间' },
                // ★★ 普通（30%）
                { id: 'item_common_1', name: '灵异护符', rarity: 'COMMON', type: 'supernatural', icon: '🎴', description: '具有基础防护能力的护符', effect: '基础防护', effectDetail: '可以抵御低级灵异事件的侵袭', usageLimit: 5, duration: '每次使用持续短暂时间' },
                { id: 'item_common_2', name: '追踪定位器', rarity: 'COMMON', type: 'supernatural', icon: '📡', description: '可以追踪灵异信号的定位器', effect: '追踪灵异信号', effectDetail: '可以追踪附近的灵异信号源', usageLimit: 10, duration: '每次持续数小时' },
                { id: 'item_common_3', name: '鬼照片', rarity: 'COMMON', type: 'supernatural', icon: '📷', description: '拍摄了灵异现象的照片', effect: '记录灵异证据', effectDetail: '可以作为灵异事件的证据记录', usageLimit: 'stack', duration: '永久' },
                { id: 'item_common_4', name: '普通护身符', rarity: 'COMMON', type: 'supernatural', icon: '🧿', description: '普通的护身符，微弱灵异防护', effect: '微弱防护', effectDetail: '提供微弱的灵异防护能力', usageLimit: 10, duration: '每次持续短暂时间' },
                // ★ 常见（47.5%）
                { id: 'item_basic_1', name: '灵异记录本', rarity: 'BASIC', type: 'supernatural', icon: '📒', description: '记录灵异事件的本子', effect: '记录灵异事件', effectDetail: '可以记录和整理灵异事件信息', usageLimit: 'unlimited', duration: '永久' },
                { id: 'item_basic_2', name: '少量鬼钱', rarity: 'BASIC', type: 'supernatural', icon: '💵', description: '少量的鬼钱', effect: '小额交易', effectDetail: '可以进行小额灵异物品交易', usageLimit: 'stack', duration: '永久' },
                { id: 'item_basic_3', name: '灵异感知增强剂', rarity: 'BASIC', type: 'supernatural', icon: '💊', description: '可以暂时增强灵异感知的药剂', effect: '增强灵异感知', effectDetail: '暂时提升对灵异现象的感知能力', usageLimit: 6, duration: '每次持续数小时' }
            ],
            clue: [
                { id: 'clue_decisive', name: '决定性线索', rarity: 'EPIC', type: 'clue', icon: '🔍', description: '关键的决定性线索，大幅提升档案完成度', effect: '档案进度 +50%', effectDetail: '获得后立即提升指定厉鬼档案完成度50%', progress: 0.5 },
                { id: 'clue_core', name: '核心线索', rarity: 'RARE', type: 'clue', icon: '🔎', description: '核心线索，显著提升档案完成度', effect: '档案进度 +25%', effectDetail: '获得后立即提升指定厉鬼档案完成度25%', progress: 0.25 },
                { id: 'clue_important', name: '重要线索', rarity: 'COMMON', type: 'clue', icon: '🔦', description: '重要线索，提升档案完成度', effect: '档案进度 +10%', effectDetail: '获得后立即提升指定厉鬼档案完成度10%', progress: 0.1 },
                { id: 'clue_common', name: '普通线索', rarity: 'BASIC', type: 'clue', icon: '🔬', description: '普通线索，少量提升档案完成度', effect: '档案进度 +5%', effectDetail: '获得后立即提升指定厉鬼档案完成度5%', progress: 0.05 }
            ],
            knowledge: [
                { id: 'knowledge_forbidden', name: '禁忌知识', rarity: 'EPIC', type: 'knowledge', icon: '📕', description: '禁忌的知识，大幅揭示厉鬼规律', effect: '规律进度 +50%', effectDetail: '获得后立即提升指定厉鬼规律完成度50%', progress: 0.5 },
                { id: 'knowledge_core', name: '核心知识', rarity: 'RARE', type: 'knowledge', icon: '📗', description: '核心知识，显著揭示厉鬼规律', effect: '规律进度 +25%', effectDetail: '获得后立即提升指定厉鬼规律完成度25%', progress: 0.25 },
                { id: 'knowledge_deep', name: '深入知识', rarity: 'COMMON', type: 'knowledge', icon: '📘', description: '深入的知识，揭示部分规律', effect: '规律进度 +10%', effectDetail: '获得后立即提升指定厉鬼规律完成度10%', progress: 0.1 },
                { id: 'knowledge_basic', name: '基础知识', rarity: 'BASIC', type: 'knowledge', icon: '📙', description: '基础知识，少量揭示规律', effect: '规律进度 +5%', effectDetail: '获得后立即提升指定厉鬼规律完成度5%', progress: 0.05 }
            ]
        }
    };

    // 获取自定义物品覆盖层（localStorage）
    const getCustomGachaItems = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_GACHA_ITEMS);
            return stored ? JSON.parse(stored) : { supernatural: [], clue: [], knowledge: [] };
        } catch (e) {
            console.error('Failed to load custom gacha items:', e);
            return { supernatural: [], clue: [], knowledge: [] };
        }
    };

    // 设置自定义物品覆盖层
    const setCustomGachaItems = (customItems) => {
        try {
            localStorage.setItem(STORAGE_KEY_CUSTOM_GACHA_ITEMS, JSON.stringify(customItems));
        } catch (e) {
            console.error('Failed to save custom gacha items:', e);
        }
    };

    // 合并物品定义：builtin（只读）∪ custom（覆盖/新增）
    // 返回完整的物品对象数组，每项包含 rarity 对象而非字符串
    const getAllGachaItemDefinitions = () => {
        const custom = getCustomGachaItems();
        const result = { supernatural: [], clue: [], knowledge: [] };

        for (const type of ['supernatural', 'clue', 'knowledge']) {
            // builtin 只读层
            const builtinItems = BUILTIN_GACHA_ITEMS.items[type] || [];
            // custom 覆盖层
            const customItems = custom[type] || [];

            // 先加入所有 builtin 物品
            for (const item of builtinItems) {
                // 将 rarity 字符串转换为完整的 rarity 对象
                const fullItem = {
                    ...item,
                    rarity: BUILTIN_GACHA_ITEMS.rarity[item.rarity] || GACHA_RARITY[item.rarity],
                    targetTable: type === 'supernatural' ? 'sheet_supernatural_items' :
                                 type === 'clue' ? 'sheet_clues' : 'sheet_collected_rules'
                };

                // 检查是否有 custom 覆盖
                const customOverride = customItems.find(c => c.id === item.id);
                if (customOverride) {
                    // custom 覆盖 builtin 字段（保留未覆盖的 builtin 字段）
                    Object.assign(fullItem, customOverride);
                    // 如果 custom 覆盖了 rarity 字符串，重新转换
                    if (typeof customOverride.rarity === 'string') {
                        fullItem.rarity = BUILTIN_GACHA_ITEMS.rarity[customOverride.rarity] || GACHA_RARITY[customOverride.rarity];
                    }
                }

                result[type].push(fullItem);
            }

            // 新增 custom 物品（不在 builtin 中的）
            for (const customItem of customItems) {
                if (!builtinItems.find(b => b.id === customItem.id)) {
                    const fullItem = {
                        ...customItem,
                        rarity: typeof customItem.rarity === 'string' ?
                               (BUILTIN_GACHA_ITEMS.rarity[customItem.rarity] || GACHA_RARITY[customItem.rarity]) :
                               customItem.rarity,
                        targetTable: type === 'supernatural' ? 'sheet_supernatural_items' :
                                     type === 'clue' ? 'sheet_clues' : 'sheet_collected_rules'
                    };
                    result[type].push(fullItem);
                }
            }
        }

        return result;
    };

    // 添加自定义物品
    const addCustomGachaItem = (type, itemDef) => {
        const custom = getCustomGachaItems();
        if (!custom[type]) custom[type] = [];
        // 检查是否已存在
        const existingIdx = custom[type].findIndex(c => c.id === itemDef.id);
        if (existingIdx >= 0) {
            custom[type][existingIdx] = itemDef; // 覆盖
        } else {
            custom[type].push(itemDef); // 新增
        }
        setCustomGachaItems(custom);
    };

    // 删除自定义物品（仅删除 custom 层，不影响 builtin）
    const removeCustomGachaItem = (type, itemId) => {
        const custom = getCustomGachaItems();
        if (custom[type]) {
            custom[type] = custom[type].filter(c => c.id !== itemId);
            setCustomGachaItems(custom);
        }
    };

    // 四个物品池类型
    const GACHA_POOL_TYPE = {
        ALL: 'all',                    // 全物品池
        ARCHIVE: 'archive',            // 厉鬼档案池（线索权重x2）
        PATTERN: 'pattern',            // 厉鬼规律池（知识权重x2）
        SUPERNATURAL: 'supernatural'   // 灵异物品池（仅灵异物品）
    };

    // 构建抽卡池
    // 构建抽卡池（使用合并后的物品目录）
    const buildGachaPool = (poolType) => {
        const pool = [];
        const allItems = getAllGachaItemDefinitions();

        if (poolType === GACHA_POOL_TYPE.SUPERNATURAL) {
            // 仅灵异物品
            allItems.supernatural.forEach(item => {
                pool.push({ item, weight: item.rarity.probability });
            });
        } else if (poolType === GACHA_POOL_TYPE.ARCHIVE) {
            // 线索权重x2
            allItems.supernatural.forEach(item => {
                pool.push({ item, weight: item.rarity.probability * 0.5 });
            });
            allItems.clue.forEach(item => {
                pool.push({ item, weight: item.rarity.probability * 2 });
            });
            allItems.knowledge.forEach(item => {
                pool.push({ item, weight: item.rarity.probability * 0.5 });
            });
        } else if (poolType === GACHA_POOL_TYPE.PATTERN) {
            // 知识权重x2
            allItems.supernatural.forEach(item => {
                pool.push({ item, weight: item.rarity.probability * 0.5 });
            });
            allItems.clue.forEach(item => {
                pool.push({ item, weight: item.rarity.probability * 0.5 });
            });
            allItems.knowledge.forEach(item => {
                pool.push({ item, weight: item.rarity.probability * 2 });
            });
        } else {
            // 全物品池（均匀分布）
            allItems.supernatural.forEach(item => {
                pool.push({ item, weight: item.rarity.probability });
            });
            allItems.clue.forEach(item => {
                pool.push({ item, weight: item.rarity.probability });
            });
            allItems.knowledge.forEach(item => {
                pool.push({ item, weight: item.rarity.probability });
            });
        }

        // 归一化权重
        const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
        pool.forEach(p => p.normalizedWeight = p.weight / totalWeight);

        return pool;
    };

    // 单次抽卡逻辑
    const performSingleGacha = (poolType, forcedRarity = null) => {
        const pool = buildGachaPool(poolType);

        if (forcedRarity) {
            // 保底机制：强制指定稀有度
            const filtered = pool.filter(p => p.item.rarity.level >= forcedRarity);
            if (filtered.length === 0) return pool[0].item;

            const totalWeight = filtered.reduce((sum, p) => sum + p.weight, 0);
            const random = Math.random() * totalWeight;
            let cumulative = 0;

            for (const p of filtered) {
                cumulative += p.weight;
                if (random <= cumulative) return p.item;
            }
            return filtered[filtered.length - 1].item;
        }

        // 正常抽卡
        const random = Math.random();
        let cumulative = 0;

        for (const p of pool) {
            cumulative += p.normalizedWeight;
            if (random <= cumulative) return p.item;
        }

        return pool[pool.length - 1].item;
    };

    // 十连抽卡逻辑
    const performTenGacha = (poolType) => {
        const results = [];
        const pity = getGachaPity();

        for (let i = 0; i < 10; i++) {
            let forcedRarity = null;

            // 第10抽保底★★★
            if (i === 9) {
                forcedRarity = Math.max(forcedRarity || 0, GACHA_RARITY.RARE.level);
            }

            // 50抽保底★★★★
            if (pity.epic >= 49) {
                forcedRarity = Math.max(forcedRarity || 0, GACHA_RARITY.EPIC.level);
            }

            // 100抽保底★★★★★★
            if (pity.total >= 99) {
                forcedRarity = Math.max(forcedRarity || 0, GACHA_RARITY.MYTHIC.level);
            }

            const item = performSingleGacha(poolType, forcedRarity);
            results.push(item);

            // 更新保底计数
            incrementGachaPity();

            // 重置保底
            if (item.rarity.level >= GACHA_RARITY.RARE.level) {
                resetGachaPity('rare');
            }
            if (item.rarity.level >= GACHA_RARITY.EPIC.level) {
                resetGachaPity('epic');
            }
            if (item.rarity.level >= GACHA_RARITY.MYTHIC.level) {
                resetGachaPity('mythic');
            }
        }

        return results;
    };

    // 单抽
    const gachaSingle = (poolType = GACHA_POOL_TYPE.ALL) => {
        const cost = GACHA_CURRENCY.cost.single;
        if (!deductGachaCurrency(cost)) {
            return { success: false, error: '调查点不足' };
        }

        const pity = getGachaPity();
        let forcedRarity = null;

        // 50抽保底★★★★
        if (pity.epic >= 49) {
            forcedRarity = GACHA_RARITY.EPIC.level;
        }

        // 100抽保底★★★★★★
        if (pity.total >= 99) {
            forcedRarity = GACHA_RARITY.MYTHIC.level;
        }

        const item = performSingleGacha(poolType, forcedRarity);

        // 更新保底计数
        incrementGachaPity();

        // 重置保底
        if (item.rarity.level >= GACHA_RARITY.RARE.level) {
            resetGachaPity('rare');
        }
        if (item.rarity.level >= GACHA_RARITY.EPIC.level) {
            resetGachaPity('epic');
        }
        if (item.rarity.level >= GACHA_RARITY.MYTHIC.level) {
            resetGachaPity('mythic');
        }

        // 保存抽卡历史
        saveGachaHistory([item]);

        return { success: true, items: [item], currency: getGachaCurrency() };
    };

    // 十连
    const gachaTen = (poolType = GACHA_POOL_TYPE.ALL) => {
        const cost = GACHA_CURRENCY.cost.ten;
        if (!deductGachaCurrency(cost)) {
            return { success: false, error: '调查点不足' };
        }

        const items = performTenGacha(poolType);

        // 保存抽卡历史
        saveGachaHistory(items);

        return { success: true, items, currency: getGachaCurrency() };
    };

    // 保存抽卡历史
    const saveGachaHistory = (items) => {
        try {
            const history = getGachaHistory();
            const timestamp = Date.now();
            items.forEach(item => {
                history.unshift({ item, timestamp });
            });
            // 只保留最近100次
            if (history.length > 100) {
                history.splice(100);
            }
            localStorage.setItem(STORAGE_KEY_GACHA_HISTORY, JSON.stringify(history));
        } catch (e) {
            console.error('Failed to save gacha history:', e);
        }
    };

    // 获取抽卡历史
    const getGachaHistory = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_GACHA_HISTORY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    };

    // 显示抽卡主面板
    const showGachaPanel = () => {
        const { $ } = getCore();
        const config = getConfig();
        const currency = getGachaCurrency();
        const pity = getGachaPity();

        const dialog = $(`
            <div class="acu-edit-overlay">
                <div class="acu-edit-dialog acu-theme-${config.theme}" style="max-width: 900px; max-height: 90vh; overflow: hidden;">
                    <div class="acu-edit-title" style="display:flex; justify-content:space-between; align-items:center;">
                        <span>神秘复苏抽卡系统</span>
                        <button id="gacha-close" style="background:transparent; border:none; color:var(--acu-text-sub); cursor:pointer; font-size:20px;">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>

                    <div class="acu-settings-content" style="flex:1; overflow-y:auto; padding:20px;">
                        <!-- 货币显示 -->
                        <div style="background:var(--acu-btn-bg); border-radius:12px; padding:20px; margin-bottom:20px; border:2px solid var(--acu-highlight);">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="color:var(--acu-text-sub); font-size:13px; margin-bottom:8px;">当前余额</div>
                                    <div style="color:var(--acu-highlight); font-size:32px; font-weight:bold; display:flex; align-items:center; gap:10px;">
                                        <i class="fa-solid fa-search"></i>
                                        <span id="gacha-currency-display">${currency}</span>
                                        <span style="font-size:16px; color:var(--acu-text-main);">${GACHA_CURRENCY.name}</span>
                                    </div>
                                </div>
                                <div style="text-align:right; color:var(--acu-text-sub); font-size:12px; line-height:1.8;">
                                    <div>💬 消息 +1</div>
                                    <div>🔍 线索 +5</div>
                                    <div>📅 事件 +10</div>
                                    <div>👻 对抗厉鬼 +15</div>
                                </div>
                            </div>
                        </div>

                        <!-- 保底进度 -->
                        <div style="background:var(--acu-table-head); border-radius:12px; padding:15px; margin-bottom:20px;">
                            <div style="color:var(--acu-title-color); font-weight:bold; margin-bottom:12px; font-size:14px;">保底进度</div>
                            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:15px; font-size:12px;">
                                <div>
                                    <div style="color:var(--acu-text-sub); margin-bottom:5px;">十连保底 ★★★</div>
                                    <div style="color:var(--acu-text-main); font-weight:bold;">下次十连必出</div>
                                </div>
                                <div>
                                    <div style="color:var(--acu-text-sub); margin-bottom:5px;">50抽保底 ★★★★</div>
                                    <div style="color:var(--acu-text-main); font-weight:bold;">还需 ${Math.max(0, 50 - pity.epic)} 抽</div>
                                </div>
                                <div>
                                    <div style="color:var(--acu-text-sub); margin-bottom:5px;">100抽保底 ★★★★★★</div>
                                    <div style="color:var(--acu-text-main); font-weight:bold;">还需 ${Math.max(0, 100 - pity.total)} 抽</div>
                                </div>
                            </div>
                        </div>

                        <!-- 抽卡池选择 -->
                        <div style="background:var(--acu-table-head); border-radius:12px; padding:15px; margin-bottom:20px;">
                            <div style="color:var(--acu-title-color); font-weight:bold; margin-bottom:12px; font-size:14px;">选择抽卡池</div>
                            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;">
                                <button class="gacha-pool-btn active" data-pool="all" style="background:var(--acu-btn-bg); border:2px solid var(--acu-highlight); border-radius:8px; padding:12px; cursor:pointer; color:var(--acu-text-main); font-size:13px; transition:all 0.2s;">
                                    <div style="font-weight:bold; margin-bottom:5px;">全物品池</div>
                                    <div style="font-size:11px; color:var(--acu-text-sub);">均匀分布</div>
                                </button>
                                <button class="gacha-pool-btn" data-pool="archive" style="background:var(--acu-btn-bg); border:2px solid var(--acu-border); border-radius:8px; padding:12px; cursor:pointer; color:var(--acu-text-main); font-size:13px; transition:all 0.2s;">
                                    <div style="font-weight:bold; margin-bottom:5px;">厉鬼档案池</div>
                                    <div style="font-size:11px; color:var(--acu-text-sub);">线索权重↑</div>
                                </button>
                                <button class="gacha-pool-btn" data-pool="pattern" style="background:var(--acu-btn-bg); border:2px solid var(--acu-border); border-radius:8px; padding:12px; cursor:pointer; color:var(--acu-text-main); font-size:13px; transition:all 0.2s;">
                                    <div style="font-weight:bold; margin-bottom:5px;">厉鬼规律池</div>
                                    <div style="font-size:11px; color:var(--acu-text-sub);">知识权重↑</div>
                                </button>
                                <button class="gacha-pool-btn" data-pool="supernatural" style="background:var(--acu-btn-bg); border:2px solid var(--acu-border); border-radius:8px; padding:12px; cursor:pointer; color:var(--acu-text-main); font-size:13px; transition:all 0.2s;">
                                    <div style="font-weight:bold; margin-bottom:5px;">灵异物品池</div>
                                    <div style="font-size:11px; color:var(--acu-text-sub);">仅灵异物品</div>
                                </button>
                            </div>
                        </div>

                        <!-- 抽卡按钮 -->
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
                            <button id="gacha-single-btn" style="background:linear-gradient(135deg, var(--acu-highlight) 0%, var(--acu-highlight-bg) 100%); border:none; border-radius:12px; padding:20px; cursor:pointer; color:white; font-size:16px; font-weight:bold; transition:transform 0.2s, box-shadow 0.2s; box-shadow:0 4px 15px var(--acu-highlight-bg);">
                                <div style="margin-bottom:8px;">单抽</div>
                                <div style="font-size:13px; opacity:0.9;">消耗 ${GACHA_CURRENCY.cost.single} 调查点</div>
                            </button>
                            <button id="gacha-ten-btn" style="background:linear-gradient(135deg, #ffd93d 0%, #ff6b6b 100%); border:none; border-radius:12px; padding:20px; cursor:pointer; color:white; font-size:16px; font-weight:bold; transition:transform 0.2s, box-shadow 0.2s; box-shadow:0 4px 15px rgba(255, 107, 107, 0.3);">
                                <div style="margin-bottom:8px;">十连抽</div>
                                <div style="font-size:13px; opacity:0.9;">消耗 ${GACHA_CURRENCY.cost.ten} 调查点（9折）</div>
                            </button>
                        </div>

                        <!-- 结果展示区 -->
                        <div id="gacha-result-container" style="display:none; background:var(--acu-bg-panel); border-radius:12px; padding:20px; margin-bottom:20px;">
                            <div style="color:var(--acu-title-color); font-weight:bold; margin-bottom:15px; font-size:14px; text-align:center;">抽卡结果</div>
                            <div id="gacha-result-items" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:12px;"></div>
                        </div>

                        <!-- 抽卡历史 -->
                        <div style="background:var(--acu-table-head); border-radius:12px; padding:15px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <div style="color:var(--acu-title-color); font-weight:bold; font-size:14px;">抽卡历史</div>
                                <button id="gacha-history-toggle" style="background:transparent; border:none; color:var(--acu-text-sub); cursor:pointer; font-size:12px;">
                                    <i class="fa-solid fa-chevron-down"></i> 展开
                                </button>
                            </div>
                            <div id="gacha-history-content" style="display:none; max-height:200px; overflow-y:auto;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        $('body').append(dialog);

        // 当前选中的抽卡池
        let selectedPool = GACHA_POOL_TYPE.ALL;

        // 关闭对话框
        const closeDialog = () => dialog.remove();
        dialog.find('#gacha-close').click(closeDialog);
        dialog.on('click', function(e) { if ($(e.target).hasClass('acu-edit-overlay')) closeDialog(); });

        // 抽卡池选择
        dialog.find('.gacha-pool-btn').on('click', function() {
            dialog.find('.gacha-pool-btn').removeClass('active').css('border-color', 'var(--acu-border)');
            $(this).addClass('active').css('border-color', 'var(--acu-highlight)');
            selectedPool = $(this).data('pool');
        });

        // 按钮悬停效果
        dialog.find('#gacha-single-btn, #gacha-ten-btn').on('mouseenter', function() {
            $(this).css('transform', 'translateY(-3px) scale(1.02)');
        }).on('mouseleave', function() {
            $(this).css('transform', 'translateY(0) scale(1)');
        });

        // 显示抽卡结果
        const showGachaResult = (items) => {
            const $resultContainer = dialog.find('#gacha-result-container');
            const $resultItems = dialog.find('#gacha-result-items');

            $resultItems.empty();

            items.forEach(item => {
                const $card = $(`
                    <div class="gacha-result-card" style="background:var(--acu-btn-bg); border:2px solid ${item.rarity.color}; border-radius:10px; padding:12px; text-align:center; position:relative; overflow:hidden; cursor:pointer; transition:transform 0.2s;">
                        <div style="position:absolute; top:0; left:0; right:0; bottom:0; background:linear-gradient(135deg, ${item.rarity.color}22 0%, transparent 100%); pointer-events:none;"></div>
                        <div style="position:relative; z-index:1;">
                            <div style="font-size:36px; margin-bottom:8px;">${item.icon}</div>
                            <div style="color:${item.rarity.color}; font-size:11px; margin-bottom:5px;">${item.rarity.stars}</div>
                            <div style="color:var(--acu-text-main); font-weight:bold; font-size:13px; margin-bottom:5px;">${item.name}</div>
                            <div style="color:var(--acu-text-sub); font-size:11px;">${item.effect}</div>
                        </div>
                    </div>
                `);

                // 翻卡动画
                $card.css({
                    opacity: 0,
                    transform: 'rotateY(90deg)'
                });

                setTimeout(() => {
                    $card.css({
                        opacity: 1,
                        transform: 'rotateY(0deg)',
                        transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                    });
                }, Math.random() * 200);

                // 悬停放大
                $card.on('mouseenter', function() {
                    $(this).css('transform', 'scale(1.05)');
                }).on('mouseleave', function() {
                    $(this).css('transform', 'scale(1)');
                });

                // 点击显示详情
                $card.on('click', function() {
                    showGachaItemDetail(item);
                });

                $resultItems.append($card);
            });

            $resultContainer.show();

            // 滚动到结果区域
            setTimeout(() => {
                $resultContainer[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 600);
        };

        // 单抽
        dialog.find('#gacha-single-btn').on('click', async function() {
            const result = gachaSingle(selectedPool);

            if (!result.success) {
                if (window.toastr) window.toastr.error(result.error);
                return;
            }

            // 更新货币显示
            dialog.find('#gacha-currency-display').text(result.currency);

            // 更新保底显示
            const newPity = getGachaPity();
            dialog.find('#gacha-result-container').siblings().eq(1).find('[style*="grid-template-columns"]').html(`
                <div>
                    <div style="color:var(--acu-text-sub); margin-bottom:5px;">十连保底 ★★★</div>
                    <div style="color:var(--acu-text-main); font-weight:bold;">下次十连必出</div>
                </div>
                <div>
                    <div style="color:var(--acu-text-sub); margin-bottom:5px;">50抽保底 ★★★★</div>
                    <div style="color:var(--acu-text-main); font-weight:bold;">还需 ${Math.max(0, 50 - newPity.epic)} 抽</div>
                </div>
                <div>
                    <div style="color:var(--acu-text-sub); margin-bottom:5px;">100抽保底 ★★★★★★</div>
                    <div style="color:var(--acu-text-main); font-weight:bold;">还需 ${Math.max(0, 100 - newPity.total)} 抽</div>
                </div>
            `);

            // 显示结果
            showGachaResult(result.items);

            // 同步到数据库
            await syncGachaResultToDatabase(result.items);

            if (window.toastr) window.toastr.success(`获得 ${result.items[0].rarity.name} ${result.items[0].name}！`);
        });

        // 十连
        dialog.find('#gacha-ten-btn').on('click', async function() {
            const result = gachaTen(selectedPool);

            if (!result.success) {
                if (window.toastr) window.toastr.error(result.error);
                return;
            }

            // 更新货币显示
            dialog.find('#gacha-currency-display').text(result.currency);

            // 更新保底显示
            const newPity = getGachaPity();
            dialog.find('#gacha-result-container').siblings().eq(1).find('[style*="grid-template-columns"]').html(`
                <div>
                    <div style="color:var(--acu-text-sub); margin-bottom:5px;">十连保底 ★★★</div>
                    <div style="color:var(--acu-text-main); font-weight:bold;">下次十连必出</div>
                </div>
                <div>
                    <div style="color:var(--acu-text-sub); margin-bottom:5px;">50抽保底 ★★★★</div>
                    <div style="color:var(--acu-text-main); font-weight:bold;">还需 ${Math.max(0, 50 - newPity.epic)} 抽</div>
                </div>
                <div>
                    <div style="color:var(--acu-text-sub); margin-bottom:5px;">100抽保底 ★★★★★★</div>
                    <div style="color:var(--acu-text-main); font-weight:bold;">还需 ${Math.max(0, 100 - newPity.total)} 抽</div>
                </div>
            `);

            // 显示结果
            showGachaResult(result.items);

            // 同步到数据库
            await syncGachaResultToDatabase(result.items);

            // 统计稀有度
            const rarityCount = {};
            result.items.forEach(item => {
                const level = item.rarity.level;
                rarityCount[level] = (rarityCount[level] || 0) + 1;
            });

            const highlights = [];
            if (rarityCount[6]) highlights.push(`${rarityCount[6]}个神话`);
            if (rarityCount[5]) highlights.push(`${rarityCount[5]}个传说`);
            if (rarityCount[4]) highlights.push(`${rarityCount[4]}个史诗`);

            if (highlights.length > 0) {
                if (window.toastr) window.toastr.success(`十连完成！获得 ${highlights.join('、')}！`);
            } else {
                if (window.toastr) window.toastr.success('十连完成！');
            }
        });

        // 历史记录折叠/展开
        dialog.find('#gacha-history-toggle').on('click', function() {
            const $content = dialog.find('#gacha-history-content');
            const $icon = $(this).find('i');

            if ($content.is(':visible')) {
                $content.slideUp(200);
                $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
                $(this).html('<i class="fa-solid fa-chevron-down"></i> 展开');
            } else {
                // 加载历史记录
                const history = getGachaHistory().slice(0, 20);
                $content.empty();

                if (history.length === 0) {
                    $content.html('<div style="text-align:center; color:var(--acu-text-sub); padding:20px; font-size:12px;">暂无抽卡记录</div>');
                } else {
                    history.forEach(record => {
                        const item = record.item;
                        const time = new Date(record.timestamp).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        $content.append(`
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--acu-btn-bg); border-radius:6px; margin-bottom:6px; font-size:12px;">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <span style="font-size:20px;">${item.icon}</span>
                                    <div>
                                        <div style="color:var(--acu-text-main); font-weight:bold;">${item.name}</div>
                                        <div style="color:${item.rarity.color}; font-size:11px;">${item.rarity.stars}</div>
                                    </div>
                                </div>
                                <div style="color:var(--acu-text-sub); font-size:11px;">${time}</div>
                            </div>
                        `);
                    });
                }

                $content.slideDown(200);
                $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
                $(this).html('<i class="fa-solid fa-chevron-up"></i> 收起');
            }
        });
    };

    // 显示物品详情
    const showGachaItemDetail = (item) => {
        const { $ } = getCore();
        const config = getConfig();

        const detailDialog = $(`
            <div class="acu-edit-overlay">
                <div class="acu-edit-dialog acu-theme-${config.theme}" style="max-width: 500px; max-height: 80vh;">
                    <div class="acu-edit-title" style="display:flex; justify-content:space-between; align-items:center;">
                        <span>${item.name}</span>
                        <button class="detail-close" style="background:transparent; border:none; color:var(--acu-text-sub); cursor:pointer; font-size:20px;">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>

                    <div class="acu-settings-content" style="padding:20px; overflow-y:auto;">
                        <div style="text-align:center; margin-bottom:20px;">
                            <div style="font-size:64px; margin-bottom:10px;">${item.icon}</div>
                            <div style="color:${item.rarity.color}; font-size:14px; margin-bottom:10px;">${item.rarity.stars} ${item.rarity.name}</div>
                        </div>

                        <div style="background:var(--acu-table-head); border-radius:10px; padding:15px; margin-bottom:15px;">
                            <div style="color:var(--acu-title-color); font-weight:bold; margin-bottom:10px; font-size:13px;">物品描述</div>
                            <div style="color:var(--acu-text-main); font-size:13px; line-height:1.8;">${item.description}</div>
                        </div>

                        <div style="background:var(--acu-table-head); border-radius:10px; padding:15px; margin-bottom:15px;">
                            <div style="color:var(--acu-title-color); font-weight:bold; margin-bottom:10px; font-size:13px;">效果</div>
                            <div style="color:var(--acu-highlight); font-weight:bold; font-size:14px; margin-bottom:8px;">${item.effect}</div>
                            <div style="color:var(--acu-text-sub); font-size:12px; line-height:1.8;">${item.effectDetail}</div>
                        </div>

                        ${item.usageLimit ? `
                        <div style="background:var(--acu-table-head); border-radius:10px; padding:15px;">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; font-size:12px;">
                                <div>
                                    <div style="color:var(--acu-text-sub); margin-bottom:5px;">使用次数</div>
                                    <div style="color:var(--acu-text-main); font-weight:bold;">${item.usageLimit === 'unlimited' ? '无限' : item.usageLimit === 'stack' ? '可叠加' : item.usageLimit + ' 次'}</div>
                                </div>
                                <div>
                                    <div style="color:var(--acu-text-sub); margin-bottom:5px;">持续时间</div>
                                    <div style="color:var(--acu-text-main); font-weight:bold;">${item.duration}</div>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `);

        $('body').append(detailDialog);

        detailDialog.find('.detail-close').click(() => detailDialog.remove());
        detailDialog.on('click', function(e) { if ($(e.target).hasClass('acu-edit-overlay')) detailDialog.remove(); });
    };

    // 将抽卡结果写入数据库
    const syncGachaResultToDatabase = async (items) => {
        const api = getCore().getDB();
        if (!api) return;

        for (const item of items) {
            try {
                if (item.type === GACHA_ITEM_TYPE.SUPERNATURAL) {
                    // 写入灵异物品表
                    const itemData = {
                        row_id: '',
                        物品名称: item.name,
                        物品描述: item.description,
                        物品效果: item.effect,
                        稀有度: item.rarity.name,
                        使用次数: item.usageLimit === 'unlimited' ? '无限' : item.usageLimit === 'stack' ? '可叠加' : String(item.usageLimit),
                        持续时间: item.duration,
                        获得途径: '抽卡',
                        备注: item.effectDetail
                    };

                    // 尝试通过 CRUD 写入
                    const crud = window.MfrsDatabase;
                    if (crud && crud.insertRow) {
                        await crud.insertRow('sheet_supernatural_items', itemData);
                    } else if (api.executeMutation) {
                        // fallback: 直接插入
                        const headers = ['row_id', '物品名称', '物品描述', '物品效果', '稀有度', '使用次数', '持续时间', '获得途径', '备注'];
                        const values = headers.map(h => itemData[h] || '');
                        await api.executeMutation({
                            type: 'insert',
                            tableName: 'sheet_supernatural_items',
                            data: { headers, rows: [values] }
                        });
                    }
                } else if (item.type === GACHA_ITEM_TYPE.CLUE) {
                    // 写入线索表，并更新档案进度
                    const clueData = {
                        row_id: '',
                        线索编码: `CLUE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        线索描述: `${item.name}：${item.description}`,
                        相关厉鬼: '待分配',
                        重要程度: item.rarity.name,
                        发现时间: new Date().toLocaleString('zh-CN'),
                        获得途径: '抽卡',
                        可见摘要: item.effect
                    };

                    const crud = window.MfrsDatabase;
                    if (crud && crud.insertRow) {
                        await crud.insertRow('sheet_clues', clueData);
                    } else if (api.executeMutation) {
                        const headers = ['row_id', '线索编码', '线索描述', '相关厉鬼', '重要程度', '发现时间', '获得途径', '可见摘要'];
                        const values = headers.map(h => clueData[h] || '');
                        await api.executeMutation({
                            type: 'insert',
                            tableName: 'sheet_clues',
                            data: { headers, rows: [values] }
                        });
                    }

                    // 更新档案进度（这里简化处理，实际应该找到对应的档案记录更新）
                    // 由于不知道具体厉鬼，这里只记录线索，实际使用时玩家需要手动分配
                } else if (item.type === GACHA_ITEM_TYPE.KNOWLEDGE) {
                    // 写入知识到规律表（简化处理）
                    const knowledgeData = {
                        row_id: '',
                        规律名称: item.name,
                        规律描述: item.description,
                        杀人规律: item.effectDetail,
                        触发条件: '待研究',
                        破解方法: '待研究',
                        完成度: `+${Math.round(item.progress * 100)}%`,
                        相关厉鬼: '待分配',
                        可见摘要: item.effect
                    };

                    const crud = window.MfrsDatabase;
                    if (crud && crud.insertRow) {
                        await crud.insertRow('sheet_collected_rules', knowledgeData);
                    } else if (api.executeMutation) {
                        const headers = ['row_id', '规律名称', '规律描述', '杀人规律', '触发条件', '破解方法', '完成度', '相关厉鬼', '可见摘要'];
                        const values = headers.map(h => knowledgeData[h] || '');
                        await api.executeMutation({
                            type: 'insert',
                            tableName: 'sheet_collected_rules',
                            data: { headers, rows: [values] }
                        });
                    }
                }
            } catch (e) {
                console.error('Failed to sync gacha result:', e);
            }
        }

        // 刷新界面
        renderInterface();
    };

    const { $ } = getCore();
    if ($) $(document).ready(init); else window.addEventListener('load', init);
})();
