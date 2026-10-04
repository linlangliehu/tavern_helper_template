export interface MfrsEventBudgetEntry {
  content?: unknown;
  ignoreBudget?: boolean;
  [key: string]: unknown;
}

function eventPackageIdOf(entry: MfrsEventBudgetEntry): string {
  const match = String(entry.content ?? '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => /^事件包ID\s*[：:]\s*\S+$/.test(line))
    ?.match(/^事件包ID\s*[：:]\s*(\S+)$/);
  return match?.[1] ?? '';
}

/** Keep only the selected playable package outside the normal worldbook budget. */
export function routeMfrsEventPackageBudget(
  entries: readonly MfrsEventBudgetEntry[],
  selectedPackageId?: string | null,
): MfrsEventBudgetEntry[] {
  const selected = String(selectedPackageId ?? '').trim();
  return entries.map(entry => {
    const packageId = eventPackageIdOf(entry);
    if (!packageId) return entry;

    const shouldIgnoreBudget = Boolean(selected) && packageId === selected;
    if (Boolean(entry.ignoreBudget) === shouldIgnoreBudget) return entry;
    return { ...entry, ignoreBudget: shouldIgnoreBudget };
  });
}
