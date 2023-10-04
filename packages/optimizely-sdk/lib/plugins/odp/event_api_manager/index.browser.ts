import { OdpEvent } from '../../../core/odp/odp_event';
import { OdpEventApiManager } from '../../../core/odp/odp_event_api_manager';
import { LogLevel } from '../../../modules/logging';
import { ODP_EVENT_BROWSER_ENDPOINT } from '../../../utils/enums';

const EVENT_SENDING_FAILURE_MESSAGE = 'ODP event send failed';

export class BrowserOdpEventApiManager extends OdpEventApiManager {
  protected shouldSendEvents(events: OdpEvent[]): boolean {
    if (events.length <= 1) {
      return true;
    }
    this.getLogger().log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (browser only supports batch size 1)`);
    return false;
  }

  protected generateRequestData(
    apiHost: string,
    apiKey: string,
    events: OdpEvent[]
  ): { method: string; endpoint: string; headers: { [key: string]: string }; data: string } {
    const method = 'GET';
    const event = events[0];
    const url = new URL(ODP_EVENT_BROWSER_ENDPOINT);
    event.identifiers.forEach((v, k) => {
      url.searchParams.append(k, v);
    });
    event.data.forEach((v, k) => {
      url.searchParams.append(k, v as string);
    });
    url.searchParams.append('tracker_id', apiKey);
    url.searchParams.append('event_type', event.type);
    url.searchParams.append('vdl_action', event.action);
    const endpoint = url.toString();
    return {
      method,
      endpoint,
      headers: {},
      data: '',
    };
  }
}
