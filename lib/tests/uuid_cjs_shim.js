/**
 * CJS require hook that intercepts `require('uuid')` to provide a CJS-compatible
 * shim. Needed because uuid v13+ is ESM-only and cannot be loaded via require().
 * Uses Node's built-in crypto.randomUUID() which produces identical RFC 4122 v4 UUIDs.
 */
const Module = require('module'); // eslint-disable-line @typescript-eslint/no-var-requires
const crypto = require('crypto'); // eslint-disable-line @typescript-eslint/no-var-requires

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const uuidShim = {
  v4: () => crypto.randomUUID(),
  validate: (str) => typeof str === 'string' && UUID_REGEX.test(str),
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'uuid') {
    return uuidShim;
  }
  return originalLoad.call(this, request, parent, isMain);
};
