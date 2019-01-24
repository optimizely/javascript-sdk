/// <reference types="jest" />
import * as React from 'react'
import * as Enzyme from 'enzyme'
import * as Adapter from 'enzyme-adapter-react-16'
Enzyme.configure({ adapter: new Adapter() })

import { Experiment, OptimizelyExperiment } from './Experiment'

import { mount } from 'enzyme'
import { OptimizelyProvider } from './Provider'
import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'
import { OptimizelyVariation } from './Variation'

async function sleep(timeout = 0): Promise<{}> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, timeout)
  })
}

describe('<OptimizelyExperiment>', () => {
  it('throws an error when not rendered in the context of an OptimizelyProvider', () => {
    expect(() => {
      // @ts-ignore
      mount(
        <OptimizelyExperiment experiment="experiment1">
          {variation => variation}
        </OptimizelyExperiment>,
      )
    }).toThrow()
  })

  it('should wait until onReady() is resolved then render result of activate', async () => {
    let resolver: any
    const variationKey = 'variationResult'
    const onReadyPromise = new Promise((resolve, reject) => {
      resolver = {
        reject,
        resolve,
      }
    })

    const optimizelyMock = ({
      onReady: jest.fn().mockImplementation(config => onReadyPromise),
      activate: jest.fn().mockImplementation(experimentKey => variationKey),
    } as unknown) as OptimizelySDKWrapper

    const component = mount(
      <OptimizelyProvider
        optimizely={optimizelyMock}
        timeout={100}
        userId="jordan"
        userAttributes={{ plan_type: 'bronze' }}
      >
        <OptimizelyExperiment experiment="experiment1">
          {variation => variation}
        </OptimizelyExperiment>
      </OptimizelyProvider>,
    )

    expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 })
    // while it's waiting for onReady()
    expect(component.text()).toBe(null)
    resolver.resolve()

    await sleep()

    expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', 'jordan', {
      plan_type: 'bronze',
    })
    expect(component.text()).toBe(variationKey)
  })

  it('should render using <OptimizelyVariation> when the variationKey matches', async () => {
    let resolver: any
    const variationKey = 'variationResult'
    const onReadyPromise = new Promise((resolve, reject) => {
      resolver = {
        reject,
        resolve,
      }
    })

    const optimizelyMock = ({
      onReady: jest.fn().mockImplementation(config => onReadyPromise),
      activate: jest.fn().mockImplementation(experimentKey => variationKey),
    } as unknown) as OptimizelySDKWrapper

    const component = mount(
      <OptimizelyProvider optimizely={optimizelyMock} userId="jordan">
        <OptimizelyExperiment experiment="experiment1">
          <OptimizelyVariation variation="otherVariation">
            other variation
          </OptimizelyVariation>
          <OptimizelyVariation variation="variationResult">
            correct variation
          </OptimizelyVariation>
          <OptimizelyVariation default>default variation</OptimizelyVariation>
        </OptimizelyExperiment>
      </OptimizelyProvider>,
    )

    // while it's waiting for onReady()
    expect(component.text()).toBe(null)
    resolver.resolve()

    await sleep()

    expect(component.text()).toBe('correct variation')
  })

  it('should render using <OptimizelyVariation default>', async () => {
    let resolver: any
    const variationKey = 'variationResult'
    const onReadyPromise = new Promise((resolve, reject) => {
      resolver = {
        reject,
        resolve,
      }
    })

    const optimizelyMock = ({
      onReady: jest.fn().mockImplementation(config => onReadyPromise),
      activate: jest.fn().mockImplementation(experimentKey => variationKey),
    } as unknown) as OptimizelySDKWrapper

    const component = mount(
      <OptimizelyProvider optimizely={optimizelyMock} userId="jordan">
        <OptimizelyExperiment experiment="experiment1">
          <OptimizelyVariation variation="otherVariation">
            other variation
          </OptimizelyVariation>
          <OptimizelyVariation default>default variation</OptimizelyVariation>
        </OptimizelyExperiment>
      </OptimizelyProvider>,
    )

    // while it's waiting for onReady()
    expect(component.text()).toBe(null)
    resolver.resolve()

    await sleep()

    expect(component.text()).toBe('default variation')
  })

  it('should render null when no default or matching variation is provided', async () => {
    let resolver: any
    const variationKey = 'variationResult'
    const onReadyPromise = new Promise((resolve, reject) => {
      resolver = {
        reject,
        resolve,
      }
    })

    const optimizelyMock = ({
      onReady: jest.fn().mockImplementation(config => onReadyPromise),
      activate: jest.fn().mockImplementation(experimentKey => variationKey),
    } as unknown) as OptimizelySDKWrapper

    const component = mount(
      <OptimizelyProvider optimizely={optimizelyMock} userId="jordan">
        <OptimizelyExperiment experiment="experiment1">
          <OptimizelyVariation variation="otherVariation">
            other variation
          </OptimizelyVariation>
          <OptimizelyVariation variation="otherVariation2">
            other variation 2
          </OptimizelyVariation>
        </OptimizelyExperiment>
      </OptimizelyProvider>,
    )

    // while it's waiting for onReady()
    expect(component.text()).toBe(null)
    resolver.resolve()

    await sleep()

    expect(component.text()).toBe(null)
  })
})
