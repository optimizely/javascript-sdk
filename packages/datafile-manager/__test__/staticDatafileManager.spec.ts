/**
 * Copyright 2019, Optimizely
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

import StaticDatafileManager from '../src/staticDatafileManager'

describe('staticDatafileManager', () => {
  it('can be constructed with a datafile object and become ready', async () => {
    const manager = new StaticDatafileManager({ foo: 'bar' })
    manager.start()
    await manager.onReady()
  })

  it('returns the datafile it was constructed with from get', async () => {
    const manager = new StaticDatafileManager({ foo: 'bar' })
    manager.start()
    expect(manager.get()).toEqual({ foo: 'bar' })
    await manager.onReady()
    expect(manager.get()).toEqual({ foo: 'bar' })
  })

  it('can be stopped', async () => {
    const manager = new StaticDatafileManager({ foo: 'bar' })
    manager.start()
    await manager.onReady()
    await manager.stop()
  })

  it('can have event listeners added', () => {
    const manager = new StaticDatafileManager({ foo: 'bar' })
    const dispose = manager.on('update', jest.fn())
    dispose()
  })
})
