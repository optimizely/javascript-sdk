// Apply BroadcastChannel polyfill for Safari 14 and other browsers that don't support it
// The bundled library exposes BroadcastChannel2
(function() {
  if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'undefined') {
    if (typeof window.BroadcastChannel2 !== 'undefined') {
      window.BroadcastChannel = window.BroadcastChannel2;
      console.log('[Polyfill] BroadcastChannel polyfill applied successfully');
    } else {
      console.error('[Polyfill] BroadcastChannel2 not found - polyfill bundle may not have loaded');
    }
  } else if (typeof window !== 'undefined') {
    console.log('[Polyfill] Native BroadcastChannel detected, polyfill not needed');
  }
})();
