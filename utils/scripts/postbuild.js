const fs = require('fs-extra');

const targetDir = process.env.BUILD_ENV === 'prod' ? './dist-prod' : './dist-dev';

fs.copy('./package.json', `${targetDir}/package.json`)
  .then(() => console.log(`package.json copied to ${targetDir}`))
  .catch(err => console.error('Error copying package.json:', err));
