import { FOO } from "errorMessage";

export interface Fooer {
  foo() : void;
}

const ErrMsg = {
  FOO: 'this is a longggggggggg error message',
}

export class Extra implements Fooer {
  private doLog : boolean;
  constructor(doLog: boolean) {
    this.doLog = doLog;
  }
  foo() {
    if (this.doLog) {
      console.log(ErrMsg.FOO);
    }
  }
  bar() {
    console.log('long msg bar');
  }
}

export const ABCD = 'a';

export const MESS = {
  ABCD: 'messs abcd',
  EFGH: 'messs efgh',
};
