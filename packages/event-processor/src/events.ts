import { Event, ProjectConfig, UserAttributes } from '@optimizely/js-sdk-models'
import { getLogger } from '@optimizely/js-sdk-logging'
import { getTimestamp, generateUUID } from '@optimizely/js-sdk-utils'

const logger = getLogger('EventProcessor')
export const EVENT_REVENUE_KEY = 'revenue'
export const EVENT_VALUE_KEY = 'value'

export type VisitorAttribute = {
  entityId: string
  key: string
  value: string | number | boolean
}

export interface BaseEvent {
  type: 'impression' | 'conversion' | 'summary'
  timestamp: number
  uuid: string

  // projectConfig stuff
  context: {
    accountId: string
    projectId: string
    clientName: string
    clientVersion: string
    revision: string
    anonymizeIP: boolean
    botFiltering?: boolean
  }
}

export interface SummaryMetric {
  measurement: SummaryMetric.Measurement
  tags: SummaryMetric.Tags
  // for binary counters value === count
  value: SummaryMetric.Value
  count: number
}

export namespace SummaryMetric {
  export type Measurement = string
  export type Tags = { [key: string]: string }
  export type Value = string | boolean | number
}

export interface SummaryEvent extends BaseEvent {
  type: 'summary'

  summaries: SummaryMetric[]
}

export interface ImpressionEvent extends BaseEvent {
  type: 'impression'

  user: {
    id: string
    attributes: VisitorAttribute[]
  }

  layer: {
    id: string
  } | null

  experiment: {
    id: string
    key: string
  } | null

  variation: {
    id: string
    key: string
  } | null
}

export interface ConversionEvent extends BaseEvent {
  type: 'conversion'

  user: {
    id: string
    attributes: VisitorAttribute[]
  }

  event: {
    id: string
    key: string
  }

  revenue: number | null
  value: number | null
  tags: EventTags
}

export type EventTags = {
  [key: string]: string | number | null
}

export function buildConversionEvent(opts: {
  projectConfig: ProjectConfig
  event: Event
  userId: string
  userAttributes: UserAttributes
  eventTags: EventTags
  clientName: string
  clientVersion: string
}): ConversionEvent {
  const {
    event,
    userId,
    userAttributes,
    eventTags,
    projectConfig,
    clientName,
    clientVersion,
  } = opts

  const attributes = buildVisitorAttributes(userAttributes, projectConfig)

  return {
    type: 'conversion',
    timestamp: getTimestamp(),
    uuid: generateUUID(),

    user: {
      id: userId,
      attributes,
    },

    context: {
      accountId: projectConfig.getAccountId(),
      projectId: projectConfig.getProjectId(),
      revision: projectConfig.getRevision(),
      clientName: clientName,
      clientVersion: clientVersion,
      anonymizeIP: projectConfig.getAnonymizeIP(),
      botFiltering: projectConfig.getBotFiltering(),
    },

    event: {
      id: event.id,
      key: event.key,
    },

    revenue: getRevenueValue(eventTags),
    value: getEventValue(eventTags),
    tags: eventTags,
  }
}

export function buildVisitorAttributes(
  userAttributes: UserAttributes,
  projectConfig: ProjectConfig,
): VisitorAttribute[] {
  const attributes: VisitorAttribute[] = []

  Object.keys(userAttributes).forEach(key => {
    const value = userAttributes[key]
    const attribute = projectConfig.getAttributeByKey(key)
    if (attribute) {
      attributes.push({
        entityId: attribute.id,
        key,
        // TODO validate this is valid attribute value
        value: value as any,
      } as VisitorAttribute)
    } else {
      logger.warn(
        'Unrecognized attribute %s provided. Pruning before sending event to Optimizely.',
        key,
      )
    }
  })

  return attributes
}

export function getRevenueValue(eventTags: EventTags): number | null {
  if (!eventTags.hasOwnProperty(EVENT_REVENUE_KEY)) {
    return null
  }

  const parsed = parseInt(eventTags[EVENT_REVENUE_KEY] as string, 10)
  if (isNaN(parsed)) {
    logger.warn(
      'Failed to parse revenue value "%s" from event tags.',
      eventTags[EVENT_REVENUE_KEY],
    )
    return null
  }
  return parsed
}

export function getEventValue(eventTags: EventTags): number | null {
  if (!eventTags.hasOwnProperty(EVENT_VALUE_KEY)) {
    return null
  }

  const parsed = parseFloat(eventTags[EVENT_VALUE_KEY] as string)
  if (isNaN(parsed)) {
    logger.warn(
      'Failed to parse event value "%s" from event tags.',
      eventTags[EVENT_VALUE_KEY],
    )
    return null
  }
  return parsed
}
