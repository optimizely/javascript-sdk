type ConditionOperator = 'and' | 'or' | 'not'

/**
 * {
 *   operator: 'and',
 *   conditions: [
 *     {
 *       operator: 'or',
 *       conditions: [
           <Condition>,
           <Condition>,
 *       ]
 *     }
 *
 *   ]
 * }
 *
 */
interface ConditionObject extends OperatorCondition {}

export type OperatorCondition = {
  operator: ConditionOperator
  conditions: Condition[] | ConditionObject[]
}

export type Condition = {
  name: string
  value: any
  match_type: string
  type: string
}

type ExperimentKey = string

export type View = {
  // conditions to see if a view is active
  condition: OperatorCondition
  // experiment keys that should try to activate for a view
  experiments: ExperimentKey[]
}

export type EnvironmentData = {
  [key: string]: any
}

export type EvaluatorFn = (condition: Condition, data: EnvironmentData) => boolean

export type Change = {
  config: object,
  type: string,
}

export interface ActivationResult {
  variation: string,
  changes: Change[],
}

export interface AppliedActivationResult extends ActivationResult {
  // result of mapping applyFn on the change
  appliedChanges: Array<any>
}

export interface Activator {
  views: View[]
  // list of activatorAttribute type to Evaluator
  matchers: {
    [type: string]: EvaluatorFn
  }

  activate({
    environmentData: EnvironmentData,
    userId: string,
    userAttributes: object,
  }) : ActivationResult[]
}

type ApplyFn = (change: Change) => any

export interface ChangeApplier {
  appliers: {
    [change_type: string]: ApplyFn,
  }

  handleActivationResults(results: ActivationResult[]) : AppliedActivationResult[]
}