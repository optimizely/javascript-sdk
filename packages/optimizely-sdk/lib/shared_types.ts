export type UserAttributes = {
   // TODO[OASIS-6649]: Don't use any type
   // eslint-disable-next-line  @typescript-eslint/no-explicit-any
   [name: string]: any;
}

export type Condition = {
   name: string;
   type: string;
   match: string;
   // TODO[OASIS-6649]: Don't use any type
   // eslint-disable-next-line  @typescript-eslint/no-explicit-any
   value: any;
}
