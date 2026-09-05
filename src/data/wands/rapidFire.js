// ponytail: 연사속도는 원래 첫 번째(공격형) 지팡이만 정하지만, 이 지팡이는 예외로
// 체인 어디에 꽂혀도 fireRateMultiplier를 곱해서 연사속도를 올림.
export default {
  id: 'rapidFire',
  name: '속사 지팡이',
  apply(effect, level = 1) {
    const multiplier = Math.max(0.3, 0.65 - (level - 1) * 0.1);
    return { ...effect, fireRateMultiplier: (effect.fireRateMultiplier ?? 1) * multiplier };
  }
};
