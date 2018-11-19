import { OptimizelySDKWrapper } from '../src/OptimizelySDKWrapper'
import { assert } from 'chai'
import { datafile } from './testData'

describe('OptimizelySDKWrapper blackbox tests', function() {
  describe('initializing a static Datafile with no userId', function() {
    it('instantiate successfully and be immediately initailized', function() {
      const instance = new OptimizelySDKWrapper({
        datafile,
      })
      assert.isTrue(instance.isInitialized)
      assert.deepEqual(instance.datafile, datafile)
    })
  })
})
