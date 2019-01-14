import * as React from 'react'
import { OptimizelyContextConsumer } from './Context'
import { Subtract } from 'utility-types'
import { OptimizelySDKWrapper } from '@optimizely/js-sdk-wrapper'

export interface WithOptimizelyProps {
  optimizely: OptimizelySDKWrapper | null,
  optimizelyReadyTimeout: number,
}

export function withOptimizely<P extends WithOptimizelyProps>(
  Component: React.ComponentType<P>,
) {
  return class WithOptimizely extends React.Component<Subtract<P, WithOptimizelyProps>> {
    render() {
      return (
        <OptimizelyContextConsumer>
          {({ optimizely, timeout }) => <React.Component {...this.props} optimizely={optimizely} optimizelyReadyTimeout={timeout} />}
        </OptimizelyContextConsumer>
      )
    }
  }
}

// type WrappedComponentPropsExceptProvided = Exclude<keyof WrappedComponentProps, keyof WithOptimizelyProps>;
// type ForwardedProps = Pick<WrappedComponentProps, WrappedComponentPropsExceptProvided>;

// function withOptimizely<C extends React.ComponentType>(
//   Comp: C
// ) : C {
//   return class WithOptimizely extends React.Component {
//     render() {
//       return <Comp />;
//     }
//   };
// }

// const withOptimizely = <C>(
//   Component: C<P>
// ) : C<P> =>
//   class WithOptimizely extends React.Component<P, {}> {
//     render() {
//       return (
//         <OptimizelyContextConsumer>
//           {context => <Component {...this.props} optimizely={context} />}
//         </OptimizelyContextConsumer>
//       );
//     }
//   };
