/// <reference path="../src/OptimizelySDK.d.ts" />

import { ResourceLoader, ResourceEmitter, SingleResourceStream, CombinedResourceStream } from '../src/ResourceStream'
import { assert } from 'chai'
import * as sinon from 'sinon'
import * as nock from 'nock'
import { StaticUserIdLoader, CookieRandomUserIdLoader } from '../src/UserIdLoaders'

class TestLoader implements ResourceLoader<string> {
  emitter: ResourceEmitter<string>

  load(emitter: ResourceEmitter<string>) {
    this.emitter = emitter
  }
}

describe('UserId Loaders', function() {
  const sandbox = sinon.sandbox.create()
  this.afterEach(function() {
    sandbox.reset()
  })

  let emitterSpy: ResourceEmitter<string>
  beforeEach(function() {
    emitterSpy = {
      data: sandbox.spy(),
      ready: sandbox.spy(),
      error: sandbox.spy(),
    }
  })

  describe('ProvidedUserIdLoader', function() {
    it('should invoke the emitter synchronously', function() {
      const userId = 'jordan'
      const loader = new StaticUserIdLoader(userId)

      loader.load(emitterSpy)

      sinon.assert.calledOnce(emitterSpy.data as sinon.SinonSpy)
      sinon.assert.calledWithExactly(emitterSpy.data as sinon.SinonSpy, {
        resourceKey: 'userId',
        resource: userId,
        metadata: { source: 'fresh' },
      })

      sinon.assert.calledOnce(emitterSpy.ready as sinon.SinonSpy)
    })
  })
})
