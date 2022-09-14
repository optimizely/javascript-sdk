/**
 * Copyright 2022, Optimizely
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

import { ProcessMode, TaskQueue } from './index';

describe('Task Queue', () => {
  it('(in node) should queue and execute function tasks in serial successfully', async () => {
    const taskQueue = new TaskQueue({
      flushInterval: 1000,
      maxRetries: 2,
      maxQueueSize: 50,
      batchSize: 3,
      processMode: ProcessMode.SERIAL,
      processAutomatically: false, // to control testing
    });
    for (let taskId = 0; taskId <= 10; taskId = taskId + 1) {
      const tasksRandomReturnTimeout = (Math.floor(Math.random() * 3) + 1) * 1000;
      taskQueue.enqueue(() => setTimeout(() => {
        console.log(`TaskId: ${taskId}`);
      }, tasksRandomReturnTimeout));
    }

    await taskQueue.start();
  });

  it('(in node) should queue and execute function tasks in parallel successfully', () => {

  });
});
