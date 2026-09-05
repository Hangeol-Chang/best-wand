export default {
  id: 'heavy',
  name: '헤비 지팡이',
  baseStats(level) {
    return {
      damage: 30 + (level - 1) * 8,
      speed: 150,
      fireRateMs: 900,
      lifetimeMs: 3600,
      projectileRadius: 9
    };
  },
  apply(effect) {
    return effect;
  }
};
