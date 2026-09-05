import MobBase from './MobBase.js';

export default class Boss extends MobBase {
  static id = 'boss';
  static size = 48;
  static color = 0x7c3aed;
  static hp = MobBase.hp * 6;
  static damage = 25;
  static speed = MobBase.speed * 0.6;
  static isBoss = true;

  static onDeath(scene, mob) {
    scene.spawnChest(mob.x, mob.y);
  }
}
