import Phaser from 'phaser';
import { WANDS } from '../data/wands/index.js';
import { acquireWand, resetLoadout, setTestMode } from '../state/loadout.js';

const CHOICE_COUNT = 3;
const CARD_WIDTH = 150;
const CARD_HEIGHT = 120;
const CARD_GAP = 24;
const ROW_HEIGHT = CARD_HEIGHT; // 창 높이 = 한 칸 높이: 항상 정확히 한 항목만 보이게
const ROW_MS = 140; // 빠른 구간에서 한 칸 지나가는 속도(일정)
const SLOW_ROWS = 5; // 마지막에 감속하며 멈추는 구간 길이
const SLOW_DURATION_MS = 650;
const FAST_ROWS_BASE = 10;
const FAST_ROWS_STEP = 6; // 카드(i)마다 더 오래 돌게 해서 순차적으로 멈추게 함

export default class WandChoiceScene extends Phaser.Scene {
  constructor() {
    super('WandChoice');
  }

  create(data) {
    this.mode = data?.mode === 'start' ? 'start' : 'pickup';
    const { width, height } = this.scale;
    const centerY = height / 2 + 80;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    const title = this.mode === 'start' ? '지팡이를 하나 선택하세요' : '상자 획득!\n지팡이 하나를 선택하세요';
    this.add.text(width / 2, 100, title, {
      fontSize: '22px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const picks = Phaser.Utils.Array.Shuffle(WANDS.slice()).slice(0, CHOICE_COUNT);
    const totalWidth = picks.length * CARD_WIDTH + (picks.length - 1) * CARD_GAP;
    const startX = width / 2 - totalWidth / 2 + CARD_WIDTH / 2;

    picks.forEach((wand, i) => {
      const x = startX + i * (CARD_WIDTH + CARD_GAP);
      this.buildReelCard(x, centerY, wand, i);
    });
  }

  buildReelCard(x, centerY, wand, index) {
    const card = this.add.rectangle(x, centerY, CARD_WIDTH, CARD_HEIGHT, 0x3a3f4b);

    const fastRows = FAST_ROWS_BASE + index * FAST_ROWS_STEP;
    const rowCount = fastRows + SLOW_ROWS;
    const names = [];
    for (let r = 0; r < rowCount - 1; r++) names.push(Phaser.Utils.Array.GetRandom(WANDS).name);
    names.push(wand.name);

    const strip = this.add.container(x, centerY);
    const texts = names.map((name, idx) => {
      const t = this.add.text(0, (idx - (rowCount - 1)) * ROW_HEIGHT, name, {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5);
      strip.add(t);
      return t;
    });

    const maskShape = this.make.graphics({}, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(x - CARD_WIDTH / 2, centerY - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT);
    strip.setMask(maskShape.createGeometryMask());

    const scrollDistance = (rowCount - 1) * ROW_HEIGHT;
    const slowDistance = SLOW_ROWS * ROW_HEIGHT;
    strip.y = centerY - scrollDistance;

    const finish = () => {
      texts.slice(0, -1).forEach((t) => t.destroy());
      strip.clearMask();
      maskShape.destroy();

      const finalLabel = texts[texts.length - 1];
      this.tweens.add({ targets: [card, finalLabel], scale: { from: 1.25, to: 1 }, duration: 150, ease: 'Back.Out' });
      card.setFillStyle(0x4a4f5b);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setFillStyle(0x5a5f6b));
      card.on('pointerout', () => card.setFillStyle(0x4a4f5b));
      card.on('pointerdown', () => this.choose(wand.id));
    };

    // 1단계: 일정한 빠른 속도로 여러 항목이 스쳐 지나감
    this.tweens.add({
      targets: strip,
      y: centerY - slowDistance,
      duration: (fastRows - 1) * ROW_MS,
      ease: 'Linear',
      onComplete: () => {
        // 2단계: 마지막 구간만 감속하며 정확히 멈춤
        this.tweens.add({
          targets: strip,
          y: centerY,
          duration: SLOW_DURATION_MS,
          ease: 'Cubic.easeOut',
          onComplete: finish
        });
      }
    });
  }

  choose(id) {
    if (this.mode === 'start') {
      resetLoadout();
      setTestMode(false);
      acquireWand(id);
      this.scene.stop();
      this.scene.start('Game');
      return;
    }
    acquireWand(id);
    this.scene.stop();
    this.scene.resume('Game');
  }
}
