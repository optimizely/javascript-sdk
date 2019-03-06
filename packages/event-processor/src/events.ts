export type VisitorAttribute = {
  entityId: string
  key: string
  value: string | number | boolean
}

export interface BaseEvent {
  type: 'impression' | 'conversion'
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
