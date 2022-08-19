/**
 * Copyright 2022, Optimizely
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

import { assert } from 'chai'
import { ReactNativeLRUCache } from './LRUCache.react_native'

const sleep = async (ms: number) => {
    return await new Promise(r => setTimeout(r, ms))
}

describe('/lib/core/odp/lru_cache (React Native)', () => {
    let cache: ReactNativeLRUCache<unknown, unknown>;

    describe('LRU Cache > Initialization', () => {
        it('should successfully create a new cache with maxSize > 0 and timeout > 0', () => {
            cache = new ReactNativeLRUCache({
                maxSize: 1000,
                timeout: 2000
            })

            assert.exists(cache)

            assert.equal(cache.maxSize, 1000)
            assert.equal(cache.timeout, 2000)
        })

        it('should successfully create a new cache with maxSize == 0 and timeout == 0', () => {
            cache = new ReactNativeLRUCache({
                maxSize: 0,
                timeout: 0
            })

            assert.exists(cache)

            assert.equal(cache.maxSize, 0)
            assert.equal(cache.timeout, 0)
        })
    })

    describe('LRU Cache > Save & Lookup', () => {
        const maxCacheSize = 2

        beforeEach(() => {
            cache = new ReactNativeLRUCache({
                maxSize: maxCacheSize,
                timeout: 1000
            })
        })

        it('should have no values in the cache upon initialization', async () => {
            assert.isNull(await cache.peek(1))
        })

        it('should save keys and values of any valid type', async () => {
            await cache.save({ key: 'a', value: 1 })              // { a: 1 }
            assert.equal(await cache.peek('a'), 1)

            await cache.save({ key: 2, value: 'b' })              // { a: 1, 2: 'b' }
            assert.equal(await cache.peek(2), 'b')

            const foo = Symbol('foo')
            const bar = {}
            await cache.save({ key: foo, value: bar })            // { 2: 'b', Symbol('foo'): {} }
            assert.deepEqual({}, await cache.peek(foo))
        })

        it('should save values up to its maxSize', async () => {
            await cache.save({ key: 'a', value: 1 })              // { a: 1 }
            assert.equal(await cache.peek('a'), 1)

            await cache.save({ key: 'b', value: 2 })              // { a: 1, b: 2 }
            assert.equal(await cache.peek('a'), 1)
            assert.equal(await cache.peek('b'), 2)

            await cache.save({ key: 'c', value: 3 })              // { b: 2, c: 3 }
            assert.equal(await cache.peek('a'), null)
            assert.equal(await cache.peek('b'), 2)
            assert.equal(await cache.peek('c'), 3)
        })

        it('should override values of matching keys when saving', async () => {
            await cache.save({ key: 'a', value: 1 })              // { a: 1 }
            assert.equal(await cache.peek('a'), 1)

            await cache.save({ key: 'a', value: 2 })              // { a: 2 }
            assert.equal(await cache.peek('a'), 2)

            await cache.save({ key: 'a', value: 3 })              // { a: 3 }
            assert.equal(await cache.peek('a'), 3)
        })

        it('should update cache accordingly when using lookup/peek', async () => {
            assert.isNull(await cache.lookup(3))

            await cache.save({ key: 'b', value: 201 })            // { b: 201 }
            await cache.save({ key: 'a', value: 101 })            // { b: 201, a: 101 }

            assert.equal(await cache.lookup('b'), 201)            // { a: 101, b: 201 }

            await cache.save({ key: 'c', value: 302 })            // { b: 201, c: 302 }

            assert.isNull(await cache.peek(1))
            assert.equal(await cache.peek('b'), 201)
            assert.equal(await cache.peek('c'), 302)
            assert.equal(await cache.lookup('c'), 302)            // { b: 201, c: 302 }

            await cache.save({ key: 'a', value: 103 })            // { c: 302, a: 103 }
            assert.equal(await cache.peek('a'), 103)
            assert.isNull(await cache.peek('b'))
            assert.equal(await cache.peek('c'), 302)
        })
    })

    describe('LRU Cache > Size', async () => {
        it('should keep LRU Cache map size capped at cache.capacity', async () => {
            const maxCacheSize = 2

            cache = new ReactNativeLRUCache({
                maxSize: maxCacheSize,
                timeout: 1000
            })

            await cache.save({ key: 'a', value: 1 })              // { a: 1 }
            await cache.save({ key: 'b', value: 2 })              // { a: 1, b: 2 }

            assert.equal(cache.map.size, maxCacheSize)
            assert.equal(cache.map.size, cache.maxSize)
        })

        it('should not save to cache if maxSize is 0', async () => {
            cache = new ReactNativeLRUCache({
                maxSize: 0,
                timeout: 1000
            })

            assert.isNull(await cache.lookup('a'))
            await cache.save({ key: 'a', value: 100 })
            assert.isNull(await cache.lookup('a'))
        })

        it('should not save to cache if maxSize is negative', async () => {
            cache = new ReactNativeLRUCache({
                maxSize: -500,
                timeout: 1000
            })

            assert.isNull(await cache.lookup('a'))
            await cache.save({ key: 'a', value: 100 })
            assert.isNull(await cache.lookup('a'))
        })
    })

    describe('LRU Cache > Timeout', () => {
        it('should discard stale entries in the cache on peek/lookup when timeout is greater than 0', async () => {
            const maxTimeout = 1

            cache = new ReactNativeLRUCache({
                maxSize: 1000,
                timeout: maxTimeout
            })

            await cache.save({ key: 'a', value: 100 })            // { a: 100 }
            await cache.save({ key: 'b', value: 200 })            // { a: 100, b: 200 }
            await cache.save({ key: 'c', value: 300 })            // { a: 100, b: 200, c: 300 }

            assert.equal(await cache.peek('a'), 100)
            assert.equal(await cache.peek('b'), 200)
            assert.equal(await cache.peek('c'), 300)

            await sleep(100)

            assert.isNull(await cache.peek('a'))
            assert.isNull(await cache.peek('b'))
            assert.isNull(await cache.peek('c'))

            await cache.save({ key: 'd', value: 400 })            // { d: 400 }
            await cache.save({ key: 'a', value: 101 })            // { d: 400, a: 101 }

            assert.equal(await cache.lookup('a'), 101)            // { d: 400, a: 101 }
            assert.equal(await cache.lookup('d'), 400)            // { a: 101, d: 400 }
        })

        it('should never have stale entries if timeout is 0', async () => {
            const maxTimeout = 0

            cache = new ReactNativeLRUCache({
                maxSize: 1000,
                timeout: maxTimeout
            })

            await cache.save({ key: 'a', value: 100 })            // { a: 100 }
            await cache.save({ key: 'b', value: 200 })            // { a: 100, b: 200 }

            await sleep(100)
            assert.equal(await cache.lookup('a'), 100)
            assert.equal(await cache.lookup('b'), 200)
        })

        it('should never have stale entries if timeout is less than 0', async () => {
            const maxTimeout = -500

            cache = new ReactNativeLRUCache({
                maxSize: 1000,
                timeout: maxTimeout
            })

            await cache.save({ key: 'a', value: 100 })            // { a: 100 }
            await cache.save({ key: 'b', value: 200 })            // { a: 100, b: 200 }

            await sleep(100)
            assert.equal(await cache.lookup('a'), 100)
            assert.equal(await cache.lookup('b'), 200)
        })
    })

    describe('LRU Cache > Reset', async () => {
        it('should be able to reset the cache', async () => {
            cache = new ReactNativeLRUCache({ maxSize: 2, timeout: 100 })
            await cache.save({ key: 'a', value: 100 })            // { a: 100 }
            await cache.save({ key: 'b', value: 200 })            // { a: 100, b: 200 }

            await sleep(0)

            assert.equal(cache.map.size, 2)
            cache.reset()                                   // { }

            await sleep(150)

            assert.equal(cache.map.size, 0)

            it('should be fully functional after resetting the cache', async () => {
                await cache.save({ key: 'c', value: 300 })        // { c: 300 }
                await cache.save({ key: 'd', value: 400 })        // { c: 300, d: 400 }
                assert.isNull(await cache.peek('b'))
                assert.equal(await cache.peek('c'), 300)
                assert.equal(await cache.peek('d'), 400)

                await cache.save({ key: 'a', value: 500 })        // { d: 400, a: 500 }
                await cache.save({ key: 'b', value: 600 })        // { a: 500, b: 600 }
                assert.isNull(await cache.peek('c'))
                assert.equal(await cache.peek('a'), 500)
                assert.equal(await cache.peek('b'), 600)

                const _ = await cache.lookup('a')                 // { b: 600, a: 500 }
                assert.equal(500, _)

                await cache.save({ key: 'c', value: 700 })        // { a: 500, c: 700 }
                assert.isNull(await cache.peek('b'))
                assert.equal(await cache.peek('a'), 500)
                assert.equal(await cache.peek('c'), 700)
            })
        })
    })
})