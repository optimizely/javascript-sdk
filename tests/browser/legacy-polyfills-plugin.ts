/**
 * Copyright 2026, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { Plugin } from 'vite';

// Vitest 5's in-browser runtime (the tester page and the pre-bundled vitest
// runtime) calls a few built-ins that the oldest browsers we test don't have:
//
//   Array/String/TypedArray.prototype.at  Chromium 92, Firefox 90, Safari 15.4
//   Object.hasOwn                         Chromium 93, Firefox 92, Safari 15.4
//   Array.prototype.findLast(Index)       Chromium 97, Firefox 104, Safari 15.4
//
// Without them the runtime throws before it can report back, and the run hangs
// until it times out (seen on Edge 89 and 90). Vitest 3 didn't depend on these, so the
// root setup doesn't need this.
//
// The polyfills go into both pages Vitest loads: the orchestrator page (via
// `browser.orchestratorScripts`, see legacyPolyfillsOrchestratorScript) and the
// test iframe (via this plugin's transformIndexHtml). They run before any other
// script, so the SDK code under test also sees them. The SDK source (lib/) doesn't use any of
// these today. If it starts to, tests on these old browsers would no longer
// catch it.
const POLYFILLS = `
(function () {
  function define(target, name, value) {
    if (target && !target[name]) {
      Object.defineProperty(target, name, { value: value, writable: true, configurable: true });
    }
  }

  function at(index) {
    var length = this.length;
    var i = Math.trunc(index) || 0;
    if (i < 0) i += length;
    return i < 0 || i >= length ? undefined : this[i];
  }

  function findLast(predicate, thisArg) {
    for (var i = this.length - 1; i >= 0; i--) {
      if (predicate.call(thisArg, this[i], i, this)) return this[i];
    }
    return undefined;
  }

  function findLastIndex(predicate, thisArg) {
    for (var i = this.length - 1; i >= 0; i--) {
      if (predicate.call(thisArg, this[i], i, this)) return i;
    }
    return -1;
  }

  var typedArrayPrototype = Object.getPrototypeOf(Int8Array.prototype);

  define(Array.prototype, 'at', at);
  define(String.prototype, 'at', at);
  define(typedArrayPrototype, 'at', at);
  define(Array.prototype, 'findLast', findLast);
  define(Array.prototype, 'findLastIndex', findLastIndex);
  define(typedArrayPrototype, 'findLast', findLast);
  define(typedArrayPrototype, 'findLastIndex', findLastIndex);
  define(Object, 'hasOwn', function (object, key) {
    return Object.prototype.hasOwnProperty.call(Object(object), key);
  });
})();
`;

// For `browser.orchestratorScripts`. The orchestrator page doesn't go through
// transformIndexHtml. A classic script (not a module) runs while the page is
// parsed, before Vitest's module scripts.
export const legacyPolyfillsOrchestratorScript = {
  id: 'legacy-polyfills.js',
  content: POLYFILLS,
  type: 'text/javascript',
};

// Adds the polyfills to the test iframe page
export function legacyPolyfillsPlugin(): Plugin {
  return {
    name: 'legacy-polyfills',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children: POLYFILLS,
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}
