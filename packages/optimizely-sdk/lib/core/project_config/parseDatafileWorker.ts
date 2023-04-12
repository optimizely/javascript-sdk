import { tryCreatingProjectConfig } from '.';

const messageListener = (e: MessageEvent<{ type: string; payload: { datafile: string | object } }>) => {
  if (e.data.type === 'START_PARSE_DATAFILE') {
    const { configObj, error } = tryCreatingProjectConfig({
      datafile: e.data.payload.datafile,
      logger: {
        log: (...args) => {
          console.log(...args);
        },
      },
    });

    if (error) {
      postMessage({
        type: 'DATAFILE_PARSE_ERROR',
        payload: {
          error: error.message,
          parsedDatafile: null
        }
      })
    } else {
      postMessage({
        type: 'DATAFILE_PARSE_SUCCESS',
        payload: {
          parsedDatafile: configObj
        }
      })
    }
  }
};

addEventListener('message', messageListener);
