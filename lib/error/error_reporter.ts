import { LoggerFacade } from "../logging/logger";
import { ErrorNotifier } from "./error_notifier";
import { OptimizelyError } from "./optimizly_error";

export class ErrorReporter {
  private logger?: LoggerFacade;
  private errorNotifier?: ErrorNotifier;

  constructor(logger?: LoggerFacade, errorNotifier?: ErrorNotifier) {
    this.logger = logger;
    this.errorNotifier = errorNotifier;
  }

  report(error: OptimizelyError): void;
  report(baseMessage: string, ...params: any[]): void;

  report(error: OptimizelyError | string, ...params: any[]): void {
    if (typeof error === 'string') {
      error = new OptimizelyError(error, ...params);
      this.report(error);
      return;
    }

    const errorMessage = error.getErrorMessage();

    if (this.errorNotifier) {
      this.errorNotifier.notify(error);
    }

    if (this.logger) {
      this.logger.error(errorMessage.baseMessage, ...errorMessage.params);
    }
  }

  setLogger(logger: LoggerFacade): void {
    this.logger = logger;
  }

  setErrorNotifier(errorNotifier: ErrorNotifier): void {
    this.errorNotifier = errorNotifier;
  }
}
