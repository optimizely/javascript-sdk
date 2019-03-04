import { EventV1 } from "./v1/buildEventV1";

export interface EventDispatcher {
  dispatch(event: object, callback: (success: boolean) => void): void
}

export interface EventV1Request {
  url: string
  method: 'POST' | 'PUT' | 'GET' | 'PATCH'
  headers: {
    [key: string]: string[]
  }
  event: EventV1,
}

export interface HttpEventDispatcher extends EventDispatcher {
  dispatch(request: EventV1Request, callback: (success: boolean) => void): void
}
