import Phaser from 'phaser';
import { WANDS } from '../data/wands/index.js';
import { acquireWand, resetLoadout, setTestMode } from '../state/loadout.js';

const CHOICE_COUNT = 3;
const CARD_WIDTH = 150;
const CARD_HEIGHT = 120;
const CARD_GAP = 24;

export default class WandChoiceScene extends Phaser.Scene {
  constructor() {
    super('WandChoice');
  }

  create(data) {
    this.mode = data?.mode === 'start' ? 'start' : 'pickup';
    const { width, height } = this.scale;
    const centerY = height / 2 + 80;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85).setInteractive();
    const title = this.mode === 'start' ? '지팡이를 하나 선택하세요' : '상자 획득!\n지팡이 하나를 선택하세요';
    this.add.text(width / 2, 100, title, {
      fontSize: '22px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const picks = Phaser.Utils.Array.Shuffle(WANDS.slice()).slice(0, CHOICE_COUNT);
    const totalWidth = picks.length * CARD_WIDTH + (picks.length - 1) * CARD_GAP;
    const startX = width / 2 - totalWidth / 2 + CARD_WIDTH / 2;

    this.locked = true;
    const allNames = WANDS.map((w) => w.name);

    picks.forEach((wand, i) => {
      const x = startX + i * (CARD_WIDTH + CARD_GAP);
      const card = this.add.rectangle(x, centerY, CARD_WIDTH, CARD_HEIGHT, 0x3a3f4b);
      card.on('pointerover', () => card.setFillStyle(0x4a4f5b));
      card.on('pointerout', () => card.setFillStyle(0x3a3f4b));
      card.on('pointerdown', () => this.choose(wand.id));

      this.spinCard(card, x, centerY, wand.name, allNames, i * 150);
    });
  }

  // 릴이 위->아래로 굴러가다 최종 이름에서 멈추는 슬롯머신 연출.
  spinCard(card, x, centerY, finalName, allNames, startDelay) {
    const ROW_H = CARD_HEIGHT;
    const FILLER_COUNT = 14;

    const names = [];
    for (let i = 0; i < FILLER_COUNT; i += 1) names.push(Phaser.Utils.Array.GetRandom(allNames));
    names.push(finalName);
    const rowCount = names.length;

    const reel = this.add.container(x, centerY);
    names.forEach((name, i) => {
      reel.add(this.add.text(0, -i * ROW_H, name, { fontSize: '18px', color: '#ffffff', align: 'center' }).setOrigin(0.5));
    });

    const maskShape = this.make.graphics({}, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(x - CARD_WIDTH / 2, centerY - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT);
    reel.setMask(maskShape.createGeometryMask());

    this.time.delayedCall(startDelay, () => {
      this.tweens.add({
        targets: reel,
        y: centerY + (rowCount - 1) * ROW_H,
        duration: 1400,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          card.setInteractive({ useHandCursor: true });
          this.tweens.add({ targets: card, scale: { from: 1.15, to: 1 }, duration: 180, ease: 'Back.Out' });
        }
      });
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
