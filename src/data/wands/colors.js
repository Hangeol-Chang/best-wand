// 지팡이 아이콘 색 - 로비/게임 UI에서 지팡이를 직사각형으로 표시할 때 사용
export const WAND_COLORS = {
  fireball: 0xff6b4a,
  laser: 0x66e0ff,
  split: 0xb266ff,
  splitShot: 0xb266ff,
  homing: 0x33ff99,
  freeze: 0x66ccff,
  branch: 0xffd166,
  rapidFire: 0xf6ad55,
  heavy: 0x8b5e3c,
  orbit: 0x4ade80,
  meteor: 0xff8800,
  lightning: 0xffe066
};

export function wandColor(id) {
  return WAND_COLORS[id] ?? 0x9aa0ac;
}
