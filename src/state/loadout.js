// 현재 장착 중인 지팡이 순서 + 레벨 (플레이어가 편집 화면에서 순서를 바꾸고,
// 보스 드롭으로 같은 지팡이를 얻으면 레벨이 오름)
import { WANDS } from '../data/wands/index.js';

let order = WANDS.map((w) => w.id);
let levels = Object.fromEntries(order.map((id) => [id, 1]));
let testMode = false;

// 게임 시작 시 지팡이 하나만 고르고 시작하도록 초기화
export function resetLoadout() {
  order = [];
  levels = {};
}

// Test 모드로 들어온 판인지 - true면 WandEditScene이 추가/삭제/레벨 조절 UI를 보여줌
export function setTestMode(value) {
  testMode = value;
}

export function isTestMode() {
  return testMode;
}

// Test 모드 전용: 체인 끝에 지팡이 추가 (중복 id 허용 - 같은 지팡이 두 번 넣기 가능)
export function appendWand(id) {
  order = [...order, id];
  if (levels[id] === undefined) levels[id] = 1;
}

// Test 모드 전용: 특정 위치의 지팡이 제거
export function removeAt(index) {
  order = order.filter((_, i) => i !== index);
}

// Test 모드 전용: 레벨 직접 조절
export function setLevel(id, level) {
  levels[id] = Math.max(1, level);
}

export function getOrder() {
  return order;
}

export function setOrder(newOrder) {
  order = newOrder;
}

export function getLevel(id) {
  return levels[id] ?? 1;
}

// 보스가 드롭한 지팡이 습득 시 호출: 이미 장착 중이면 레벨업, 처음이면 장착
export function acquireWand(id) {
  if (order.includes(id)) {
    levels[id] = getLevel(id) + 1;
  } else {
    order = [...order, id];
    levels[id] = 1;
  }
}

export function getOrderedWands() {
  return order.map((id) => ({ ...WANDS.find((w) => w.id === id), level: getLevel(id) }));
}
