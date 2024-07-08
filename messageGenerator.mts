import * as errorMessage from './lib/errorMessage';
import { openSync, closeSync, appendFileSync, ftruncateSync } from 'fs';

const generate = () => {
  console.log(errorMessage);
  const fd = openSync('./lib/errorMessage.gen.ts', 'a');
  ftruncateSync(fd);

  const messages : Array<any> = [];

  Object.keys(errorMessage).forEach((key, i) => {
    const msg = errorMessage[key];
    const out = `export const ${key} = '${i}';\n`;
    messages.push(errorMessage[key])
    appendFileSync(fd, out, 'utf-8');
  });

  appendFileSync(fd, `export const messages = ${JSON.stringify(messages)};`, 'utf-8');
  closeSync(fd);
}

try {
  generate();
} catch(e) {
  console.error(e);
  process.exit(1);
}
