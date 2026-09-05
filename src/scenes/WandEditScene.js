import Phaser from 'phaser';
import { WANDS } from '../data/wands/index.js';
import { wandColor } from '../data/wands/colors.js';
import { getOrder, setOrder, getLevel, isTestMode, appendWand, removeAt, setLevel } from '../state/loadout.js';

const ROW_HEIGHT = 70;
const START_Y = 120;
const WAND_SEGMENT_WIDTH = 90;

export default class WandEditScene extends Phaser.Scene {
  constructor() {
    super('WandEdit');
  }

  create() {
    const { width, height } = this.scale;
    this.wandSegmentX = width - 40 - WAND_SEGMENT_WIDTH / 2;
    this.testMode = isTestMode();

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    this.add.text(width / 2, 50, '지팡이 순서 편집', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

    const closeBtn = this.add.text(width - 20, 20, '닫기', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeEditor());

    const wandsById = new Map(WANDS.map((w) => [w.id, w]));
    this.slots = getOrder().map((id, i) => this.createSlot(wandsById.get(id), i, width));

    if (this.testMode) {
      const addBtn = this.add.text(width / 2, START_Y + this.slots.length * ROW_HEIGHT + 20, '+ 지팡이 추가', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#3a7f5f',
        padding: { x: 14, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      addBtn.on('pointerdown', () => {
        this.scene.launch('WandPicker', {
          onPick: (id) => {
            appendWand(id);
            this.scene.restart();
          }
        });
      });
    }

    this.input.on('drag', (pointer, obj, dragX, dragY) => {
      const y = Phaser.Math.Clamp(dragY, START_Y, START_Y + (this.slots.length - 1) * ROW_HEIGHT);
      obj.y = y;
      obj.nameText.y = y;
      obj.wandRect.y = y;
    });

    this.input.on('dragstart', (pointer, obj) => {
      obj.setDepth(1);
      obj.nameText.setDepth(1);
      obj.wandRect.setDepth(1);
    });
    this.input.on('dragend', () => this.reorderSlots());
  }

  createSlot(wand, index, width) {
    const y = START_Y + index * ROW_HEIGHT;
    const level = getLevel(wand.id);
    const displayName = level > 1 ? `${wand.name} Lv.${level}` : wand.name;

    const wandRect = this.add.rectangle(this.wandSegmentX, y, WAND_SEGMENT_WIDTH, ROW_HEIGHT, wandColor(wand.id));
    const nameText = this.add.text(this.testMode ? 60 : 40, y, displayName, { fontSize: '18px', color: '#ffffff' }).setOrigin(0, 0.5);

    const box = this.add.rectangle(width / 2, y, width - 40, ROW_HEIGHT, 0xffffff, 0)
      .setInteractive({ draggable: true, useHandCursor: true });
    box.wandId = wand.id;
    box.nameText = nameText;
    box.wandRect = wandRect;

    if (this.testMode) {
      const removeBtn = this.add.text(24, y, '✕', { fontSize: '18px', color: '#ff6666' })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      removeBtn.on('pointerdown', () => {
        removeAt(this.slots.indexOf(box));
        this.scene.restart();
      });

      const levelDown = this.add.text(this.wandSegmentX - WAND_SEGMENT_WIDTH / 2 - 24, y, '-', {
        fontSize: '18px', color: '#ffffff', backgroundColor: '#3a3f4b', padding: { x: 6, y: 2 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      levelDown.on('pointerdown', () => {
        setLevel(wand.id, getLevel(wand.id) - 1);
        this.scene.restart();
      });

      const levelUp = this.add.text(this.wandSegmentX + WAND_SEGMENT_WIDTH / 2 + 24, y, '+', {
        fontSize: '18px', color: '#ffffff', backgroundColor: '#3a3f4b', padding: { x: 6, y: 2 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      levelUp.on('pointerdown', () => {
        setLevel(wand.id, getLevel(wand.id) + 1);
        this.scene.restart();
      });
    }

    return box;
  }

  reorderSlots() {
    // y가 같으면(맨 위/아래로 끝까지 끌었을 때) 드래그 중이던 슬롯(depth 1)을 우선시
    this.slots.sort((a, b) => (a.y - b.y) || (b.depth - a.depth));
    this.slots.forEach((slot, i) => {
      const y = START_Y + i * ROW_HEIGHT;
      slot.setDepth(0);
      slot.nameText.setDepth(0);
      slot.wandRect.setDepth(0);
      slot.y = y;
      slot.nameText.y = y;
      slot.wandRect.y = y;
    });
    setOrder(this.slots.map((slot) => slot.wandId));
  }

  closeEditor() {
    this.scene.stop();
    this.scene.resume('Game');
  }
}
