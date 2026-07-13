(function () {
    'use strict';

    const CONFIG_KEY = 'MFRS_DATABASE_FRONTEND_CONFIG';
    const config = {
        dashboardSlots: [
            { id: 'slot_2_1', kw: '玩家状态', title: '玩家状态', rule: 'kv' },
            { id: 'slot_3_1', kw: '全局状态', title: '全局状态', rule: 'kv' },
            { id: 'slot_4_1', kw: '人物', title: '人物', rule: 'capsule', col: 1 },
            { id: 'slot_5_1', kw: '灵异物品', title: '灵异物品', rule: 'capsule', col: 1 },
            { id: 'slot_5_2', kw: '厉鬼档案', title: '厉鬼档案', rule: 'capsule', col: 1 },
            { id: 'slot_6_1', kw: '灵异事件', title: '灵异事件', rule: 'capsule', col: 1, capCols: 2 },
            { id: 'slot_6_2', kw: '地点', title: '地点', rule: 'capsule', col: 1, capCols: 2 },
        ],
        legacyDashboardKeywords: ['主角信息', '全局数据', '全局数据表', '重要人物', '重要人物表', '背包', '背包物品', '背包物品表', '技能', '主角任务栏', '任务'],
        recallTableRules: [
            {
                key: 'sheet_chronicle',
                names: ['事件纪要', '纪要'],
                kind: '记忆',
                icon: 'fa-clock-rotate-left',
                titleHeaders: ['纪要编号', '概览', '关联事件'],
                summaryHeaders: ['纪要', '概览'],
                tagHeaders: ['时间跨度', '关联事件'],
                injected: true,
            },
            {
                key: 'sheet_clues',
                names: ['线索'],
                kind: '剧情',
                icon: 'fa-magnifying-glass',
                titleHeaders: ['线索编号', '内容', '关联事件'],
                summaryHeaders: ['内容', '推断', '验证状态'],
                tagHeaders: ['关联事件', '来源', '可信度', '可见性'],
                injected: true,
            },
            {
                key: 'sheet_characters',
                names: ['人物'],
                kind: '剧情',
                icon: 'fa-address-book',
                titleHeaders: ['姓名', '身份'],
                summaryHeaders: ['已知情报', '关系', '灵异能力'],
                tagHeaders: ['阵营', '所在地点', '在场状态', '生死状态'],
                injected: true,
            },
            {
                key: 'sheet_locations',
                names: ['地点'],
                kind: '剧情',
                icon: 'fa-map-location-dot',
                titleHeaders: ['地点名', '城市'],
                summaryHeaders: ['关键描述', '可交互内容', '相关事件'],
                tagHeaders: ['城市', '地点类型', '灵异状态', '封锁状态'],
                injected: true,
            },
            {
                key: 'sheet_supernatural_events',
                names: ['灵异事件'],
                kind: '剧情',
                icon: 'fa-triangle-exclamation',
                titleHeaders: ['事件代号', '可见摘要'],
                summaryHeaders: ['可见摘要', '已知杀人规律', '猜测杀人规律'],
                tagHeaders: ['危害等级', '发生地点', '处理状态', '扩散趋势'],
                injected: true,
            },
            {
                key: 'sheet_ghost_archives',
                names: ['厉鬼档案'],
                kind: '剧情',
                icon: 'fa-ghost',
                titleHeaders: ['档案编号', '厉鬼称呼'],
                summaryHeaders: ['表现', '已知规律', '危险备注'],
                tagHeaders: ['关联事件', '关押状态', '拼图关系'],
                injected: true,
            },
            {
                key: 'sheet_supernatural_items',
                names: ['灵异物品'],
                kind: '资源',
                icon: 'fa-briefcase',
                titleHeaders: ['物品名', '类型'],
                summaryHeaders: ['效果', '副作用', '使用限制'],
                tagHeaders: ['类型', '持有人', '所在地点', '数量或状态'],
                injected: true,
            },
            {
                key: 'sheet_collected_archives',
                names: ['收录档案'],
                kind: '档案',
                icon: 'fa-folder-open',
                titleHeaders: ['档案厉鬼名称', '收录状态'],
                summaryHeaders: ['可见摘要', '厉鬼信息', '已知规律'],
                tagHeaders: ['收录状态', '收录进度', '档案完整度', '可调用范围'],
                injected: true,
            },
            {
                key: 'sheet_collected_rules',
                names: ['收录规律'],
                kind: '档案',
                icon: 'fa-book-open',
                titleHeaders: ['来源厉鬼', '规律类型'],
                summaryHeaders: ['规律内容', '规律进阶', '可见摘要'],
                tagHeaders: ['获取方式', '完整度', '风险备注'],
                injected: true,
            },
            {
                key: 'sheet_controlled_ghosts',
                names: ['驾驭厉鬼'],
                kind: '状态',
                icon: 'fa-skull',
                titleHeaders: ['厉鬼代号', '恐怖程度'],
                summaryHeaders: ['可见摘要', '可用能力', '杀人规律'],
                tagHeaders: ['恐怖程度', '死机状态', '复苏进度'],
                injected: true,
            },
        ],
        consistencyRules: [
            { label: '玩家状态', statPaths: ['姓名', '身份', '所在位置', '状态', '驭鬼者状态'], tableNames: ['玩家状态', '人物'] },
            { label: '当前事件', statPaths: ['当前灵异事件', '当前事件'], tableNames: ['灵异事件', '事件纪要'] },
            { label: '驾驭厉鬼', statPaths: ['驭鬼者状态.已驾驭厉鬼', '驾驭厉鬼'], tableNames: ['驾驭厉鬼', '厉鬼档案'] },
            { label: '灵异物品', statPaths: ['灵异资源.持有物品', '背包', '物品', '灵异物品'], tableNames: ['灵异物品'] },
            { label: '线索', statPaths: ['线索', '当前线索', '调查线索'], tableNames: ['线索'] },
            { label: '事件纪要', statPaths: ['事件纪要', '剧情纪要', '记忆'], tableNames: ['事件纪要'] },
        ],
    };

    const frozenConfig = Object.freeze(config);
    const attach = (target) => {
        if (!target || typeof target !== 'object') return;
        Object.defineProperty(target, CONFIG_KEY, {
            configurable: true,
            enumerable: false,
            value: frozenConfig,
        });
    };

    attach(window);
    try {
        if (window.parent && window.parent !== window) attach(window.parent);
    } catch (error) {
        // Cross-frame access can be unavailable in unusual hosts; local config is enough for the bundle.
    }
})();
