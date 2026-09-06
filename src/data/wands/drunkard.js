export default {
  id: 'drunkard',
  name: '주정뱅이',
  baseStats(level) {
    return {
      damage: 6,
      speed: 340,
      fireRateMs: 450,
      lifetimeMs: 650,
      radius: 4
    };
  },
  apply(effect) {
    return {
      ...effect,
      quantity: effect.quantity * (Math.random() * 0.05 + 0.05), // 혼자면 5~10개, 곱연산이라 순서 무관
      spreadDeg: 8,
      speedJitter: 0.35,
      spiralRadius: 14,
      spiralDeg: 720,
      color: 0xb266ff
    };
  }
};
