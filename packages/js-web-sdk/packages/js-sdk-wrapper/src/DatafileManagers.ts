import { OptimizelyDatafile } from './Datafile'


export interface DatafileLoader {
  load: () => OptimizelyDatafile | Promise<OptimizelyDatafile>
}

export class StaticDatafileLoader implements DatafileLoader {
  private datafile: OptimizelyDatafile

  constructor(config: { datafile: OptimizelyDatafile }) {
    this.datafile = config.datafile
  }

  load() {
    return this.datafile
  }
}

/**
 * Fetches a datafile by URL and handles storing it in LocalStorage
 * 
 * Note: this uses the window.fetch API and would need to be polyfilled
 * or reimplemented for IE
 */
export class UrlDatafileLoader implements DatafileLoader {
  private datafileUrl: string
  private datafile: OptimizelyDatafile

  constructor(config: { datafileUrl: string }) {
    this.datafileUrl = config.datafileUrl
  }

  async load() : Promise<OptimizelyDatafile> {
    const datafile = await this.fetchDatafile()
    return datafile
  }

  private async fetchDatafile() : Promise<OptimizelyDatafile> {
    const resp = await fetch(this.datafileUrl, { mode: 'cors' });
    let datafile: any = await resp.json();
    return datafile
  }
}
