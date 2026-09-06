export default {
  id: 'flamethrower',
  name: '화염방사기',
  baseStats(level) {
    return {
      damage: 4 + (level - 1) * 1,
      speed: 420,
      fireRateMs: 45,
      lifetimeMs: 700,
      radius: 4,
      decel: 2.2
    };
  },
  apply(effect) {
    return {
      ...effect,
      quantity: effect.quantity * 12,
      spreadDeg: effect.spreadDeg + 6,
      spreadJitterDeg: effect.spreadJitterDeg + 8,
      clusterRadius: 24,
      speedJitter: 0.2,
      radiusJitter: 0.5,
      color: 0xff6a00
    };
  }
};
