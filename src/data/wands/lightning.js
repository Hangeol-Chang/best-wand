// weaponType 'lightning': 가장 가까운 적이 아니라 사거리 내 랜덤 몹을 향해 즉시 판정되는 번개.
// 목표까지 살짝 불규칙하게 꺾이는 유도형 경로이고, 그 경로에 걸리는 몹 전부를 맞힘. 사거리는 다른 무기보다 짧음.
export default {
  id: 'lightning',
  name: '번개 지팡이',
  weaponType: 'lightning',
  baseStats(level) {
    return { damage: 12 + (level - 1) * 4, fireRateMs: 550 };
  },
  apply(effect) {
    return effect;
  }
};
