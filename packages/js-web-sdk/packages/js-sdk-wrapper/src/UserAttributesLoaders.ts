import { UserAttributes } from '@optimizely/optimizely-sdk'

import { ResourceLoader, ResourceLoaderConnection } from './DatafileLoaders'

export class ProvidedAttributesLoader implements ResourceLoader<UserAttributes> {
  private attributes: UserAttributes

  constructor(config: { attributes?: UserAttributes } = {}) {
    this.attributes = config.attributes || {}
  }

  load(connection: ResourceLoaderConnection<UserAttributes>) : void {
    connection.load(this.attributes, { source: 'fresh' })
    connection.ready()
  }
}