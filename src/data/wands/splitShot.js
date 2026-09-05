export default {
  id: 'splitShot',
  name: '분열탄',
  spawnTiming: 'onHit',
  seedChild(effect) {
    return { ...effect, damage: Math.max(1, Math.round(effect.damage / 2)), projectileCount: 2 };
  },
  apply(effect) {
    return { ...effect, splitOnHit: true };
  }
};
