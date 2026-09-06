import Phaser from 'phaser';
import { getOrderedWands } from '../state/loadout.js';
import { wandColor } from '../data/wands/colors.js';
import { resolveWandChain, createBaseEffect } from '../systems/wandChain.js';
import VirtualJoystick from '../systems/joystick.js';
import { pickMobType } from '../data/mobs/index.js';
import { recordRun } from '../state/runHistory.js';

const PLAYER_SPEED = 220;
const PLAYER_DISPLAY_SIZE = 48;
const PLAYER_FRAME_SIZE = 418;
// 3x3 캐릭터 시트: 위쪽 행 = S계열(가운데가 정면 S), 가운데 행 = W/E, 아래쪽 행 = N계열. 중앙(4)은 미사용.
const DIR_FRAME = { SW: 0, S: 1, SE: 2, W: 3, E: 5, NW: 6, N: 7, NE: 8 };
const TILE_SIZE = 192;
const TILE_COLOR_A = 0x1a1d24;
const TILE_COLOR_B = 0x21242c;
const MOB_SPAWN_MARGIN = 60;
const MOB_SPAWN_INTERVAL_MS = 900;
const PLAYER_INVULN_MS = 500;
const MAX_HP = 100;
const HP_BAR_WIDTH = 160;
const HP_BAR_HEIGHT = 14;
const HIT_PARTICLE_COLOR = 0xe53e3e;
const CHEST_SIZE = 20;
const CHEST_COLOR = 0xffd700;
const MUZZLE_RADIUS = 28; // 도트 발사 시작점 - 플레이어 중앙이 아니라 이 반경의 원 경계, 발사 방향 쪽에서 나감

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.hp = MAX_HP;
    this.score = 0;
    this.kills = 0;
    this.maxHit = 0;
    this.gameOver = false;

    this.createCheckerBackground();
    this.createParticleTexture();

    this.player = this.physics.add.sprite(0, 0, 'character', DIR_FRAME.S);
    const playerScale = PLAYER_DISPLAY_SIZE / PLAYER_FRAME_SIZE;
    this.player.setScale(playerScale);
    this.player.body.setSize(PLAYER_FRAME_SIZE * 0.5, PLAYER_FRAME_SIZE * 0.7);
    this.player.body.setOffset(PLAYER_FRAME_SIZE * 0.25, PLAYER_FRAME_SIZE * 0.25);

    this.cameras.main.startFollow(this.player);

    this.projectiles = this.physics.add.group();
    this.mobs = this.physics.add.group();
    this.chests = this.physics.add.group();
    this.mobSpawnCount = 0;
    this.playerInvulnerableUntil = 0;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.joystick = new VirtualJoystick(this);

    this.hpBarBg = this.add.rectangle(10, 10, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x3a1a1a)
      .setOrigin(0, 0).setScrollFactor(0);
    this.hpBarFill = this.add.rectangle(10, 10, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0xe53e3e)
      .setOrigin(0, 0).setScrollFactor(0);
    this.hpText = this.add.text(14, 10 + HP_BAR_HEIGHT / 2, '', {
      color: '#ffffff',
      fontSize: '11px'
    }).setOrigin(0, 0.5).setScrollFactor(0);
    this.hud = this.add.text(10, 10 + HP_BAR_HEIGHT + 4, '', { color: '#ffffff', fontSize: '14px' }).setScrollFactor(0);
    this.updateHud();

    this.wandIconContainer = this.add.container(0, 0).setScrollFactor(0);
    this.renderWandUI();
    this.events.on('resume', () => this.renderWandUI());

    this.settingsBtn = this.add.text(this.scale.width - 10, 46, '설정', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#2a2f3b',
      padding: { x: 8, y: 4 }
    }).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.settingsBtn.on('pointerdown', () => this.openSettings());

    this.mobHitEmitter = this.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 160 },
      lifespan: 300,
      scale: { start: 0.8, end: 0 },
      tint: HIT_PARTICLE_COLOR,
      blendMode: 'ADD',
      emitting: false
    });
    this.playerHitEmitter = this.add.particles(0, 0, 'spark', {
      speed: { min: 80, max: 200 },
      lifespan: 350,
      scale: { start: 1, end: 0 },
      tint: 0xff5555,
      blendMode: 'ADD',
      emitting: false
    });

    this.physics.add.overlap(this.projectiles, this.mobs, (proj, mob) => this.onProjectileHitMob(proj, mob));
    this.physics.add.overlap(this.player, this.mobs, (player, mob) => this.onMobHitPlayer(mob));
    this.physics.add.overlap(this.player, this.chests, (player, chest) => this.onChestPickup(chest));

    this.fireAccumulatorMs = 0;
    this.time.addEvent({ delay: MOB_SPAWN_INTERVAL_MS, loop: true, callback: () => this.spawnMob() });
  }

  update(time, delta) {
    this.bg.tilePositionX = this.cameras.main.scrollX;
    this.bg.tilePositionY = this.cameras.main.scrollY;
    if (this.gameOver) return;
    this.handleMovement();
    this.updateMobBehavior(delta);
    this.updateFiring(delta);
    this.updateProjectileDecel(delta);
    this.updateProjectileHoming(delta);
    this.updateProjectileSpiral(delta);
    this.updatePlayerInvulnBlink(time);
  }

  updatePlayerInvulnBlink(time) {
    const invulnerable = time < this.playerInvulnerableUntil;
    this.player.setAlpha(invulnerable ? (Math.floor(time / 80) % 2 === 0 ? 1 : 0.3) : 1);
  }

  createCheckerBackground() {
    if (!this.textures.exists('checker')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(TILE_COLOR_A).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.fillStyle(TILE_COLOR_B).fillRect(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
      g.fillStyle(TILE_COLOR_B).fillRect(0, TILE_SIZE, TILE_SIZE, TILE_SIZE);
      g.fillStyle(TILE_COLOR_A).fillRect(TILE_SIZE, TILE_SIZE, TILE_SIZE, TILE_SIZE);
      g.generateTexture('checker', TILE_SIZE * 2, TILE_SIZE * 2);
      g.destroy();
    }
    this.bg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'checker')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10);
  }

  createParticleTexture() {
    if (this.textures.exists('spark')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff).fillCircle(4, 4, 4);
    g.generateTexture('spark', 8, 8);
    g.destroy();
  }

  getFireIntervalMs() {
    const effects = resolveWandChain(getOrderedWands(), createBaseEffect());
    const effect = effects[0] || createBaseEffect();
    return effect.fireRateMs;
  }

  updateFiring(delta) {
    this.fireAccumulatorMs += delta;
    const interval = this.getFireIntervalMs();
    if (this.fireAccumulatorMs < interval) return;
    this.fireAccumulatorMs -= interval;
    this.fireWandChain();
  }

  handleMovement() {
    if (this.joystick.active) {
      const vec = this.joystick.getVector();
      this.player.body.setVelocity(vec.x * PLAYER_SPEED, vec.y * PLAYER_SPEED);
      this.updatePlayerFacing(vec.x, vec.y);
      return;
    }

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    const dirX = (right ? 1 : 0) - (left ? 1 : 0);
    const dirY = (down ? 1 : 0) - (up ? 1 : 0);
    const vec = new Phaser.Math.Vector2(dirX, dirY).normalize().scale(PLAYER_SPEED);

    this.player.body.setVelocity(vec.x, vec.y);
    this.updatePlayerFacing(dirX, dirY);
  }

  updatePlayerFacing(dirX, dirY) {
    if (dirX === 0 && dirY === 0) return;
    const angle = Phaser.Math.RadToDeg(Math.atan2(dirY, dirX));
    let dir;
    if (angle >= -22.5 && angle < 22.5) dir = 'E';
    else if (angle >= 22.5 && angle < 67.5) dir = 'SE';
    else if (angle >= 67.5 && angle < 112.5) dir = 'S';
    else if (angle >= 112.5 && angle < 157.5) dir = 'SW';
    else if (angle >= -67.5 && angle < -22.5) dir = 'NE';
    else if (angle >= -112.5 && angle < -67.5) dir = 'N';
    else if (angle >= -157.5 && angle < -112.5) dir = 'NW';
    else dir = 'W';
    this.player.setFrame(DIR_FRAME[dir]);
  }

  findNearestMob(fromX = this.player.x, fromY = this.player.y) {
    let nearest = null;
    let nearestDistSq = Infinity;
    this.mobs.children.iterate((mob) => {
      if (!mob || !mob.active) return;
      const d = Phaser.Math.Distance.Squared(fromX, fromY, mob.x, mob.y);
      if (d < nearestDistSq) {
        nearestDistSq = d;
        nearest = mob;
      }
    });
    return nearest;
  }

  renderWandUI() {
    const iconW = 28;
    const iconH = 18;
    const y = 10 + iconH / 2;
    const rightEdge = this.scale.width - 10;

    this.wandIconContainer.removeAll(true);
    const wands = getOrderedWands();
    const count = Math.max(wands.length, 1);

    wands.forEach((wand, i) => {
      const x = rightEdge - iconW / 2 - (count - 1 - i) * iconW;
      const rect = this.add.rectangle(x, y, iconW, iconH, wandColor(wand.id))
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.openWandEditor());
      this.wandIconContainer.add(rect);
    });

    if (wands.length === 0) {
      const rect = this.add.rectangle(rightEdge - iconW / 2, y, iconW, iconH, 0x2a2f3b)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.openWandEditor());
      this.wandIconContainer.add(rect);
    }
  }

  openWandEditor() {
    this.scene.pause();
    this.scene.launch('WandEdit');
  }

  openSettings() {
    this.scene.pause();
    this.scene.launch('Settings', { from: 'Game' });
  }

  fireWandChain() {
    if (this.gameOver) return;
    const effects = resolveWandChain(getOrderedWands(), createBaseEffect());
    effects.forEach((effect) => this.fireEffect(effect));
  }

  // effect.radial이면 조준 없이 360도로, 아니면 가장 가까운 몹 방향 기준 spreadDeg 부채꼴로 quantity개 도트를 뿌림.
  // 적중 시 생성되는 자식 도트(effect.onHit)도 이 함수로 재사용됨.
  fireEffect(effect) {
    const count = Math.max(1, Math.round(effect.quantity));

    const jitter = Phaser.Math.DegToRad(effect.spreadJitterDeg);
    const jitterAngle = () => (jitter ? Phaser.Math.FloatBetween(-jitter / 2, jitter / 2) : 0);

    // clusterRadius가 있으면 한 점이 아니라 원판 안에 흩어진 위치에서 출발 - "덩어리째 발사"로 보이게 함
    const clusterOffset = () => {
      if (!effect.clusterRadius) return { x: 0, y: 0 };
      const r = effect.clusterRadius * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    };

    // 발사 각도 쪽 원 경계(MUZZLE_RADIUS)에서 출발 - 플레이어 중앙에서 튀어나오지 않게
    const muzzlePoint = (angle) => ({
      x: this.player.x + Math.cos(angle) * MUZZLE_RADIUS,
      y: this.player.y + Math.sin(angle) * MUZZLE_RADIUS
    });

    if (effect.radial) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + jitterAngle();
        const o = clusterOffset();
        const m = muzzlePoint(angle);
        this.spawnDot(m.x + o.x, m.y + o.y, angle, effect);
      }
      return;
    }

    const target = this.findNearestMob();
    if (!target) return;
    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const spread = Phaser.Math.DegToRad(effect.spreadDeg);
    for (let i = 0; i < count; i++) {
      const angle = (count === 1 ? baseAngle : baseAngle - spread / 2 + (spread * i) / (count - 1)) + jitterAngle();
      const o = clusterOffset();
      const m = muzzlePoint(angle);
      this.spawnDot(m.x + o.x, m.y + o.y, angle, effect);
    }
  }

  spawnDot(x, y, angle, effect) {
    // radius를 최대 크기로 두고 그 아래로만 랜덤 - radius * FloatBetween(1-jitter, 1)
    const jitteredRadius = effect.radiusJitter
      ? effect.radius * Phaser.Math.FloatBetween(1 - effect.radiusJitter, 1)
      : effect.radius;
    const size = Math.max(1, jitteredRadius * 2);
    let dot = this.projectiles.getFirstDead(false);
    if (!dot) {
      dot = this.add.rectangle(0, 0, size, size, effect.color);
      this.physics.add.existing(dot);
      this.projectiles.add(dot);
    }
    dot.setActive(true).setVisible(true);
    dot.body.enable = true;
    dot.setPosition(x, y);
    dot.setSize(size, size);
    dot.body.setSize(size, size);
    dot.setFillStyle(effect.color);
    dot.damage = effect.damage;
    dot.onHit = effect.onHit || null;
    dot.travelAngle = angle;
    dot.decel = effect.decel;
    dot.currentSpeed = effect.speed * (effect.speedJitter ? 1 + Phaser.Math.FloatBetween(-effect.speedJitter, effect.speedJitter) : 1);
    dot.age = 0;
    dot.homingDelayMs = effect.homingDelayMs;
    dot.homingAccel = effect.homingAccel;
    dot.homingTurnDeg = effect.homingTurnDeg;
    dot.homingTarget = undefined;
    dot.spiralRadius = effect.spiralRadius;
    dot.spiralDeg = effect.spiralDeg * Phaser.Math.FloatBetween(0.6, 1.4) * (Math.random() < 0.5 ? -1 : 1);
    dot.spiralPhase = Math.random() * Math.PI * 2;
    dot.forwardDist = 0;
    dot.spawnX = x;
    dot.spawnY = y;
    if (dot.spiralRadius) dot.body.velocity.set(0, 0);
    else this.physics.velocityFromRotation(angle, dot.currentSpeed, dot.body.velocity);

    if (dot.lifetimeTimer) dot.lifetimeTimer.remove();
    dot.lifetimeTimer = this.time.delayedCall(effect.lifetimeMs, () => this.deactivate(dot));
  }

  // decel이 있는 도트는 지수감쇠로 서서히 느려짐 (완전 정지는 아님) - lifetimeMs가 되면 자연스럽게 사라짐
  updateProjectileDecel(delta) {
    this.projectiles.children.iterate((dot) => {
      if (!dot || !dot.active || !dot.decel) return;
      dot.currentSpeed *= Math.exp(-dot.decel * (delta / 1000));
      this.physics.velocityFromRotation(dot.travelAngle, dot.currentSpeed, dot.body.velocity);
    });
  }

  // homingDelayMs 동안은 그대로 직진, 이후 가장 가까운 적 쪽으로 서서히 방향을 틀며 가속 (저격 유도탄용)
  updateProjectileHoming(delta) {
    this.projectiles.children.iterate((dot) => {
      if (!dot || !dot.active || (!dot.homingAccel && !dot.homingTurnDeg)) return;
      dot.age += delta;
      if (dot.age < dot.homingDelayMs) return;

      if (dot.homingTarget === undefined) {
        dot.homingTarget = this.findNearestMob(dot.x, dot.y);
        dot.homingTargetGen = dot.homingTarget ? dot.homingTarget.genId : null;
      }
      if (dot.homingTurnDeg && dot.homingTarget && dot.homingTarget.active && dot.homingTarget.genId === dot.homingTargetGen) {
        const targetAngle = Phaser.Math.Angle.Between(dot.x, dot.y, dot.homingTarget.x, dot.homingTarget.y);
        const step = Phaser.Math.DegToRad(dot.homingTurnDeg) * (delta / 1000);
        dot.travelAngle = Phaser.Math.Angle.RotateTo(dot.travelAngle, targetAngle, step);
      }
      if (dot.homingAccel) dot.currentSpeed += dot.homingAccel * (delta / 1000);
      this.physics.velocityFromRotation(dot.travelAngle, dot.currentSpeed, dot.body.velocity);
    });
  }

  // spiralRadius가 있으면 travelAngle 방향으로 등속 전진하는 "보이지 않는 중심점" 둘레를
  // spiralDeg 각속도로 실제 원형 궤도를 그리며 도는 것처럼 움직임 (쌍성 운동 느낌)
  updateProjectileSpiral(delta) {
    this.projectiles.children.iterate((dot) => {
      if (!dot || !dot.active || !dot.spiralRadius) return;
      const dt = delta / 1000;
      dot.forwardDist += dot.currentSpeed * dt;
      dot.spiralPhase += Phaser.Math.DegToRad(dot.spiralDeg) * dt;

      const angle = dot.travelAngle;
      const centerX = dot.spawnX + Math.cos(angle) * dot.forwardDist;
      const centerY = dot.spawnY + Math.sin(angle) * dot.forwardDist;
      dot.setPosition(
        centerX + Math.cos(dot.spiralPhase) * dot.spiralRadius,
        centerY + Math.sin(dot.spiralPhase) * dot.spiralRadius
      );
    });
  }

  spawnMob() {
    if (this.gameOver) return;
    this.mobSpawnCount += 1;
    this.spawnMobEntity(pickMobType(this.mobSpawnCount));
  }

  spawnMobEntity(MobType) {
    let mob = this.mobs.getFirstDead(false);
    if (!mob) {
      mob = this.add.rectangle(0, 0, MobType.size, MobType.size, MobType.color);
      this.physics.add.existing(mob);
      this.mobs.add(mob);
    }
    mob.setActive(true).setVisible(true);
    mob.body.enable = true;
    mob.setSize(MobType.size, MobType.size);
    mob.body.setSize(MobType.size, MobType.size);
    mob.setFillStyle(MobType.color);
    mob.hp = MobType.hp;
    mob.genId = (mob.genId ?? 0) + 1;
    mob.type = MobType;

    const halfW = this.cameras.main.width / 2 + MOB_SPAWN_MARGIN;
    const halfH = this.cameras.main.height / 2 + MOB_SPAWN_MARGIN;
    const edge = Phaser.Math.Between(0, 3);
    const pos =
      edge === 0 ? { x: this.player.x - halfW, y: this.player.y + Phaser.Math.Between(-halfH, halfH) } :
      edge === 1 ? { x: this.player.x + halfW, y: this.player.y + Phaser.Math.Between(-halfH, halfH) } :
      edge === 2 ? { x: this.player.x + Phaser.Math.Between(-halfW, halfW), y: this.player.y - halfH } :
      { x: this.player.x + Phaser.Math.Between(-halfW, halfW), y: this.player.y + halfH };
    mob.setPosition(pos.x, pos.y);
    return mob;
  }

  spawnChest(x, y) {
    const chest = this.add.rectangle(x, y, CHEST_SIZE, CHEST_SIZE, CHEST_COLOR);
    this.physics.add.existing(chest);
    this.chests.add(chest);
  }

  onChestPickup(chest) {
    chest.destroy();
    this.scene.pause();
    this.scene.launch('WandChoice', { mode: 'pickup' });
  }

  updateMobBehavior(delta) {
    this.mobs.children.iterate((mob) => {
      if (!mob || !mob.active) return;
      mob.type.behavior(this, mob, delta);
    });
  }

  onProjectileHitMob(dot, mob) {
    if (!dot.active || !mob.active) return;
    this.damageMob(mob, dot.damage, dot.x, dot.y);
    if (dot.onHit) this.fireEffectAt(dot.x, dot.y, dot.travelAngle, dot.onHit);
    this.deactivate(dot);
  }

  // onHit 자식 도트는 적중 지점에서 fireEffect와 동일한 방식(조준/부채꼴 또는 radial)으로 다시 뿌림.
  fireEffectAt(x, y, baseAngle, effects) {
    effects.forEach((effect) => {
      const count = Math.max(1, Math.round(effect.quantity));
      if (effect.radial) {
        for (let i = 0; i < count; i++) this.spawnDot(x, y, (Math.PI * 2 * i) / count, effect);
        return;
      }
      const spread = Phaser.Math.DegToRad(effect.spreadDeg);
      for (let i = 0; i < count; i++) {
        const angle = count === 1 ? baseAngle : baseAngle - spread / 2 + (spread * i) / (count - 1);
        this.spawnDot(x, y, angle, effect);
      }
    });
  }

  damageMob(mob, amount, x, y) {
    if (!mob.active) return;
    mob.hp -= amount;
    this.maxHit = Math.max(this.maxHit, amount);
    this.mobHitEmitter.explode(6, x, y);

    if (mob.hp <= 0) {
      mob.type.onDeath(this, mob);
      this.deactivate(mob);
      this.score += mob.type.scoreValue();
      this.kills += 1;
      this.updateHud();
    }
  }

  onMobHitPlayer(mob) {
    if (this.gameOver || !mob.active) return;
    if (this.time.now < this.playerInvulnerableUntil) return;

    const damage = mob.type.damage;
    this.playerHitEmitter.explode(10, this.player.x, this.player.y);
    this.playerInvulnerableUntil = this.time.now + PLAYER_INVULN_MS;
    this.hp -= damage;
    this.updateHud();
    if (this.hp <= 0) this.endGame();
  }

  deactivate(obj) {
    obj.setActive(false).setVisible(false);
    obj.body.enable = false;
    if (obj.lifetimeTimer) {
      obj.lifetimeTimer.remove();
      obj.lifetimeTimer = null;
    }
  }

  updateHud() {
    const hpRatio = Phaser.Math.Clamp(this.hp / MAX_HP, 0, 1);
    this.hpBarFill.width = HP_BAR_WIDTH * hpRatio;
    this.hpText.setText(`HP ${Math.max(this.hp, 0)} / ${MAX_HP}`);
    this.hud.setText(`Score: ${this.score}`);
  }

  endGame() {
    this.gameOver = true;
    const { width, height } = this.scale;

    recordRun({
      wands: getOrderedWands().map((w) => (w.level > 1 ? `${w.name} Lv.${w.level}` : w.name)),
      score: this.score,
      kills: this.kills,
      maxHit: this.maxHit
    });

    this.add.text(width / 2, height / 2 - 60, 'GAME OVER', {
      color: '#ff5555',
      fontSize: '32px'
    }).setOrigin(0.5).setScrollFactor(0);

    const restartBtn = this.add.text(width / 2 - 90, height / 2, '재시작', {
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerover', () => restartBtn.setStyle({ backgroundColor: '#4a5063' }));
    restartBtn.on('pointerout', () => restartBtn.setStyle({ backgroundColor: '#3a3f4b' }));
    restartBtn.on('pointerdown', () => this.scene.start('WandChoice', { mode: 'start' }));

    const lobbyBtn = this.add.text(width / 2 + 90, height / 2, '로비로', {
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#3a3f4b',
      padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });

    lobbyBtn.on('pointerover', () => lobbyBtn.setStyle({ backgroundColor: '#4a5063' }));
    lobbyBtn.on('pointerout', () => lobbyBtn.setStyle({ backgroundColor: '#3a3f4b' }));
    lobbyBtn.on('pointerdown', () => this.scene.start('Lobby'));
  }
}
