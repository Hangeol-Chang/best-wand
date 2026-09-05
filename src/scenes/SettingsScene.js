import Phaser from 'phaser';

const VOLUME_KEY = 'bw_volume';
const TRACK_WIDTH = 300;

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  init(data) {
    this.fromGame = data?.from === 'Game';
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x111318, this.fromGame ? 0.9 : 1);
    this.add.text(width / 2, 40, '설정', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

    const closeBtn = this.add.text(width - 20, 20, '닫기', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());

    if (this.fromGame) this.createGameButtons(width, height);

    this.add.text(width / 2, height / 2 - 40, '소리 크기', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);

    const trackX = width / 2 - TRACK_WIDTH / 2;
    const trackY = height / 2;

    this.add.rectangle(width / 2, trackY, TRACK_WIDTH, 6, 0x3a3f4b);

    const savedVolume = Number(localStorage.getItem(VOLUME_KEY) ?? this.sound.volume ?? 1);
    this.sound.volume = savedVolume;

    const handle = this.add.circle(trackX + savedVolume * TRACK_WIDTH, trackY, 12, 0xffffff)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.input.setDraggable(handle);
    this.input.on('drag', (pointer, obj, dragX) => {
      if (obj !== handle) return;
      const clampedX = Phaser.Math.Clamp(dragX, trackX, trackX + TRACK_WIDTH);
      handle.x = clampedX;
      const volume = (clampedX - trackX) / TRACK_WIDTH;
      this.sound.volume = volume;
      localStorage.setItem(VOLUME_KEY, String(volume));
    });
  }

  createGameButtons(width, height) {
    const y = height / 2 + 80;

    const restartBtn = this.add.text(width / 2 - 90, y, '재시작', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover', () => restartBtn.setStyle({ backgroundColor: '#4a5063' }));
    restartBtn.on('pointerout', () => restartBtn.setStyle({ backgroundColor: '#3a3f4b' }));
    restartBtn.on('pointerdown', () => {
      this.scene.stop('Game');
      this.scene.start('WandChoice', { mode: 'start' });
    });

    const lobbyBtn = this.add.text(width / 2 + 90, y, '로비로', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    lobbyBtn.on('pointerover', () => lobbyBtn.setStyle({ backgroundColor: '#4a5063' }));
    lobbyBtn.on('pointerout', () => lobbyBtn.setStyle({ backgroundColor: '#3a3f4b' }));
    lobbyBtn.on('pointerdown', () => {
      this.scene.stop('Game');
      this.scene.start('Lobby');
    });
  }

  close() {
    if (this.fromGame) {
      this.scene.stop();
      this.scene.resume('Game');
    } else {
      this.scene.start('Lobby');
    }
  }
}
