jest.mock('./createUserWrapper', () => ({
  __esModule: true,
  createUserWrapper: jest.fn(),
}))

import * as React from 'react'
import * as Enzyme from 'enzyme'
import * as Adapter from 'enzyme-adapter-react-16'
Enzyme.configure({ adapter: new Adapter() })

import { mount } from 'enzyme'
import { OptimizelyProvider } from './Provider'
import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'
import { withOptimizely } from './withOptimizely'
import { UserWrappedOptimizelySDK, createUserWrapper } from './createUserWrapper'

async function sleep(timeout = 0): Promise<{}> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, timeout)
  })
}

type TestProps = {
  optimizely: UserWrappedOptimizelySDK
  optimizelyReadyTimeout: number | undefined
}

class InnerComponent extends React.Component<TestProps, any> {
  constructor(props: TestProps) {
    super(props)
  }

  render() {
    return <div>test</div>
  }
}

const WrapperComponent = withOptimizely(InnerComponent)

describe('withOptimizely', () => {
  let wrappedOptimizely: UserWrappedOptimizelySDK
  beforeEach(() => {
    wrappedOptimizely = {} as UserWrappedOptimizelySDK
    ;(createUserWrapper as jest.Mock).mockReturnValue(wrappedOptimizely)
  })

  it('should inject optimizely and optimizelyReadyTiemout from <OptimizelyProvider>', async () => {
    const optimizelyMock = ({} as unknown) as OptimizelySDKWrapper

    const component = mount(
      <OptimizelyProvider
        optimizely={optimizelyMock}
        timeout={200}
        userId="jordan"
        userAttributes={{ plan_type: 'bronze' }}
      >
        <WrapperComponent />
      </OptimizelyProvider>,
    )

    expect(createUserWrapper).toHaveBeenCalledWith({
      instance: optimizelyMock,
      userId: 'jordan',
      userAttributes: { plan_type: 'bronze' },
    })

    const innerComponent = component.find(InnerComponent)
    expect(innerComponent.props()).toEqual({
      optimizely: wrappedOptimizely,
      optimizelyReadyTimeout: 200,
    })
  })
})
