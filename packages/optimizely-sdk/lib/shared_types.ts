export type UserAttributes = {
   // TODO[OASIS-6649]: Don't use any type
   // eslint-disable-next-line  @typescript-eslint/no-explicit-any
   [name: string]: any;
}

export type Condition = {
   name: string;
   type: string;
   match?: string;
   value: string | number | boolean | null;
 }

export type ConditionEvaluator = (condition: Condition, userAttributes: UserAttributes) => boolean | null;
