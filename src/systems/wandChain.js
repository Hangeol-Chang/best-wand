// 완드 체이닝 - 순서에 따라 효과가 달라지는 합성 파이프라인
// wand: { id, name, apply(effect) => effect }
//
// effect 스키마 (발사체 하나가 최종적으로 가지는 속성 묶음):
//   damage: number          - 명중 시 피해량
//   speed: number           - 투사체 이동 속도 (px/s)
//   projectileCount: number - 한 번 발사에 만들어질 투사체 수 (분열 등이 곱함)
//   burn: boolean           - 화상 상태이상 부여 여부
//
// 새 필드 추가 시 이 목록에 같이 적을 것.

export function createBaseEffect() {
  return { damage: 10, speed: 300, projectileCount: 1, burn: false };
}

export function resolveWandChain(wands, baseEffect) {
  return wands.reduce((effect, wand) => wand.apply(effect), baseEffect);
}
