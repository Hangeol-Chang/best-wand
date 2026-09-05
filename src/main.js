import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import LobbyScene from './scenes/LobbyScene.js';
import GameScene from './scenes/GameScene.js';
import WandEditScene from './scenes/WandEditScene.js';
import WandChoiceScene from './scenes/WandChoiceScene.js';
import CodexScene from './scenes/CodexScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import TestLoadoutScene from './scenes/TestLoadoutScene.js';
import WandPickerScene from './scenes/WandPickerScene.js';
import HistoryScene from './scenes/HistoryScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 540,
  height: 960,
  backgroundColor: '#111318',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, LobbyScene, GameScene, WandEditScene, WandChoiceScene, CodexScene, SettingsScene, TestLoadoutScene, WandPickerScene, HistoryScene]
});
