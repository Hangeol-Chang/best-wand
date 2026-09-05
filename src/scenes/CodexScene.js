import Phaser from 'phaser';
import { WANDS } from '../data/wands/index.js';
import { createBaseEffect } from '../systems/wandChain.js';

const SLOT_HEIGHT = 64;
const START_Y = 100;

const FIELD_LABELS = {
  damage: '피해량',
  speed: '속도',
  fireRateMs: '발사 간격(ms)',
  fireRateMultiplier: '연사 배율',
  projectileCount: '투사체 수',
  burn: '화상',
  splitOnHit: '피격 시 분열',
  homing: '유도',
  freeze: '빙결'
};

function describeWand(wand) {
  const lines = [];

  if (wand.baseStats) {
    lines.push('기본 스탯 (체인 첫 번째일 때만 적용)');
    for (const key of Object.keys(wand.baseStats)) {
      lines.push(`  ${FIELD_LABELS[key] ?? key}: ${wand.baseStats[key]}`);
    }
  }

  const base = createBaseEffect();
  const result = wand.apply(base);

  if (Array.isArray(result)) {
    lines.push('효과: 발사체를 2갈래로 분기');
    return lines;
  }

  for (const key of Object.keys(FIELD_LABELS)) {
    if (result[key] === base[key]) continue;
    const label = FIELD_LABELS[key];
    if (typeof result[key] === 'boolean') {
      lines.push(`${label}: 부여`);
    } else if (key === 'projectileCount' || key === 'fireRateMultiplier') {
      const ratio = result[key] / base[key];
      lines.push(`${label}: x${ratio}`);
    } else {
      const diff = result[key] - base[key];
      lines.push(`${label}: ${diff > 0 ? '+' : ''}${diff}`);
    }
  }
  return lines.length ? lines : ['효과 없음'];
}

export default class CodexScene extends Phaser.Scene {
  constructor() {
    super('Codex');
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x111318, 1);
    this.add.text(width / 2, 40, '지팡이 도감', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

    const closeBtn = this.add.text(width - 20, 20, '닫기', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.scene.start('Lobby'));

    WANDS.forEach((wand, i) => {
      const y = START_Y + i * SLOT_HEIGHT;
      const box = this.add.rectangle(width / 2, y, width - 40, SLOT_HEIGHT - 10, 0x3a3f4b)
        .setInteractive({ useHandCursor: true });
      this.add.text(width / 2, y, wand.name, { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
      box.on('pointerover', () => box.setFillStyle(0x4a5063));
      box.on('pointerout', () => box.setFillStyle(0x3a3f4b));
      box.on('pointerdown', () => this.showDetail(wand));
    });
  }

  showDetail(wand) {
    const { width, height } = this.scale;

    const overlay = this.add.container(0, 0);
    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
      .setInteractive();
    const panel = this.add.rectangle(width / 2, height / 2, width - 60, 260, 0x2a2f3b);
    const title = this.add.text(width / 2, height / 2 - 100, wand.name, {
      fontSize: '26px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const lines = describeWand(wand);
    const body = this.add.text(width / 2, height / 2 - 50, lines.join('\n'), {
      fontSize: '18px',
      color: '#dddddd',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5, 0);

    const closeBtn = this.add.text(width / 2, height / 2 + 100, '닫기', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    overlay.add([dim, panel, title, body, closeBtn]);
    closeBtn.on('pointerdown', () => overlay.destroy());
    dim.on('pointerdown', () => overlay.destroy());
  }
}
