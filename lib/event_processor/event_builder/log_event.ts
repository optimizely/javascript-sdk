/**
 * Copyright 2021-2022, 2024, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ConversionEvent, ImpressionEvent, UserEvent } from './user_event';

import { CONTROL_ATTRIBUTES } from '../../utils/enums';

import { LogEvent } from '../event_dispatcher/event_dispatcher';
import { EventTags } from '../../shared_types';
import { Region } from '../../project_config/project_config';

const ACTIVATE_EVENT_KEY = 'campaign_activated'
const CUSTOM_ATTRIBUTE_FEATURE_TYPE = 'custom'

export const logxEndpoint: Record<Region, string> = {
  US: 'https://logx.optimizely.com/v1/events',
  EU: 'https://eu.logx.optimizely.com/v1/events',
}

export type EventBatch = {
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
  snapshots: Snapshot[]
  visitor_id: string
  attributes: Attribute[]
}

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
  metadata: Metadata
}

type Metadata = {
  flag_key: string;
  rule_key: string;
  rule_type: string;
  variation_key: string;
  enabled: boolean;
  cmab_uuid?: string;
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

/**
 * Given an array of batchable Decision or ConversionEvent events it returns
 * a single EventV1 with proper batching
 *
 * @param {UserEvent[]} events
 * @returns {EventBatch}
 */
export function makeEventBatch(events: UserEvent[]): EventBatch {
  const visitors: Visitor[] = []
  const data = events[0]

  events.forEach(event => {
    if (event.type === 'conversion' || event.type === 'impression') {
      const visitor = makeVisitor(event)

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

function makeConversionSnapshot(conversion: ConversionEvent): Snapshot {
  const tags: EventTags = {
    ...conversion.tags,
  }

  delete tags['revenue']
  delete tags['value']

  const event: SnapshotEvent = {
    entity_id: conversion.event.id,
    key: conversion.event.key,
    timestamp: conversion.timestamp,
    uuid: conversion.uuid,
  }

  if (conversion.tags) {
    event.tags = conversion.tags
  }

  if (conversion.value != null) {
    event.value = conversion.value
  }

  if (conversion.revenue != null) {
    event.revenue = conversion.revenue
  }

  return {
    events: [event],
  }
}

function makeDecisionSnapshot(event: ImpressionEvent): Snapshot {
  const { layer, experiment, variation, ruleKey, flagKey, ruleType, enabled, cmabUuid } = event
  const layerId = layer ? layer.id : null
  const experimentId = experiment?.id ?? ''
  const variationId = variation?.id ?? ''
  const variationKey = variation ? variation.key : ''

  return {
    decisions: [
      {
        campaign_id: layerId,
        experiment_id: experimentId,
        variation_id: variationId,
        metadata: {
          flag_key: flagKey,
          rule_key: ruleKey,
          rule_type: ruleType,
          variation_key: variationKey,
          enabled: enabled,
          cmab_uuid: cmabUuid,
        },
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
      type: 'custom' as const, // tell the compiler this is always string "custom"
      value: attr.value,
    })
  })

  if (typeof data.context.botFiltering === 'boolean') {
    visitor.attributes.push({
      entity_id: CONTROL_ATTRIBUTES.BOT_FILTERING,
      key: CONTROL_ATTRIBUTES.BOT_FILTERING,
      type: CUSTOM_ATTRIBUTE_FEATURE_TYPE,
      value: data.context.botFiltering,
    })
  }
  return visitor
}

export function buildLogEvent(events: UserEvent[]): LogEvent {
  const region = events[0]?.context.region || 'US';
  const url = logxEndpoint[region];

  return {
    url,
    httpVerb: 'POST',
    params: makeEventBatch(events),
  }
}
