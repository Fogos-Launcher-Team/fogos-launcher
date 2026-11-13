const fs = require('fs');
const path = require('path');

const MC_DIR = process.env.FOGOS_GAME_DIR || path.join(__dirname, '..', 'game');
const INSTANCES_DIR = path.join(MC_DIR, 'instances');

function ensureDirs(name) {
  const dir = path.join(INSTANCES_DIR, name);
  ['.minecraft', '.minecraft/mods', '.minecraft/resourcepacks',
   '.minecraft/shaderpacks', '.minecraft/datapacks',
   '.minecraft/saves', '.minecraft/config']
   .forEach((d) => fs.mkdirSync(path.join(dir, d), { recursive: true }));
  return dir;
}

function normalize(meta) {
  return {
    name: meta.name, mcVersion: meta.mcVersion,
    loader: meta.loader || 'vanilla', loaderVersion: meta.loaderVersion || null,
    versionId: meta.versionId || null, group: meta.group || 'Без группы',
    icon: meta.icon || 'default', javaPath: meta.javaPath || '',
    maxMemory: meta.maxMemory || 4096, minMemory: meta.minMemory || 1024,
    jvmArgs: meta.jvmArgs || '', gameArgs: meta.gameArgs || '',
    notes: meta.notes || '', created: meta.created || Date.now(),
    installedMods: meta.installedMods || {},
    installedFiles: meta.installedFiles || {},
    type: meta.type || 'java'
  };
}

function getInstance(name) {
  const p = path.join(INSTANCES_DIR, name, 'instance.json');
  if (!fs.existsSync(p)) return null;
  try {
    return normalize(JSON.parse(fs.readFileSync(p, 'utf8')));
  } catch (e) {
    return null;
  }
}

function listInstances() {
  fs.mkdirSync(INSTANCES_DIR, { recursive: true });
  return fs.readdirSync(INSTANCES_DIR)
    .map((n) => getInstance(n))
    .filter(Boolean);
}

function createInstance({ name, mcVersion, loader, loaderVersion, icon, versionId, type }) {
  const dir = ensureDirs(name);
  const meta = {
    name, mcVersion, loader: loader || 'vanilla',
    loaderVersion: loaderVersion || null, versionId: versionId || null,
    group: 'Без группы', icon: icon || 'default', javaPath: '',
    maxMemory: 4096, minMemory: 1024, jvmArgs: '', gameArgs: '', notes: '', created: Date.now(),
    installedMods: {}, installedFiles: {}, type: type || 'java'
  };
  fs.writeFileSync(path.join(dir, 'instance.json'), JSON.stringify(meta, null, 2));
  return meta;
}

function updateInstance(name, patch) {
  const p = path.join(INSTANCES_DIR, name, 'instance.json');
  if (!fs.existsSync(p)) throw new Error('Instance not found: ' + name);
  const meta = JSON.parse(fs.readFileSync(p, 'utf8'));
  const gameChanged = ['mcVersion', 'loader', 'loaderVersion'].some((k) => k in patch && patch[k] !== meta[k]);
  Object.assign(meta, patch);
  if (gameChanged && !('versionId' in patch)) meta.versionId = null;
  fs.writeFileSync(p, JSON.stringify(meta, null, 2));
  return meta;
}

function deleteInstance(name) {
  fs.rmSync(path.join(INSTANCES_DIR, name), { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
}

module.exports = { listInstances, getInstance, createInstance, updateInstance, deleteInstance, INSTANCES_DIR, MC_DIR };
