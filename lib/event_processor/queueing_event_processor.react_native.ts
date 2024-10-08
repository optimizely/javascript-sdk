import {
  NetInfoState,
  addEventListener as addConnectionListener,
} from "@react-native-community/netinfo"

import { QueueingEventProcessor, QueueingEventProcessorConfig } from "./queueing_event_processor";
import { Fn } from "../utils/type";

class ReactNativeNetInfoEventProcessor extends QueueingEventProcessor {
  private isInternetReachable = true;
  private unsubscribeNetInfo?: Fn;

  constructor(config: QueueingEventProcessorConfig) {
    super(config);
  }

  private async connectionListener(state: NetInfoState) {
    if (this.isInternetReachable && !state.isInternetReachable) {
      this.isInternetReachable = false;
      return;
    }

    if (!this.isInternetReachable && state.isInternetReachable) {
      this.isInternetReachable = true;
      await this.retryFailedEvents()
    }
  }

  start(): void {
    this.unsubscribeNetInfo = addConnectionListener(this.connectionListener.bind(this))
    super.start()
  }

  stop(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo()
    }
    super.stop()
  }
}
