import Phaser from 'phaser';

export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super('Lobby');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2 - 40, 'Best Wand', {
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(20, 20, 'Player', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0, 0);

    const settingsBtn = this.add.text(width - 20, 20, '설정', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 14, y: 8 }
    })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    settingsBtn.on('pointerover', () => settingsBtn.setStyle({ backgroundColor: '#4a5063' }));
    settingsBtn.on('pointerout', () => settingsBtn.setStyle({ backgroundColor: '#3a3f4b' }));
    settingsBtn.on('pointerdown', () => this.scene.start('Settings'));

    const button = this.add.text(width / 2, height - 80, 'Game Start', {
      fontSize: '28px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 24, y: 12 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setStyle({ backgroundColor: '#4a5063' }));
    button.on('pointerout', () => button.setStyle({ backgroundColor: '#3a3f4b' }));
    button.on('pointerdown', () => this.scene.start('WandChoice', { mode: 'start' }));

    const testBtn = this.add.text(button.getBounds().left - 20, height - 80, 'Test', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 20, y: 10 }
    })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    testBtn.on('pointerover', () => testBtn.setStyle({ backgroundColor: '#4a5063' }));
    testBtn.on('pointerout', () => testBtn.setStyle({ backgroundColor: '#3a3f4b' }));
    testBtn.on('pointerdown', () => this.scene.start('TestLoadout'));

    const codexBtn = this.add.text(button.getBounds().right + 20, height - 80, '도감', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 20, y: 10 }
    })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    codexBtn.on('pointerover', () => codexBtn.setStyle({ backgroundColor: '#4a5063' }));
    codexBtn.on('pointerout', () => codexBtn.setStyle({ backgroundColor: '#3a3f4b' }));
    codexBtn.on('pointerdown', () => this.scene.start('Codex'));
  }
}
