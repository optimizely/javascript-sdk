import { createReducer } from './createReducer'
import { combineReducers } from 'redux';

const datafile = createReducer({
  getInitialState() {
    


  },
})

const experiments = createReducer({
  getInitialState() {
    


  },
})

const features = createReducer({
  getInitialState() {
    


  },
})

const log = createReducer({
  getInitialState() {
    


  },
})

export const rootReducer = combineReducers({
  datafile,
  experiments,
  features,
  log,
})