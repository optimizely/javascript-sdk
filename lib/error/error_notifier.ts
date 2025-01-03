import { sprintf } from "../utils/fns";
import { ErrorHandler } from "./error_handler";
import { OptimizelyError } from "./optimizly_error";

export interface ErrorNotifier {
  notify(error: OptimizelyError): void;
  child(name: string): ErrorNotifier;
}

export interface ErrorMessageResolver {
  resolve(baseMessage: string): string;
}

export class DefaultErrorNotifier implements ErrorNotifier {
  private name: string;
  private errorHandler: ErrorHandler;
  private messageResolver: ErrorMessageResolver;

  constructor(errorHandler: ErrorHandler, messageResolver: ErrorMessageResolver, name?: string) {
    this.errorHandler = errorHandler;
    this.messageResolver = messageResolver;
    this.name = name || '';
  }

  notify(error: OptimizelyError): void {
    const ErrorMessage = error.getErrorMessage();
    const resolvedBase = this.messageResolver.resolve(ErrorMessage.baseMessage);
    const messagePrefix = this.name ? `${this.name}: ` : '';
    const message = `${messagePrefix}${sprintf(resolvedBase, ...ErrorMessage.params)}`;
    error.setMessage(message);
    this.errorHandler.handleError(error);
  }

  child(name: string): ErrorNotifier {
    return new DefaultErrorNotifier(this.errorHandler, this.messageResolver, name);
  }
}
