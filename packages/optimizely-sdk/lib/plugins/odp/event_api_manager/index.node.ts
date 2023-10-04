import { OdpEvent } from '../../../core/odp/odp_event';
import { OdpEventApiManager } from '../../../core/odp/odp_event_api_manager';

export class NodeOdpEventApiManager extends OdpEventApiManager {
  protected shouldSendEvents(events: OdpEvent[]): boolean {
    return true;
  }

  protected generateRequestData(
    apiHost: string,
    apiKey: string,
    events: OdpEvent[]
  ): { method: string; endpoint: string; headers: { [key: string]: string }; data: string } {
    return {
      method: 'POST',
      endpoint: `${apiHost}/v3/events`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      data: JSON.stringify(events, this.replacer),
    };
  }

  private replacer(_: unknown, value: unknown) {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    } else {
      return value;
    }
  }
}
