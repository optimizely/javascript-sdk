import { UserAttributes } from '@optimizely/optimizely-sdk'

import { InitializationResourceLoader } from './DatafileLoaders'

export class ProvidedAttributesLoader implements InitializationResourceLoader<UserAttributes> {
  private attributes: UserAttributes
  public preferCached: boolean
  public loadIfCacheHit: boolean

  constructor(config: { attributes?: UserAttributes } = {}) {
    this.attributes = config.attributes || {}
    this.preferCached = true
    this.loadIfCacheHit = false
  }

  async load() : Promise<null> {
    return Promise.resolve(null)
  }

  loadFromCache() : UserAttributes {
    return this.attributes
  }
}