// 지팡이 아이콘 색 - 로비/게임 UI에서 지팡이를 직사각형으로 표시할 때 사용
export const WAND_COLORS = {
  flamethrower: 0xff6a00,
  radialWave: 0x66ccff
};

export function wandColor(id) {
  return WAND_COLORS[id] ?? 0x9aa0ac;
}
