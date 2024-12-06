export const exhaustMicrotasks = async (loop = 100) => {
  for(let i = 0; i < loop; i++) {
    await Promise.resolve();
  }
};

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));