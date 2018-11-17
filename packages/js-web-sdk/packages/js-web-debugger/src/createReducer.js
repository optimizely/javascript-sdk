export function createReducer(config) {
  const getInitialState = config.getInitialState
  delete config.getInitialState

  if (!getInitialState) {
    throw new Error('createReducer config must be passed `getInitialState()` method')
  }



  return function CreatedReducer(state, action) {
    if (typeof (state) === 'undefined') {
      return getInitialState()
    }

    const actionHandler = config[action.type]
    if (!actionHandler) {
      return state
    }

    return actionHandler(state, action)
  }
}
