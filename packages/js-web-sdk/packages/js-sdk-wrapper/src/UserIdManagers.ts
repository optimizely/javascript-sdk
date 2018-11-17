export interface UserIdManager {
  lookup: () => string
}

/**
 * Handles the user id being provided statically
 */
export class StaticUserIdManager implements UserIdManager {
  protected userId: string
  constructor(userId: string) {
    this.userId = userId
  }

  lookup(): string {
    return this.userId
  }
}

export class LocalStorageRandomUserIdManager implements UserIdManager {
  private localStorageKey: string
  private userId: string

  constructor(
    config: {
      localStorageKey?: string
    } = {},
  ) {
    this.localStorageKey = config.localStorageKey || 'optly_fs_userid'
    const existing = window.localStorage.getItem(this.localStorageKey)
    if (!existing) {
      this.userId = this.randomUserId()
      window.localStorage.setItem(this.localStorageKey, this.userId)
    } else {
      this.userId = existing
    }
  }

  randomUserId() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  lookup(): string {
    return this.userId
  }
}