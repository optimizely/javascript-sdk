import { UserAttributes } from '@optimizely/optimizely-sdk'

import { ResourceLoader, ResourceEmitter } from './ResourceStream'

export class ProvidedAttributesLoader implements ResourceLoader<UserAttributes> {
  private attributes: UserAttributes

  constructor(config: { attributes?: UserAttributes } = {}) {
    this.attributes = config.attributes || {}
  }

  load(emitter: ResourceEmitter<UserAttributes>): void {
    emitter.data({
      resourceKey: 'attributes',
      resource: this.attributes,
      metadata: { source: 'fresh' },
    })
    emitter.complete()
  }
}
