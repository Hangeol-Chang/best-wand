// weaponType 'orbit': 투사체가 날아가지 않고 플레이어 주위를 원형으로 계속 도는 방식.
// baseStats.speed는 다른 무기처럼 px/s가 아니라 공전 각속도(deg/s)로 쓰임 (GameScene.updateOrbitProjectiles 참고).
export default {
  id: 'orbit',
  name: '오빗 지팡이',
  weaponType: 'orbit',
  baseStats(level) {
    return {
      damage: 8 + (level - 1) * 3,
      speed: 140,
      fireRateMs: 400,
      lifetimeMs: 4000,
      projectileCount: 2
    };
  },
  apply(effect) {
    return effect;
  }
};
