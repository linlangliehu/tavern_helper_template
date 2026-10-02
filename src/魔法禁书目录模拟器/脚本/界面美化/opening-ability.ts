export type MfrsOpeningAbility = {
  能力名称: string;
  阵营类型: '超能力' | '术式';
  等级或位阶: string;
  能力效果: string;
  是否稳定: boolean;
  实战运用: string;
};

const NO_ABILITY_LABELS = new Set([
  '无',
  '无能力',
  '无能力者',
  '无能力者（level 0）',
  '无能力者(level 0)',
  '未觉醒',
  '未指定',
  '未指定能力',
  '未声明',
  '未声明能力',
  '未声明术式',
  '未选择能力',
  '未选择魔法',
  '无超能力',
  '没有超能力',
  '没有能力',
  '没有术式',
  '尚未觉醒',
  '能力未觉醒',
  '无术式',
  '无术式（普通凡人）',
  '普通人',
  '普通凡人',
]);

export function isMfrsNoAbilityLabel(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase();
  return (
    !normalized ||
    NO_ABILITY_LABELS.has(normalized) ||
    /^level\s*0(?:\s*[（(]无能力者[）)])?$/.test(normalized) ||
    /^无能力者(?:\s*[（(]level\s*0[^）)]*[）)])?(?:\s*[—–-].*)?$/.test(normalized) ||
    /^无术式(?:\s*[（(].*[）)])?$/.test(normalized) ||
    /^未觉醒的无能力者(?:\s*[（(].*[）)])?$/.test(normalized)
  );
}

export function createMfrsOpeningAbilityRoster(
  name: string,
  camp: MfrsOpeningAbility['阵营类型'],
  level: string,
  effect: string,
): MfrsOpeningAbility[] {
  const abilityName = name.trim();
  if (!abilityName || isMfrsNoAbilityLabel(abilityName)) return [];

  return [
    {
      能力名称: abilityName,
      阵营类型: camp,
      等级或位阶: level.trim() || '未指定',
      能力效果: effect.trim(),
      是否稳定: true,
      实战运用: '',
    },
  ];
}
