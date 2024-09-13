import { vi } from 'vitest';
import { LoggerFacade } from '../../modules/logging';

export const getMockLogger = () : LoggerFacade => {
  return {
    info: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
};
