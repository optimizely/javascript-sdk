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

  randomUserId() {
    var text = ''
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (var i = 0; i < 5; i++) text += possible.charAt(Math.floor(Math.random() * possible.length))

    return text
  }

  load(emitter: ResourceEmitter<UserId>) {
    emitter.data({
      resourceKey: 'userId',
      resource: this.userId,
      metadata: { source: 'fresh' },
    })
    emitter.complete()
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

export class UniversalAnalyticsClientIdUserIdLoader implements ResourceLoader<UserId> {
  private intervalId: NodeJS.Timeout
  private userId: string
  private emitter?: ResourceEmitter<UserId>

  constructor() {
    this.intervalId = setInterval(() => {
      const clientId = this.getClientId()
      if (clientId) {
        this.userId = clientId
      }

      if (this.userId && this.emitter) {
        this.emitter.data({
          resource: this.userId,
          resourceKey: 'userId',
          metadata: {
            source: 'fresh',
          },
        })
      }
    }, 50)
  }

  load(emitter: ResourceEmitter<UserId>): void {
    this.emitter = emitter
  }

  getClientId(): string | undefined {
    let clientId
    if (typeof window != 'undefined' && typeof window['ga'] != 'undefined') {
      window['ga']((tracker: UniversalAnalytics.Tracker) => {
        clientId = tracker.get('clientId')
      })
    }

    return clientId
  }

  cleanup():  void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }
}
