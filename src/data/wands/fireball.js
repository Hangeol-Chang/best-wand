export default {
  id: 'fireball',
  name: '파이어볼',
  baseStats(level) {
    return { damage: 15 + (level - 1) * 5, speed: 300, fireRateMs: 600, lifetimeMs: 2600 };
  },
  apply(effect) {
    return { ...effect, burn: true };
  }
};
