import { OptimizelySDKWrapper, VariableValuesObject } from '@optimizely/js-web-sdk'

export type UserAttributes = { [attribute: string]: any }

type EventTags = { [tagKey: string]: boolean | number | string }

export interface UserWrappedOptimizelySDK extends OptimizelySDKWrapper {
  activate(
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: UserAttributes,
  ): string | null

  getVariation(
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: UserAttributes,
  ): string | null

  getFeatureVariables(
    featureKey: string,
    overrideUserId?: string,
    overrideAttributes?: UserAttributes,
  ): VariableValuesObject

  getFeatureVariableString(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: UserAttributes,
  ): string | null

  getFeatureVariableInteger(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: UserAttributes,
  ): number | null

  getFeatureVariableBoolean(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: UserAttributes,
  ): boolean | null

  getFeatureVariableDouble(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: UserAttributes,
  ): number | null

  isFeatureEnabled(
    featureKey: string,
    overrideUserId?: string,
    overrideAttributes?: UserAttributes,
  ): boolean

  track(
    eventKey: string,
    overrideUserId?: string | EventTags,
    overrideAttributes?: UserAttributes,
    eventTags?: EventTags,
  ): void
}


/**
 * Wrapper to memoize the userId / userAttributes around an OptimizelySDKWrapper instance
 *
 * @param {{
 *   instance: OptimizelySDKWrapper
 *   userId: string
 *   attributes?: UserAttributes
 * }} {
 *   instance,
 *   userId,
 *   attributes,
 * }
 * @returns
 */
export function createUserWrapper({
  instance,
  userId,
  userAttributes,
}: {
  instance: OptimizelySDKWrapper
  userId: string
  userAttributes?: UserAttributes
}): UserWrappedOptimizelySDK {
  function getUserIdAndAttributes(
    overrideUserId?: string,
    overrideAttributes?: UserAttributes,
  ): [string, UserAttributes] {
    const finalUserId = overrideUserId !== undefined ? overrideUserId : userId
    const finalUserAttributes =
      overrideAttributes !== undefined ? overrideAttributes : userAttributes

    return [finalUserId, finalUserAttributes || {}]
  }

  return {
    ...instance,

    activate(
      experimentKey: string,
      overrideUserId?: string,
      overrideAttributes?: UserAttributes,
    ) {
      return instance.activate(
        experimentKey,
        ...getUserIdAndAttributes(overrideUserId, overrideAttributes),
      )
    },

    getVariation(
      experimentKey: string,
      overrideUserId?: string,
      overrideAttributes?: UserAttributes,
    ) {
      return instance.getVariation(
        experimentKey,
        ...getUserIdAndAttributes(overrideUserId, overrideAttributes),
      )
    },

    getFeatureVariables(
      featureKey: string,
      overrideUserId?: string,
      overrideAttributes?: UserAttributes,
    ) {
      return instance.getFeatureVariables(
        featureKey,
        ...getUserIdAndAttributes(overrideUserId, overrideAttributes),
      )
    },

    getFeatureVariableInteger(
      featureKey: string,
      variableKey: string,
      overrideUserId?: string,
      overrideAttributes?: UserAttributes,
    ) {
      return instance.getFeatureVariableInteger(
        featureKey,
        variableKey,
        ...getUserIdAndAttributes(overrideUserId, overrideAttributes),
      )
    },

    getFeatureVariableString(
      featureKey: string,
      variableKey: string,
      overrideUserId?: string,
      overrideAttributes?: UserAttributes,
    ) {
      return instance.getFeatureVariableString(
        featureKey,
        variableKey,
        ...getUserIdAndAttributes(overrideUserId, overrideAttributes),
      )
    },

    getFeatureVariableBoolean(
      featureKey: string,
      variableKey: string,
      overrideUserId?: string,
      overrideAttributes?: UserAttributes,
    ) {
      return instance.getFeatureVariableBoolean(
        featureKey,
        variableKey,
        ...getUserIdAndAttributes(overrideUserId, overrideAttributes),
      )
    },

    getFeatureVariableDouble(
      featureKey: string,
      variableKey: string,
      overrideUserId?: string,
      overrideAttributes?: UserAttributes,
    ) {
      return instance.getFeatureVariableDouble(
        featureKey,
        variableKey,
        ...getUserIdAndAttributes(overrideUserId, overrideAttributes),
      )
    },

    isFeatureEnabled(
      featureKey: string,
      overrideUserId?: string,
      overrideAttributes?: UserAttributes,
    ) {
      return instance.isFeatureEnabled(
        featureKey,
        ...getUserIdAndAttributes(overrideUserId, overrideAttributes),
      )
    },

    track(
      eventKey: string,
      overrideUserId?: string | EventTags,
      overrideAttributes?: UserAttributes,
      eventTags?: EventTags,
    ) {
      if (typeof overrideUserId !== 'undefined' && typeof overrideUserId !== 'string') {
        eventTags = overrideUserId
        overrideUserId = undefined
        overrideAttributes = undefined
      }
      const [userId, attributes] = getUserIdAndAttributes(
        overrideUserId,
        overrideAttributes,
      )

      return instance.track(eventKey, userId, attributes, eventTags)
    },
  } as UserWrappedOptimizelySDK
}
