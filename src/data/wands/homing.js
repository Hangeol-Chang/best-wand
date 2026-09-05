export default {
  id: 'homing',
  name: '유도탄',
  apply(effect) {
    return { ...effect, homing: true };
  }
};
