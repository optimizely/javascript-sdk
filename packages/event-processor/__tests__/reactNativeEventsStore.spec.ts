/**
 * Copyright 2020, Optimizely
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

import { ReactNativeEventsStore } from '../src/reactNativeEventsStore'
import AsyncStorage from '../__mocks__/@react-native-async-storage/async-storage'

const STORE_KEY = 'test-store'

describe('ReactNativeEventsStore', () => {
  let store: ReactNativeEventsStore<any>

  beforeEach(() => {
    store = new ReactNativeEventsStore(5, STORE_KEY)
  })

  describe('set', () => {
    it('should store all the events correctly in the store', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      const storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY])
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })
    })

    it('should store all the events when set asynchronously', async (done) => {
      const promises = []
      promises.push(store.set('event1', {'name': 'event1'}))
      promises.push(store.set('event2', {'name': 'event2'}))
      promises.push(store.set('event3', {'name': 'event3'}))
      promises.push(store.set('event4', {'name': 'event4'}))
      Promise.all(promises).then(() => {
        const storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY])
        expect(storedPendingEvents).toEqual({
          "event1": { "name": "event1" },
          "event2": { "name": "event2" },
          "event3": { "name": "event3" },
          "event4": { "name": "event4" },
        })
        done()
      })
    })
  })

  describe('get', () => {
    it('should correctly get items', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      expect(await store.get('event1')).toEqual({'name': 'event1'})
      expect(await store.get('event2')).toEqual({'name': 'event2'})
      expect(await store.get('event3')).toEqual({'name': 'event3'})
      expect(await store.get('event4')).toEqual({'name': 'event4'})
    })
  })

  describe('getEventsMap', () => {
    it('should get the whole map correctly', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      const mapResult = await store.getEventsMap()
      expect(mapResult).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })
    })
  })

  describe('getEventsList', () => {
    it('should get all the events as a list', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      const listResult = await store.getEventsList()
      expect(listResult).toEqual([
        { "name": "event1" },
        { "name": "event2" },
        { "name": "event3" },
        { "name": "event4" },
      ])
    })
  })

  describe('remove', () => {
    it('should correctly remove items from the store', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      let storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY])
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })

      await store.remove('event1')
      storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY])
      expect(storedPendingEvents).toEqual({
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })

      await store.remove('event2')
      storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY])
      expect(storedPendingEvents).toEqual({
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })
    })

    it('should correctly remove items from the store when removed asynchronously', async (done) => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      let storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY])
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })

      const promises = []
      promises.push(store.remove('event1'))
      promises.push(store.remove('event2'))
      promises.push(store.remove('event3'))
      Promise.all(promises).then(() => {
        let storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY])
        expect(storedPendingEvents).toEqual({ "event4": { "name": "event4" }})
        done()
      })
    })
  })

  describe('clear', () => {
    it('should clear the whole store',async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      let storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY])
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })
      await store.clear()
      storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY] || '{}')
      expect(storedPendingEvents).toEqual({})
    })
  })

  describe('maxSize', () => {
    it('should not add anymore events if the store if full', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})

      let storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY])
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })
      await store.set('event5', {'name': 'event5'})

      storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY])
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
        "event5": { "name": "event5" },
      })

      await store.set('event6', {'name': 'event6'})
      storedPendingEvents = JSON.parse(AsyncStorage.dumpItems()[STORE_KEY])
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
        "event5": { "name": "event5" },
      })
    })
  })
})
