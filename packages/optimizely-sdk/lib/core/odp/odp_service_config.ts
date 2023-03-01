import { BrowserLRUCacheConfig } from '../../utils/lru_cache/browser_lru_cache';
import { OdpEventManager } from './odp_event_manager';
import { OdpSegmentManager } from './odp_segment_manager';

export interface IOdpServiceConfig {
  odpServicesDisabled?: boolean;
  odpSegmentsCacheSize?: number;
  odpSegmentsCacheTimeout?: number;
  odpSegmentManager?: OdpSegmentManager;
  odpEventManager?: OdpEventManager;
}

/**
 * Blueprint for SDK x ODP/ATS Service Configuration Preferences
 */
export class OdpServiceConfig {
  odpServicesDisabled?: boolean;
  odpSegmentsCacheSize?: number;
  odpSegmentsCacheTimeout?: number;
  odpSegmentManager?: OdpSegmentManager;
  odpEventManager?: OdpEventManager;

  /**
   * Instantiates new object representing SDK x ODP/ATS Service Configuration Preferences
   * @param {IOdpServiceConfig} odpServiceConfig
   * @param {boolean}           odpServiceConfig.odpServicesDisabled        (Optional) Set to true to disable ODP functionality (except for VuidManager in client cases). False by default.
   * @param {number}            odpServiceConfig.odpSegmentsCacheSize       (Optional) Override SDK variation-specific cache size. Adopts lowest size among available SDK variations by default.
   * @param {number}            odpServiceConfig.odpSegmentsCacheTimeout    (Optional) Override SDK variation-specific cache timeout. Adopts fastest timeout among available SDK variations by default.
   * @param {OdpSegmentManager} odpServiceConfig.odpSegmentManager          (Optional) Override ODP Segment Manager used for fetching qualified segments.
   * @param {OdpEventManager}   odpServiceConfig.OdpEventManager            (Optional) Override ODP Event Manager used for sending events.
   */
  constructor({
    odpServicesDisabled,
    odpSegmentsCacheSize,
    odpSegmentsCacheTimeout,
    odpSegmentManager,
    odpEventManager,
  }: IOdpServiceConfig) {
    this.odpServicesDisabled = odpServicesDisabled || false;
    this.odpSegmentsCacheSize = odpSegmentsCacheSize || BrowserLRUCacheConfig.DEFAULT_CAPACITY;
    this.odpSegmentsCacheTimeout = odpSegmentsCacheTimeout || BrowserLRUCacheConfig.DEFAULT_TIMEOUT_SECS;
    this.odpSegmentManager = odpSegmentManager;
    this.odpEventManager = odpEventManager;
  }
}
