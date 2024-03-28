import { OdpConfig, OdpIntegrationConfig } from '../../../core/odp/odp_config';
import { OdpEvent } from '../../../core/odp/odp_event';
import { OdpEventApiManager } from '../../../core/odp/odp_event_api_manager';
import { LogLevel } from '../../../modules/logging';
export class NodeOdpEventApiManager extends OdpEventApiManager {
  protected shouldSendEvents(events: OdpEvent[]): boolean {
    return true;
  }

  protected generateRequestData(
    odpConfig: OdpConfig,
    events: OdpEvent[]
  ): { method: string; endpoint: string; headers: { [key: string]: string }; data: string } {

    const { apiHost, apiKey } = odpConfig;
    
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
