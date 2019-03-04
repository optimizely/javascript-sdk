/// <reference types="jest" />
const mockTimestamp = 'timestamp'
const mockUuid = 'uuid-uuid-uuid-uuid'

jest.mock('@optimizely/js-sdk-utils', () => ({
  __esModule: true,
  getTimestamp: jest.fn().mockReturnValue(mockTimestamp),
  generateUUID: jest.fn().mockReturnValue(mockUuid),
}))

import { ProjectConfig, TestProjectConfig, Event } from '@optimizely/js-sdk-models'
import {
  buildVisitorAttributes,
  getRevenueValue,
  getEventValue,
  buildConversionEvent,
} from '../src/events'

describe('events', () => {
  describe('getRevenueValue', () => {
    it('getRevenueValue({ revenue: 1000 }) => 1000', () => {
      expect(getRevenueValue({ revenue: 1000 })).toBe(1000)
    })

    it('getRevenueValue({ revenue: "1000" }) => 1000', () => {
      expect(getRevenueValue({ revenue: '1000' })).toBe(1000)
    })

    it('getRevenueValue({ revenue: "string" }) => null', () => {
      expect(getRevenueValue({ revenue: 'string' })).toBe(null)
    })

    it('getRevenueValue({ revenue: 1000, otherTag: "foo" }) => null', () => {
      expect(getRevenueValue({ revenue: 1000, otherTag: 'foo' })).toBe(1000)
    })

    it('getRevenueValue({}) => null', () => {
      expect(getRevenueValue({})).toBe(null)
    })
  })

  describe('getEventValue', () => {
    it('getEventValue({ value: 1000 }) => 1000', () => {
      expect(getEventValue({ value: 1000 })).toBe(1000)
    })

    it('getEventValue({ value: "1000" }) => 1000', () => {
      expect(getEventValue({ value: '1000' })).toBe(1000)
    })

    it('getEventValue({ value: "string" }) => null', () => {
      expect(getEventValue({ value: 'string' })).toBe(null)
    })

    it('getEventValue({ value: 1000, otherTag: "foo" }) => null', () => {
      expect(getEventValue({ value: 1000, otherTag: 'foo' })).toBe(1000)
    })

    it('getEventValue({}) => null', () => {
      expect(getEventValue({})).toBe(null)
    })
  })

  describe('buildVisitorAttributes', () => {
    let projectConfig: ProjectConfig
    beforeEach(() => {
      projectConfig = new TestProjectConfig({
        attributes: [{ id: '1', key: 'plan_type' }, { id: '2', key: 'membership_type' }],
      })
    })

    it('should return an array of VisitorAttribute for attributes in projectConfig and prune the rest', () => {
      const attributes = {
        plan_type: 'bronze',
        membership_type: 'lifetime',
        other: 'foo',
      }
      const visitorAttributes = buildVisitorAttributes(attributes, projectConfig)

      expect(visitorAttributes).toEqual([
        {
          entityId: '1',
          key: 'plan_type',
          value: 'bronze',
        },

        {
          entityId: '2',
          key: 'membership_type',
          value: 'lifetime',
        },
      ])
    })
  })

  describe('buildImpressionEvent', () => {
    let projectConfig: ProjectConfig
    const clientName = 'node-sdk'
    const clientVersion = '3.0.0'
    const projectId = '123'
    const accountId = '456'
    const anonymizeIP = true
    const botFiltering = true
    const revision = '69'
    const attributes = [
      { id: '1', key: 'plan_type' },
      { id: '2', key: 'membership_type' },
    ]

    const event: Event = {
      key: 'eventKey',
      id: 'eventId',
    }

    beforeEach(() => {
      projectConfig = new TestProjectConfig({
        projectId,
        accountId,
        anonymizeIP,
        botFiltering,
        revision,
        attributes,
      })
    })

    it('should build an impression event with no revenue, value or tags', () => {
      const userId = 'jordan'
      const userAttributes = {
        plan_type: 'bronze',
        membership_type: 'lifetime',
        other: 'foo',
      }

      const result = buildConversionEvent({
        projectConfig,
        event,
        userId,
        userAttributes,
        eventTags: {},
        clientName,
        clientVersion,
      })

      expect(result).toEqual({
        type: 'conversion',
        timestamp: mockTimestamp,
        uuid: mockUuid,
        user: {
          id: 'jordan',
          attributes: [
            {
              entityId: '1',
              key: 'plan_type',
              value: 'bronze',
            },

            {
              entityId: '2',
              key: 'membership_type',
              value: 'lifetime',
            },
          ],
        },

        context: {
          projectId,
          accountId,
          revision,
          clientName,
          clientVersion,
          anonymizeIP,
          botFiltering,
        },

        event: {
          id: 'eventId',
          key: 'eventKey',
        },
        revenue: null,
        value: null,
        tags: {},
      })
    })

    it('should build an impression event with eventTags', () => {
      const userId = 'jordan'
      const userAttributes = {
        plan_type: 'bronze',
        membership_type: 'lifetime',
        other: 'foo',
      }
      const eventTags = {
        revenue: '1000',
        value: 1.2,
        otherTag: 'foo',
      }

      const result = buildConversionEvent({
        projectConfig,
        event,
        userId,
        userAttributes,
        eventTags,
        clientName,
        clientVersion,
      })

      expect(result).toEqual({
        type: 'conversion',
        timestamp: mockTimestamp,
        uuid: mockUuid,
        user: {
          id: 'jordan',
          attributes: [
            {
              entityId: '1',
              key: 'plan_type',
              value: 'bronze',
            },

            {
              entityId: '2',
              key: 'membership_type',
              value: 'lifetime',
            },
          ],
        },

        context: {
          projectId,
          accountId,
          revision,
          clientName,
          clientVersion,
          anonymizeIP,
          botFiltering,
        },

        event: {
          id: 'eventId',
          key: 'eventKey',
        },
        revenue: 1000,
        value: 1.2,
        tags: eventTags,
      })
    })
  })
})
