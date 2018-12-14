import React, { Component } from 'react'

import { Board } from './Board'
import './App.css'

const mainStyle = {
  fontFamily: 'Fira Sans',
  fontWeight: 800,
}

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      submitted: false,
      userId: '',
      ready: false,
    }
  }

  submitUserId = e => {
    e.preventDefault()
    this.setState({
      submitted: true,
    })
  }

  render() {
    const { optimizely } = this.props
    const { submitted, userId } = this.state
    return (
      <React.Fragment>
        <link
          href="https://fonts.googleapis.com/css?family=Fira+Sans:400,800"
          rel="stylesheet"
        />
        <div id="game" style={mainStyle}>
          <h1>Optimizely Feature Flag Bingo</h1>
          <form onSubmit={this.submitUserId} className="user">
            {!this.state.submitted ? (
              <input
                type="text"
                placeholder="Username"
                required
                onChange={e => this.setState({ userId: e.target.value })}
              />
            ) : (
              <React.Fragment>
                <p>Okay {this.state.userId}, let's play!</p>
                <p class="instructions">
                  Every square is backed by an Optimizely feature flag. Bingo-Minesweeper rules
                  apply, try to create a complete row, column or diagonal without
                  striking out!
                </p>
              </React.Fragment>
            )}
          </form>
          <Board optimizely={optimizely} userId={userId} ready={submitted} />
        </div>
      </React.Fragment>
    )
  }
}

export default App
