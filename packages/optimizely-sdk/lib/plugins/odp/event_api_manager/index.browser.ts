import { OdpEvent } from '../../../core/odp/odp_event';
import { OdpEventApiManager } from '../../../core/odp/odp_event_api_manager';
import { LogLevel } from '../../../modules/logging';
import { ODP_EVENT_BROWSER_ENDPOINT } from '../../../utils/enums';
import { ODP_CONFIG_NOT_READY_MESSAGE } from '../../../core/odp/odp_event_api_manager';

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
    events: OdpEvent[]
  ): { method: string; endpoint: string; headers: { [key: string]: string }; data: string } {
    // the caller should ensure odpConfig is ready before calling
    if (!this.odpConfig?.isReady()) {
      this.getLogger().log(LogLevel.ERROR, ODP_CONFIG_NOT_READY_MESSAGE);
      throw new Error(ODP_CONFIG_NOT_READY_MESSAGE);
    }

    const apiKey = this.odpConfig!.apiKey;
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
