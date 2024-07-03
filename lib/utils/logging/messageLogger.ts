import { LogHandler, LogLevel } from '../../modules/logging/models';
import { ErrorMessageKey, LogMessageKey, MessageKey } from './message';
import { MessageResolver } from './messageResolver';

export class MessageLogger {
  private logger: LogHandler;
  private messageResolver: MessageResolver;

  constructor(logger: LogHandler, messageResolver: MessageResolver) {
    this.logger = logger;
    this.messageResolver = messageResolver;
  }

  log(level: LogLevel, messageKey: MessageKey): void {
    this.logger.log(level, this.messageResolver.resolve(messageKey, []));
  }
}
