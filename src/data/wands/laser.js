// weaponType: 체인 첫 번째 지팡이일 때만 읽힘 - 발사 방식(프로젝타일/레이저 등)을 결정
export default {
  id: 'laser',
  name: '레이저',
  weaponType: 'laser',
  baseStats(level) {
    return { damage: 14 + (level - 1) * 4, speed: 300, fireRateMs: 500 };
  },
  apply(effect) {
    return effect;
  }
};
