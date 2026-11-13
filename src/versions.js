const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');

const MC_DIR = process.env.FOGOS_GAME_DIR || path.join(__dirname, '..', 'game');
const VERSIONS_DIR = path.join(MC_DIR, 'versions');
const LIBS_DIR = path.join(MC_DIR, 'libraries');
const ASSETS_DIR = path.join(MC_DIR, 'assets');

const MANIFEST_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json';
const RESOURCES_URL = 'https://resources.download.minecraft.net';
const LIBRARIES_URL = 'https://libraries.minecraft.net/';

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function osName() {
  return process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
}

function archName() {
  if (process.arch === 'arm64') return 'arm64';
  if (process.arch === 'ia32') return 'x86';
  return 'x64';
}

function sha1Of(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

async function fetchJson(url, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
      return await r.json();
    } catch (e) {
      lastErr = e;
      if (/HTTP 4\d\d/.test(e.message)) break;
      await sleep(400 * (i + 1));
    }
  }
  throw lastErr;
}

async function getManifest() {
  return fetchJson(MANIFEST_URL);
}

async function getVersionList() {
  const manifest = await getManifest();
  return manifest.versions.map((v) => ({ id: v.id, type: v.type, releaseTime: v.releaseTime }));
}

async function getVersionJson(versionId) {
  const manifest = await getManifest();
  const entry = manifest.versions.find((v) => v.id === versionId);
  if (!entry) throw new Error('Версия не найдена: ' + versionId);
  return fetchJson(entry.url);
}

function readVersionJson(versionId) {
  const p = path.join(VERSIONS_DIR, versionId, `${versionId}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

async function download(url, dest, opts = {}) {
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest)) {
    const st = fs.statSync(dest);
    const valid = opts.size ? st.size === opts.size : st.size > 0;
    if (valid) return;
    try { fs.unlinkSync(dest); } catch (e) {}
  }
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length === 0) throw new Error('Пустой ответ: ' + url);
      if (opts.sha1 && sha1Of(buf) !== opts.sha1) throw new Error('Контрольная сумма не совпала: ' + url);
      const tmp = dest + '.part';
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, dest);
      return;
    } catch (e) {
      lastErr = e;
      if (/HTTP 4\d\d/.test(e.message)) break;
      await sleep(500 * (attempt + 1));
    }
  }
  throw lastErr;
}

function ruleMatches(rule, osn) {
  if (rule.features) return false;
  if (rule.os) {
    if (rule.os.name && rule.os.name !== osn) return false;
    if (rule.os.arch && rule.os.arch !== archName()) return false;
  }
  return true;
}

function rulesAllow(rules, osn) {
  if (!rules || rules.length === 0) return true;
  let allow = false;
  for (const r of rules) {
    if (!ruleMatches(r, osn)) continue;
    allow = r.action === 'allow';
  }
  return allow;
}

function mavenPath(name) {
  let coords = name;
  let ext = 'jar';
  const at = coords.indexOf('@');
  if (at !== -1) {
    ext = coords.slice(at + 1);
    coords = coords.slice(0, at);
  }
  const [group, artifact, version, classifier] = coords.split(':');
  const file = `${artifact}-${version}${classifier ? '-' + classifier : ''}.${ext}`;
  return `${group.replace(/\./g, '/')}/${artifact}/${version}/${file}`;
}

function libraryFiles(lib, osn) {
  const out = [];
  const d = lib.downloads;
  const classifierOf = (name) => (name.split('@')[0].split(':')[3] || '');

  if (d && d.artifact && d.artifact.path) {
    out.push({
      rel: d.artifact.path, url: d.artifact.url, sha1: d.artifact.sha1, size: d.artifact.size,
      classpath: true, extract: /^natives/.test(classifierOf(lib.name || ''))
    });
  }

  if (lib.natives && lib.natives[osn]) {
    const cls = lib.natives[osn].replace('${arch}', process.arch === 'x64' ? '64' : '32');
    const c = d && d.classifiers && d.classifiers[cls];
    if (c) {
      out.push({ rel: c.path, url: c.url, sha1: c.sha1, size: c.size, classpath: false, extract: true });
    } else {
      out.push({ rel: mavenPath(`${lib.name}:${cls}`), url: null, base: lib.url, classpath: false, extract: true });
    }
  }

  if (!d && !lib.natives) {
    out.push({ rel: mavenPath(lib.name), url: null, base: lib.url, classpath: true, extract: /^natives/.test(classifierOf(lib.name || '')) });
  }

  return out;
}

function libraryUrl(item) {
  if (item.url === '') return null;
  if (item.url) return item.url;
  return (item.base || LIBRARIES_URL) + item.rel;
}

async function downloadLibraries(libs, onProgress = () => {}, label = 'Библиотеки') {
  const osn = osName();
  const items = [];
  const seen = new Set();
  for (const lib of libs || []) {
    if (!lib || !lib.name) continue;
    if (!rulesAllow(lib.rules, osn)) continue;
    for (const item of libraryFiles(lib, osn)) {
      if (seen.has(item.rel)) continue;
      seen.add(item.rel);
      items.push({ ...item, name: lib.name });
    }
  }

  const failed = [];
  let done = 0;
  const queue = items.slice();

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      const url = libraryUrl(item);
      const dest = path.join(LIBS_DIR, item.rel);
      try {
        if (url) await download(url, dest, { sha1: item.sha1, size: item.size });
      } catch (e) {
        failed.push(`${item.name} (${e.message})`);
      }
      done++;
      onProgress({ text: `${label} ${done}/${items.length}`, percent: items.length ? Math.round((done / items.length) * 100) : 100 });
    }
  }

  await Promise.all(Array.from({ length: 8 }, () => worker()));

  if (failed.length > 0) {
    console.warn('[libs] failed:', failed);
    throw new Error(`Не удалось скачать библиотеки (${failed.length}): ${failed.slice(0, 3).join('; ')}`);
  }
  return items.length;
}

function objectPath(hash) {
  return path.join(ASSETS_DIR, 'objects', hash.slice(0, 2), hash);
}

async function installAssets(assetIndex, onProgress = () => {}) {
  onProgress({ text: 'Скачиваем индекс ассетов...', percent: 0 });
  const indexPath = path.join(ASSETS_DIR, 'indexes', `${assetIndex.id}.json`);
  await download(assetIndex.url, indexPath, { sha1: assetIndex.sha1, size: assetIndex.size });
  const indexJson = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const objects = Object.values(indexJson.objects || {});
  const total = objects.length;

  let done = 0;
  let fails = 0;
  let alreadyPresent = 0;
  const queue = [];
  const failedList = [];
  const seen = new Set();

  for (const info of objects) {
    if (seen.has(info.hash)) { done++; continue; }
    seen.add(info.hash);
    const dest = objectPath(info.hash);
    if (fs.existsSync(dest) && fs.statSync(dest).size === info.size) {
      alreadyPresent++;
      done++;
      continue;
    }
    queue.push({ hash: info.hash, dest, size: info.size });
  }

  if (queue.length === 0) {
    onProgress({ text: `Ассеты уже на месте (${alreadyPresent}/${total})`, percent: 100 });
    return { ok: true, total, alreadyPresent, downloaded: 0, fails: 0, failedList: [] };
  }

  onProgress({ text: `Докачиваем ассеты ${done}/${total}`, percent: Math.round((done / total) * 100) });

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      try {
        await download(`${RESOURCES_URL}/${item.hash.slice(0, 2)}/${item.hash}`, item.dest, { sha1: item.hash, size: item.size });
      } catch (e) {
        fails++;
        if (failedList.length < 50) failedList.push({ hash: item.hash, error: e.message });
      }
      done++;
      if (done % 20 === 0 || queue.length === 0) {
        onProgress({ text: `Докачиваем ассеты ${done}/${total}`, percent: Math.round((done / total) * 100) });
      }
    }
  }

  await Promise.all(Array.from({ length: 16 }, () => worker()));

  const summary = { ok: fails === 0, total, alreadyPresent, downloaded: total - alreadyPresent - fails, fails, failedList };
  if (fails > 0) {
    onProgress({ text: `Готово, но ${fails} ассет(ов) не скачалось`, percent: 100 });
    console.warn('[assets] failed files:', failedList);
  } else {
    onProgress({ text: 'Ассеты в порядке', percent: 100 });
  }
  return summary;
}

function prepareLegacyAssets(assetIndexId, gameDir) {
  const indexPath = path.join(ASSETS_DIR, 'indexes', `${assetIndexId}.json`);
  const result = { gameAssets: ASSETS_DIR };
  if (!fs.existsSync(indexPath)) return result;
  let indexJson;
  try {
    indexJson = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch (e) {
    return result;
  }
  if (!indexJson.virtual && !indexJson.map_to_resources) return result;

  const targetRoot = indexJson.map_to_resources
    ? path.join(gameDir, 'resources')
    : path.join(ASSETS_DIR, 'virtual', assetIndexId);

  for (const [name, info] of Object.entries(indexJson.objects || {})) {
    const src = objectPath(info.hash);
    const dest = path.join(targetRoot, name);
    if (!dest.startsWith(targetRoot)) continue;
    if (fs.existsSync(dest) && fs.statSync(dest).size === info.size) continue;
    if (!fs.existsSync(src)) continue;
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }

  result.gameAssets = targetRoot;
  return result;
}

async function installVersion(versionId, onProgress = () => {}) {
  onProgress({ text: 'Получаем метаданные ' + versionId + '...', percent: 0 });
  const vjson = await getVersionJson(versionId);
  const vid = vjson.id;
  const versionDir = path.join(VERSIONS_DIR, vid);
  ensureDir(versionDir);

  onProgress({ text: 'Скачиваем client.jar...', percent: 5 });
  if (vjson.downloads && vjson.downloads.client && vjson.downloads.client.url) {
    const c = vjson.downloads.client;
    await download(c.url, path.join(versionDir, `${vid}.jar`), { sha1: c.sha1, size: c.size });
  }

  await downloadLibraries(vjson.libraries, (p) => {
    onProgress({ text: p.text, percent: 5 + Math.round((p.percent / 100) * 30) });
  });

  if (vjson.assetIndex && vjson.assetIndex.url) {
    onProgress({ text: 'Скачиваем ассеты...', percent: 35 });
    const res = await installAssets(vjson.assetIndex, (p) => {
      onProgress({ text: p.text, percent: 35 + Math.round(((p.percent || 0) / 100) * 65) });
    });
    if (!res.ok) throw new Error(`Не скачалось ассетов: ${res.fails}. Повторите установку или запустите починку ассетов.`);
  }

  fs.writeFileSync(path.join(versionDir, `${vid}.json`), JSON.stringify(vjson, null, 2));
  onProgress({ text: 'Готово!', percent: 100 });
  return vjson;
}

async function ensureVersion(versionId, onProgress = () => {}) {
  const vjson = readVersionJson(versionId);
  const jar = path.join(VERSIONS_DIR, versionId, `${versionId}.jar`);
  if (vjson && fs.existsSync(jar) && fs.statSync(jar).size > 0) return vjson;
  return installVersion(versionId, onProgress);
}

async function repairAssets(versionId, onProgress = () => {}) {
  const vjson = readVersionJson(versionId) || await getVersionJson(versionId);
  if (!vjson.assetIndex || !vjson.assetIndex.url) {
    throw new Error('У версии ' + versionId + ' нет assetIndex');
  }
  return installAssets(vjson.assetIndex, onProgress);
}

module.exports = {
  installVersion, ensureVersion, getVersionJson, readVersionJson, getManifest, getVersionList, repairAssets,
  installAssets, prepareLegacyAssets, downloadLibraries, libraryFiles, fetchJson,
  MC_DIR, VERSIONS_DIR, LIBS_DIR, ASSETS_DIR,
  download, ensureDir, osName, archName, rulesAllow, mavenPath
};
