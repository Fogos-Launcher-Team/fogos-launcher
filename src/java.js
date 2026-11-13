const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const AdmZip = require('adm-zip');
const fetch = require('node-fetch');
const { MC_DIR, ensureDir } = require('./versions');
const { loadConfig } = require('./config');

const JAVA_BIN = process.platform === 'win32' ? 'java.exe' : 'java';

function featureVersion(major) {
  const v = Number(major) || 8;
  if (v <= 8) return 8;
  if (v <= 17) return 17;
  if (v <= 21) return 21;
  return 25;
}

function adoptiumTarget() {
  const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';
  const arch = process.arch === 'arm64' ? 'aarch64' : process.arch === 'ia32' ? 'x32' : 'x64';
  return { os, arch };
}

function findJavaBinary(dir, depth = 0) {
  if (!fs.existsSync(dir)) return null;
  const direct = path.join(dir, 'bin', JAVA_BIN);
  if (fs.existsSync(direct)) return direct;
  if (depth >= 4) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = findJavaBinary(path.join(dir, entry.name), depth + 1);
    if (found) return found;
  }
  return null;
}

async function downloadToFile(url, dest) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`Не удалось скачать Java: HTTP ${r.status}`);
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    r.body.on('error', reject);
    out.on('error', reject);
    out.on('finish', resolve);
    r.body.pipe(out);
  });
}

async function getManagedJava(majorVersion, onProgress) {
  const feature = featureVersion(majorVersion);
  const javaBaseDir = path.join(MC_DIR, 'java');
  const jreDir = path.join(javaBaseDir, `jre-${feature}`);

  const existing = findJavaBinary(jreDir);
  if (existing) return existing;

  ensureDir(javaBaseDir);
  fs.rmSync(jreDir, { recursive: true, force: true });
  ensureDir(jreDir);

  const { os, arch } = adoptiumTarget();
  const url = `https://api.adoptium.net/v3/binary/latest/${feature}/ga/${os}/${arch}/jre/hotspot/normal/eclipse`;
  const archive = path.join(javaBaseDir, `jre-${feature}.${os === 'windows' ? 'zip' : 'tar.gz'}`);

  onProgress({ text: `Скачиваем Java ${feature}...`, percent: 0 });
  try {
    await downloadToFile(url, archive);
    onProgress({ text: `Распаковываем Java ${feature}...`, percent: 60 });
    if (os === 'windows') {
      new AdmZip(archive).extractAllTo(jreDir, true);
    } else {
      const res = spawnSync('tar', ['-xzf', archive, '-C', jreDir]);
      if (res.status !== 0) throw new Error('Не удалось распаковать Java');
    }
  } catch (e) {
    fs.rmSync(jreDir, { recursive: true, force: true });
    throw e;
  } finally {
    try { fs.unlinkSync(archive); } catch (e) {}
  }

  const javaExe = findJavaBinary(jreDir);
  if (!javaExe) {
    fs.rmSync(jreDir, { recursive: true, force: true });
    throw new Error(`Java ${feature} распакована некорректно`);
  }
  if (process.platform !== 'win32') {
    try { fs.chmodSync(javaExe, 0o755); } catch (e) {}
  }
  onProgress({ text: `Java ${feature} готова`, percent: 100 });
  return javaExe;
}

async function getJavaPath(majorVersion, onProgress = () => {}, preferred = '') {
  const configured = preferred || loadConfig().javaPath;
  if (configured && (!/[\\/]/.test(configured) || fs.existsSync(configured))) return configured;
  return getManagedJava(majorVersion, onProgress);
}

module.exports = { getJavaPath, getManagedJava };
