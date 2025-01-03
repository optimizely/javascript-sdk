type ErrorMessage = {
  baseMessage: string;
  params: any[];
};

export class OptimizelyError extends Error {
  private baseMessage: string;
  private params: any[];
  constructor(baseMessage: string, ...params: any[]) {
    super();
    this.name = 'OptimizelyError';
    this.baseMessage = baseMessage;
    this.params = params;
  }

  getErrorMessage(): ErrorMessage {
    return {
      baseMessage: this.baseMessage,
      params: this.params,
    };
  }

  setMessage(message: string): void {
    this.message = message;
  }
}
