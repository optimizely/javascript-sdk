import StaticDatafileManager from '../src/staticDatafileManager'

describe('staticDatafileManager', () => {
  it('can be constructed with a datafile object and become ready', async () => {
    const manager = new StaticDatafileManager({ foo: 'bar' })
    manager.start()
    await manager.onReady()
  })

  it('returns the datafile it was constructed with from get', async () => {
    const manager = new StaticDatafileManager({ foo: 'bar' })
    manager.start()
    expect(manager.get()).toEqual({ foo: 'bar' })
    await manager.onReady()
    expect(manager.get()).toEqual({ foo: 'bar' })
  })

  it('can be stopped', async () => {
    const manager = new StaticDatafileManager({ foo: 'bar' })
    manager.start()
    await manager.onReady()
    await manager.stop()
  })

  it('can have event listeners added', () => {
    const manager = new StaticDatafileManager({ foo: 'bar' })
    const dispose = manager.on('update', jest.fn())
    dispose()
  })
})
