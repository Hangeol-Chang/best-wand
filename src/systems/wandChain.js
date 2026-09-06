// 완드 체이닝 - 순서에 따라 효과가 달라지는 합성 파이프라인
// wand: { id, name, level?, baseStats?(level), spawnTiming?, seedChild?(effect), apply(effect, level) => effect | effect[] }
//   level: 보스 드롭으로 같은 지팡이를 또 얻으면 오름 (state/loadout.js의 acquireWand가 관리).
//   baseStats(level): { damage, speed, fireRateMs, lifetimeMs, radius } 반환 - "새 탄" 구간의 첫 지팡이일 때만 적용됨.
//
//   spawnTiming: 이 값이 있으면 이 지팡이는 "새 탄을 만드는 창조자"라서 체인이 여기서 구간으로 나뉨.
//     'immediate' - 다음 구간 지팡이들은 여전히 "지금 나가는 같은 탄"에 이어서 적용됨 (재시딩 없음).
//     'onHit'     - "적중 시점"에 자식 탄 생성 - 다음 구간은 완전히 새로운 자식 탄이라서 그 구간 첫 지팡이의
//                 baseStats로 다시 시딩된 뒤 지팡이들이 적용됨 (effect.onHit로 지연 보관).
//   seedChild(effect): onHit 창조자가 자식 탄에 어떤 값을 물려줄지 정함 (기본: 그대로 물려줌).
//   apply(effect, level)이 배열을 반환하면 그 지점에서 병렬로 갈래가 나뉨 (분기 지팡이).
//
// effect 스키마 (지팡이 체인 하나가 최종적으로 가지는 파티클 발사 속성 묶음 - GameScene이 이 값으로 작은 사각 도트를 뿌림):
//   damage: number     - 도트 하나가 명중 시 주는 피해량 (구간 첫 지팡이의 baseStats.damage로 결정)
//   speed: number       - 도트 이동 속도 px/s (구간 첫 지팡이의 baseStats.speed로 결정)
//   fireRateMs: number  - 발사 간격 ms (구간 첫 지팡이의 baseStats.fireRateMs로 결정)
//   lifetimeMs: number  - 도트가 사라지기까지 시간 ms (사거리 = speed * lifetimeMs)
//   radius: number      - 도트 반지름 px (구간 첫 지팡이의 baseStats.radius로 결정)
//   radiusJitter: number - 도트 크기 랜덤 편차 비율 (0~1). radius를 최대 크기로 두고 radius * (1 - random*radiusJitter)로 그 아래로만 랜덤
//   quantity: number    - 한 번 발사에 뿌릴 도트 개수. 곱연산으로 조합됨 (지팡이별로 x2, x3 등)
//   spreadDeg: number   - 조준 방향 기준 부채꼴 퍼짐 각도(deg). 지팡이가 자기 몫을 더해서 넓힘
//   spreadJitterDeg: number - 도트 하나하나에 랜덤으로 더 얹는 퍼짐(deg, ±jitter/2). 덩어리가 흩어지는 느낌용
//   decel: number       - 초당 감속 비율(1/s, 지수감쇠: speed *= e^-decel*dt). 0이면 등속, 값이 있으면
//                         점점 느려지되 완전히 딱 멈추지 않고 서서히 거의 정지에 수렴 (lifetimeMs로 자연 소멸)
//   clusterRadius: number - 발사 시작점 랜덤 위치 편차(px). 값이 있으면 도트들이 한 점이 아니라
//                         반경 clusterRadius 원판 안에 흩뿌려져 시작 - "덩어리째 발사"처럼 보이게 함
//   speedJitter: number - 도트 속도 랜덤 편차 비율(0~1). speed * (1 ± speedJitter)로 도트마다 속도 랜덤
//   radial: boolean     - true면 조준 없이 360도 전방위로 도트를 뿌림 (아무 지팡이나 켤 수 있음, 한 번 켜지면 유지)
//   color: number       - 도트 색 (hex). 마지막에 설정한 지팡이가 이김
//   onHit: effect[] | undefined - 이 도트가 적중했을 때 생성할 자식 도트들의 effect (onHit 창조자를 거쳤을 때만 존재)
//
// 새 필드 추가 시 이 목록에 같이 적을 것.

export function createBaseEffect() {
  return {
    damage: 10,
    speed: 220,
    fireRateMs: 500,
    lifetimeMs: 500,
    radius: 4,
    radiusJitter: 0,
    quantity: 1,
    spreadDeg: 10,
    spreadJitterDeg: 0,
    decel: 0,
    clusterRadius: 0,
    speedJitter: 0,
    radial: false,
    color: 0xffffff
  };
}

// 구간의 첫 지팡이가 "새 탄"의 baseStats(데미지/속도/연사속도 등)를 결정.
function seedSegment(segment, effects) {
  const first = segment.wands[0];
  if (!first || !first.baseStats) return effects;
  return effects.map((effect) => ({ ...effect, ...first.baseStats(first.level ?? 1) }));
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
