import { applyRawProtocolToMvuData } from '../mvu-protocol-applier/raw-status-writer';

/**
 * HUD / 消息内面板侧的 raw 协议兜底解析。
 *
 * 语义必须与 hotfix 写回链路完全一致，否则会出现"面板显示 A、变量落库 B"的分裂，
 * 因此这里不再复制一份 JSONPatch 实现，而是直接包装生产 applier：
 * hotfix 侧以 { stat_data } 为根、patch 路径相对 stat_data；HUD 侧只持有 stat_data 本身，
 * 故在此补上外层包装再拆回。
 *
 * 历史坑（G8 门禁捕获）：本文件曾自带一份实现，其 patch 路径同样拼了 'stat_data' 前缀，
 * 但根对象传的是 stat_data 自身 —— 父路径查找永远落空，所有 patch 静默跳过，
 * 于是"现场档案不随对话更新"。共享实现即为该 bug 的结构性修复。
 */
export function applyUpdateProtocolToStatData(
  statData: Record<string, unknown>,
  raw: string,
): Record<string, unknown> {
  const base = statData && typeof statData === 'object' && !Array.isArray(statData) ? statData : {};
  const result = applyRawProtocolToMvuData({ stat_data: base }, raw);
  const next = result.data.stat_data;
  return next && typeof next === 'object' && !Array.isArray(next) ? (next as Record<string, unknown>) : {};
}
