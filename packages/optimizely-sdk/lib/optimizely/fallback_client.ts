import { Client, NotificationCenter, OptimizelyConfig } from "@optimizely/optimizely-sdk";

class FallbackNotificationCenter implements NotificationCenter {
  addNotificationListener(): number {
    return -1;
  }

  removeNotificationListener(): boolean {
    return false;
  }

  clearAllNotificationListeners(): void {
  }

  clearNotificationListeners(): void {
  }
}

class FallbackClient implements Client {
    public readonly notificationCenter: NotificationCenter = new FallbackNotificationCenter();

    private readonly fallbackPromise: Promise<{ success: boolean; reason?: string }> = Promise.resolve({
      success: false,
      reason: 'Fallback client'
    });

    activate(): string | null {
      return null;
    }

    track(): void {
    }

    getVariation(): string | null {
      return null;
    }

    setForcedVariation(): boolean {
      return false;
    }

    getForcedVariation(): string | null {
      return null;
    }

    isFeatureEnabled(): boolean {
      return false;
    }

    getEnabledFeatures(): string[] {
      return [];
    }

    getFeatureVariable(): unknown {
      return null;
    }

    getFeatureVariableBoolean(): boolean | null {
      return null;
    }

    getFeatureVariableDouble(): number | null {
      return null;
    }

    getFeatureVariableInteger(): number | null {
      return null;
    }

    getFeatureVariableString(): string | null {
      return null;
    }

    getFeatureVariableJson(): unknown {
      return null;
    }

    getAllFeatureVariables(): { [variableKey: string]: unknown } {
      return {};
    }

    getOptimizelyConfig(): OptimizelyConfig | null {
      return null;
    }

    onReady(): Promise<{ success: boolean; reason?: string }> {
      return this.fallbackPromise;
    }

    close(): Promise<{ success: boolean; reason?: string }> {
      return this.fallbackPromise;
    }
}

const fallbackClient = new FallbackClient();

export default fallbackClient;
