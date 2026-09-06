export default {
  id: 'radialWave',
  name: '방사형 파동',
  baseStats(level) {
    return {
      speed: 200,
      fireRateMs: 500,
      lifetimeMs: 700,
      radius: 4
    };
  },
  apply(effect) {
    return {
      ...effect,
      damage: effect.damage + 1,
      spreadDeg: effect.spreadDeg + 35,
      spreadJitterDeg: effect.spreadJitterDeg + 12,
      quantity: effect.quantity * 0.6,
      radiusJitter: 0.5,
      color: 0x66ccff
    };
  }
};
