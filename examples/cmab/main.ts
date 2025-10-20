/**
 * CMAB Testing Example for Optimizely JavaScript SDK
 *
 * This file contains comprehensive test scenarios for CMAB functionality
 * Based on: https://github.com/optimizely/go-sdk/tree/mpirnovar-gosdk-bash/examples/cmab
 *
 * To run:
 *   npm run build
 *   node dist/main.js --test=basic
 *   node dist/main.js --test=cache_hit
 *   node dist/main.js (runs all tests)
 */

import {
  createInstance,
  createPollingProjectConfigManager,
  Client,
  OptimizelyDecision,
  OptimizelyDecideOption,
  createLogger,
  DEBUG,
  createForwardingEventProcessor,
} from '@optimizely/optimizely-sdk';

// ============================================================================
// CONFIGURATION
// ============================================================================

// SDK Key from rc (prep) environment
const SDK_KEY = 'MCfgns9gkv68ZxRXR6U26'; // rc (prep)
const FLAG_KEY = 'cmab_test';

// Test user IDs
const USER_QUALIFIED = 'test_user_99'; // Will be bucketed into CMAB
const USER_NOT_BUCKETED = 'test_user_1'; // Won't be bucketed (traffic allocation)
const USER_CACHE_TEST = 'cache_user_123';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Print decision details
 */
function printDecision(label: string, decision: OptimizelyDecision): void {
  console.log(`\n${label}:`);
  console.log(`  Enabled: ${decision.enabled}`);
  console.log(`  Variation: ${decision.variationKey}`);
  console.log(`  Rule: ${decision.ruleKey || 'N/A'}`);

  if (decision.variables && Object.keys(decision.variables).length > 0) {
    console.log(`  Variables: ${JSON.stringify(decision.variables)}`);
  }

  if (decision.reasons && decision.reasons.length > 0) {
    console.log(`  Reasons:`);
    decision.reasons.forEach((reason: string) => {
      console.log(`    - ${reason}`);
    });
  }

  console.log(`  [Check debug logs above for CMAB UUID and calls]`);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test 1: Basic CMAB functionality
 */
async function testBasicCMAB(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: Basic CMAB Functionality ---');

  console.log('=== CMAB Testing Suite for JavaScript SDK ===');
  console.log(`Testing CMAB with rc environment`);
  console.log(`SDK Key: ${SDK_KEY}`);
  console.log(`Flag Key: ${FLAG_KEY}\n`);

  // Wait for datafile to load
  console.log('Waiting for datafile to load...');
  await optimizelyClient.onReady();

  // Test with user who qualifies for CMAB
  const userContext = optimizelyClient.createUserContext(USER_QUALIFIED, {
    hello: true
  });

  const decision = await userContext.decideAsync(FLAG_KEY);
  printDecision('CMAB Qualified User', decision);

  // cache miss
  const userContext2 = optimizelyClient.createUserContext(USER_QUALIFIED, {
    country: 'ru',
  });

  const decision2 = await userContext2.decide(FLAG_KEY);
  printDecision('CMAB Qualified User2', decision2);

  // // cache hit
  // const userContext3 = optimizelyClient.createUserContext(USER_QUALIFIED, {
  //   country: 'ru',
  // });

  // const decision3 = await userContext3.decide(FLAG_KEY);
  // printDecision('CMAB Qualified User3', decision3);

  console.log('===============================');
  optimizelyClient.close();
}

/**
 * Test 2: Cache hit - same user and attributes
 * Expected:
 * 1. Decision 1: "hello" → Passes audience → CMAB API call → Cache stored for user + "hello"
 * 2. Decision 2: Same user, same "hello" → Passes audience → Cache hit (same cache key) → Returns cached result (no API call)
 */
async function testCacheHit(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: Cache Hit (Same User & Attributes) ---');

  const userContext = optimizelyClient.createUserContext(USER_CACHE_TEST, {
    hello:true,
  });

  // First decision - should call CMAB service
  console.log('First decision (CMAB call):');
  const decision1 = await userContext.decideAsync(FLAG_KEY);
  printDecision('Decision 1', decision1);

  const userContext2 = optimizelyClient.createUserContext(USER_CACHE_TEST, {
    hello: true,
  });

  // Second decision - hit cache
  console.log('\nSecond decision (Cache hit):');
  const decision2 = await userContext2.decideAsync(FLAG_KEY);
  printDecision('Decision 2', decision2);
}

/**
 * Test 3: Cache miss when relevant attributes change
 * Expected:
 *  1. Decision 1: "hello" → Passes audience → CMAB API call → Cache stored for "hello"
 *  2. Decision 2: "world" → Passes audience → Cache miss (different attribute value) → New CMAB API call → Cache stored for "world"
 *  3. Decision 3: "world" → Passes audience → Cache hit (same attribute) → Uses cached result
 */
async function testCacheMissOnAttributeChange(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: Cache Miss on Attribute Change ---');

  // First decision with valid attribute
  const userContext1 = optimizelyClient.createUserContext(USER_CACHE_TEST + '_attr', {
    hello: true
  });

  console.log("Decision with 'hello':");
  const decision1 = await userContext1.decideAsync(FLAG_KEY);
  printDecision('Decision 1', decision1);

  // Second decision with changed valid attribute
  const userContext2 = optimizelyClient.createUserContext(USER_CACHE_TEST + '_attr', {
    hello: true,
    world: true
  });

  console.log("\nDecision with 'world' (cache miss expected):");
  const decision2 = await userContext2.decideAsync(FLAG_KEY);
  printDecision('Decision 2', decision2);

  // Third decision with same user and attributes
  const userContext3 = optimizelyClient.createUserContext(USER_CACHE_TEST + '_attr', {
    hello: true
  });

  console.log('\nDecision with same user and attributes (cache hit expected):');
  const decision3 = await userContext3.decideAsync(FLAG_KEY);
  printDecision('Decision 3', decision3);
}

/**
 * Test 4: IGNORE_CMAB_CACHE option
 * Expected:
 * 1. Decision 1: "hello" → Passes audience → CMAB API call → Cache stored for user + "hello"
 * 2. Decision 2: Same user, same "hello" + IGNORE_CMAB_CACHE → Passes audience → Cache bypassed → New CMAB API call (original cache preserved)
 * 3. Decision 3: Same user, same "hello" → Passes audience → Cache hit → Uses original cached result (no API call)
 */
async function testIgnoreCacheOption(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: IGNORE_CMAB_CACHE Option ---');

  const userContext = optimizelyClient.createUserContext(USER_CACHE_TEST + '_ignore', {
    hello: true
  });

  // First decision - populate cache
  console.log('First decision (populate cache):');
  const decision1 = await userContext.decideAsync(FLAG_KEY);
  printDecision('Decision 1', decision1);

  // Second decision with IGNORE_CMAB_CACHE
  console.log('\nSecond decision with IGNORE_CMAB_CACHE:');
  const decision2 = await userContext.decideAsync(FLAG_KEY, [OptimizelyDecideOption.IGNORE_CMAB_CACHE]);
  printDecision('Decision 2 (ignored cache)', decision2);

  // Third decision - should use original cache
  console.log('\nThird decision (should use original cache):');
  const decision3 = await userContext.decideAsync(FLAG_KEY);
  printDecision('Decision 3', decision3);
}

/**
 * Test 5: RESET_CMAB_CACHE option
 * Expected:
 * 1. User 1: "hello" → CMAB API call → Cache stored for User 1
 * 2. User 2: "hello" → CMAB API call → Cache stored for User 2
 * 3. User 1: RESET_CMAB_CACHE → Clears entire cache → New CMAB API call for User 1
 * 4. User 2: Same "hello" → Cache was cleared → New CMAB API call for User 2 (no cached result)
 */
async function testResetCacheOption(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: RESET_CMAB_CACHE Option ---');

  // Setup two different users
  const userContext1 = optimizelyClient.createUserContext('reset_user_1', {
    hello: true
  });

  const userContext2 = optimizelyClient.createUserContext('reset_user_2', {
    hello: true,
  });

  // Populate cache for both users
  console.log('Populating cache for User 1:');
  const decision1 = await userContext1.decideAsync(FLAG_KEY);
  printDecision('User 1 Decision', decision1);

  console.log('\nPopulating cache for User 2:');
  const decision2 = await userContext2.decideAsync(FLAG_KEY);
  printDecision('User 2 Decision', decision2);

  // Reset entire cache
  console.log('\nResetting entire CMAB cache:');
  const decision3 = await userContext1.decideAsync(FLAG_KEY, [OptimizelyDecideOption.RESET_CMAB_CACHE]);
  printDecision('User 1 after RESET', decision3);

  // Check if User 2's cache was also cleared
  console.log('\nUser 2 after cache reset (should refetch):');
  const decision4 = await userContext2.decideAsync(FLAG_KEY);
  printDecision('User 2 after reset', decision4);
}

/**
 * Test 6: INVALIDATE_USER_CMAB_CACHE option
 * Expected:
 * 1. User 1: "hello" → CMAB API call → Cache stored for User 1
 * 2. User 2: "hello" → CMAB API call → Cache stored for User 2
 * 3. User 1: INVALIDATE_USER_CMAB_CACHE → Clears only User 1's cache → New CMAB API call for User 1
 * 4. User 2: Same "hello" → User 2's cache preserved → Cache hit (no API call)
 */
async function testInvalidateUserCacheOption(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: INVALIDATE_USER_CMAB_CACHE Option ---');

  // Setup two different users
  const userContext1 = optimizelyClient.createUserContext('invalidate_user_1', {
    hello: true,
  });

  const userContext2 = optimizelyClient.createUserContext('invalidate_user_2', {
    hello: true,
  });

  // Populate cache for both users
  console.log('Populating cache for User 1:');
  const decision1 = await userContext1.decideAsync(FLAG_KEY);
  printDecision('User 1 Initial', decision1);

  console.log('\nPopulating cache for User 2:');
  const decision2 = await userContext2.decideAsync(FLAG_KEY);
  printDecision('User 2 Initial', decision2);

  // Invalidate only User 1's cache
  console.log("\nInvalidating User 1's cache only:");
  const decision3 = await userContext1.decideAsync(FLAG_KEY, [
    OptimizelyDecideOption.INVALIDATE_USER_CMAB_CACHE,
  ]);
  printDecision('User 1 after INVALIDATE', decision3);

  // Check if User 2's cache is still valid
  console.log('\nUser 2 after User 1 invalidation (should use cache):');
  const decision4 = await userContext2.decideAsync(FLAG_KEY);
  printDecision('User 2 still cached', decision4);
}

/**
 * Test 7: Concurrent requests for same user - verify thread safety
 * Expected: The Go SDK uses mutex-based cache synchronization (sync.RWMutex)
 * EXPECTED BEHAVIOR: 1 CMAB API call + 4 cache hits
 *   - First goroutine makes CMAB API call and stores result in cache
 *   - Other 4 goroutines wait for mutex, then find cached result and use it
 *   - Logs should show: 1 "Fetching CMAB decision" + 4 "Returning cached CMAB decision"
 * 
 * ACTUAL BEHAVIOR: If you see 5 separate API calls, this may indicate:
 *   - Race condition in cache check/write logic
 *   - Cache key generation issues
 *   - Timing issue where all requests start before first completes
 * 
 * Key requirement regardless: all goroutines return same variation for consistency
 */
async function testConcurrentRequests(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: Concurrent Requests ---');

  const userContext1 = optimizelyClient.createUserContext('concurrent_user', {
    hello: true
  });

  // Launch 5 concurrent requests
  console.log('Launching 5 concurrent decide calls...');
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(userContext1.decideAsync(FLAG_KEY));
  }

  const decisions = await Promise.all(promises);

  // Check variations
  const variations = new Map<string, number>();
  decisions.forEach((decision: OptimizelyDecision, index: number) => {
    console.log(`  Goroutine ${index} completed - Variation: ${decision.variationKey}`);
    const key = decision.variationKey || 'null';
    variations.set(key, (variations.get(key) || 0) + 1);
  });

  console.log('\nResults:');
  variations.forEach((count, variation) => {
    console.log(`  Variation '${variation}': ${count} times`);
  });

  if (variations.size === 1) {
    console.log('✓ Concurrent handling correct: All returned same variation');
  } else {
    console.log('✗ Issue with concurrent handling: Different variations returned');
  }

  console.log('\nExpected: Only 1 CMAB API call, all return same variation');
}

/**
 * Test 8: Fallback when user doesn't qualify for CMAB
 */
async function testFallbackWhenNotQualified(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: Fallback When Not Qualified for CMAB ---');

  // User with attributes that don't match CMAB audience
  const userContext = optimizelyClient.createUserContext('fallback_user', {});

  const decision = await userContext.decide(FLAG_KEY);
  printDecision('Non-CMAB User', decision);

  console.log('\nExpected: No CMAB API call in debug logs above, falls through to next rule');
}

/**
 * Test 9: Traffic allocation check with 50% traffic allocation (0 - 5000) - test_user_1
 */
async function testTrafficAllocation(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: Traffic Allocation Check ---');

  // User in traffic allocation (test_user_1)
  const userContext1 = optimizelyClient.createUserContext(USER_NOT_BUCKETED, {
    hello: true,
  });

  const decision1 = await userContext1.decideAsync(FLAG_KEY);
  printDecision('User in Traffic', decision1);

  // User not in traffic allocation (test_user_99)
  const userContext2 = optimizelyClient.createUserContext(USER_QUALIFIED, {
    hello: true
  });

  const decision2 = await userContext2.decideAsync(FLAG_KEY);
  printDecision('User not in Traffic', decision2);

  console.log('\nExpected: Only first user triggers CMAB API call');
}

/**
 * Test 10: Event tracking with CMAB UUID
 */
async function testEventTracking(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: Event Tracking with CMAB UUID ---');

  const userContext = optimizelyClient.createUserContext('test', {
    hello: true
  });

  // Make CMAB decision
  const decision = await userContext.decideAsync(FLAG_KEY);
  printDecision('Decision for Events', decision);

  // Track a conversion event
  userContext.trackEvent('event1');

  console.log("\nConversion event tracked: 'event1'");
  console.log('Expected: Impression events contain CMAB UUID, conversion events do NOT contain CMAB UUID');
  console.log('Check event processor logs for CMAB UUID only in impression events');
}

/**
 * Test 11: Performance benchmarks
 * Expected: Cache hits should be significantly faster than API calls
 *   - First API call: ~160ms (network latency + CMAB processing)
 *   - Cached calls: ~85µs average (memory lookup only)
 *   - Performance improvement: ~1,880x faster for cached calls
 *   - Targets: API calls <500ms, cached calls <10ms
 *   - Results: ✓ API: 160ms < 500ms, ✓ Cache: 85µs < 10ms
 * 
 * This validates caching performance and responsiveness under load
 */
async function testPerformanceBenchmarks(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: Performance Benchmarks ---');

  const userContext = optimizelyClient.createUserContext('perf_user', {
    hello: true,
  });

  // Measure first call (API call)
  const start = Date.now();
  const decision1 = await userContext.decideAsync(FLAG_KEY);
  const apiDuration = Date.now() - start;

  printDecision('First Call (API)', decision1);
  console.log(`API call duration: ${apiDuration}ms`);

  // Measure cached calls
  const cachedDurations: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await userContext.decideAsync(FLAG_KEY);
    cachedDurations.push(Date.now() - start);
  }

  const avgCached = cachedDurations.reduce((sum, d) => sum + d, 0) / cachedDurations.length;

  console.log(`Average cached call duration: ${avgCached.toFixed(2)}ms (10 calls)`);
  console.log('\nPerformance Targets:');
  console.log(`- Cached calls: <10ms (actual: ${avgCached.toFixed(2)}ms)`);
  console.log(`- API calls: <500ms (actual: ${apiDuration}ms)`);

  if (avgCached < 10) {
    console.log('✓ Cached performance: PASS');
  } else {
    console.log('✗ Cached performance: FAIL');
  }

  if (apiDuration < 500) {
    console.log('✓ API performance: PASS');
  } else {
    console.log('✗ API performance: FAIL');
  }
}

/**
 * Test 12: Cache expiry - verify TTL-based cache invalidation
 * Expected: Cached decisions expire after TTL and trigger new API calls
 *   - Initial call: CMAB API call creates cache entry with timestamp
 *   - Immediate follow-up: Returns cached result (within TTL)
 *   - After TTL expires: New CMAB API call (cache entry invalid)
 *   - Current result: Still cached after 2s (expected - TTL is ~30min)
 *   - Real expiry test: Requires waiting for full TTL duration
 *   - Default TTL from cmab.NewDefaultConfig() is 30 minutes
 * 
 * This validates TTL-based cache expiration logic
 */
async function testCacheExpiry(optimizelyClient: Client): Promise<void> {
  console.log('\n--- Test: Cache Expiry (Simulated) ---');

  const userContext = optimizelyClient.createUserContext('expiry_user', {
    hello: true,
  });

  // First decision
  console.log('Decision at T=0:');
  const decision1 = await userContext.decideAsync(FLAG_KEY);
  printDecision('Initial Decision', decision1);

  // Simulate time passing (in real scenario this would be 30+ minutes)
  console.log('\nSimulating cache expiry...');
  await sleep(6000);
  // For actual testing, you would need to wait 30+ minutes or manipulate cache TTL

  console.log('Decision after simulated expiry:');
  const decision2 = await userContext.decideAsync(FLAG_KEY);
  printDecision('After Expiry', decision2);

  console.log('\nNote: Real cache expiry test requires 30+ minute wait');
  console.log('Expected: New CMAB API call after expiry');
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const testArg = args.find(arg => arg.startsWith('--test='));
  const testCase = testArg ? testArg.split('=')[1] : 'all';

  console.log('=== CMAB Testing Suite for JavaScript SDK ===');
  console.log('Testing CMAB with rc environment');
  console.log(`SDK Key: ${SDK_KEY}`);
  console.log(`Flag Key: ${FLAG_KEY}\n`);

  // Create Optimizely client
  console.log('Initializing Optimizely SDK...');

  // Create config manager
  const configManager = createPollingProjectConfigManager({
    sdkKey: SDK_KEY,
    // urlTemplate: 'https://optimizely-staging.s3.amazonaws.com/datafiles/%s.json',
  });

  const eventProcessor = createForwardingEventProcessor()

  const logger = createLogger({
    level: DEBUG,
  });

  const optimizelyClient = createInstance({
    projectConfigManager: configManager,
    logger,
    eventProcessor,
    cmab: {
      cacheTtl: 5000
    }
  });

  // Wait for datafile to load
  console.log('Waiting for datafile to load...');
  await optimizelyClient.onReady();
  console.log('✓ SDK initialized\n');

  // Run tests based on test case
  try {
    switch (testCase) {
      case 'basic':
        await testBasicCMAB(optimizelyClient);
        break;
      case 'cache_hit':
        await testCacheHit(optimizelyClient);
        break;
      case 'cache_miss':
        await testCacheMissOnAttributeChange(optimizelyClient);
        break;
      case 'ignore_cache':
        await testIgnoreCacheOption(optimizelyClient);
        break;
      case 'reset_cache':
        await testResetCacheOption(optimizelyClient);
        break;
      case 'invalidate_user':
        await testInvalidateUserCacheOption(optimizelyClient);
        break;
      case 'concurrent':
        await testConcurrentRequests(optimizelyClient);
        break;
      case 'fallback':
        await testFallbackWhenNotQualified(optimizelyClient);
        break;
      case 'traffic':
        await testTrafficAllocation(optimizelyClient);
        break;
      case 'event_tracking':
        await testEventTracking(optimizelyClient);
        break;
      case 'performance':
        await testPerformanceBenchmarks(optimizelyClient);
        break;
      case 'cache_expiry':
        await testCacheExpiry(optimizelyClient);
        break;
      case 'all':
        console.log('Running all tests...\n');
        await testBasicCMAB(optimizelyClient);
        await testCacheHit(optimizelyClient);
        await testCacheMissOnAttributeChange(optimizelyClient);
        await testIgnoreCacheOption(optimizelyClient);
        await testResetCacheOption(optimizelyClient);
        await testInvalidateUserCacheOption(optimizelyClient);
        await testConcurrentRequests(optimizelyClient);
        await testFallbackWhenNotQualified(optimizelyClient);
        await testTrafficAllocation(optimizelyClient);
        await testEventTracking(optimizelyClient);
        await testPerformanceBenchmarks(optimizelyClient);
        await testCacheExpiry(optimizelyClient);
        break;
      default:
        console.log(`Unknown test case: ${testCase}`);
        console.log('\nAvailable test cases:');
        console.log('  basic, cache_hit, cache_miss, ignore_cache, reset_cache,');
        console.log('  invalidate_user, concurrent, fallback, traffic,');
        console.log('  event_tracking, performance, cache_expiry, all');
        process.exit(1);
    }

    console.log('\n===============================');
    console.log('Tests completed!');
    console.log('===============================\n');

    // Clean up
    optimizelyClient.close();
  } catch (error) {
    console.error('Error running tests:', error);
    optimizelyClient.close();
    process.exit(1);
  }
}

// Run main function
main();
