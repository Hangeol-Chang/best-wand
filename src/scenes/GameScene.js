import Phaser from 'phaser';
import { WANDS } from '../data/wands.js';
import { resolveWandChain, createBaseEffect } from '../systems/wandChain.js';

const WORLD_W = 960;
const WORLD_H = 540;
const PLAYER_SPEED = 220;
const MOB_SPEED = 90;
const FIRE_INTERVAL_MS = 600;
const MOB_SPAWN_INTERVAL_MS = 900;
const MOB_HP = 20;
const MOB_CONTACT_DAMAGE = 10;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.hp = 100;
    this.score = 0;
    this.gameOver = false;

    this.player = this.add.circle(WORLD_W / 2, WORLD_H / 2, 12, 0x4fd1c5);
    this.physics.add.existing(this.player);
    this.player.body.setCircle(12);
    this.player.body.setCollideWorldBounds(true);

    this.projectiles = this.physics.add.group();
    this.mobs = this.physics.add.group();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    this.hud = this.add.text(10, 10, '', { color: '#ffffff', fontSize: '14px' });
    this.updateHud();

    this.physics.add.overlap(this.projectiles, this.mobs, (proj, mob) => this.onProjectileHitMob(proj, mob));
    this.physics.add.overlap(this.player, this.mobs, (player, mob) => this.onMobHitPlayer(mob));

    this.time.addEvent({ delay: FIRE_INTERVAL_MS, loop: true, callback: () => this.fireWandChain() });
    this.time.addEvent({ delay: MOB_SPAWN_INTERVAL_MS, loop: true, callback: () => this.spawnMob() });
  }

  update() {
    if (this.gameOver) return;
    this.handleMovement();
  }

  handleMovement() {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    const vec = new Phaser.Math.Vector2(
      (right ? 1 : 0) - (left ? 1 : 0),
      (down ? 1 : 0) - (up ? 1 : 0)
    ).normalize().scale(PLAYER_SPEED);

    this.player.body.setVelocity(vec.x, vec.y);
  }

  findNearestMob() {
    let nearest = null;
    let nearestDistSq = Infinity;
    this.mobs.children.iterate((mob) => {
      if (!mob || !mob.active) return;
      const d = Phaser.Math.Distance.Squared(this.player.x, this.player.y, mob.x, mob.y);
      if (d < nearestDistSq) {
        nearestDistSq = d;
        nearest = mob;
      }
    });
    return nearest;
  }

  fireWandChain() {
    if (this.gameOver) return;
    const target = this.findNearestMob();
    if (!target) return;

    const effect = resolveWandChain(WANDS, createBaseEffect());
    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const count = effect.projectileCount;
    const spread = Phaser.Math.DegToRad(15);

    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : spread * (i - (count - 1) / 2);
      this.spawnProjectile(this.player.x, this.player.y, baseAngle + offset, effect);
    }
  }

  spawnProjectile(x, y, angle, effect) {
    let proj = this.projectiles.getFirstDead(false);
    if (!proj) {
      proj = this.add.circle(0, 0, 5, 0xf6ad55);
      this.physics.add.existing(proj);
      proj.body.setCircle(5);
      this.projectiles.add(proj);
    }
    proj.setActive(true).setVisible(true);
    proj.body.enable = true;
    proj.setPosition(x, y);
    proj.damage = effect.damage;
    proj.burn = effect.burn;
    this.physics.velocityFromRotation(angle, effect.speed, proj.body.velocity);

    this.time.delayedCall(1500, () => this.deactivate(proj));
  }

  spawnMob() {
    if (this.gameOver) return;
    let mob = this.mobs.getFirstDead(false);
    if (!mob) {
      mob = this.add.circle(0, 0, 14, 0xe53e3e);
      this.physics.add.existing(mob);
      mob.body.setCircle(14);
      this.mobs.add(mob);
    }
    mob.setActive(true).setVisible(true);
    mob.body.enable = true;
    mob.hp = MOB_HP;

    const edge = Phaser.Math.Between(0, 3);
    const pos =
      edge === 0 ? { x: 0, y: Phaser.Math.Between(0, WORLD_H) } :
      edge === 1 ? { x: WORLD_W, y: Phaser.Math.Between(0, WORLD_H) } :
      edge === 2 ? { x: Phaser.Math.Between(0, WORLD_W), y: 0 } :
      { x: Phaser.Math.Between(0, WORLD_W), y: WORLD_H };
    mob.setPosition(pos.x, pos.y);

    const angle = Phaser.Math.Angle.Between(pos.x, pos.y, this.player.x, this.player.y);
    this.physics.velocityFromRotation(angle, MOB_SPEED, mob.body.velocity);
  }

  onProjectileHitMob(proj, mob) {
    if (!proj.active || !mob.active) return;
    mob.hp -= proj.damage + (proj.burn ? 5 : 0);
    this.deactivate(proj);
    if (mob.hp <= 0) {
      this.deactivate(mob);
      this.score += 1;
      this.updateHud();
    }
  }

  onMobHitPlayer(mob) {
    if (this.gameOver || !mob.active) return;
    this.deactivate(mob);
    this.hp -= MOB_CONTACT_DAMAGE;
    this.updateHud();
    if (this.hp <= 0) this.endGame();
  }

  deactivate(obj) {
    obj.setActive(false).setVisible(false);
    obj.body.enable = false;
  }

  updateHud() {
    this.hud.setText(`HP: ${Math.max(this.hp, 0)}   Score: ${this.score}`);
  }

  endGame() {
    this.gameOver = true;
    this.add.text(WORLD_W / 2, WORLD_H / 2, 'GAME OVER', {
      color: '#ff5555',
      fontSize: '32px'
    }).setOrigin(0.5);
  }
}
