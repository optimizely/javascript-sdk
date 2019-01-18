import { UserAttributes } from '@optimizely/optimizely-sdk'

import { ResourceLoader } from './ResourceManager'

export class ProvidedAttributesLoader implements ResourceLoader<UserAttributes> {
  private attributes: UserAttributes

  constructor(config: { attributes?: UserAttributes } = {}) {
    this.attributes = config.attributes || {}
  }

  public load() {
    return this.attributes;
  }
}
