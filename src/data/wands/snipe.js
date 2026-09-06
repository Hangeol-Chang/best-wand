export default {
  id: 'snipe',
  name: '저격',
  baseStats(level) {
    return {
      speed: 60,
      fireRateMs: 2200,
      lifetimeMs: 2600,
      radius: 5
    };
  },
  apply(effect) {
    return {
      ...effect,
      damage: effect.damage + 120,
      quantity: effect.quantity * 0.01,
      radiusJitter: 0.3,
      homingDelayMs: 500,
      homingAccel: 900,
      homingTurnDeg: 260,
      color: 0xff2b2b
    };
  }
};
