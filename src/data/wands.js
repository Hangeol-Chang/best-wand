// 완드 정의 목록 - 다음 에이전트가 실제 밸런스/효과 채워넣음
// apply(effect)는 effect 객체를 받아 수정된 새 effect를 반환해야 함 (불변 유지 권장)

export const WANDS = [
  {
    id: 'fireball',
    name: '파이어볼',
    apply(effect) {
      return { ...effect, damage: effect.damage + 5, burn: true };
    }
  },
  {
    id: 'split',
    name: '분열',
    apply(effect) {
      return { ...effect, projectileCount: (effect.projectileCount || 1) * 2 };
    }
  }
];
