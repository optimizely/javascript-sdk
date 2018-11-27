import { UserAttributes } from '@optimizely/optimizely-sdk'

import { ResourceLoader, ResourceObserver } from './ResourceLoader'

export class ProvidedAttributesLoader implements ResourceLoader<UserAttributes> {
  private attributes: UserAttributes

  constructor(config: { attributes?: UserAttributes } = {}) {
    this.attributes = config.attributes || {}
  }

  load(observer: ResourceObserver<UserAttributes>): void {
    observer.next({
      resource: this.attributes,
      metadata: { source: 'fresh' },
    })
    observer.complete()
  }
}
