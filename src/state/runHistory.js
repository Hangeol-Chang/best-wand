// 임시 인메모리 런 기록 - 새로고침/서버 재시작하면 사라짐.
// 추후 백엔드 붙으면 recordRun 호출부만 API 저장으로 바꾸면 됨.
let runs = [];

export function recordRun({ wands, score, kills, maxHit }) {
  runs = [{ wands, score, kills, maxHit, timestamp: Date.now() }, ...runs];
}

export function getRuns() {
  return runs;
}
