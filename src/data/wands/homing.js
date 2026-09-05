// 유도 성능(homingTurnRate, deg/s)은 레벨이 오를수록 세짐 - 낮으면 처음 발사각에서 천천히 꺾이고, 높으면 빠르게 목표를 향해 꺾임
export default {
  id: 'homing',
  name: '유도탄',
  apply(effect, level = 1) {
    return { ...effect, homing: true, homingTurnRate: 160 + (level - 1) * 80 };
  }
};
