import { MessageResolver } from "../message/message_resolver";
import { sprintf } from "../utils/fns";

export class OptimizelyError extends Error {
  baseMessage: string;
  params: any[];
  private resolved = false;
  constructor(baseMessage: string, ...params: any[]) {
    super();
    this.name = 'OptimizelyError';
    this.baseMessage = baseMessage;
    this.params = params;
  }

  getMessage(resolver?: MessageResolver): string {
    if (this.resolved) {
      return this.message;
    }

    if (resolver) {
      this.setMessage(resolver);
      return this.message;
    }

    return this.baseMessage;
  }
  
  setMessage(resolver: MessageResolver): void {
    this.message = sprintf(resolver.resolve(this.baseMessage), ...this.params);
    this.resolved = true;
  }
}
