/**
 * Copyright 2024, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { NetInfoState, addEventListener } from '@react-native-community/netinfo';

import { BatchEventProcessor, BatchEventProcessorConfig } from './batch_event_processor';
import { Fn } from '../utils/type';

export class ReactNativeNetInfoEventProcessor extends BatchEventProcessor {
  private isInternetReachable = true;
  private unsubscribeNetInfo?: Fn;

  constructor(config: BatchEventProcessorConfig) {
    super(config);
  }

  private async connectionListener(state: NetInfoState) {
    if (this.isInternetReachable && !state.isInternetReachable) {
      this.isInternetReachable = false;
      return;
    }

    if (!this.isInternetReachable && state.isInternetReachable) {
      this.isInternetReachable = true;
      this.retryFailedEvents();
    }
  }

  start(): void {
    super.start();
    this.unsubscribeNetInfo = addEventListener(this.connectionListener.bind(this));
  }

  stop(): void {
    this.unsubscribeNetInfo?.();
    super.stop();
  }
}
