import { groupBy, objectValues } from '@optimizely/js-sdk-utils'
import { AbstractEventProcessor, ProcessableEvents } from '../eventProcessor'
import { EventV1Request } from '../eventDispatcher'
import { makeBatchedEventV1 } from './buildEventV1';

export class LogTierV1EventProcessor extends AbstractEventProcessor {
  private buildGroupByKey(event: ProcessableEvents): string {
    return objectValues(event.context).join('|')
  }

  protected groupEvents(events: ProcessableEvents[]): ProcessableEvents[][] {
    return groupBy(events, event => this.buildGroupByKey(event))
  }

  protected formatEvents(events: ProcessableEvents[]): EventV1Request {
    return {
      url: 'https://logx.optimizely.com/v1/events',
      method: 'POST',
      headers: {},
      event: makeBatchedEventV1(events),
    }
  }
}
