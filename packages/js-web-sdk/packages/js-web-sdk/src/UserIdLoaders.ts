import { ResourceLoader } from './ResourceManager'
import { emitter } from 'nock';
import * as utils from './utils'

export type UserId = string | null

export interface UserIdManager {
  lookup: () => string
}

export class StaticUserIdLoader implements ResourceLoader<UserId> {
  protected userId: UserId
  constructor(userId: UserId) {
    this.userId = userId
  }

  public load() {
    return this.userId;
  }
}

export class CookieRandomUserIdLoader implements ResourceLoader<UserId> {
  private cookieKey: string
  private userId: string

  constructor(
    config: {
      cookieKey?: string
    } = {},
  ) {
    this.cookieKey = config.cookieKey || 'optly_fs_userid'
    const existing = utils.getCookie(this.cookieKey)
    if (!existing) {
      this.userId = this.randomUserId()
      utils.setInfiniteCookie(this.cookieKey, this.userId)
    } else {
      this.userId = existing
    }
  }

  public load() {
    return this.userId;
  }

  randomUserId() {
    return 'oeu' + Date.now() + 'r' + Math.random();
  }
}

