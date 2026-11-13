const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const AdmZip = require('adm-zip');
const fetch = require('node-fetch');
const {
  MC_DIR, VERSIONS_DIR, LIBS_DIR, ASSETS_DIR, rulesAllow, osName, libraryFiles,
  ensureVersion, readVersionJson, installAssets, prepareLegacyAssets, downloadLibraries
} = require('./versions');
const { INSTANCES_DIR, updateInstance } = require('./instances');
const { installLoader, findInstalledLoaderVersion } = require('./installers');
const { getJavaPath } = require('./java');

const SEP = process.platform === 'win32' ? ';' : ':';

function replaceAll(str, map) {
  let out = String(str);
  for (const k of Object.keys(map)) out = out.split(k).join(map[k]);
  return out;
}

function isDemoArg(arg) {
  if (!arg) return false;
  const a = String(arg).toLowerCase();
  return a === '--demo' || a === '-demo' || a === 'demo' || a.startsWith('--demo=');
}

function libKey(lib) {
  const p = lib.name.split('@')[0].split(':');
  return `${p[0]}:${p[1]}:${p[3] || ''}`;
}

function mergeLibraries(child, parent) {
  const seen = new Set();
  const out = [];
  for (const lib of [...(child || []), ...(parent || [])]) {
    if (!lib || !lib.name) continue;
    const key = libKey(lib);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lib);
  }
  return out;
}

function mergeArguments(parent, child) {
  const result = { jvm: [], game: [], legacy: null };

  if (child.minecraftArguments && !child.arguments) {
    result.legacy = child.minecraftArguments;
    return result;
  }
  if (!child.arguments && parent && parent.minecraftArguments) {
    result.legacy = parent.minecraftArguments;
    return result;
  }

  if (parent) {
    if (parent.arguments) {
      result.jvm.push(...(parent.arguments.jvm || []));
      result.game.push(...(parent.arguments.game || []));
    } else if (parent.minecraftArguments) {
      result.game.push(...parent.minecraftArguments.split(' ').filter(Boolean));
    }
  }
  if (child.arguments) {
    result.jvm.push(...(child.arguments.jvm || []));
    result.game.push(...(child.arguments.game || []));
  }
  return result;
}

function mergeVersions(vjson, parent) {
  const pick = (key) => (vjson[key] !== undefined ? vjson[key] : parent ? parent[key] : undefined);
  return {
    id: vjson.id,
    mainClass: vjson.mainClass || (parent && parent.mainClass),
    assets: pick('assets'),
    assetIndex: pick('assetIndex'),
    type: pick('type') || 'release',
    args: mergeArguments(parent, vjson),
    libraries: mergeLibraries(vjson.libraries, parent && parent.libraries),
    javaVersion: pick('javaVersion'),
    jar: vjson.jar || vjson.inheritsFrom || vjson.id
  };
}

function collectArgs(list, ctx) {
  const out = [];
  const osn = osName();
  for (const a of list || []) {
    if (typeof a === 'string') {
      const arg = replaceAll(a, ctx);
      if (arg.trim() !== '') out.push(arg);
      continue;
    }
    if (!a || !rulesAllow(a.rules, osn)) continue;
    const vals = Array.isArray(a.value) ? a.value : [a.value];
    for (const v of vals) {
      const arg = replaceAll(v, ctx);
      if (arg.trim() !== '') out.push(arg);
    }
  }
  return out;
}

async function ensureAuthlibInjector() {
  const authlibPath = path.join(MC_DIR, 'libraries', 'authlib-injector.jar');
  if (fs.existsSync(authlibPath) && fs.statSync(authlibPath).size > 0) return authlibPath;

  const url = 'https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.5/authlib-injector-1.2.5.jar';
  const r = await fetch(url);
  if (!r.ok) return null;
  fs.mkdirSync(path.dirname(authlibPath), { recursive: true });
  fs.writeFileSync(authlibPath, Buffer.from(await r.arrayBuffer()));
  return authlibPath;
}

function extractNatives(libraries, nativesDir) {
  const osn = osName();
  fs.rmSync(nativesDir, { recursive: true, force: true });
  fs.mkdirSync(nativesDir, { recursive: true });
  let extracted = 0;

  for (const lib of libraries) {
    if (!rulesAllow(lib.rules, osn)) continue;
    for (const item of libraryFiles(lib, osn)) {
      if (!item.extract) continue;
      const jarPath = path.join(LIBS_DIR, item.rel);
      if (!fs.existsSync(jarPath)) continue;
      try {
        const zip = new AdmZip(jarPath);
        for (const entry of zip.getEntries()) {
          if (entry.isDirectory) continue;
          if (entry.entryName.startsWith('META-INF/')) continue;
          if (!/\.(dll|so|dylib|jnilib)$/i.test(entry.entryName)) continue;
          fs.writeFileSync(path.join(nativesDir, path.basename(entry.entryName)), entry.getData());
          extracted++;
        }
      } catch (e) {
        console.warn('[natives] failed to extract', jarPath, e.message);
      }
    }
  }
  console.log(`[natives] extracted ${extracted} file(s) into ${nativesDir}`);
}

function buildClasspath(libraries, clientJar) {
  const osn = osName();
  const entries = [];
  const seen = new Set();
  const add = (p) => {
    if (!p || seen.has(p) || !fs.existsSync(p)) return;
    seen.add(p);
    entries.push(p);
  };

  for (const lib of libraries) {
    if (!rulesAllow(lib.rules, osn)) continue;
    for (const item of libraryFiles(lib, osn)) {
      if (item.classpath) add(path.join(LIBS_DIR, item.rel));
    }
  }
  add(clientJar);
  return entries;
}

function resolveClientJar(vjson, merged) {
  const candidates = [vjson.jar, vjson.id, vjson.inheritsFrom, merged.jar].filter(Boolean);
  for (const id of candidates) {
    const p = path.join(VERSIONS_DIR, id, `${id}.jar`);
    if (fs.existsSync(p) && fs.statSync(p).size > 0) return p;
  }
  return null;
}

async function resolveVersionId(meta, instanceName, onProgress) {
  if (!meta.loader || meta.loader === 'vanilla') {
    await ensureVersion(meta.mcVersion, onProgress);
    return meta.mcVersion;
  }

  if (meta.versionId && readVersionJson(meta.versionId)) return meta.versionId;

  let id = findInstalledLoaderVersion(meta.loader, meta.mcVersion, meta.loaderVersion);
  if (!id) {
    onProgress({ text: 'Installing mod loader...', percent: 10 });
    const res = await installLoader({
      loader: meta.loader, mcVersion: meta.mcVersion, version: meta.loaderVersion, onProgress
    });
    id = res.versionId;
  }
  try {
    updateInstance(instanceName, { versionId: id });
  } catch (e) {
    console.warn('[launch] cannot save versionId', e.message);
  }
  return id;
}

async function launchGame({ instance, account, onProgress = () => {} }) {
  const instanceDir = path.join(INSTANCES_DIR, instance);
  const gameDir = path.join(instanceDir, '.minecraft');
  const meta = JSON.parse(fs.readFileSync(path.join(instanceDir, 'instance.json'), 'utf8'));
  fs.mkdirSync(gameDir, { recursive: true });

  const versionId = await resolveVersionId(meta, instance, onProgress);
  const vjson = readVersionJson(versionId);
  if (!vjson) throw new Error('Version files not found: ' + versionId);

  let parent = null;
  const baseId = vjson.inheritsFrom || (vjson.jar && vjson.jar !== vjson.id ? vjson.jar : null);
  if (baseId) {
    await ensureVersion(baseId, onProgress);
    parent = readVersionJson(baseId);
  }

  console.log('LAUNCHING VERSION:', versionId);

  const merged = mergeVersions(vjson, parent);

  onProgress({ text: 'Проверяем библиотеки...', percent: 20 });
  await downloadLibraries(merged.libraries, (p) => onProgress({ text: p.text, percent: 20 + Math.round(p.percent * 0.3) }));

  if (merged.assetIndex && merged.assetIndex.url) {
    await installAssets(merged.assetIndex, (p) => onProgress({ text: p.text, percent: 50 + Math.round((p.percent || 0) * 0.4) }));
  }

  const assetIndexId = (merged.assetIndex && merged.assetIndex.id) || merged.assets || 'legacy';
  const { gameAssets } = prepareLegacyAssets(assetIndexId, gameDir);

  const nativesDir = path.join(instanceDir, 'natives');
  extractNatives(merged.libraries, nativesDir);

  const clientJar = resolveClientJar(vjson, merged);
  if (!clientJar) throw new Error('Не найден jar клиента для версии ' + versionId);
  const classpath = buildClasspath(merged.libraries, clientJar).join(SEP);

  const isOffline = account.type === 'offline';
  const accessToken = isOffline ? '0'.repeat(32) : account.accessToken;
  const userType = isOffline ? 'legacy' : 'msa';

  const ctx = {
    '${auth_player_name}': account.name,
    '${version_name}': versionId,
    '${game_directory}': gameDir,
    '${assets_root}': ASSETS_DIR,
    '${game_assets}': gameAssets,
    '${assets_index_name}': assetIndexId,
    '${auth_uuid}': account.uuid,
    '${auth_access_token}': accessToken,
    '${auth_session}': `token:${accessToken}:${account.uuid}`,
    '${user_type}': userType,
    '${version_type}': merged.type,
    '${user_properties}': '{}',
    '${clientid}': 'fogos-launcher',
    '${auth_xuid}': '0',
    '${natives_directory}': nativesDir,
    '${launcher_name}': 'FogosLauncher',
    '${launcher_version}': '1.1.0',
    '${classpath}': classpath,
    '${classpath_separator}': SEP,
    '${library_directory}': LIBS_DIR
  };

  let jvmArgs;
  let gameArgs;
  if (merged.args.legacy) {
    jvmArgs = [`-Djava.library.path=${nativesDir}`, '-cp', classpath];
    gameArgs = merged.args.legacy.split(' ').filter(Boolean).map((s) => replaceAll(s, ctx)).filter((s) => s.trim() !== '');
  } else {
    jvmArgs = collectArgs(merged.args.jvm, ctx);
    gameArgs = collectArgs(merged.args.game, ctx);
    if (!jvmArgs.some((a) => a.startsWith('-Djava.library.path='))) jvmArgs.unshift(`-Djava.library.path=${nativesDir}`);
    if (!jvmArgs.some((a) => a === '-cp' || a === '-classpath')) jvmArgs.push('-cp', classpath);
  }

  const extraJvm = meta.jvmArgs ? meta.jvmArgs.split(' ').filter(Boolean) : [];
  const extraGame = meta.gameArgs ? meta.gameArgs.split(' ').filter(Boolean) : [];
  const maxRam = meta.maxMemory || 4096;
  const minRam = meta.minMemory || 1024;

  const javaPath = await getJavaPath(
    merged.javaVersion ? merged.javaVersion.majorVersion : 8, onProgress, meta.javaPath
  );

  let authlibArg = [];
  if (account.type === 'ely') {
    const authlibPath = await ensureAuthlibInjector();
    if (authlibPath) authlibArg = [`-javaagent:${authlibPath}=https://authserver.ely.by/api/authlib-injector`];
  }

  const mainClass = merged.mainClass || 'net.minecraft.client.main.Main';

  const fullArgs = [
    `-Xmx${maxRam}M`, `-Xms${minRam}M`,
    ...authlibArg,
    ...jvmArgs, ...extraJvm, mainClass,
    ...gameArgs, ...extraGame
  ].filter((a) => !isDemoArg(a));

  console.log('EXECUTING JAVA WITH ARGS:', fullArgs.join(' '));

  const logDir = path.join(gameDir, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logStream = fs.createWriteStream(path.join(logDir, 'fogos-launcher.log'), { flags: 'w' });
  const tail = [];
  const collect = (data) => {
    logStream.write(data);
    process.stdout.write(data);
    for (const line of data.toString().split(/\r?\n/)) {
      if (!line.trim()) continue;
      tail.push(line);
      if (tail.length > 30) tail.shift();
    }
  };

  const proc = spawn(javaPath, fullArgs, { cwd: gameDir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', collect);
  proc.stderr.on('data', collect);
  proc.on('close', () => logStream.end());

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ pid: proc.pid, proc });
    }, 2500);

    proc.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });
    proc.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Minecraft завершился сразу (код ${code}).\n${tail.slice(-8).join('\n')}`));
    });
  });
}

module.exports = { launchGame };
