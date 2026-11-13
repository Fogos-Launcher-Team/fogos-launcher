const fs = require('fs');
const path = require('path');

const TARGET_NAME = 'Fogos Launcher.exe';

async function main() {
  if (process.platform !== 'win32') return;

  let electronDir;
  try {
    electronDir = path.dirname(require.resolve('electron/package.json'));
  } catch (e) {
    return;
  }

  const dist = path.join(electronDir, 'dist');
  const source = path.join(dist, 'electron.exe');
  const target = path.join(dist, TARGET_NAME);
  const marker = path.join(dist, '.fogos-patched');
  if (!fs.existsSync(source)) return;

  if (!fs.existsSync(target) || !fs.existsSync(marker)) {
    const root = path.join(__dirname, '..');
    const pkg = require(path.join(root, 'package.json'));
    const mod = require('rcedit');
    const rcedit = mod.rcedit || mod.default || mod;
    fs.copyFileSync(source, target);
    await rcedit(target, {
      icon: path.join(root, 'build', 'icon.ico'),
      'file-version': pkg.version,
      'product-version': pkg.version,
      'version-string': {
        ProductName: 'Fogos Launcher',
        FileDescription: 'Fogos Launcher',
        InternalName: 'Fogos Launcher',
        OriginalFilename: 'Fogos Launcher.exe',
        CompanyName: 'Fogos Launcher Team',
        LegalCopyright: 'Copyright © Fogos Launcher Team'
      }
    });
    fs.writeFileSync(marker, '1');
  }

  fs.writeFileSync(path.join(electronDir, 'path.txt'), TARGET_NAME);
}

main().catch((e) => console.warn('[fogos] electron patch skipped:', e.message));
