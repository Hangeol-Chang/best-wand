export default {
  id: 'freeze',
  name: '빙결탄',
  apply(effect) {
    return { ...effect, freeze: true };
  }
};
