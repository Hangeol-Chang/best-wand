// 완드 체이닝 - 순서에 따라 효과가 달라지는 합성 파이프라인
// wand: { id, name, level?, weaponType?, baseStats?(level), spawnTiming?, seedChild?(effect), apply(effect, level) => effect | effect[] }
//   level: 보스 드롭으로 같은 지팡이를 또 얻으면 오름 (state/loadout.js의 acquireWand가 관리).
//   weaponType: 'projectile'(기본) | 'laser' | 'orbit' 등 - 구간(세그먼트) 안 어디에 있든 읽힘 (순서 상관없이 이 값 가진
//     지팡이가 있으면 그 구간 전체의 발사 방식이 바뀜 - 예: 헤비+오빗 순서 상관없이 오빗으로 돎). 한 구간에 여러 개면 뒤에 있는 게 이김.
//     GameScene은 각 effect가 들고 있는 weaponType으로 발사 방식을 고름 (effect.weaponType).
//   baseStats(level): { damage, speed, fireRateMs, lifetimeMs, ... } 반환 - 마찬가지로 "새 탄" 구간의 첫 지팡이일 때만 적용됨.
//
//   spawnTiming: 이 값이 있으면 이 지팡이는 "새 탄을 만드는 창조자"라서 체인이 여기서 구간으로 나뉨.
//     'immediate' (예: 분열 - 개수를 즉시 곱함) - 다음 구간 지팡이들은 여전히 "지금 나가는 같은 탄"에 이어서 적용됨.
//                 (같은 탄이라 baseStats/weaponType 재시딩 없음 - 원래 탄 스탯 그대로 이어받음)
//     'onHit'     (예: 분열탄 - "트리거 시점"에 자식 탄 생성) - 다음 구간은 완전히 새로운 자식 탄이라서, 그 구간 첫 지팡이의
//                 baseStats/weaponType으로 다시 시딩된 뒤 지팡이들이 적용됨 (effect.onHit로 지연 보관).
//                 여기서 "트리거 시점"은 wandChain은 몰라도 됨 - GameScene이 이 탄의 weaponType에 맞는 시점에
//                 effect.onHit을 소비하면 됨 (예: 프로젝타일/레이저는 적중 시, 메테오는 폭발 시 - applyHit/explodeMeteor 참고).
//     구간을 여는 창조자 자신의 apply 결과는 항상 "지금 구간"(경계 앞쪽)에 포함됨.
//   seedChild(effect): onHit 창조자가 자식 탄에 어떤 값을 물려줄지 정함 (기본: 그대로 물려줌 - baseStats 재시딩은 그 다음에 별도로 일어남).
//   apply(effect, level)이 배열을 반환하면 그 지점에서 병렬로 갈래가 나뉨 (분기 지팡이). 구간 경계와는 별개 개념.
//
// effect 스키마 (발사체 하나가 최종적으로 가지는 속성 묶음):
//   weaponType: string         - 'projectile' | 'laser' | 'orbit' 등 (자신이 속한 구간의 첫 지팡이가 결정)
//   damage: number             - 명중 시 피해량 (구간 첫 지팡이의 baseStats.damage로 결정)
//   speed: number              - 투사체 이동 속도 px/s (구간 첫 지팡이의 baseStats.speed로 결정)
//   fireRateMs: number         - 발사 간격 ms (구간 첫 지팡이의 baseStats.fireRateMs로 결정, 최상위 구간에서만 의미 있음)
//   lifetimeMs: number         - 투사체가 사라지기까지 시간 ms (구간 첫 지팡이의 baseStats.lifetimeMs로 결정, 사거리 = speed * lifetimeMs)
//   fireRateMultiplier: number - 연사속도 배율. 위치 상관없이 아무 지팡이나 곱할 수 있음 (예외)
//   projectileCount: number   - 한 번 발사(또는 한 번 적중 시 생성)에 만들어질 투사체 수
//   projectileRadius: number  - 투사체 표시 반지름 px (구간 첫 지팡이의 baseStats.projectileRadius로 결정, 기본 5)
//   impactRadius: number       - 범위 공격(메테오 등) 폭발 반지름 px (구간 첫 지팡이의 baseStats.impactRadius로 결정, 기본 0)
//   burn: boolean              - 화상 상태이상 부여 여부
//   splitOnHit: boolean        - (표시용) 피격 시 분열 능력이 있다는 도감 설명용 플래그. 실제 자식 탄 생성 여부는 onHit 필드로 결정됨
//   homing: boolean            - 가장 가까운 적을 추적 (즉시 방향 전환이 아니라 homingTurnRate만큼씩 서서히 꺾임)
//   homingTurnRate: number     - 유도 성능(초당 회전 각도, deg/s). homing 탄 전용이지만 필드 자체는 범용이라
//                                다른 유도 기능(예: 다른 지팡이의 유도 자식 탄)에도 그대로 재사용 가능
//   freeze: boolean            - 적중한 적을 일정 시간 정지시킴
//   onHit: effect[] | undefined - 이 탄이 적중했을 때 생성할 자식 탄들의 effect (onHit 창조자를 거쳤을 때만 존재)
//
// 새 필드 추가 시 이 목록에 같이 적을 것.

export function createBaseEffect() {
  return {
    weaponType: 'projectile',
    damage: 10,
    speed: 300,
    fireRateMs: 600,
    lifetimeMs: 2200,
    fireRateMultiplier: 1,
    projectileCount: 1,
    projectileRadius: 5,
    impactRadius: 0,
    homingTurnRate: 220,
    burn: false
  };
}

// 구간의 첫 지팡이가 "새 탄"의 baseStats(데미지/속도/연사속도 등)를 결정.
// weaponType은 첫 지팡이 전용이 아니라 구간 안 아무 지팡이나 가질 수 있음 (뒤에 있는 게 이김) - 순서 안 타고 조합됨.
function seedSegment(segment, effects) {
  const first = segment.wands[0];
  const weaponTypeWand = [...segment.wands].reverse().find((w) => w.weaponType);
  if (!first && !weaponTypeWand) return effects;
  return effects.map((effect) => {
    let next = effect;
    if (first && first.baseStats) next = { ...next, ...first.baseStats(first.level ?? 1) };
    if (weaponTypeWand) next = { ...next, weaponType: weaponTypeWand.weaponType };
    return next;
  });
}

function buildSegments(wands) {
  const segments = [];
  let current = { wands: [], timing: null };
  for (const wand of wands) {
    current.wands.push(wand);
    if (wand.spawnTiming) {
      segments.push(current);
      current = { wands: [], timing: wand.spawnTiming };
    }
  }
  segments.push(current);
  return segments;
}

function applySegmentWands(wands, effects) {
  let result = effects;
  for (const wand of wands) {
    result = result.flatMap((effect) => {
      const out = wand.apply(effect, wand.level ?? 1);
      return Array.isArray(out) ? out : [out];
    });
  }
  return result;
}

function resolveFrom(segments, index, effects) {
  const segment = segments[index];
  const resolved = applySegmentWands(segment.wands, effects);
  const next = segments[index + 1];
  if (!next) return resolved;

  if (next.timing === 'onHit') {
    const creator = segment.wands[segment.wands.length - 1];
    const seededChild = resolved.map((effect) => (creator && creator.seedChild ? creator.seedChild(effect) : effect));
    const reseeded = seedSegment(next, seededChild); // 새 자식 탄 - 그 구간 첫 지팡이 기준으로 다시 시딩
    const childEffects = resolveFrom(segments, index + 1, reseeded);
    return resolved.map((effect) => ({ ...effect, onHit: childEffects }));
  }

  // 'immediate' - 지금 나가는 같은 탄으로 계속 이어서 적용 (재시딩 없음)
  return resolveFrom(segments, index + 1, resolved);
}

// 반환값: 최종 effect 배열 (분기 없으면 길이 1). 각 effect는 onHit로 지연 세그먼트를 물고 있을 수 있음
export function resolveWandChain(wands, baseEffect) {
  const segments = buildSegments(wands);
  const seeded = seedSegment(segments[0], [baseEffect]);
  return resolveFrom(segments, 0, seeded);
}
