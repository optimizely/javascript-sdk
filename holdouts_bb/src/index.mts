import { createInstance, createPollingProjectConfigManager, createForwardingEventProcessor, eventDispatcher, DEBUG, createLogger } from '@optimizely/optimizely-sdk';

async function main() {
  try {
    console.log("🚀 Starting Optimizely SDK test...\n");
    
    // Create static project config manager with test datafile
    const projectConfigManager = createPollingProjectConfigManager({
      sdkKey: 'WnRFQEiC9BN6aWjBP78pf'
    });
    
    // Create forwarding event processor for immediate event processing
    const eventProcessor = createForwardingEventProcessor({
      dispatchEvent: (event: any) => {
        console.log("📤 Event dispatched:", JSON.stringify(event));
        return eventDispatcher.dispatchEvent(event);
      }
    });
    
    // Create Optimizely client instance
    const optimizelyClient = createInstance({
      projectConfigManager,
      eventProcessor,
      logger: createLogger({ level: DEBUG }),
    });
    
    console.log("✅ Optimizely client created successfully!");
    
    // Wait for SDK to be ready
    await optimizelyClient.onReady();
    console.log("✅ SDK is ready!");
    
    // Create user context
    const userId = "test_user_123";
    const userContext = optimizelyClient.createUserContext(userId, {
      ho: 3,
    });
    
    console.log(`📱 Created user context for user: ${userId}`);
    
    // Make a decision for flag_1
    console.log("\n🎯 Making decision for flag_1...");
    const decision = userContext.decide("flag_1");
    
    // Print the decision result
    console.log("\n📊 Decision Result:");
    console.log(`   Flag Key: ${decision.flagKey}`);
    console.log(`   Enabled: ${decision.enabled}`);
    console.log(`   Variation Key: ${decision.variationKey}`);
    console.log(`   Rule Key: ${decision.ruleKey}`);
    console.log(`   User Context: ${decision.userContext?.getUserId()}`);
    console.log(`   Variables: ${JSON.stringify(decision.variables, null, 2)}`);
    console.log(`   Reasons: ${JSON.stringify(decision.reasons, null, 2)}`);
    
    // Clean up
    await optimizelyClient.close();
    console.log("\n🧹 SDK cleaned up successfully!");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the main function
main();