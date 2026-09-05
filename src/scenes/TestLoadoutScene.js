import Phaser from 'phaser';
import { WANDS } from '../data/wands/index.js';
import { resetLoadout, acquireWand, setTestMode } from '../state/loadout.js';

const ROW_HEIGHT = 44;
const START_Y = 110;

// 테스트용: 지팡이를 원하는 만큼 골라 원하는 순서로 체이닝해서 바로 시작.
// 순서 재조정은 게임 시작 후 우측상단 UI(드래그 편집기)로 하면 됨.
export default class TestLoadoutScene extends Phaser.Scene {
  constructor() {
    super('TestLoadout');
  }

  create() {
    const { width, height } = this.scale;
    this.selected = [];

    this.add.text(width / 2, 40, '테스트: 지팡이 조합 선택', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(width / 2, 68, '탭한 순서대로 체이닝됨 (다시 탭하면 제거)', {
      fontSize: '13px',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    WANDS.forEach((wand, i) => {
      const y = START_Y + i * ROW_HEIGHT;
      const box = this.add.rectangle(width / 2, y, width - 60, ROW_HEIGHT - 8, 0x3a3f4b)
        .setInteractive({ useHandCursor: true });
      this.add.text(width / 2, y, wand.name, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      box.on('pointerdown', () => this.toggle(wand.id, box));
    });

    this.chainText = this.add.text(width / 2, height - 140, '', {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: width - 40 }
    }).setOrigin(0.5);

    const startBtn = this.add.text(width / 2 - 80, height - 60, '시작하기', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#3a7f5f',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startBtn.on('pointerdown', () => this.start());

    const backBtn = this.add.text(width / 2 + 80, height - 60, '취소', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('Lobby'));

    this.renderChain();
  }

  toggle(id, box) {
    const idx = this.selected.indexOf(id);
    if (idx >= 0) {
      this.selected.splice(idx, 1);
      box.setFillStyle(0x3a3f4b);
    } else {
      this.selected.push(id);
      box.setFillStyle(0x3a7f5f);
    }
    this.renderChain();
  }

  renderChain() {
    const names = this.selected.map((id) => WANDS.find((w) => w.id === id)?.name).join(' → ');
    this.chainText.setText(names || '(선택된 지팡이 없음)');
  }

  start() {
    resetLoadout();
    setTestMode(true);
    this.selected.forEach((id) => acquireWand(id));
    this.scene.start('Game');
  }
}
