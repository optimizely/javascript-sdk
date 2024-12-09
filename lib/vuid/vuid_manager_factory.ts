import { Cache } from '../utils/cache/cache';

export type VuidManagerOptions = {
  vuidCache?: Cache<string>;
  enableVuid?: boolean;
}
