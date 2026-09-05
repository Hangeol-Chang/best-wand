import Phaser from 'phaser';
import { getOrderedWands } from '../state/loadout.js';
import { wandColor } from '../data/wands/colors.js';
import { resolveWandChain, createBaseEffect } from '../systems/wandChain.js';
import VirtualJoystick from '../systems/joystick.js';
import { pickMobType } from '../data/mobs/index.js';

const PLAYER_SPEED = 220;
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
const FREEZE_DURATION_MS = 1500;
const BRANCH_SPREAD_DEG = 30;
const FAN_SPREAD_DEG = 15;
const LASER_RANGE = 750;
const LASER_HIT_WIDTH = 16;
const LASER_COLOR = 0x66e0ff;
const ORBIT_RADIUS = 90;
const ORBIT_LAUNCH_SPEED = 260;
const METEOR_FALL_MS = 700;
const METEOR_SCATTER = 40;
const METEOR_COLOR = 0xff8800;
const CHEST_SIZE = 20;
const CHEST_COLOR = 0xffd700;

// 능력별 고유 색 - 여러 능력 조합 시 평균 혼합해서 표시
const BASE_PROJECTILE_COLOR = 0xf6ad55;
const ABILITY_COLORS = {
  burn: 0xff4d4d,
  splitOnHit: 0xb266ff,
  homing: 0x33ff99,
  freeze: 0x66ccff
};

function projectileColor(effect) {
  const active = Object.keys(ABILITY_COLORS).filter((key) => effect[key]);
  if (active.length === 0) return BASE_PROJECTILE_COLOR;
  let r = 0, g = 0, b = 0;
  active.forEach((key) => {
    const c = Phaser.Display.Color.IntegerToColor(ABILITY_COLORS[key]);
    r += c.red; g += c.green; b += c.blue;
  });
  return Phaser.Display.Color.GetColor(r / active.length, g / active.length, b / active.length);
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.hp = MAX_HP;
    this.score = 0;
    this.gameOver = false;

    this.createCheckerBackground();
    this.createParticleTexture();

    this.player = this.add.rectangle(0, 0, 16, 32, 0x4fd1c5);
    this.physics.add.existing(this.player);
    this.player.body.setSize(16, 32);

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

    this.laserGlowEmitter = this.add.particles(0, 0, 'spark', {
      speed: { min: 10, max: 40 },
      lifespan: 200,
      scale: { start: 0.9, end: 0 },
      tint: LASER_COLOR,
      blendMode: 'ADD',
      emitting: false
    });
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
    this.updateHomingProjectiles();
    this.updateOrbitProjectiles(delta);
    this.updateFiring(delta);
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
    return effect.fireRateMs * (effect.fireRateMultiplier ?? 1);
  }

  updateFiring(delta) {
    this.fireAccumulatorMs += delta;
    const interval = this.getFireIntervalMs();
    if (this.fireAccumulatorMs < interval) return;
    this.fireAccumulatorMs -= interval;
    this.fireWandChain();
  }

  updateHomingProjectiles() {
    this.projectiles.children.iterate((proj) => {
      if (!proj || !proj.active || !proj.homing) return;
      const target = proj.homingTarget;
      if (!target || !target.active) return;
      const angle = Phaser.Math.Angle.Between(proj.x, proj.y, target.x, target.y);
      proj.travelAngle = angle;
      this.physics.velocityFromRotation(angle, proj.speed, proj.body.velocity);
    });
  }

  handleMovement() {
    if (this.joystick.active) {
      const vec = this.joystick.getVector();
      this.player.body.setVelocity(vec.x * PLAYER_SPEED, vec.y * PLAYER_SPEED);
      return;
    }

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
    const wands = getOrderedWands();
    const effects = resolveWandChain(wands, createBaseEffect());
    const weaponType = effects[0]?.weaponType || 'projectile';

    if (weaponType === 'orbit') {
      this.launchOrbitEffects(effects);
      return;
    }

    if (weaponType === 'meteor') {
      this.launchMeteorEffects(effects);
      return;
    }

    const target = this.findNearestMob();
    if (!target) return;
    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    this.launchEffects(this.player.x, this.player.y, baseAngle, effects);
  }

  // effects 배열을 갈래(branch)로 부채꼴 배치하고, 항목별 projectileCount만큼 또 부채꼴로 나눠서
  // callback(effect, angle)을 호출함. 프로젝타일/레이저 등 발사 방식이 달라도 이 배치 로직은 공유.
  forEachShot(baseAngle, effects, callback) {
    const branchSpread = Phaser.Math.DegToRad(BRANCH_SPREAD_DEG);
    const fanSpread = Phaser.Math.DegToRad(FAN_SPREAD_DEG);

    effects.forEach((effect, branchIndex) => {
      const branchAngle = baseAngle + (effects.length === 1 ? 0 : branchSpread * (branchIndex - (effects.length - 1) / 2));
      const count = effect.projectileCount || 1;
      for (let i = 0; i < count; i++) {
        const offset = count === 1 ? 0 : fanSpread * (i - (count - 1) / 2);
        callback(effect, branchAngle + offset);
      }
    });
  }

  // 적중 시 생성되는 자식 탄(effect.onHit)도 이 함수로 그대로 재사용됨.
  // effect.weaponType은 그 탄이 속한 구간의 첫 지팡이가 정한 것 - 자식 탄이 레이저면 여기서 레이저로 나감.
  launchEffects(x, y, baseAngle, effects) {
    this.forEachShot(baseAngle, effects, (effect, angle) => {
      if (effect.weaponType === 'laser') {
        this.fireLaserBeam(x, y, angle, effect);
      } else {
        this.spawnProjectile(x, y, angle, effect);
      }
    });
  }

  // 오빗 지팡이: 수명 없이 계속 도니까, 매 발사마다 새로 쏘는 게 아니라 목표 개수(projectileCount)에서
  // 모자란 만큼만(적중으로 없어진 것 등) 채워 넣음. 부채꼴 조준 없이 원 위에 고르게 배치.
  launchOrbitEffects(effects) {
    effects.forEach((effect) => {
      const desiredCount = effect.projectileCount || 1;
      const currentCount = this.countActiveOrbitProjectiles();
      for (let i = currentCount; i < desiredCount; i++) {
        this.spawnOrbitProjectile(effect, (Math.PI * 2 * i) / desiredCount);
      }
    });
  }

  countActiveOrbitProjectiles() {
    let count = 0;
    this.projectiles.children.iterate((proj) => {
      if (proj && proj.active && (proj.orbit || proj.orbitLaunching)) count += 1;
    });
    return count;
  }

  // 조준/부채꼴 없이 effects별 projectileCount개를 원 위에 고르게 뿌림.
  // 메테오 폭발 지점에서 onHit(분열탄 등) 자식 탄을 한 번에 사방으로 날릴 때 씀 (방향성이 없으니 launchEffects의 부채꼴 대신 원형 배치)
  launchEffectsRadial(x, y, effects) {
    effects.forEach((effect) => {
      const count = effect.projectileCount || 1;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        if (effect.weaponType === 'laser') {
          this.fireLaserBeam(x, y, angle, effect);
        } else {
          this.spawnProjectile(x, y, angle, effect);
        }
      }
    });
  }

  // 메테오: 조준 없이 가장 가까운 몹 근처(없으면 플레이어 근처) 좌표를 골라 낙하 예고 후 지연 폭발시킴
  launchMeteorEffects(effects) {
    const target = this.findNearestMob();
    effects.forEach((effect) => {
      const count = effect.projectileCount || 1;
      for (let i = 0; i < count; i++) {
        const originX = target ? target.x : this.player.x;
        const originY = target ? target.y : this.player.y;
        const x = originX + Phaser.Math.Between(-METEOR_SCATTER, METEOR_SCATTER);
        const y = originY + Phaser.Math.Between(-METEOR_SCATTER, METEOR_SCATTER);
        this.spawnMeteor(x, y, effect);
      }
    });
  }

  // 낙하 예고(그림자 + 떨어지는 돌) 연출 후 METEOR_FALL_MS 뒤 폭발
  spawnMeteor(x, y, effect) {
    const impactRadius = effect.impactRadius || 70;
    const boltRadius = effect.projectileRadius ?? 14;
    const shadow = this.add.ellipse(x, y, impactRadius * 2, impactRadius, 0x000000, 0.35);
    const bolt = this.add.circle(x, y - 260, boltRadius, METEOR_COLOR);

    this.tweens.add({
      targets: bolt,
      y,
      duration: METEOR_FALL_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        bolt.destroy();
        shadow.destroy();
        this.explodeMeteor(x, y, effect);
      }
    });
  }

  // 메테오 폭발: 반경 내 몹 전부에게 데미지 적용, 그 다음 폭발 지점 한 곳에서만 onHit(분열탄 등) 자식 탄 트리거
  explodeMeteor(x, y, effect) {
    const radius = effect.impactRadius || 70;
    this.mobHitEmitter.explode(16, x, y);
    const fx = this.add.circle(x, y, radius, METEOR_COLOR, 0.5);
    this.tweens.add({ targets: fx, alpha: 0, scale: 1.3, duration: 250, onComplete: () => fx.destroy() });

    this.mobs.children.iterate((mob) => {
      if (!mob || !mob.active) return;
      const dist = Phaser.Math.Distance.Between(mob.x, mob.y, x, y);
      if (dist > radius + mob.body.width / 2) return;
      this.damageMob(mob, effect.damage + (effect.burn ? 5 : 0), mob.x, mob.y, effect.freeze);
    });

    if (effect.onHit) {
      this.launchEffectsRadial(x, y, effect.onHit);
    }
  }

  // 즉시 판정되는 직선 빔. 경로에 걸리는 몹 전부를 맞히고, 각 몹마다 독립적으로 onHit이 트리거됨.
  fireLaserBeam(x, y, angle, effect) {
    const endX = x + Math.cos(angle) * LASER_RANGE;
    const endY = y + Math.sin(angle) * LASER_RANGE;
    this.drawLaserFx(x, y, endX, endY);

    this.mobs.children.iterate((mob) => {
      if (!mob || !mob.active) return;
      const dist = this.distanceToSegment(mob.x, mob.y, x, y, endX, endY);
      if (dist <= LASER_HIT_WIDTH / 2 + mob.body.width / 2) {
        this.applyHit(mob, effect, mob.x, mob.y, angle);
      }
    });
  }

  drawLaserFx(x1, y1, x2, y2) {
    const g = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(10, LASER_COLOR, 0.35);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(4, LASER_COLOR, 0.9);
    g.lineBetween(x1, y1, x2, y2);
    this.time.delayedCall(100, () => g.destroy());

    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const step = Math.max(1, Math.round(dist / 24));
    for (let i = 0; i <= step; i++) {
      const t = i / step;
      this.laserGlowEmitter.emitParticleAt(Phaser.Math.Linear(x1, x2, t), Phaser.Math.Linear(y1, y2, t), 1);
    }
  }

  distanceToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
    return Phaser.Math.Distance.Between(px, py, x1 + t * dx, y1 + t * dy);
  }

  // 프로젝타일/레이저 공통 적중 처리: 몹 하나 데미지 처리 + 그 자리에서 바로 자식 탄(onHit) 트리거.
  // (메테오처럼 여러 몹을 한 번에 때리고 자식 탄은 폭발 지점 한 번만 트리거하고 싶으면 damageMob만 따로 써야 함 - explodeMeteor 참고)
  applyHit(mob, effect, x, y, angle) {
    this.damageMob(mob, effect.damage + (effect.burn ? 5 : 0), x, y, effect.freeze);
    if (effect.onHit) {
      this.launchEffects(x, y, angle, effect.onHit);
    }
  }

  // 몹 하나에 데미지 적용 + 빙결 + 처치 판정만 함. 자식 탄(onHit) 트리거 여부/시점은 호출한 쪽 책임.
  damageMob(mob, amount, x, y, freeze) {
    if (!mob.active) return;
    mob.hp -= amount;
    this.mobHitEmitter.explode(8, x, y);

    if (freeze) {
      mob.frozenUntil = this.time.now + FREEZE_DURATION_MS;
      mob.setFillStyle(0x99e6ff);
      mob.body.setVelocity(0, 0);
    }

    if (mob.hp <= 0) {
      mob.type.onDeath(this, mob);
      this.deactivate(mob);
      this.score += mob.type.scoreValue();
      this.updateHud();
    }
  }

  spawnProjectile(x, y, angle, effect) {
    const radius = effect.projectileRadius ?? (effect.homing ? 7 : 5);
    let proj = this.projectiles.getFirstDead(false);
    if (!proj) {
      proj = this.add.circle(0, 0, radius, BASE_PROJECTILE_COLOR);
      this.physics.add.existing(proj);
      this.projectiles.add(proj);
    }
    proj.setActive(true).setVisible(true);
    proj.body.enable = true;
    proj.setPosition(x, y);
    proj.setRadius(radius);
    proj.body.setCircle(radius);
    proj.setFillStyle(projectileColor(effect));
    proj.setStrokeStyle(effect.onHit ? 2 : 0, 0x000000);
    proj.damage = effect.damage;
    proj.burn = effect.burn;
    proj.speed = effect.speed;
    proj.homing = !!effect.homing;
    proj.homingTarget = effect.homing ? this.findNearestMob() : null;
    proj.freeze = !!effect.freeze;
    proj.onHit = effect.onHit || null;
    proj.orbit = false;
    proj.orbitLaunching = false;
    proj.travelAngle = angle;
    this.physics.velocityFromRotation(angle, effect.speed, proj.body.velocity);

    if (proj.lifetimeTimer) proj.lifetimeTimer.remove();
    proj.lifetimeTimer = this.time.delayedCall(effect.lifetimeMs ?? 2200, () => this.deactivate(proj));
  }

  // 원 궤도를 도는 투사체. 플레이어 위치에서 해당 각도로 직선 발사되다가(launching) 궤도 반지름에
  // 도달하면 궤도 모드로 전환되어 그 뒤로는 플레이어 중심 각도만 진행시키며 위치를 재계산함
  spawnOrbitProjectile(effect, orbitAngle) {
    const radius = effect.projectileRadius ?? 5;
    let proj = this.projectiles.getFirstDead(false);
    if (!proj) {
      proj = this.add.circle(0, 0, radius, BASE_PROJECTILE_COLOR);
      this.physics.add.existing(proj);
      this.projectiles.add(proj);
    }
    proj.setActive(true).setVisible(true);
    proj.body.enable = true;
    proj.setRadius(radius);
    proj.body.setCircle(radius);
    proj.setFillStyle(projectileColor(effect));
    proj.setStrokeStyle(effect.onHit ? 2 : 0, 0x000000);
    proj.damage = effect.damage;
    proj.burn = effect.burn;
    proj.homing = false;
    proj.homingTarget = null;
    proj.freeze = !!effect.freeze;
    proj.onHit = effect.onHit || null;
    proj.orbit = false;
    proj.orbitLaunching = true;
    proj.orbitAngle = orbitAngle;
    proj.orbitRadius = ORBIT_RADIUS;
    proj.orbitSpeed = Phaser.Math.DegToRad(effect.speed);
    proj.travelAngle = orbitAngle;
    proj.body.reset(this.player.x, this.player.y);
    this.physics.velocityFromRotation(orbitAngle, ORBIT_LAUNCH_SPEED, proj.body.velocity);

    // 오빗은 수명 없음 - 적중하기 전까진 계속 돎 (launchOrbitEffects가 개수 채워넣는 방식으로 관리)
    if (proj.lifetimeTimer) {
      proj.lifetimeTimer.remove();
      proj.lifetimeTimer = null;
    }
  }

  updateOrbitProjectiles(delta) {
    this.projectiles.children.iterate((proj) => {
      if (!proj || !proj.active || (!proj.orbit && !proj.orbitLaunching)) return;

      if (proj.orbitLaunching) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, proj.x, proj.y);
        if (dist < proj.orbitRadius) return;
        proj.orbitLaunching = false;
        proj.orbit = true;
        proj.orbitAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, proj.x, proj.y);
        proj.body.setVelocity(0, 0);
      }

      proj.orbitAngle += proj.orbitSpeed * (delta / 1000);
      proj.travelAngle = proj.orbitAngle;
      const x = this.player.x + Math.cos(proj.orbitAngle) * proj.orbitRadius;
      const y = this.player.y + Math.sin(proj.orbitAngle) * proj.orbitRadius;
      proj.body.reset(x, y);
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
    mob.frozenUntil = 0;
    mob.type = MobType;
    mob.baseColor = MobType.color;

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
    this.scene.launch('WandChoice');
  }

  updateMobBehavior(delta) {
    const now = this.time.now;
    this.mobs.children.iterate((mob) => {
      if (!mob || !mob.active) return;
      if (mob.frozenUntil && now < mob.frozenUntil) {
        mob.body.setVelocity(0, 0);
        return;
      }
      if (mob.frozenUntil) {
        mob.frozenUntil = 0;
        mob.setFillStyle(mob.baseColor);
      }
      mob.type.behavior(this, mob, delta);
    });
  }

  onProjectileHitMob(proj, mob) {
    if (!proj.active || !mob.active) return;
    this.applyHit(mob, proj, proj.x, proj.y, proj.travelAngle);
    this.deactivate(proj);
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
