import React, { Component } from 'react'

import classnames from 'classnames'

export function transposeArray(array, arrayLength) {
  var newArray = []
  for (var i = 0; i < array.length; i++) {
    newArray.push([])
  }

  for (var i = 0; i < array.length; i++) {
    for (var j = 0; j < arrayLength; j++) {
      newArray[j].push(array[i][j])
    }
  }

  return newArray
}

export const Tile = ({ value, onActivate, feature }) => (
  <a
    className={classnames({
      tile: true,
      'result-true': value === true,
      'result-false': value === false,
    })}
    onClick={() => onActivate(feature)}
  >
    <div>
      <pre>optimizely.isFeatureEnabled</pre>
      <span>("{feature}")</span>
        <pre className={value !== null ? 'activated' : 'not-activated'}>{value ? 'true' : 'false'}</pre>
    </div>
  </a>
)

export class Board extends Component {
  constructor(props) {
    super(props)
    this.board = [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]
    this.state = {
      outcome: null,
      board: this.board,
    }
  }
  onActivate([x, y], featureKey) {
    const { ready, optimizely, userId } = this.props
    if (this.state.outcome !== null || !ready) {
      return
    }
    const result = optimizely.isFeatureEnabled(featureKey, userId)
    this.board[x][y] = result
    this.setState({
      board: this.board,
    })
    if (!result) {
      this.setState({
        outcome: 'lose',
      })
      optimizely.track('lose', userId)
      return
    }
    if (this.checkWin(this.board)) {
      this.setState({
        outcome: 'win',
      })
      optimizely.track('win', userId)
    } else if (this.isFull(this.board)) {
      this.setState({
        outcome: 'lose',
      })
      optimizely.track('win', userId)
    }
  }
  isFull(board) {
    return board.every(row => row.every(i => i !== null))
  }
  checkWin(board) {
    let won = false
    const lookup = ({ x, y }) => board[x][y]
    const tBoard = transposeArray(board, 4)
    for (let i = 0; i < 4; i++) {
      // check row win
      if (board[i].every(res => !!res) || tBoard[i].every(res => !!res)) {
        won = true
        break
      }
    }
    if (!won) {
      const diag1 = [[0, 0], [1, 1], [2, 2], [3, 3]]

      const diag2 = [[0, 3], [1, 2], [2, 1], [3, 0]]

      if (diag1.every(([x, y]) => board[x][y])) {
        won = true
      }

      if (diag2.every(([x, y]) => board[x][y])) {
        won = true
      }
    }

    return won
  }

  generateLogLink() {
    const { userId } = this.props
    return `http://hack.paulserraino.com:8080/app/kibana#/discover/4ca56e30-fe7c-11e8-b8b8-cd22bc14a8dd?_g=(refreshInterval:(pause:!f,value:5000),time:(from:now-1h,mode:quick,to:now))&_a=(columns:!(projectId,userId,type,featureKey,isFeatureEnabled,eventKey,datafileRevision),filters:!(('$state':(store:appState),exists:(field:type),meta:(alias:!n,disabled:!f,index:'994e29c0-fe77-11e8-b8b8-cd22bc14a8dd',key:type,negate:!f,type:exists,value:exists)),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'994e29c0-fe77-11e8-b8b8-cd22bc14a8dd',key:userId,negate:!f,params:(query:fuck,type:phrase),type:phrase,value:fuck),query:(match:(userId:(query:${userId},type:phrase))))),index:'994e29c0-fe77-11e8-b8b8-cd22bc14a8dd',interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`
  }

  clickedLogs = () => {
    const { optimizely, userId } = this.props
    optimizely.track('clicked_see_dope_logs', userId)
  }

  render() {
    const { ready } = this.props
    const { outcome, board } = this.state
    return (
      <div className={`board ${ready ? 'ready' : ''} ${outcome ? 'finished' : ''}`}>
        <div className={`outcome outcome-${outcome}`}>
          <span>
            <strong>
              {outcome === 'win' && '🥇'}
              {outcome === 'lose' && '⚠️'}
            </strong>
            optimizely.track("{outcome}")
          </span>
          <div className="log-wrapper">
            <a href={this.generateLogLink()} onClick={this.clickedLogs} target="_blank">
              See dope logs...
            </a>
          </div>
        </div>
        <div className="row">
          <Tile
            value={board[0][0]}
            feature="rebrand"
            onActivate={this.onActivate.bind(this, [0, 0])}
          />
          <Tile
            value={board[0][1]}
            feature="new_search_algo"
            onActivate={this.onActivate.bind(this, [0, 1])}
          />
          <Tile
            value={board[0][2]}
            feature="ads"
            onActivate={this.onActivate.bind(this, [0, 2])}
          />
          <Tile
            value={board[0][3]}
            feature="infinite_scroll"
            onActivate={this.onActivate.bind(this, [0, 3])}
          />
        </div>
        <div className="row">
          <Tile
            value={board[1][0]}
            feature="oauth_flow"
            onActivate={this.onActivate.bind(this, [1, 0])}
          />
          <Tile
            value={board[1][1]}
            feature="deep_learning"
            onActivate={this.onActivate.bind(this, [1, 1])}
          />
          <Tile
            value={board[1][2]}
            feature="self_driving_cars"
            onActivate={this.onActivate.bind(this, [1, 2])}
          />
          <Tile
            value={board[1][3]}
            feature="expensive_pricing"
            onActivate={this.onActivate.bind(this, [1, 3])}
          />
        </div>
        <div className="row">
          <Tile
            value={board[2][0]}
            feature="fullstack_onboarding"
            onActivate={this.onActivate.bind(this, [2, 0])}
          />
          <Tile
            value={board[2][1]}
            feature="cheap_pricing"
            onActivate={this.onActivate.bind(this, [2, 1])}
          />
          <Tile
            value={board[2][2]}
            feature="tabby_cats"
            onActivate={this.onActivate.bind(this, [2, 2])}
          />
          <Tile
            value={board[2][3]}
            feature="big_data"
            onActivate={this.onActivate.bind(this, [2, 3])}
          />
        </div>
        <div className="row">
          <Tile
            value={board[3][0]}
            feature="small_data"
            onActivate={this.onActivate.bind(this, [3, 0])}
          />
          <Tile
            value={board[3][1]}
            feature="microservices"
            onActivate={this.onActivate.bind(this, [3, 1])}
          />
          <Tile
            value={board[3][2]}
            feature="use_public_rest_api"
            onActivate={this.onActivate.bind(this, [3, 2])}
          />
          <Tile
            value={board[3][3]}
            feature="use_vue_js"
            onActivate={this.onActivate.bind(this, [3, 3])}
          />
        </div>
      </div>
    )
  }
}
