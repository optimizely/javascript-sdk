import { EventTags, ConversionEvent, ImpressionEvent, VisitorAttribute } from '../events'
import { ProcessableEvents } from '../eventProcessor'

const ACTIVATE_EVENT_KEY = 'campaign_activated'
const CUSTOM_ATTRIBUTE_FEATURE_TYPE = 'custom'
const BOT_FILTERING_KEY = '$opt_bot_filtering'

export type EventV1 = {
  account_id: string
  project_id: string
  revision: string
  client_name: string
  client_version: string
  anonymize_ip: boolean
  enrich_decisions: boolean
  visitors: Visitor[]
}

type Visitor = {
  snapshots: Visitor.Snapshot[]
  visitor_id: string
  attributes: Visitor.Attribute[]
}

namespace Visitor {
  type AttributeType = 'custom'

  export type Attribute = {
    // attribute id
    entity_id: string
    // attribute key
    key: string
    type: AttributeType
    value: string | number | boolean
  }

  export type Snapshot = {
    decisions?: Decision[]
    events: SnapshotEvent[]
  }

  type Decision = {
    campaign_id: string | null
    experiment_id: string | null
    variation_id: string | null
  }

  export type SnapshotEvent = {
    entity_id: string | null
    timestamp: number
    uuid: string
    key: string
    revenue?: number
    value?: number
    tags?: EventTags
  }
}



type Attributes = {
  [key: string]: string | number | boolean
}

/**
 * Given an array of batchable Decision or ConversionEvent events it returns
 * a single EventV1 with proper batching
 *
 * @param {ProcessableEvents[]} events
 * @returns {EventV1}
 */
export function makeBatchedEventV1(events: ProcessableEvents[]): EventV1 {
  const visitors: Visitor[] = []
  const data = events[0]

  events.forEach(event => {
    if (event.type === 'conversion' || event.type === 'impression') {
      let visitor = makeVisitor(event)

      if (event.type === 'impression') {
        visitor.snapshots.push(makeDecisionSnapshot(event))
      } else if (event.type === 'conversion') {
        visitor.snapshots.push(makeConversionSnapshot(event))
      }

      visitors.push(visitor)
    }
  })

  return {
    client_name: data.context.clientName,
    client_version: data.context.clientVersion,

    account_id: data.context.accountId,
    project_id: data.context.projectId,
    revision: data.context.revision,
    anonymize_ip: data.context.anonymizeIP,
    enrich_decisions: true,

    visitors,
  }
}

function makeConversionSnapshot(conversion: ConversionEvent): Visitor.Snapshot {
  let tags: EventTags = {
    ...conversion.tags,
  }

  delete tags['revenue']
  delete tags['value']

  const event: Visitor.SnapshotEvent = {
    entity_id: conversion.event.id,
    key: conversion.event.key,
    timestamp: conversion.timestamp,
    uuid: conversion.uuid,
  }

  if (conversion.tags) {
    event.tags = conversion.tags
  }

  if (conversion.value) {
    event.value = conversion.value
  }

  if (conversion.revenue) {
    event.revenue = conversion.revenue
  }

  return {
    events: [event],
  }
}

function makeDecisionSnapshot(event: ImpressionEvent): Visitor.Snapshot {
  const { layer, experiment, variation } = event
  let layerId = layer ? layer.id : null
  let experimentId = experiment ? experiment.id : null
  let variationId = variation ? variation.id : null

  return {
    decisions: [
      {
        campaign_id: layerId,
        experiment_id: experimentId,
        variation_id: variationId,
      },
    ],
    events: [
      {
        entity_id: layerId,
        timestamp: event.timestamp,
        key: ACTIVATE_EVENT_KEY,
        uuid: event.uuid,
      },
    ],
  }
}

function makeVisitor(data: ImpressionEvent | ConversionEvent): Visitor {
  const visitor: Visitor = {
    snapshots: [],
    visitor_id: data.user.id,
    attributes: [],
  }

  data.user.attributes.forEach(attr => {
    visitor.attributes.push({
      entity_id: attr.entityId,
      key: attr.key,
      type: 'custom' as 'custom', // tell the compiler this is always string "custom"
      value: attr.value,
    })
  })

  if (typeof data.context.botFiltering === 'boolean') {
    visitor.attributes.push({
      entity_id: BOT_FILTERING_KEY,
      key: BOT_FILTERING_KEY,
      type: CUSTOM_ATTRIBUTE_FEATURE_TYPE,
      value: data.context.botFiltering,
    })
  }
  return visitor
}

/**
 * Event for usage with v1 logtier
 *
 * @export
 * @interface EventBuilderV1
 */

export function buildImpressionEventV1(data: ImpressionEvent): EventV1 {
  const visitor = makeVisitor(data)
  visitor.snapshots.push(makeDecisionSnapshot(data))

  return {
    client_name: data.context.clientName,
    client_version: data.context.clientVersion,

    account_id: data.context.accountId,
    project_id: data.context.projectId,
    revision: data.context.revision,
    anonymize_ip: data.context.anonymizeIP,
    enrich_decisions: true,

    visitors: [visitor],
  }
}

export function buildConversionEventV1(data: ConversionEvent): EventV1 {
  const visitor = makeVisitor(data)
  visitor.snapshots.push(makeConversionSnapshot(data))

  return {
    client_name: data.context.clientName,
    client_version: data.context.clientVersion,

    account_id: data.context.accountId,
    project_id: data.context.projectId,
    revision: data.context.revision,
    anonymize_ip: data.context.anonymizeIP,
    enrich_decisions: true,

    visitors: [visitor],
  }
}
