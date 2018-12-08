import { ResourceLoader, ResourceEmitter } from './ResourceStream'
import { emitter } from 'nock';

export type UserId = string | null

export interface UserIdManager {
  lookup: () => string
}

export class StaticUserIdLoader implements ResourceLoader<UserId> {
  protected userId: UserId
  constructor(userId: UserId) {
    this.userId = userId
  }

  load(emitter: ResourceEmitter<UserId>) {
    emitter.data({
      resourceKey: 'userId',
      resource: this.userId,
      metadata: { source: 'fresh' },
    })
    emitter.complete()
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
    const existing = this.getCookie(this.cookieKey)
    if (!existing) {
      this.userId = this.randomUserId()
      this.setCookie(this.cookieKey, this.userId)
    } else {
      this.userId = existing
    }
  }

  load(emitter: ResourceEmitter<UserId>) {
    emitter.data({
      resourceKey: 'userId',
      resource: this.userId,
      metadata: { source: 'fresh' },
    })
    emitter.complete()
  }

  getDateNow() {
    return Date.now()
  }

  randomUserId() {
    return 'oeu' + this.getDateNow() + 'r' + Math.random();
  }

  setCookie(cname: string, cvalue: string): void {
    var expires = 'expires=Fri, 31 Dec 9999 23:59:59 GMT'
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/'
  }

  getCookie(cname: string): string {
    var name = cname + '='
    var decodedCookie = decodeURIComponent(document.cookie)
    var ca = decodedCookie.split(';')
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i]
      while (c.charAt(0) == ' ') {
        c = c.substring(1)
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length)
      }
    }
    return ''
  }
}

