import { OdpEvent } from '../../../core/odp/odp_event';
import { OdpEventApiManager } from '../../../core/odp/odp_event_api_manager';
import { LogLevel } from '../../../modules/logging';
import { ODP_CONFIG_NOT_READY_MESSAGE } from '../../../core/odp/odp_event_api_manager';
export class NodeOdpEventApiManager extends OdpEventApiManager {
  protected shouldSendEvents(events: OdpEvent[]): boolean {
    return true;
  }

  protected generateRequestData(
    events: OdpEvent[]
  ): { method: string; endpoint: string; headers: { [key: string]: string }; data: string } {
    // the caller should ensure odpConfig is ready before calling
    if (!this.odpConfig?.isValid()) {
      this.getLogger().log(LogLevel.ERROR, ODP_CONFIG_NOT_READY_MESSAGE);
      throw new Error(ODP_CONFIG_NOT_READY_MESSAGE);
    }

    const apiHost = this.odpConfig.apiHost;
    const apiKey = this.odpConfig.apiKey;

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
