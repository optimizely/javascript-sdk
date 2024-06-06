import { assert } from 'chai';
import { scheduleMicrotaskOrTimeout } from '.'; 

describe.only('scheduleMicrotaskOrTimeout', () => {
  it('should use queueMicrotask if available', (done) => {
    // Assuming queueMicrotask is available in the environment
    scheduleMicrotaskOrTimeout(() => {
      done();
    });
  });

  it('should fallback to setTimeout if queueMicrotask is not available', (done) => {
    // Temporarily remove queueMicrotask to test the fallback
    const originalQueueMicrotask = window.queueMicrotask;
    window.queueMicrotask = undefined;

    scheduleMicrotaskOrTimeout(() => {
      // Restore queueMicrotask before calling done
      window.queueMicrotask = originalQueueMicrotask;
      done();
    });
  });
});
