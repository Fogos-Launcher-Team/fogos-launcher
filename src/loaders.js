const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const fetch = require('node-fetch');
const {
  VERSIONS_DIR, LIBS_DIR, MC_DIR, download, ensureDir, fetchJson,
  downloadLibraries, ensureVersion, readVersionJson, mavenPath
} = require('./versions');
const { getManagedJava } = require('./java');

const FABRIC_META = 'https://meta.fabricmc.net/v2';
const QUILT_META = 'https://meta.quiltmc.org/v3';
const FABRIC_MAVEN = 'https://maven.fabricmc.net/';
const QUILT_MAVEN = 'https://maven.quiltmc.org/repository/release/';
const FORGE_MAVEN = 'https://maven.minecraftforge.net/net/minecraftforge/forge';
const FORGE_PROMOS = 'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json';
const NEOFORGE_API = 'https://maven.neoforged.net/api/maven/versions/releases/net/neoforged';
const NEOFORGE_MAVEN = 'https://maven.neoforged.net/releases/net/neoforged';
const LITELOADER_MANIFEST = 'https://dl.liteloader.com/versions/versions.json';

const versionListCache = new Map();

function compareVersions(a, b) {
  const pa = String(a).split(/[.\-+]/);
  const pb = String(b).split(/[.\-+]/);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i];
    const y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny) {
      if (+x !== +y) return +x - +y;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

function isPreRelease(v) {
  return /(alpha|beta|rc|snapshot|pre)/i.test(v);
}

function pickLatest(versions) {
  const sorted = versions.slice().sort(compareVersions);
  const stable = sorted.filter((v) => !isPreRelease(v));
  const pool = stable.length ? stable : sorted;
  return pool[pool.length - 1];
}

function listVersionDirs() {
  if (!fs.existsSync(VERSIONS_DIR)) return [];
  return fs.readdirSync(VERSIONS_DIR).filter((n) => {
    return !n.startsWith('_') && fs.existsSync(path.join(VERSIONS_DIR, n, `${n}.json`));
  });
}

function baseMcVersion(id, json) {
  return json.inheritsFrom || json.jar || null;
}

const LOADER_ID_TESTS = {
  fabric: (id) => id.startsWith('fabric-loader-'),
  quilt: (id) => id.startsWith('quilt-loader-'),
  forge: (id) => /forge/i.test(id) && !/neoforge/i.test(id),
  neoforge: (id) => /neoforge/i.test(id),
  liteloader: (id) => /liteloader/i.test(id)
};

function findInstalledLoaderVersion(loader, mcVersion, loaderVersion) {
  const test = LOADER_ID_TESTS[loader];
  if (!test) return null;
  const wantVersion = loaderVersion && loaderVersion !== 'auto' ? loaderVersion : null;
  const matches = listVersionDirs().filter((id) => {
    if (!test(id)) return false;
    const json = readVersionJson(id);
    if (!json) return false;
    const base = baseMcVersion(id, json);
    if (base ? base !== mcVersion : !id.includes(mcVersion)) return false;
    if (wantVersion && !id.includes(wantVersion)) return false;
    return true;
  });
  if (matches.length === 0) return null;
  return matches.sort(compareVersions)[matches.length - 1];
}

async function installFabricLike({ label, metaBase, mavenBase, mcVersion, loaderVersion, onProgress }) {
  onProgress({ text: `Получаем версии ${label}...`, percent: 0 });
  const list = await fetchJson(`${metaBase}/versions/loader/${mcVersion}`);
  if (!Array.isArray(list) || list.length === 0) throw new Error(`${label} для ${mcVersion} не найден`);

  let entry;
  if (loaderVersion && loaderVersion !== 'auto') {
    entry = list.find((e) => e.loader.version === loaderVersion);
    if (!entry) throw new Error(`${label} ${loaderVersion} недоступен для ${mcVersion}`);
  } else {
    entry = list.find((e) => e.loader.stable === true)
      || list.find((e) => !/[-+]/.test(e.loader.version))
      || list[0];
  }
  const loaderVer = entry.loader.version;

  const profile = await fetchJson(`${metaBase}/versions/loader/${mcVersion}/${loaderVer}/profile/json`);
  if (!profile || !profile.id) throw new Error(`${label}: профиль запуска не получен`);

  onProgress({ text: `Проверяем Minecraft ${mcVersion}...`, percent: 5 });
  await ensureVersion(mcVersion, (p) => onProgress({ text: p.text, percent: 5 + Math.round((p.percent || 0) * 0.5) }));

  const libs = (profile.libraries || []).map((lib) => ({ ...lib, url: lib.url || mavenBase }));
  await downloadLibraries(libs, (p) => {
    onProgress({ text: `${label}: ${p.text}`, percent: 55 + Math.round((p.percent || 0) * 0.4) });
  });

  const vdir = path.join(VERSIONS_DIR, profile.id);
  ensureDir(vdir);
  fs.writeFileSync(path.join(vdir, `${profile.id}.json`), JSON.stringify(profile, null, 2));
  onProgress({ text: `${label} установлен`, percent: 100 });
  return { versionId: profile.id, loaderVersion: loaderVer };
}

function installFabric(mcVersion, loaderVersion, onProgress) {
  return installFabricLike({ label: 'Fabric', metaBase: FABRIC_META, mavenBase: FABRIC_MAVEN, mcVersion, loaderVersion, onProgress });
}

function installQuilt(mcVersion, loaderVersion, onProgress) {
  return installFabricLike({ label: 'Quilt', metaBase: QUILT_META, mavenBase: QUILT_MAVEN, mcVersion, loaderVersion, onProgress });
}

function ensureLauncherProfiles() {
  const p = path.join(MC_DIR, 'launcher_profiles.json');
  if (fs.existsSync(p)) return;
  fs.writeFileSync(p, JSON.stringify({ profiles: {}, settings: {}, version: 3 }, null, 2));
}

function runInstaller(javaPath, installer, label) {
  return new Promise((resolve, reject) => {
    const proc = spawn(javaPath, ['-jar', installer, '--installClient', MC_DIR], { cwd: MC_DIR, windowsHide: true });
    const tail = [];
    const collect = (data) => {
      for (const line of data.toString().split(/\r?\n/)) {
        if (!line.trim()) continue;
        tail.push(line);
        if (tail.length > 40) tail.shift();
        console.log(`[${label}]`, line);
      }
    };
    proc.stdout.on('data', collect);
    proc.stderr.on('data', collect);
    proc.on('error', (e) => reject(new Error('Ошибка запуска Java: ' + e.message)));
    proc.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`Установщик ${label} завершился с кодом ${code}\n${tail.slice(-6).join('\n')}`));
    });
  });
}

async function downloadFirst(candidates, cacheName) {
  const cacheDir = path.join(VERSIONS_DIR, '_cache');
  ensureDir(cacheDir);
  let lastErr;
  for (const c of candidates) {
    const dest = path.join(cacheDir, c.file);
    try {
      await download(c.url, dest);
      return dest;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Не удалось скачать установщик ${cacheName}: ${lastErr ? lastErr.message : ''}`);
}

async function runLoaderInstaller({ label, mcVersion, installerPath, onProgress, matchNew }) {
  const vanilla = await ensureVersion(mcVersion, (p) => onProgress({ text: p.text, percent: Math.round((p.percent || 0) * 0.3) }));
  const javaMajor = vanilla.javaVersion ? vanilla.javaVersion.majorVersion : 8;
  const java = await getManagedJava(javaMajor, (p) => onProgress({ text: p.text, percent: 30 }));

  ensureLauncherProfiles();
  const before = new Set(listVersionDirs());
  onProgress({ text: `Установка ${label}...`, percent: 40 });
  await runInstaller(java, installerPath, label);
  onProgress({ text: `${label} установлен`, percent: 100 });

  const after = listVersionDirs();
  const fresh = after.filter((id) => !before.has(id));
  const pool = fresh.length ? fresh : after;
  const found = pool.find((id) => {
    const json = readVersionJson(id);
    return json && matchNew(id, json);
  });
  if (!found) throw new Error(`${label}: установщик отработал, но версия не появилась в папке versions`);
  return found;
}

async function resolveForgeVersion(mcVersion, loaderVersion) {
  if (loaderVersion && loaderVersion !== 'auto') return loaderVersion;
  const promos = (await fetchJson(FORGE_PROMOS)).promos || {};
  const v = promos[`${mcVersion}-recommended`] || promos[`${mcVersion}-latest`];
  if (!v) throw new Error('Forge для ' + mcVersion + ' не найден');
  return v;
}

async function installForge(mcVersion, loaderVersion, onProgress) {
  const forgeVer = await resolveForgeVersion(mcVersion, loaderVersion);
  const fulls = [`${mcVersion}-${forgeVer}`, `${mcVersion}-${forgeVer}-${mcVersion}`];
  const installer = await downloadFirst(
    fulls.map((full) => ({ url: `${FORGE_MAVEN}/${full}/forge-${full}-installer.jar`, file: `forge-${full}-installer.jar` })),
    'Forge'
  );
  const versionId = await runLoaderInstaller({
    label: 'Forge', mcVersion, installerPath: installer, onProgress,
    matchNew: (id, json) => LOADER_ID_TESTS.forge(id) && id.includes(forgeVer)
      && (baseMcVersion(id, json) ? baseMcVersion(id, json) === mcVersion : id.includes(mcVersion))
  });
  return { versionId, loaderVersion: forgeVer };
}

function neoForgePrefix(mcVersion) {
  const p = mcVersion.split('.');
  if (p[0] === '1') return `${p[1]}.${p[2] || '0'}.`;
  return `${mcVersion}.`;
}

async function listNeoForgeVersions(mcVersion) {
  if (mcVersion === '1.20.1') {
    const data = await fetchJson(`${NEOFORGE_API}/forge`);
    return (data.versions || []).filter((v) => v.startsWith('1.20.1-'));
  }
  const data = await fetchJson(`${NEOFORGE_API}/neoforge`);
  const prefix = neoForgePrefix(mcVersion);
  return (data.versions || []).filter((v) => v.startsWith(prefix));
}

async function installNeoForge(mcVersion, loaderVersion, onProgress) {
  const legacy = mcVersion === '1.20.1';
  let ver;
  if (loaderVersion && loaderVersion !== 'auto') {
    ver = loaderVersion;
  } else {
    const all = await listNeoForgeVersions(mcVersion);
    if (!all.length) throw new Error('NeoForge для ' + mcVersion + ' не найден');
    ver = pickLatest(all);
  }
  const artifact = legacy ? 'forge' : 'neoforge';
  const url = `${NEOFORGE_MAVEN}/${artifact}/${ver}/${artifact}-${ver}-installer.jar`;
  const installer = await downloadFirst([{ url, file: `${artifact}-${ver}-installer.jar` }], 'NeoForge');
  const shortVer = legacy ? ver.replace(/^1\.20\.1-/, '') : ver;
  const versionId = await runLoaderInstaller({
    label: 'NeoForge', mcVersion, installerPath: installer, onProgress,
    matchNew: (id, json) => id.includes(shortVer)
      && (baseMcVersion(id, json) ? baseMcVersion(id, json) === mcVersion : true)
  });
  return { versionId, loaderVersion: ver };
}

async function installLiteLoader(mcVersion, loaderVersion, onProgress) {
  onProgress({ text: 'Получаем данные LiteLoader...', percent: 0 });
  let manifest;
  try {
    manifest = await fetchJson(LITELOADER_MANIFEST, 2);
  } catch (e) {
    throw new Error('Не удалось получить данные LiteLoader. Сайт проекта часто недоступен.');
  }
  const entry = manifest.versions && manifest.versions[mcVersion];
  if (!entry) throw new Error('LiteLoader не поддерживает ' + mcVersion);

  const artefacts = (entry.artefacts && entry.artefacts['com.mumfrey:liteloader']) || {};
  const art = artefacts[mcVersion] || artefacts.latest || Object.values(artefacts)[0];
  if (!art || !art.version) throw new Error('LiteLoader: сборка для ' + mcVersion + ' не найдена');
  const repoUrl = (entry.repo && entry.repo.url) || 'https://repo.mumfrey.com/content/repositories/liteloader/';
  const tweakClass = art.tweakClass || 'com.mumfrey.liteloader.launch.LiteLoaderTweaker';

  const parent = await ensureVersion(mcVersion, (p) => onProgress({ text: p.text, percent: Math.round((p.percent || 0) * 0.5) }));
  if (!parent.minecraftArguments) throw new Error('LiteLoader не поддерживает ' + mcVersion);

  const liteName = `com.mumfrey:liteloader:${art.version}`;
  const liteDest = path.join(LIBS_DIR, mavenPath(liteName));
  const liteUrl = `${repoUrl.replace(/\/?$/, '/')}com/mumfrey/liteloader/${art.version}/${art.file || `liteloader-${art.version}.jar`}`;
  onProgress({ text: 'Скачиваем LiteLoader...', percent: 55 });
  await download(liteUrl, liteDest);

  const libs = [{ name: liteName }];
  const extra = Array.isArray(entry.libraries) ? entry.libraries : [];
  for (const lib of extra) if (lib && lib.name) libs.push({ name: lib.name, url: lib.url });
  if (!libs.some((l) => l.name.startsWith('net.minecraft:launchwrapper:'))) {
    libs.push({ name: 'net.minecraft:launchwrapper:1.12', url: 'https://libraries.minecraft.net/' });
  }
  if (!libs.some((l) => l.name.startsWith('org.ow2.asm:asm-all:'))) {
    libs.push({ name: 'org.ow2.asm:asm-all:5.2', url: 'https://repo1.maven.org/maven2/' });
  }
  await downloadLibraries(libs.slice(1), (p) => onProgress({ text: `LiteLoader: ${p.text}`, percent: 60 + Math.round((p.percent || 0) * 0.35) }));

  const id = `${mcVersion}-LiteLoader${art.version}`;
  const profile = {
    id,
    inheritsFrom: mcVersion,
    type: parent.type || 'release',
    mainClass: 'net.minecraft.launchwrapper.Launch',
    minecraftArguments: `${parent.minecraftArguments} --tweakClass ${tweakClass}`,
    libraries: libs
  };
  const vdir = path.join(VERSIONS_DIR, id);
  ensureDir(vdir);
  fs.writeFileSync(path.join(vdir, `${id}.json`), JSON.stringify(profile, null, 2));
  onProgress({ text: 'LiteLoader установлен', percent: 100 });
  return { versionId: id, loaderVersion: art.version };
}

async function getLoaderVersions(loader, mcVersion) {
  const key = `${loader}:${mcVersion}`;
  const cached = versionListCache.get(key);
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) return cached.list;

  let list = [];
  if (loader === 'fabric') {
    list = (await fetchJson(`${FABRIC_META}/versions/loader/${mcVersion}`)).map((e) => e.loader.version);
  } else if (loader === 'quilt') {
    list = (await fetchJson(`${QUILT_META}/versions/loader/${mcVersion}`)).map((e) => e.loader.version);
  } else if (loader === 'forge') {
    const r = await fetch(`${FORGE_MAVEN}/maven-metadata.xml`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const xml = await r.text();
    const all = [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map((m) => m[1]);
    list = all
      .filter((v) => v.startsWith(`${mcVersion}-`))
      .map((v) => v.slice(mcVersion.length + 1).replace(new RegExp(`-${mcVersion.replace(/\./g, '\\.')}$`), ''))
      .reverse();
  } else if (loader === 'neoforge') {
    list = (await listNeoForgeVersions(mcVersion)).sort(compareVersions).reverse();
  }

  versionListCache.set(key, { time: Date.now(), list });
  return list;
}

async function installLoader({ loader, mcVersion, version, onProgress = () => {} }) {
  switch (loader) {
    case 'fabric': return installFabric(mcVersion, version, onProgress);
    case 'quilt': return installQuilt(mcVersion, version, onProgress);
    case 'forge': return installForge(mcVersion, version, onProgress);
    case 'neoforge': return installNeoForge(mcVersion, version, onProgress);
    case 'liteloader': return installLiteLoader(mcVersion, version, onProgress);
    default: throw new Error('Неизвестный лоадер: ' + loader);
  }
}

module.exports = {
  installFabric, installQuilt, installForge, installNeoForge, installLiteLoader,
  installLoader, getLoaderVersions, findInstalledLoaderVersion
};
