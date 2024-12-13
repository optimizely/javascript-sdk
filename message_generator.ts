import path from 'path';
import { writeFile } from 'fs/promises';

const generate = async () => {
  const inp = process.argv.slice(2);
  for(const filePath of inp) {
    console.log('generating messages for: ', filePath);
    const parsedPath = path.parse(filePath);
    const fileName = parsedPath.name;
    const dirName = parsedPath.dir;
    const ext = parsedPath.ext;

    const genFilePath = path.join(dirName, `${fileName}.gen${ext}`);
    console.log('generated file path: ', genFilePath);
    const exports = await import(filePath);
    const messages : Array<any> = [];

    let genOut = '';

    Object.keys(exports).forEach((key, i) => {
      const msg = exports[key];
      genOut += `export const ${key} = '${i}';\n`;
      messages.push(exports[key])
    });
    
    genOut += `export const messages = ${JSON.stringify(messages, null, 2)};`
    await writeFile(genFilePath, genOut, 'utf-8');
  }
}

generate().then(() => {
  console.log('successfully generated messages');
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
