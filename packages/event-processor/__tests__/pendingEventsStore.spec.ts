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
/// <reference types="jest" />

import { LocalStorageStore } from '../src/pendingEventsStore'

type TestEntry = {
  uuid: string
  timestamp: number
  value: string
}

describe('LocalStorageStore', () => {
  let store: LocalStorageStore<TestEntry>
  beforeEach(() => {
    store = new LocalStorageStore({
      key: 'test_key',
      maxValues: 3,
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should get, set and remove items', async () => {
    await store.set('1', {
      uuid: '1',
      timestamp: 1,
      value: 'first',
    })

    expect(await store.get('1')).toEqual({
      uuid: '1',
      timestamp: 1,
      value: 'first',
    })

    await store.set('1', {
      uuid: '1',
      timestamp: 2,
      value: 'second',
    })

    expect(await store.get('1')).toEqual({
      uuid: '1',
      timestamp: 2,
      value: 'second',
    })

    expect(await store.values()).toHaveLength(1)

    await store.remove('1')

    expect(await store.values()).toHaveLength(0)
  })

  it('should allow replacement of the entire map', async () => {
    await store.set('1', {
      uuid: '1',
      timestamp: 1,
      value: 'first',
    })

    await store.set('2', {
      uuid: '2',
      timestamp: 2,
      value: 'second',
    })

    await store.set('3', {
      uuid: '3',
      timestamp: 3,
      value: 'third',
    })

    expect(await store.values()).toEqual([
      { uuid: '1', timestamp: 1, value: 'first' },
      { uuid: '2', timestamp: 2, value: 'second' },
      { uuid: '3', timestamp: 3, value: 'third' },
    ])

    const newMap = {}
    const theItems = await store.values()
    theItems.forEach(item => {
      newMap[item.uuid] = {
        ...item,
        value: 'new',
      }
    })
    await store.replace(newMap)

    expect(await store.values()).toEqual([
      { uuid: '1', timestamp: 1, value: 'new' },
      { uuid: '2', timestamp: 2, value: 'new' },
      { uuid: '3', timestamp: 3, value: 'new' },
    ])
  })

  it(`shouldn't allow more than the configured maxValues, using timestamp to remove the oldest entries`, async () => {
    await store.set('2', {
      uuid: '2',
      timestamp: 2,
      value: 'second',
    })

    await store.set('3', {
      uuid: '3',
      timestamp: 3,
      value: 'third',
    })

    await store.set('1', {
      uuid: '1',
      timestamp: 1,
      value: 'first',
    })

    await store.set('4', {
      uuid: '4',
      timestamp: 4,
      value: 'fourth',
    })

    expect(await store.values()).toEqual([
      { uuid: '2', timestamp: 2, value: 'second' },
      { uuid: '3', timestamp: 3, value: 'third' },
      { uuid: '4', timestamp: 4, value: 'fourth' },
    ])
  })
})
