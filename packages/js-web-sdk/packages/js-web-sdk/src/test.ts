import { OptimizelySDKWrapper } from './index'
import { OptimizelyDatafile } from './Datafile';

const localDatafile: OptimizelyDatafile = {"version": "4", "rollouts": [{"experiments": [{"status": "Running", "key": "12135000122", "layerId": "12103610772", "trafficAllocation": [{"entityId": "12097940344", "endOfRange": 10000}], "audienceIds": [], "variations": [{"variables": [{"id": "12134130361", "value": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.  shit dog"}, {"id": "12103830477", "value": "Hi Jess!"}], "id": "12097940344", "key": "12097940344", "featureEnabled": true}], "forcedVariations": {}, "id": "12135000122"}], "id": "12103610772"}, {"experiments": [{"status": "Not started", "key": "12117090566", "layerId": "12109830659", "trafficAllocation": [{"entityId": "12103740615", "endOfRange": 0}], "audienceIds": [], "variations": [{"variables": [], "id": "12103740615", "key": "12103740615", "featureEnabled": false}], "forcedVariations": {}, "id": "12117090566"}], "id": "12109830659"}], "typedAudiences": [], "anonymizeIP": false, "projectId": "12122640456", "variables": [], "featureFlags": [{"experimentIds": [], "rolloutId": "12103610772", "variables": [{"defaultValue": "Hi Jess!", "type": "string", "id": "12103830477", "key": "header"}, {"defaultValue": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.  shit dog", "type": "string", "id": "12134130361", "key": "content"}], "id": "12113321010", "key": "feature1"}, {"experimentIds": [], "rolloutId": "12109830659", "variables": [{"defaultValue": "", "type": "string", "id": "12097810491", "key": "str"}, {"defaultValue": "0.0", "type": "double", "id": "12103850480", "key": "double"}, {"defaultValue": "false", "type": "boolean", "id": "12105540346", "key": "bool"}, {"defaultValue": "0", "type": "integer", "id": "12126320466", "key": "int"}], "id": "12126690667", "key": "allvars"}], "experiments": [], "audiences": [], "groups": [], "attributes": [], "botFiltering": false, "accountId": "804231466", "events": [], "revision": "17"}


function testLocalDatafile() {
  console.log('testLocalDatafile')
  const optimizely = new OptimizelySDKWrapper({
    datafile: localDatafile,
    userProfileService: {
      lookup(userId: string) {
        console.log('lookup', userId)
        let a : any = 'foo'
        return a
      },
      save(data: any) {

      }
    }
  })

  optimizely.isFeatureEnabled('feature1', 'jordan')
  optimizely.getFeatureVariables('feature1', 'jordan')
  console.log(optimizely.isInitialized)
}

async function testUrlLoad() {
  let optimizely = new OptimizelySDKWrapper({
    sdkKey: 'GaXr9RoDhRcqXJm3ruskRa',
  })
  optimizely.track('foo', 'jordan')
  optimizely.track('foo', 'jordan', {
    plan_type: 'bronze'
  })
  optimizely.track(
    'foo',
    'jodran',
    { plan_type: 'bronze' },
    { revenue: 123 },
  )
  await optimizely.onReady()

  console.log('optly1 - feature1', optimizely.isFeatureEnabled('feature1', 'jordan'))

  let optimizely2 = new OptimizelySDKWrapper({
    sdkKey: 'GaXr9RoDhRcqXJm3ruskRa',
  })
  console.log('optly2 - feature1', optimizely2.isFeatureEnabled('feature1', 'jordan'))
}


testLocalDatafile()
testUrlLoad()