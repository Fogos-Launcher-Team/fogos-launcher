const { installVersion, getVersionJson } = require('./versions');
const { installLoader, getLoaderVersions, findInstalledLoaderVersion } = require('./loaders');

module.exports = { installVersion, getVersionJson, installLoader, getLoaderVersions, findInstalledLoaderVersion };
