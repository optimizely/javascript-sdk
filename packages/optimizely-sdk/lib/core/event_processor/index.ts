import { LogTierV1EventProcessor, LocalStoragePendingEventsDispatcher } from '@optimizely/js-sdk-event-processor';

export function createEventProcessor(
  ...args: ConstructorParameters<typeof LogTierV1EventProcessor>
): LogTierV1EventProcessor {
  return new LogTierV1EventProcessor(...args);
}

export { EventProcessor, LocalStoragePendingEventsDispatcher } from '@optimizely/js-sdk-event-processor';

export default { createEventProcessor, LocalStoragePendingEventsDispatcher };
