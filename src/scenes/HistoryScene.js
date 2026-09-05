import Phaser from 'phaser';
import { getRuns } from '../state/runHistory.js';

const START_Y = 90;
const ROW_HEIGHT = 100;

export default class HistoryScene extends Phaser.Scene {
  constructor() {
    super('History');
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x111318, 1);
    this.add.text(width / 2, 40, '기록', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

    const closeBtn = this.add.text(width - 20, 20, '닫기', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.scene.start('Lobby'));

    const runs = getRuns();

    if (runs.length === 0) {
      this.add.text(width / 2, height / 2, '기록 없음', { fontSize: '18px', color: '#888888' }).setOrigin(0.5);
      return;
    }

    runs.forEach((run, i) => {
      const y = START_Y + i * ROW_HEIGHT;
      this.add.rectangle(width / 2, y + ROW_HEIGHT / 2 - 8, width - 40, ROW_HEIGHT - 16, 0x2a2f3b);

      const date = new Date(run.timestamp).toLocaleString();
      this.add.text(30, y, `#${runs.length - i}  ${date}`, { fontSize: '12px', color: '#9aa0ac' });
      this.add.text(30, y + 18, run.wands.join(' → ') || '지팡이 없음', {
        fontSize: '14px',
        color: '#ffffff',
        wordWrap: { width: width - 60 }
      });
      this.add.text(30, y + 58, `처치 ${run.kills}   최대 피해 ${run.maxHit}   점수 ${run.score}`, {
        fontSize: '13px',
        color: '#c8ccd4'
      });
    });
  }
}
