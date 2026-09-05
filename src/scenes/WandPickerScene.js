import Phaser from 'phaser';
import { WANDS } from '../data/wands/index.js';

const ROW_HEIGHT = 50;
const START_Y = 90;

// Test 모드 전용: WandEditScene에서 "지팡이 추가"를 누르면 뜨는 전체 목록 선택창.
// data.onPick(id)로 고른 지팡이 id를 콜백해줌.
export default class WandPickerScene extends Phaser.Scene {
  constructor() {
    super('WandPicker');
  }

  create(data) {
    const { width, height } = this.scale;
    this.onPick = data?.onPick;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9).setInteractive();
    this.add.text(width / 2, 40, '추가할 지팡이 선택', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    const closeBtn = this.add.text(width - 20, 20, '닫기', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.scene.stop());

    WANDS.forEach((wand, i) => {
      const y = START_Y + i * ROW_HEIGHT;
      const box = this.add.rectangle(width / 2, y, width - 60, ROW_HEIGHT - 8, 0x3a3f4b)
        .setInteractive({ useHandCursor: true });
      this.add.text(width / 2, y, wand.name, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      box.on('pointerover', () => box.setFillStyle(0x4a5063));
      box.on('pointerout', () => box.setFillStyle(0x3a3f4b));
      box.on('pointerdown', () => {
        this.onPick?.(wand.id);
        this.scene.stop();
      });
    });
  }
}
