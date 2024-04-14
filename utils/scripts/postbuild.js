const fs = require('fs-extra');

const targetDir = process.env.BUILD_ENV === 'prod' ? './dist-prod' : './dist-dev';

// console.log(`BUILD_ENV is set to: ${process.env.BUILD_ENV}`);

fs.readJson('./package.json')
  .then(packageJson => {
    // console.log(`Original package name: ${packageJson.name}`);

    if (process.env.BUILD_ENV === 'dev') {
      packageJson.name += '-dev';
      // console.log(`Modified package name: ${packageJson.name}`);
    }

    return fs.writeJson(`${targetDir}/package.json`, packageJson, { spaces: 2 });
  })
  .then(() => console.log(`Package.json modified and copied to ${targetDir}`))
  .catch(err => console.error('Error processing package.json:', err));
