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

import ReactNativeAsyncStorageCache from '../src/reactNativeAsyncStorageCache'

describe('reactNativeAsyncStorageCache', () => {
  let cacheInstance: ReactNativeAsyncStorageCache

  beforeEach(() => {
    cacheInstance = new ReactNativeAsyncStorageCache()
  })

  describe('get', function() { 
    it('should return correct object when item is found in cache', function(done) {
      cacheInstance.get('keyThatExists')
        .then(v => { 
          expect(v).toEqual({ name: "Awesome Object" })
          done()
        })
    })

    it('should return null if item is not found in cache', function(done) {
      cacheInstance.get('keyThatDoesNotExist')
        .then(v => { 
          expect(v).toBeNull()
          done()
        })
    })

    it('should reject promise error if string has an incorrect JSON format', function(done) {
      cacheInstance.get('keyWithInvalidJsonObject')
        .catch(e => {
          done()
        })
    })
  })

  describe('set', function() { 
    it('should resolve promise if item was successfully set in the cache', function(done) {
      const testObj = { name: "Awesome Object" }
      cacheInstance.set('testKey', testObj).then(() => done())
    })

    it('should reject promise if item was not set in the cache because of json stringifying error', function(done) {
      const testObj: any = { name: "Awesome Object" }
      testObj.myOwnReference = testObj
      cacheInstance.set('testKey', testObj).catch(() => done())
    })
  })

  describe('contains', function() { 
    it('should return true if object with key exists', function(done) {
      cacheInstance.contains('keyThatExists').then(v => {
        expect(v).toBeTruthy()
        done()
      })
    })

    it('should return false if object with key does not exist', function(done) {
      cacheInstance.contains('keyThatDoesNotExist').then(v => {
        expect(v).toBeFalsy()
        done()
      })
    })
  })
})
