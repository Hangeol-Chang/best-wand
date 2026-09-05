// ponytail: 진짜 갈래별 독립 지팡이 슬롯은 resolveWandChain이 reduce 구조라 불가.
// 이후 지팡이는 두 갈래 모두에 동일하게 적용됨 (완전 독립 슬롯 필요하면 체인 구조를 트리로 재설계).
export default {
  id: 'branch',
  name: '분기 지팡이',
  apply(effect) {
    return [{ ...effect }, { ...effect }];
  }
};
