export const exhaustMicrotasks = async (loop = 100) => {
  for(let i = 0; i < loop; i++) {
    await Promise.resolve();
  }
};
