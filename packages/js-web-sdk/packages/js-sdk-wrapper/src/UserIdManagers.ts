export interface UserIdManager {
  save: (userId: string) => void
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
  save(userId: string) {
    return
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
      const userId = this.randomUserId()
      this.save(userId)
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

  save(userId: string): void {
    this.userId = userId
    window.localStorage.setItem(this.localStorageKey, userId)
  }

  lookup(): string {
    return this.userId
  }
}