const fs = require('fs-extra');

const targetDir = process.env.BUILD_ENV === 'prod' ? './dist-prod' : './dist-dev';

fs.readJson('./package.json')
  .then(packageJson => {
    const baseName = process.env.BUILD_ENV === 'dev' ? `${packageJson.name}-dev` : packageJson.name;
    const modifiedPackageJson = {
      ...packageJson,
      name: baseName,
      bin: {
        [baseName]: "index.js"
      }
    };

    return fs.writeJson(`${targetDir}/package.json`, modifiedPackageJson, { spaces: 2 });
  })
  .then(() => console.log(`Package.json modified and copied to ${targetDir}`))
  .catch(err => console.error('Error processing package.json:', err));
