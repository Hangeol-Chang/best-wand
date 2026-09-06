import Phaser from 'phaser';

// 몹 공통 인터페이스 - 새 몹 추가 시 이 클래스를 상속해서 필요한 static 값/메서드만 오버라이드하면 됨
export default class MobBase {
  static id = 'mob';
  static size = 24;
  static color = 0xe53e3e;
  static hp = 100;
  static damage = 10;   // 플레이어와 접촉 시 주는 피해
  static speed = 90;    // 이동 속도 px/s
  static isBoss = false;

  // 매 프레임 행동 방식 - 기본: 플레이어를 향해 직진 추적. 다른 패턴은 이 메서드만 오버라이드하면 됨
  static behavior(scene, mob, delta) {
    const angle = Phaser.Math.Angle.Between(mob.x, mob.y, scene.player.x, scene.player.y);
    scene.physics.velocityFromRotation(angle, this.speed, mob.body.velocity);
  }

  // 처치됐을 때 특수 동작 (기본: 없음). 보스의 상자 드랍처럼 필요할 때만 오버라이드.
  static onDeath(scene, mob) {}

  static scoreValue() {
    return this.isBoss ? 20 : 1;
  }
}
