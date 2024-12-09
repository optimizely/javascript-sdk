export const exhaustMicrotasks = async (loop = 100): Promise<void> => {
  for(let i = 0; i < loop; i++) {
    await Promise.resolve();
  }
};

export const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));