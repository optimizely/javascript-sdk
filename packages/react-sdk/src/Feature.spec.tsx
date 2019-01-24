import * as React from 'react'
import * as Enzyme from 'enzyme'
import * as Adapter from 'enzyme-adapter-react-16'
Enzyme.configure({ adapter: new Adapter() })

import { mount } from 'enzyme'
import { OptimizelyProvider } from './Provider'
import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'
import { OptimizelyFeature } from './Feature'

async function sleep(timeout = 0): Promise<{}> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, timeout)
  })
}

describe('<OptimizelyFeature>', () => {
  it('throws an error when not rendered in the context of an OptimizelyProvider', () => {
    expect(() => {
      // @ts-ignore
      mount(
        <OptimizelyFeature feature="feature1">
          {(isEnabled, variables) => isEnabled}
        </OptimizelyFeature>,
      )
    }).toThrow()
  })

  it('should wait until onReady() is resolved then render result of isFeatureEnabled and getFeatureVariables', async () => {
    let resolver: any
    const isEnabled = true
    const variables = {
      foo: 'bar',
    }
    const onReadyPromise = new Promise((resolve, reject) => {
      resolver = {
        reject,
        resolve,
      }
    })

    const optimizelyMock = ({
      onReady: jest.fn().mockImplementation(config => onReadyPromise),
      getFeatureVariables: jest.fn().mockImplementation(config => variables),
      isFeatureEnabled: jest.fn().mockImplementation(config => isEnabled),
    } as unknown) as OptimizelySDKWrapper

    const component = mount(
      <OptimizelyProvider optimizely={optimizelyMock} userId="jordan">
        <OptimizelyFeature feature="feature1">
          {(isEnabled, variables) => `${isEnabled ? 'true' : 'false'}|${variables.foo}`}
        </OptimizelyFeature>
      </OptimizelyProvider>,
    )

    expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: undefined })

    // while it's waiting for onReady()
    expect(component.text()).toBe(null)
    resolver.resolve()

    await sleep()

    expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledWith(
      'feature1',
      'jordan',
      {},
    )
    expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledWith(
      'feature1',
      'jordan',
      {},
    )
    expect(component.text()).toBe('true|bar')
  })

  it('should respect the timeout provided in <OptimizelyProvider>', async () => {
    let resolver: any
    const isEnabled = true
    const variables = {
      foo: 'bar',
    }
    const onReadyPromise = new Promise((resolve, reject) => {
      resolver = {
        reject,
        resolve,
      }
    })

    const optimizelyMock = ({
      onReady: jest.fn().mockImplementation(config => onReadyPromise),
      getFeatureVariables: jest.fn().mockImplementation(config => variables),
      isFeatureEnabled: jest.fn().mockImplementation(config => isEnabled),
    } as unknown) as OptimizelySDKWrapper

    const component = mount(
      <OptimizelyProvider
        optimizely={optimizelyMock}
        timeout={200}
        userId="jordan"
        userAttributes={{ plan_type: 'bronze' }}
      >
        <OptimizelyFeature feature="feature1">
          {(isEnabled, variables) => `${isEnabled ? 'true' : 'false'}|${variables.foo}`}
        </OptimizelyFeature>
      </OptimizelyProvider>,
    )

    expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 200 })

    // while it's waiting for onReady()
    expect(component.text()).toBe(null)
    resolver.resolve()

    await sleep()

    expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledWith('feature1', 'jordan', {
      plan_type: 'bronze',
    })
    expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledWith(
      'feature1',
      'jordan',
      { plan_type: 'bronze' },
    )
    expect(component.text()).toBe('true|bar')
  })
})
