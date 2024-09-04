import sinon from 'sinon';

export const getMockProjectConfigManager = (opt = {}) => {
  return {
    config: opt.initConfig,
    start: sinon.spy(),
    onRunning: () => opt.onRunning || Promise.resolve(),
    stop: sinon.spy(),
    onTerminated: () => opt.onTerminated || Promise.resolve(),
    getConfig: function() {
      return this.config;
    },
    setConfig: function(config) {
      this.config = config;
    },
    onUpdate: function(listener) {
      if (this.listeners === undefined) {
        this.listeners = [];
      }
      this.listeners.push(listener);
      return () => {};
    },
    pushUpdate: function(config) {
      this.config = config;
      this.listeners.forEach((listener) => listener(config));
    }
  }
};
