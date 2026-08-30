import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 실제 에셋 로드는 다음 에이전트가 채워넣음
  }

  create() {
    this.scene.start('Game');
  }
}
