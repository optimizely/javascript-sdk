const fs = require("fs");
const path = require("path");
const execSync = require("child_process").execSync;

process.chdir(path.resolve(__dirname, ".."));

function exec(command, extraEnv) {
  return execSync(command, {
    stdio: "inherit",
    env: Object.assign({}, process.env, extraEnv)
  });
}

const packageName = 'js-web-sdk';
const umdName = 'jsWebSdk'

// console.log("\nBuilding ES modules...");

// exec(`./node_modules/.bin/rollup -c scripts/config.js -f es -o dist/${packageName}.mjs`);

console.log("\nBuilding CommonJS modules...");

exec(`./node_modules/.bin/rollup -c scripts/config.js -f cjs -o dist/${packageName}.js`);

console.log("\nBuilding UMD modules...");


exec(
  `./node_modules/.bin/rollup -c scripts/config.js -f umd -n ${umdName} -o dist/${packageName}.browser.umd.js`,
  {
    EXTERNALS: "peers",
    BUILD_ENV: "development"
  }
);

exec(
  `./node_modules/.bin/rollup -c scripts/config.js -f umd -n ${umdName} -o dist/${packageName}.browser.umd.min.js`,
  {
    EXTERNALS: "peers",
    BUILD_ENV: "production"
  }
);
