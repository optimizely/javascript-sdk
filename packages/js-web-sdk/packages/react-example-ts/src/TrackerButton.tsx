import * as React from 'react'
import * as PropTypes from 'prop-types'


import {
  withOptimizely,
  WithOptimizelyProps,
} from '@optimizely/react-sdk'



interface AppProps extends WithOptimizelyProps {
  text: string
}

export class TrackerButton extends React.Component<AppProps, any> {
  componentDidMount() {
    const { optimizely } = this.props
    console.log(optimizely)
    debugger;

  }
  render() {

    return (
      <h3>{this.props.text}</h3>
    )
  }
}
const OTrackerButton = withOptimizely(TrackerButton)
export default OTrackerButton
