const path = require('path');

function loadRcedit() {
  const mod = require('rcedit');
  return mod.rcedit || mod.default || mod;
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const rcedit = loadRcedit();
  const info = context.packager.appInfo;
  const exe = path.join(context.appOutDir, `${info.productFilename}.exe`);
  await rcedit(exe, {
    icon: path.join(context.packager.projectDir, 'build', 'icon.ico'),
    'file-version': info.version,
    'product-version': info.version,
    'version-string': {
        ProductName: 'Fogos Launcher',
        FileDescription: 'Fogos Launcher',
        InternalName: 'Fogos Launcher',
        OriginalFilename: 'Fogos Launcher.exe',
        CompanyName: 'Fogos Launcher Team',
        LegalCopyright: 'Copyright © Fogos Launcher Team'
      }
  });
};
