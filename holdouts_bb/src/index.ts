import { createInstance, createPollingProjectConfigManager, createForwardingEventProcessor, eventDispatcher, DEBUG, createLogger, createStaticProjectConfigManager, OptimizelyDecision, DecisionNotificationPayload, LogEvent } from '@optimizely/optimizely-sdk';
import { datafile } from './datafile.js';


type TestCase = {
  key: string,
  title: string;
  flag: string,
  userId: string,
  attribute: Record<string, any>,
  ruleKey: string,
  ruleType: string,
  experimentId: string,
  variationKey: string,
  variationId: string,
  enabled: boolean,
  event: boolean,
}


export type ResolvablePromise<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  then: Promise<T>['then'];
};

const noop = () => {};

export function resolvablePromise<T>(): ResolvablePromise<T> {
  let resolve: (value: T | PromiseLike<T>) => void = noop;
  let reject: (reason?: any) => void = noop;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject, then: promise.then.bind(promise) };
}


async function run(tc: TestCase) {
  try {
    console.log(` =============  start test: ${tc.title} =================`);

    let eventPromise = resolvablePromise();
    let eventTimeout = setTimeout(() => eventPromise.reject(new Error('event timeout')), 5_000);
    let notificationPromise = resolvablePromise();

    const projectConfigManager = createStaticProjectConfigManager({
      datafile: JSON.stringify(datafile),
    });


    if (!tc.event) {
      clearTimeout(eventTimeout);
      eventPromise.resolve(true);
    } else {
      
    }

    const eventProcessor = createForwardingEventProcessor({
      dispatchEvent: async (event: LogEvent) => {
        // console.log("📤 Event dispatched:", JSON.stringify(event));
        const visitor = event.params.visitors[0];
        const decision = visitor.snapshots[0].decisions![0];
        const eventData = {
          userId: visitor.visitor_id,
          experimentId: decision.experiment_id,
          variationId: decision.variation_id,
          variationKey: decision.metadata.variation_key,
          ruleKey: decision.metadata.rule_key,
          ruleType: decision.metadata.rule_type,
        }

        clearTimeout(eventTimeout);

        console.log("\n📊 Event Result:");

        logResult(tc, eventData, 'userId');
        logResult(tc, eventData, 'experimentId');
        logResult(tc, eventData, 'variationId');
        logResult(tc, eventData, 'variationKey');
        logResult(tc, eventData, 'ruleKey');
        logResult(tc, eventData, 'ruleType');

        eventPromise.resolve(true);
        return eventDispatcher.dispatchEvent(event);
      }
    });
    
    // Create Optimizely client instance
    const optimizely = createInstance({
      projectConfigManager,
      eventProcessor,
      logger: createLogger({ level: DEBUG }),
    });
    
    console.log("✅ Optimizely client created successfully!");
    
    await optimizely.onReady();
    console.log("✅ SDK is ready!");

    optimizely.notificationCenter.addNotificationListener('DECISION', (d: DecisionNotificationPayload) => {
      console.log("\n📊 Notification Result:");
      logResult(tc, d.decisionInfo, 'enabled')
      logResult(tc, d.decisionInfo, 'variationKey')
      logResult(tc, d.decisionInfo, 'ruleKey')
      notificationPromise.resolve(true);
    });
    
    const userContext = optimizely.createUserContext(tc.userId, tc.attribute);
    
    console.log(`📱 Created user context for user: ${tc.userId}`);
    
    console.log(`\n🎯 Making decision for ${tc.flag}...`);
    const decision = userContext.decide(tc.flag);
    
    console.log("\n📊 Decision Result:");
    console.log(`   Flag Key- ${decision.flagKey}`);
    logResult(tc, decision, 'enabled');
    logResult(tc, decision, 'variationKey');
    logResult(tc, decision, 'ruleKey');
    

    await Promise.all([eventPromise, notificationPromise]);

    // Clean up
    await optimizely.close();
    console.log(` =============  end test: ${tc.title} =================\n\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

const logResult = (tc: any, decision: any, key: string, prefix: string = '   ') => {
  console.log(`${prefix}${key}- want: ${tc[key]}, got: ${decision[key]}, passed: ${pass(tc[key], decision[key])}`);
}

const pass = (a: any, b: any) => {
  if (a === b) return '✅';
  return '❌';
}


/**
==== holdout list =====
ho_3 1644773
hold_4 1645646
holdout_5 1645647
holdout_6 1645648
==== user holdouts =====
user-1 [ 'hold_4', 'holdout_6' ]
user-2 [ 'ho_3', 'hold_4' ]
user-3 [ 'holdout_6' ]
user-4 [ 'hold_4' ]
user-5 [ 'hold_4', 'holdout_6' ]
user-6 [ 'ho_3', 'holdout_6' ]
user-7 [ 'hold_4', 'holdout_5' ]
user-8 []
user-9 [ 'hold_4', 'holdout_6' ]
user-10 [ 'hold_4' ]
 */
const tests: TestCase[] = [
  {
    key: 'miss_all_audience_1',
    title: 'flag_1, misses audience condition of all holdouts',
    flag: 'flag_1',
    variationKey: 'var_1',
    variationId: '1546659',
    ruleKey: 'default-rollout-486801-931762175217415',
    experimentId: 'default-rollout-486801-931762175217415',
    ruleType: 'rollout',
    userId: 'user-1',
    attribute: { },
    enabled: true,
    event: false,
  },
  {
    key: 'miss_all_audience_2',
    title: 'flag_2, misses audience condition of all holdouts',
    flag: 'flag_2',
    variationKey: 'var_2',
    variationId: '1546664',
    ruleKey: 'default-rollout-486802-931762175217415',
    experimentId: 'default-rollout-486802-931762175217415',
    ruleType: 'rollout',
    userId: 'user-1',
    attribute: { },
    enabled: true,
    event: false,
  },
  {
    key: 'hits_ho3_1',
    title: 'flag_1, hits ho3 (both audience and bucket)',
    flag: 'flag_1',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'ho_3',
    experimentId: '1644773',
    ruleType: 'holdout',
    userId: 'user-2',
    attribute: { ho: 3 },
    enabled: false,
    event: true
  },
  {
    key: 'hits_ho3_2',
    title: 'flag_2, hits ho3 (both audience and bucket)',
    flag: 'flag_2',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'ho_3',
    experimentId: '1644773',
    ruleType: 'holdout',
    userId: 'user-2',
    attribute: { ho: 3 },
    enabled: false,
    event: true
  },
  {
    key: 'hits_ho3_aud_miss_bucket_1',
    title: 'hits the ho_3 holdout audience but misses bucket',
    flag: 'flag_1',
    variationKey: 'var_1',
    variationId: '1546659',
    ruleKey: 'default-rollout-486801-931762175217415',
    experimentId: 'default-rollout-486801-931762175217415',
    ruleType: 'rollout',
    userId: 'user-1',
    attribute: { ho: 3 },
    enabled: true,
    event: false,
  },
  {
    key: 'hits_ho3_aud_miss_bucket_2',
    title: 'hits the ho_3 holdout audience but misses bucket',
    flag: 'flag_2',
    variationKey: 'var_2',
    variationId: '1546659',
    ruleKey: 'default-rollout-486802-931762175217415',
    experimentId: 'default-rollout-486802-931762175217415',
    ruleType: 'rollout',
    userId: 'user-1',
    attribute: { ho: 3 },
    enabled: true,
    event: false,
  },
  {
    key: 'hits_all_aud_hit_bucket_ho3_ho4_1',
    title: 'flag_1, hits all audiences, hits bucket of ho3 and ho4, should select first in order (ho3)',
    flag: 'flag_1',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'ho_3',
    experimentId: '1644773',
    ruleType: 'holdout',
    userId: 'user-2',
    attribute: { all: 1 },
    enabled: false,
    event: true
  },
  {
    key: 'hits_all_aud_hit_bucket_ho3_ho4_2',
    title: 'flag_2, hits all audiences, hits bucket of ho3 and ho4, should select first in order (ho3)',
    flag: 'flag_2',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'ho_3',
    experimentId: '1644773',
    ruleType: 'holdout',
    userId: 'user-2',
    attribute: { all: 1 },
    enabled: false,
    event: true
  },
    {
    key: 'hits_all_aud_hit_bucket_ho4_ho6_1',
    title: 'flag_1, hits all audiences, hits bucket of ho4 and ho6, should select first in order (ho4)',
    flag: 'flag_1',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'hold_4',
    experimentId: '1645646',
    ruleType: 'holdout',
    userId: 'user-5',
    attribute: { all: 1 },
    enabled: false,
    event: true
  },
  {
    key: 'hits_all_aud_hit_bucket_ho4_ho6_2',
    title: 'flag_2, hits all audiences, hits bucket of ho4 and ho6, should select first in order (ho4)',
    flag: 'flag_2',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'hold_4',
    experimentId: '1645646',
    ruleType: 'holdout',
    userId: 'user-5',
    attribute: { all: 1 },
    enabled: false,
    event: true
  },
  {
    key: 'hits_all_aud_hit_bucket_ho6_1',
    title: 'flag_1, hits all audiences, hits bucket of only ho6',
    flag: 'flag_1',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'holdout_6',
    experimentId: '1645648',
    ruleType: 'holdout',
    userId: 'user-3',
    attribute: { all: 1 },
    enabled: false,
    event: true
  },
  {
    key: 'hits_all_aud_hit_bucket_ho6_2',
    title: 'flag_2, hits all audiences, hits bucket of only ho6',
    flag: 'flag_2',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'holdout_6',
    experimentId: '1645648',
    ruleType: 'holdout',
    userId: 'user-3',
    attribute: { all: 1 },
    enabled: false,
    event: true
  },
  {
    key: 'hits_all_aud_hit_bucket_ho4_1',
    title: 'flag_1, hits all audiences, hits bucket of only ho4',
    flag: 'flag_1',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'hold_4',
    experimentId: '1645646',
    ruleType: 'holdout',
    userId: 'user-4',
    attribute: { all: 1 },
    enabled: false,
    event: true
  },
  {
    key: 'hits_all_aud_hit_bucket_ho4_2',
    title: 'flag_2, hits all audiences, hits bucket of only ho4',
    flag: 'flag_2',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'hold_4',
    experimentId: '1645646',
    ruleType: 'holdout',
    userId: 'user-4',
    attribute: { all: 1 },
    enabled: false,
    event: true
  },
  {
    key: 'hits_bucket_ho3_ho6_aud_only_ho6_1',
    title: 'flag_1, hits bucket of ho3 and ho6, but only audience of ho6',
    flag: 'flag_1',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'holdout_6',
    experimentId: '1645648',
    ruleType: 'holdout',
    userId: 'user-6',
    attribute: { ho: 6 },
    enabled: false,
    event: true
  },
  {
    key: 'hits_bucket_ho3_ho6_aud_only_ho6_2',
    title: 'flag_2, hits bucket of ho3 and ho6, but only audience of ho6',
    flag: 'flag_2',
    variationKey: 'off',
    variationId: '$opt_dummy_variation_id',
    ruleKey: 'holdout_6',
    experimentId: '1645648',
    ruleType: 'holdout',
    userId: 'user-6',
    attribute: { ho: 6 },
    enabled: false,
    event: true
  },
  {
    key: 'hits_all_aud_miss_all_bucket_1',
    title: 'flag_1, hits all audiences but misses all buckets',
    flag: 'flag_1',
    variationKey: 'var_1',
    variationId: '1546659',
    ruleKey: 'default-rollout-486801-931762175217415',
    experimentId: 'default-rollout-486801-931762175217415',
    ruleType: 'rollout',
    userId: 'user-8',
    attribute: { all: 1 },
    enabled: true,
    event: false,
  },
  {
    key: 'hits_all_aud_miss_all_bucket_2',
    title: 'flag_2, hits all audiences but misses all buckets',
    flag: 'flag_2',
    variationKey: 'var_2',
    variationId: '1546664',
    ruleKey: 'default-rollout-486802-931762175217415',
    experimentId: 'default-rollout-486802-931762175217415',
    ruleType: 'rollout',
    userId: 'user-8',
    attribute: { all: 1 },
    enabled: true,
    event: false,
  },
]


console.log('total tests: ', tests.length, '\n');

const testKey = process.env.TEST_KEY;

if (testKey) {
  const test = tests.find((t) => t.key === testKey);
  if (test) await run(test);
} else {
  for (let test of tests) {
    await run(test)
  }
}
