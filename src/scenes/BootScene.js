import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.spritesheet('character', 'character.png', { frameWidth: 418, frameHeight: 418 });
  }

  create() {
    this.scene.start('Lobby');
  }
}
