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

export const Tile = ({ value, onActivate }) => (
  <a
    className={classnames({
      tile: true,
      'result-true': value === true,
      'result-false': value === false,
    })}
    onClick={onActivate}
  />
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
  onActivate([x, y]) {
    const { ready, optimizely, userId } = this.props
    if (this.state.outcome !== null || !ready) {
      return
    }
    const result = optimizely.isFeatureEnabled(`bingo-${x}-${y}`, userId)
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
  render() {
    const { ready } = this.props
    const { outcome, board } = this.state
    return (
      <div className={`board ${ready ? 'ready' : ''} ${outcome ? 'finished' : ''}`}>
        {outcome !== null && (
          <div className={`outcome outcome-${outcome}`}>You {outcome}!</div>
        )}
        <div className="row">
          <Tile value={board[0][0]} onActivate={this.onActivate.bind(this, [0, 0])} />
          <Tile value={board[0][1]} onActivate={this.onActivate.bind(this, [0, 1])} />
          <Tile value={board[0][2]} onActivate={this.onActivate.bind(this, [0, 2])} />
          <Tile value={board[0][3]} onActivate={this.onActivate.bind(this, [0, 3])} />
        </div>
        <div className="row">
          <Tile value={board[1][0]} onActivate={this.onActivate.bind(this, [1, 0])} />
          <Tile value={board[1][1]} onActivate={this.onActivate.bind(this, [1, 1])} />
          <Tile value={board[1][2]} onActivate={this.onActivate.bind(this, [1, 2])} />
          <Tile value={board[1][3]} onActivate={this.onActivate.bind(this, [1, 3])} />
        </div>
        <div className="row">
          <Tile value={board[2][0]} onActivate={this.onActivate.bind(this, [2, 0])} />
          <Tile value={board[2][1]} onActivate={this.onActivate.bind(this, [2, 1])} />
          <Tile value={board[2][2]} onActivate={this.onActivate.bind(this, [2, 2])} />
          <Tile value={board[2][3]} onActivate={this.onActivate.bind(this, [2, 3])} />
        </div>
        <div className="row">
          <Tile value={board[3][0]} onActivate={this.onActivate.bind(this, [3, 0])} />
          <Tile value={board[3][1]} onActivate={this.onActivate.bind(this, [3, 1])} />
          <Tile value={board[3][2]} onActivate={this.onActivate.bind(this, [3, 2])} />
          <Tile value={board[3][3]} onActivate={this.onActivate.bind(this, [3, 3])} />
        </div>
      </div>
    )
  }
}
