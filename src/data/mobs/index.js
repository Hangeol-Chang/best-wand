// 몹 추가 시: 이 폴더에 MobBase를 상속하는 파일 하나 만들고 여기 배열에 등록만 하면 됨
import Grunt from './Grunt.js';
import Boss from './Boss.js';

export const MOBS = [Grunt, Boss];

const BOSS_SPAWN_EVERY = 30;

// 스폰 순번 기준으로 어떤 몹 타입을 낼지 결정
export function pickMobType(spawnCount) {
  return spawnCount % BOSS_SPAWN_EVERY === 0 ? Boss : Grunt;
}
