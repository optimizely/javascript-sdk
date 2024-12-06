import { v4 as uuidV4 } from 'uuid';

export const VUID_PREFIX: string = `vuid_`;
export const VUID_MAX_LENGTH = 32;

export const isVuid = (vuid: string): boolean => vuid.startsWith(VUID_PREFIX) && vuid.length > VUID_PREFIX.length;

export const makeVuid = (): string => {
  // make sure UUIDv4 is used (not UUIDv1 or UUIDv6) since the trailing 5 chars will be truncated. See TDD for details.
  const uuid = uuidV4();
  const formatted = uuid.replace(/-/g, '');
  const vuidFull = `${VUID_PREFIX}${formatted}`;

  return vuidFull.length <= VUID_MAX_LENGTH ? vuidFull : vuidFull.substring(0, VUID_MAX_LENGTH);
};
