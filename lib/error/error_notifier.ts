import { MessageResolver } from "../message/message_resolver";
import { sprintf } from "../utils/fns";
import { ErrorHandler } from "./error_handler";
import { OptimizelyError } from "./optimizly_error";

export interface ErrorNotifier {
  notify(error: Error): void;
  child(name: string): ErrorNotifier;
}

export class DefaultErrorNotifier implements ErrorNotifier {
  private name: string;
  private errorHandler: ErrorHandler;
  private messageResolver: MessageResolver;

  constructor(errorHandler: ErrorHandler, messageResolver: MessageResolver, name?: string) {
    this.errorHandler = errorHandler;
    this.messageResolver = messageResolver;
    this.name = name || '';
  }

  notify(error: Error): void {
    if (error instanceof OptimizelyError) {
      error.setMessage(this.messageResolver);
    }
    this.errorHandler.handleError(error);
  }

  child(name: string): ErrorNotifier {
    return new DefaultErrorNotifier(this.errorHandler, this.messageResolver, name);
  }
}
