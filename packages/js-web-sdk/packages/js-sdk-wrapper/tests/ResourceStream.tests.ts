/// <reference path="../src/OptimizelySDK.d.ts" />

import {
  ResourceStream,
  ResourceLoader,
  ResourceEmitter,
  SingleResourceStream,
  CombinedResourceStream,
} from '../src/ResourceStream'
import { assert } from 'chai'
import * as sinon from 'sinon'
import * as nock from 'nock'

class TestLoader implements ResourceLoader<string> {
  emitter: ResourceEmitter<string>

  load(emitter: ResourceEmitter<string>) {
    this.emitter = emitter
  }
}

describe('SingleResourceStream', function() {
  const sandbox = sinon.sandbox.create()
  this.afterEach(function() {
    sandbox.reset()
  })

  let subscriberSpy
  beforeEach(function() {
    subscriberSpy = {
      data: sandbox.spy(),
      complete: sandbox.spy(),
      error: sandbox.spy(),
    }
  })

  it('should push subscription messages to a subscriber', function() {
    const testLoader = new TestLoader()
    const stream = new SingleResourceStream(testLoader)
    stream.subscribe(subscriberSpy)

    const data: ResourceEmitter.DataMessage<string> = {
      resource: 'foo',
      resourceKey: 'test',
      metadata: { source: 'fresh' },
    }

    testLoader.emitter.data(data)
    testLoader.emitter.complete()

    sinon.assert.calledOnce(subscriberSpy.data)
    sinon.assert.calledWithExactly(subscriberSpy.data, data)
    sinon.assert.calledOnce(subscriberSpy.complete)
  })

  it('should replay subscription messages to a subscriber', function() {
    const testLoader = new TestLoader()
    const stream = new SingleResourceStream(testLoader)

    const data: ResourceEmitter.DataMessage<string> = {
      resource: 'foo',
      resourceKey: 'test',
      metadata: { source: 'fresh' },
    }

    testLoader.emitter.data(data)
    testLoader.emitter.complete()
    testLoader.emitter.error({ resourceKey: 'test', reason: 'foo' })

    stream.subscribe(subscriberSpy)

    sinon.assert.calledOnce(subscriberSpy.data)
    sinon.assert.calledWithExactly(subscriberSpy.data, data)
    sinon.assert.calledOnce(subscriberSpy.complete)
    sinon.assert.calledOnce(subscriberSpy.error)

    sinon.assert.callOrder(subscriberSpy.data, subscriberSpy.complete, subscriberSpy.error)
  })

  it('should allow unsubscribe', function() {
    const testLoader = new TestLoader()
    const stream = new SingleResourceStream(testLoader)

    const data: ResourceEmitter.DataMessage<string> = {
      resource: 'foo',
      resourceKey: 'test',
      metadata: { source: 'fresh' },
    }

    const unsubscribe = stream.subscribe(subscriberSpy)
    unsubscribe()

    testLoader.emitter.data(data)
    testLoader.emitter.complete()

    sinon.assert.notCalled(subscriberSpy.data)
    sinon.assert.notCalled(subscriberSpy.complete)
  })

  it('should allow multiple subscribers', function() {
    const testLoader = new TestLoader()
    const stream = new SingleResourceStream(testLoader)
    const subscriberSpy2 = {
      data: sandbox.spy(),
      complete: sandbox.spy(),
      error: sandbox.spy(),
    }

    const data: ResourceEmitter.DataMessage<string> = {
      resource: 'foo',
      resourceKey: 'test',
      metadata: { source: 'fresh' },
    }
    const data2: ResourceEmitter.DataMessage<string> = {
      resource: 'bar',
      resourceKey: 'test',
      metadata: { source: 'fresh' },
    }

    stream.subscribe(subscriberSpy)
    stream.subscribe(subscriberSpy2)

    testLoader.emitter.data(data)
    testLoader.emitter.data(data2)
    testLoader.emitter.complete()

    sinon.assert.calledTwice(subscriberSpy.data)
    sinon.assert.calledTwice(subscriberSpy2.data)
    sinon.assert.calledOnce(subscriberSpy.complete)
    sinon.assert.calledOnce(subscriberSpy2.complete)
  })
})

describe('CombinedResourceStream', function() {
  const sandbox = sinon.sandbox.create()
  this.afterEach(function() {
    sandbox.reset()
  })

  let subscriberSpy
  beforeEach(function() {
    subscriberSpy = {
      data: sandbox.spy(),
      complete: sandbox.spy(),
      error: sandbox.spy(),
    }
  })

  it(`should push 'data' messages from all streams to all subscribers`, function() {
    const testLoader1 = new TestLoader()
    const testLoader2 = new TestLoader()
    const stream1 = new SingleResourceStream(testLoader1)
    const stream2 = new SingleResourceStream(testLoader2)
    const combinedStream = new CombinedResourceStream([stream1, stream2])

    combinedStream.subscribe(subscriberSpy)

    const data: ResourceEmitter.DataMessage<string> = {
      resource: 'foo',
      resourceKey: 'test',
      metadata: { source: 'fresh' },
    }

    testLoader1.emitter.data(data)
    testLoader2.emitter.data(data)

    sinon.assert.calledTwice(subscriberSpy.data)
    sinon.assert.calledWithExactly(subscriberSpy.data, data)
  })

  it(`should invoke 'complete' when all streams have passed complete`, function() {
    const testLoader1 = new TestLoader()
    const testLoader2 = new TestLoader()
    const stream1 = new SingleResourceStream(testLoader1)
    const stream2 = new SingleResourceStream(testLoader2)
    const combinedStream = new CombinedResourceStream([stream1, stream2])

    combinedStream.subscribe(subscriberSpy)

    testLoader1.emitter.complete()
    sinon.assert.notCalled(subscriberSpy.complete)
    testLoader2.emitter.complete()
    sinon.assert.calledOnce(subscriberSpy.complete)
  })

  it(`should invoke 'error' when any streams emit 'error'`, function() {
    const testLoader1 = new TestLoader()
    const testLoader2 = new TestLoader()
    const stream1 = new SingleResourceStream(testLoader1)
    const stream2 = new SingleResourceStream(testLoader2)
    const combinedStream = new CombinedResourceStream([stream1, stream2])

    combinedStream.subscribe(subscriberSpy)

    const errorMsg: ResourceEmitter.ErrorMessage = {
      resourceKey: 'test',
      reason: 'error',
    }

    stream2.emitter.error(errorMsg)

    sinon.assert.calledOnce(subscriberSpy.error)
    sinon.assert.calledWithExactly(subscriberSpy.error, errorMsg)
  })
})
