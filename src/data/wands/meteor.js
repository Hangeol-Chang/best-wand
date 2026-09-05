// weaponType 'meteor': 조준해서 날아가는 대신 적 근처 좌표에 예고 후 낙하 폭발.
// 폭발 시점에 effect.onHit(분열탄 등)이 소비됨 - GameScene.explodeMeteor 참고.
export default {
  id: 'meteor',
  name: '메테오',
  weaponType: 'meteor',
  baseStats(level) {
    return {
      damage: 25 + (level - 1) * 7,
      fireRateMs: 1500,
      lifetimeMs: 2200,
      impactRadius: 70,
      projectileRadius: 14
    };
  },
  apply(effect) {
    return effect;
  }
};
