export default {
  id: 'radialWave',
  name: '방사형 파동',
  baseStats(level) {
    return {
      damage: 8 + (level - 1) * 2,
      speed: 200,
      fireRateMs: 500,
      lifetimeMs: 700,
      radius: 4
    };
  },
  apply(effect) {
    return {
      ...effect,
      spreadDeg: effect.spreadDeg + 35,
      spreadJitterDeg: effect.spreadJitterDeg + 12,
      quantity: effect.quantity * 24,
      radiusJitter: 0.5,
      color: 0x66ccff
    };
  }
};
