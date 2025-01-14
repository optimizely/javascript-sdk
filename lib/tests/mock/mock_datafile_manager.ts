/**
 * Copyright 2024 Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Consumer } from '../../utils/type';
import { DatafileManager } from '../../project_config/datafile_manager';
import { EventEmitter } from '../../utils/event_emitter/event_emitter';
import { BaseService } from '../../service';
import { LoggerFacade } from '../../logging/logger';

type MockConfig = {
  datafile?: string | object;
  onRunning?: Promise<void>,
  onTerminated?: Promise<void>,
}

class MockDatafileManager extends BaseService implements DatafileManager {
  eventEmitter: EventEmitter<{ update: string}> = new EventEmitter();
  datafile: string | object | undefined;

  constructor(opt: MockConfig) {
    super();
    this.datafile = opt.datafile;
    this.startPromise.resolve(opt.onRunning || Promise.resolve());
    this.stopPromise.resolve(opt.onTerminated || Promise.resolve());
  }
  
  start(): void {
    return;
  }

  stop(): void {
    return;
  }
  
  setLogger(logger: LoggerFacade): void {
  }

  get(): string | undefined {
    if (typeof this.datafile === 'object') {
      return JSON.stringify(this.datafile);
    }
    return this.datafile;
  }

  setDatafile(datafile: string): void {
    this.datafile = datafile;
  }

  onUpdate(listener: Consumer<string>): () => void {
    return this.eventEmitter.on('update', listener)
  }

  pushUpdate(datafile: string | object): void {
    if (typeof datafile === 'object') {
      datafile = JSON.stringify(datafile);
    }
    this.datafile = datafile;
    this.eventEmitter.emit('update', datafile);
  }
}

export const getMockDatafileManager = (opt: MockConfig): MockDatafileManager => {
  return new MockDatafileManager(opt);
};
