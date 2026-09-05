export default {
  id: 'split',
  name: '분열',
  spawnTiming: 'immediate',
  apply(effect) {
    return { ...effect, projectileCount: (effect.projectileCount || 1) * 2 };
  }
};
