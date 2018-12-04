import {
  Activator,
  View,
  EvaluatorFn,
  ActivationResult,
  AppliedActivationResult,
  Condition,
  EnvironmentData,
} from './types'

import { evaluate } from './evaluate'

class ProxyActivator implements Activator {
  client: any
  views: View[]
  matchers: {
    [type: string]: EvaluatorFn
  }

  constructor(config: {
    matchers: { [type: string]: EvaluatorFn }
    views: View[]
    client: any
  }) {
    this.matchers = config.matchers
    this.views = config.views
    this.client = config.client
  }

  evaluateLeafNode = (condition: Condition, data: EnvironmentData): boolean => {
    const matcher = this.matchers[condition.type]
    if (!matcher) {
      throw new Error(`No matcher registered for type="${condition.type}"`)
    }

    return matcher(condition, data)
  }

  activate(config: {
    environmentData: EnvironmentData
    userId: string
    userAttributes: object
  }): ActivationResult[] {
    const { userId, userAttributes } = config
    let results: Array<ActivationResult> = []
    this.views
      .filter(view => {
        const res= evaluate(view.condition, condition => {
          return this.evaluateLeafNode(condition, config.environmentData)
        })
        console.log('activated view? ', view.experiments, res)
        return res
      })
      .forEach(view => {
        view.experiments.forEach(expKey => {
          const variation = this.client.activate(expKey, userId, userAttributes)
          const changes = this.client.getExperimentChanges(
            expKey,
            userId,
            userAttributes,
          )
          results.push({
            variation,
            changes,
          })
        })
      })

    return results
  }
}

function urlCondition(value) {
  return {
    name: 'homepage',
    value,
    match_type: 'simple',
    type: 'url',
  }
}

const activator = new ProxyActivator({
  views: [
    {
      experiments: ['exp1', 'exp2'],
      condition: {
        operator: 'or',
        conditions: [urlCondition('http://atticandbutton.com')],
      },
    },
    {
      experiments: ['exp3', 'exp4'],
      condition: {
        operator: 'or',
        conditions: [urlCondition('http://google.com')],
      },
    },
  ],
  client: {
    activate(exp) {
      console.log('activate', exp)
      return 'variation1'
    },
    getExperimentChanges(exp) {
      console.log('got experiment changes', exp)
      return []
    },
  },
  matchers: {
    url: (cond, data) => data.url === cond.value,
  },
})

// gets back map of { variation, changes }
const activationData = {
  url: 'http://atticandbutton.com',
}
const results = activator.activate({
  environmentData: activationData,
  userId: 'james',
  userAttributes: {},
})

console.log('did a thang', results)
