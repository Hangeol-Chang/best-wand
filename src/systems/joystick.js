import Phaser from 'phaser';

// 터치 시작 위치가 중심이 되는 가상 조이스틱. 손 떼면 중심 초기화.
export default class VirtualJoystick {
  constructor(scene, { maxRadius = 60 } = {}) {
    this.scene = scene;
    this.maxRadius = maxRadius;
    this.active = false;
    this.origin = new Phaser.Math.Vector2();
    this.vector = new Phaser.Math.Vector2();

    this.base = scene.add.circle(0, 0, maxRadius, 0xffffff, 0.15).setVisible(false).setDepth(100).setScrollFactor(0);
    this.thumb = scene.add.circle(0, 0, maxRadius * 0.5, 0xffffff, 0.35).setVisible(false).setDepth(100).setScrollFactor(0);

    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);

    scene.input.on('pointerdown', this.onDown);
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);

    scene.events.once('shutdown', () => this.destroy());
  }

  onDown(pointer, currentlyOver) {
    if (currentlyOver.length > 0) return; // UI 버튼 위 터치는 조이스틱으로 안 잡음
    this.active = true;
    this.origin.set(pointer.x, pointer.y);
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.thumb.setPosition(pointer.x, pointer.y).setVisible(true);
    this.vector.set(0, 0);
  }

  onMove(pointer) {
    if (!this.active) return;
    const dx = pointer.x - this.origin.x;
    const dy = pointer.y - this.origin.y;
    const dist = Math.min(Math.hypot(dx, dy), this.maxRadius);
    const angle = Math.atan2(dy, dx);
    this.thumb.setPosition(
      this.origin.x + Math.cos(angle) * dist,
      this.origin.y + Math.sin(angle) * dist
    );
    this.vector.set((Math.cos(angle) * dist) / this.maxRadius, (Math.sin(angle) * dist) / this.maxRadius);
  }

  onUp() {
    this.active = false;
    this.vector.set(0, 0);
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }

  getVector() {
    return this.vector;
  }

  destroy() {
    this.scene.input.off('pointerdown', this.onDown);
    this.scene.input.off('pointermove', this.onMove);
    this.scene.input.off('pointerup', this.onUp);
  }
}
