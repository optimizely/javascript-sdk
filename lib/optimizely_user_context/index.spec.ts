import { vi, describe, it, expect } from 'vitest';
import Optimizely from '../optimizely';
import OptimizelyUserContext from '.';

describe('OptimizelyUserContext', () => {
  const optimizely = {
    onReady: vi.fn().mockRejectedValue(Promise.resolve()),
  } as any as Optimizely;

  it('should set userId correctly', () => {
    const context = new OptimizelyUserContext({
      optimizely,
      userId: 'user-id',
    });
    expect(context.getUserId()).toEqual('user-id');
  });

  it('should set attributes to empty object if none are provided', () => {
    const context = new OptimizelyUserContext({
      optimizely,
      userId: 'user-id',
    });
    expect(context.getAttributes()).toEqual({});
  });

  it('should set the provided attributes at instantiaiton', () => {
    const context = new OptimizelyUserContext({
      optimizely,
      userId: 'user-id',
    });
    expect(context.getAttributes()).toEqual({});
  });
});
