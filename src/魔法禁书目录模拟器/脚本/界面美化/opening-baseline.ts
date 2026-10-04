const INITVAR_DEFAULTS: Record<string, unknown> = {
  性别: '男',
  年龄: '18岁',
  所在位置: '未知',
  剧情阶段: '序章',
  '主线进度.当前阶段': '开局接入',
  '主线进度.阶段序号': 0,
  '主线进度.阶段状态': '未启动',
  '主线进度.当前节点': '未进入事件包',
  '主线进度.正史锚点.当前锚点': '自定义开局',
  '主线进度.正史锚点.默认走向': '等待玩家开局地点与身份确定',
  '主线进度.下一步推进提示': '等待玩家确认开局地点、阵营与身份',
};

function cloneBaselineValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneBaselineValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, cloneBaselineValue(entry)]),
    );
  }
  return value;
}

function mergeBaselineValue(current: unknown, baseline: unknown, path: string, mergeDefaultArrays: boolean): unknown {
  if (Array.isArray(baseline)) {
    if (!Array.isArray(current)) return cloneBaselineValue(baseline);
    return mergeDefaultArrays && current.length === 0 && baseline.length > 0 ? cloneBaselineValue(baseline) : current;
  }

  if (baseline && typeof baseline === 'object') {
    const currentObject =
      current && typeof current === 'object' && !Array.isArray(current) ? (current as Record<string, unknown>) : {};
    const baselineObject = baseline as Record<string, unknown>;
    const merged = { ...currentObject };
    for (const [key, value] of Object.entries(baselineObject)) {
      const childPath = path ? `${path}.${key}` : key;
      merged[key] = mergeBaselineValue(currentObject[key], value, childPath, mergeDefaultArrays);
    }
    return merged;
  }

  if (current === undefined || current === null || current === '' || current === INITVAR_DEFAULTS[path]) {
    return baseline;
  }
  return current;
}

export function mergeMfrsOpeningBaseline(
  current: Record<string, unknown>,
  baseline: Record<string, unknown>,
): Record<string, unknown> {
  const currentMainline = current.主线进度 as Record<string, unknown> | undefined;
  const currentAnchor = currentMainline?.正史锚点 as Record<string, unknown> | undefined;
  const baselineMainline = baseline.主线进度 as Record<string, unknown> | undefined;
  const mergeDefaultArrays =
    currentMainline?.当前节点 === INITVAR_DEFAULTS['主线进度.当前节点'] ||
    currentAnchor?.当前锚点 === INITVAR_DEFAULTS['主线进度.正史锚点.当前锚点'] ||
    currentMainline?.当前节点 === baselineMainline?.当前节点;
  return mergeBaselineValue(current, baseline, '', mergeDefaultArrays) as Record<string, unknown>;
}
