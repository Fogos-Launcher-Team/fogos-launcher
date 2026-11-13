const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');
const { INSTANCES_DIR, updateInstance, getInstance, createInstance } = require('./instances');

const CF_API_KEY = '$2a$10$pc88LBOso6/9tXhqCNreC.9UHjc7feOhpmG.ztrBIzMyblxB8.4di';
const USER_AGENT = 'Fogos-Launcher/1.1.0 (Fogos Launcher Team)';
const SUBDIRS = { mod: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks', datapack: 'datapacks', world: 'saves' };
const CF_LOADER_TYPES = { forge: 1, fabric: 4, quilt: 5, neoforge: 6 };

function contentDir(instance, type) {
  return path.join(INSTANCES_DIR, instance, '.minecraft', SUBDIRS[type] || 'mods');
}

function safeJoin(base, name) {
  const root = path.resolve(base);
  const full = path.resolve(root, name);
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error('Недопустимое имя файла: ' + name);
  return full;
}

function stripDisabled(name) {
  return name.endsWith('.disabled') ? name.slice(0, -'.disabled'.length) : name;
}

function sendProgress(text, percent) {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    global.mainWindow.webContents.send('progress', { text, percent });
  }
}

async function downloadFile(url, dest, sha1) {
  const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + url);
  const buf = Buffer.from(await r.arrayBuffer());
  if (sha1 && crypto.createHash('sha1').update(buf).digest('hex') !== sha1) {
    throw new Error('Контрольная сумма не совпала: ' + path.basename(dest));
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = dest + '.part';
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, dest);
}

function removePath(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
  } catch (e) {
    if (e.code === 'EBUSY' || e.code === 'EPERM' || e.code === 'EACCES') {
      throw new Error(`Не удалось удалить «${path.basename(target)}»: файл занят. Закройте игру и повторите.`);
    }
    throw e;
  }
}

function removeFileVariants(dir, name) {
  const base = stripDisabled(name);
  let removed = false;
  for (const variant of [base, base + '.disabled']) {
    const target = safeJoin(dir, variant);
    if (fs.existsSync(target)) {
      removePath(target);
      removed = true;
    }
  }
  return removed;
}

function readState(instance) {
  const meta = getInstance(instance);
  if (!meta) throw new Error('Instance not found: ' + instance);
  return {
    mods: JSON.parse(JSON.stringify(meta.installedMods || {})),
    files: JSON.parse(JSON.stringify(meta.installedFiles || {}))
  };
}

function writeState(instance, state) {
  updateInstance(instance, { installedMods: state.mods, installedFiles: state.files });
}

function bucketOf(state, type) {
  if (!state.files[type]) state.files[type] = {};
  if (!state.mods[type]) state.mods[type] = [];
  return state.files[type];
}

function track(state, type, id, info) {
  const key = String(id);
  const bucket = bucketOf(state, type);
  const rec = bucket[key] || { source: info.source, files: [], requiredBy: [], dependencies: [], explicit: false };
  rec.source = info.source || rec.source;
  rec.files = [...new Set([...rec.files, ...info.files.map(stripDisabled)])];
  if (info.explicit) rec.explicit = true;
  if (info.requiredBy) rec.requiredBy = [...new Set([...rec.requiredBy, String(info.requiredBy)])];
  if (info.dependencies) rec.dependencies = [...new Set([...rec.dependencies, ...info.dependencies.map(String)])];
  bucket[key] = rec;
  if (!state.mods[type].some((x) => String(x) === key)) state.mods[type].push(info.rawId !== undefined ? info.rawId : id);
}

function untrack(state, type, key) {
  const bucket = bucketOf(state, type);
  delete bucket[key];
  state.mods[type] = state.mods[type].filter((x) => String(x) !== key);
}

async function legacyProjectFiles(projectId, type, dir) {
  try {
    const key = String(projectId);
    let names = [];
    if (/^\d+$/.test(key)) {
      for (let index = 0; index < 250; index += 50) {
        const r = await fetch(`https://api.curseforge.com/v1/mods/${key}/files?index=${index}&pageSize=50`, {
          headers: { 'x-api-key': CF_API_KEY, Accept: 'application/json' }
        });
        if (!r.ok) break;
        const data = await r.json();
        const batch = data.data || [];
        names.push(...batch.map((f) => f.fileName));
        if (batch.length < 50) break;
      }
    } else {
      const r = await fetch(`https://api.modrinth.com/v2/project/${key}/version`, { headers: { 'User-Agent': USER_AGENT } });
      if (r.ok) {
        const versions = await r.json();
        names = versions.flatMap((v) => (v.files || []).map((f) => f.filename));
      }
    }
    if (type === 'world') names = names.map((n) => n.replace(/\.zip$/i, ''));
    return [...new Set(names)].filter((n) => {
      const base = stripDisabled(n);
      return fs.existsSync(safeJoin(dir, base)) || fs.existsSync(safeJoin(dir, base + '.disabled'));
    });
  } catch (e) {
    return [];
  }
}

async function removeProjectInState(state, instance, type, key, result) {
  const dir = contentDir(instance, type);
  const bucket = bucketOf(state, type);
  const rec = bucket[key];
  const files = rec ? rec.files : await legacyProjectFiles(key, type, dir);

  for (const f of files) {
    if (removeFileVariants(dir, f)) result.files.push(f);
  }
  untrack(state, type, key);
  result.projects.push(key);

  for (const other of Object.values(bucket)) {
    other.requiredBy = (other.requiredBy || []).filter((x) => x !== key);
  }

  if (rec) {
    for (const depKey of rec.dependencies || []) {
      const dep = bucket[depKey];
      if (!dep || dep.explicit) continue;
      if ((dep.requiredBy || []).length === 0) {
        await removeProjectInState(state, instance, type, depKey, result);
      }
    }
  }
}

async function removeProject(instance, projectId, type = 'mod') {
  const state = readState(instance);
  const key = String(projectId);
  const bucket = bucketOf(state, type);
  const known = bucket[key] || state.mods[type].some((x) => String(x) === key);
  if (!known) return { ok: false, error: 'Not installed' };

  const result = { files: [], projects: [] };
  const dependents = bucket[key] ? (bucket[key].requiredBy || []).slice() : [];
  try {
    await removeProjectInState(state, instance, type, key, result);
  } catch (e) {
    writeState(instance, state);
    return { ok: false, error: e.message };
  }
  writeState(instance, state);
  return { ok: true, removed: result.files, removedProjects: result.projects, dependents };
}

async function deleteMod(instance, filename, type = 'mod') {
  const dir = contentDir(instance, type);
  let target;
  try {
    target = safeJoin(dir, filename);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  const base = stripDisabled(filename);
  const exists = fs.existsSync(target)
    || fs.existsSync(safeJoin(dir, base))
    || fs.existsSync(safeJoin(dir, base + '.disabled'));

  const state = readState(instance);
  const bucket = bucketOf(state, type);
  const owners = Object.keys(bucket).filter((k) => bucket[k].files.includes(base));

  if (!exists && owners.length === 0) return { ok: false, error: 'File not found' };

  const result = { files: [], projects: [] };
  try {
    removeFileVariants(dir, base);
    for (const key of owners) {
      await removeProjectInState(state, instance, type, key, result);
    }
  } catch (e) {
    writeState(instance, state);
    return { ok: false, error: e.message };
  }
  if (owners.length > 0) writeState(instance, state);
  return { ok: true, removed: [base, ...result.files], removedProjects: result.projects };
}

function listLocalMods(instance, type = 'mod') {
  const base = contentDir(instance, type);
  if (!fs.existsSync(base)) return [];

  return fs.readdirSync(base).map((file) => {
    try {
      const stats = fs.statSync(path.join(base, file));
      return { name: file, size: stats.size, enabled: !file.endsWith('.disabled'), isDir: stats.isDirectory() };
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

function toggleLocalMod(instance, filename, type = 'mod') {
  const base = contentDir(instance, type);
  let filePath;
  try {
    filePath = safeJoin(base, filename);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  if (!fs.existsSync(filePath)) return { ok: false, error: 'File not found' };

  const newName = filename.endsWith('.disabled') ? stripDisabled(filename) : filename + '.disabled';
  const newPath = safeJoin(base, newName);
  if (fs.existsSync(newPath)) return { ok: false, error: 'File already exists: ' + newName };

  fs.renameSync(filePath, newPath);
  return { ok: true, newName };
}

async function jsonFetch(url, headers) {
  const r = await fetch(url, { headers });
  if (!r.ok) {
    const err = new Error('HTTP ' + r.status + ': ' + url);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

async function searchModrinth(query, projectType = 'mod', loader, mcVersion, page = 1, limit = 20) {
  const facets = [[`project_type:${projectType}`]];
  if (projectType === 'mod') {
    if (loader && loader !== 'vanilla') {
      facets.push(loader === 'quilt' ? ['categories:quilt', 'categories:fabric'] : [`categories:${loader}`]);
    }
    if (mcVersion) facets.push([`versions:${mcVersion}`]);
  }

  const url = new URL('https://api.modrinth.com/v2/search');
  url.searchParams.set('query', query || '');
  url.searchParams.set('facets', JSON.stringify(facets));
  url.searchParams.set('offset', (page - 1) * limit);
  url.searchParams.set('limit', limit);

  const r = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } });
  if (!r.ok) throw new Error('Modrinth search: HTTP ' + r.status);
  const data = await r.json();
  return {
    items: (data.hits || []).map((h) => ({
      id: h.project_id, title: h.title, description: h.description,
      icon: h.icon_url, downloads: h.downloads, author: h.author, source: 'modrinth'
    })),
    total: data.total_hits || 0
  };
}

async function getModrinthDetails(projectId) {
  const r = await fetch(`https://api.modrinth.com/v2/project/${projectId}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!r.ok) throw new Error('Modrinth details: HTTP ' + r.status);
  const data = await r.json();

  let author = 'Unknown';
  if (data.team) {
    const tr = await fetch(`https://api.modrinth.com/v2/team/${data.team}/members`, { headers: { 'User-Agent': USER_AGENT } });
    if (tr.ok) {
      const members = await tr.json();
      const owner = members.find((m) => m.role === 'Owner') || members[0];
      if (owner) author = owner.user.username;
    }
  }

  return { ...data, author };
}

function pickModrinthVersion(versions, { mcVersion, loader, projectType }) {
  const filterLoader = projectType === 'mod' && loader && loader !== 'vanilla';
  const accepted = filterLoader ? (loader === 'quilt' ? ['quilt', 'fabric'] : [loader]) : null;
  const ok = versions.filter((v) => {
    if (mcVersion && !(v.game_versions || []).includes(mcVersion)) return false;
    if (accepted && !(v.loaders || []).some((l) => accepted.includes(l))) return false;
    return true;
  });
  if (ok.length === 0) return null;
  const rank = { release: 0, beta: 1, alpha: 2 };
  ok.sort((a, b) => {
    const la = filterLoader && (a.loaders || []).includes(loader) ? 0 : 1;
    const lb = filterLoader && (b.loaders || []).includes(loader) ? 0 : 1;
    if (la !== lb) return la - lb;
    const ra = rank[a.version_type] ?? 3;
    const rb = rank[b.version_type] ?? 3;
    if (ra !== rb) return ra - rb;
    return new Date(b.date_published) - new Date(a.date_published);
  });
  return ok[0];
}

async function placeDownloaded(ctx, type, filePath, fileName, writer) {
  const existed = fs.existsSync(filePath);
  if (!existed) {
    await writer();
    ctx.created.push(filePath);
  }
  if (type === 'world' && /\.zip$/i.test(fileName)) {
    const name = fileName.replace(/\.zip$/i, '');
    const target = path.join(path.dirname(filePath), name);
    if (!fs.existsSync(target)) {
      new AdmZip(filePath).extractAllTo(target, true);
      ctx.created.push(target);
    }
    fs.rmSync(filePath, { force: true });
    return name;
  }
  return fileName;
}

async function installModrinthProject(ctx, projectId, opts = {}) {
  const { state, type, dir } = ctx;
  let version;
  if (opts.versionId) {
    version = await jsonFetch(`https://api.modrinth.com/v2/version/${opts.versionId}`, { 'User-Agent': USER_AGENT });
  } else {
    const versions = await jsonFetch(`https://api.modrinth.com/v2/project/${projectId}/version`, { 'User-Agent': USER_AGENT });
    version = pickModrinthVersion(versions, ctx);
  }
  if (!version) {
    if (opts.requiredBy) {
      ctx.warnings.push(`Для зависимости ${projectId} нет подходящей версии`);
      return null;
    }
    throw new Error('Нет подходящей версии для этой версии игры и загрузчика');
  }

  const key = String(version.project_id || projectId);
  const bucket = bucketOf(state, type);

  if (ctx.visited.has(key)) {
    if (opts.requiredBy && bucket[key]) track(state, type, key, { source: 'modrinth', files: [], requiredBy: opts.requiredBy });
    return key;
  }
  ctx.visited.add(key);

  const existing = bucket[key];
  const allPresent = existing && existing.files.length > 0
    && existing.files.every((f) => fs.existsSync(safeJoin(dir, f)) || fs.existsSync(safeJoin(dir, f + '.disabled')));
  if (allPresent) {
    track(state, type, key, { source: 'modrinth', files: [], explicit: !opts.requiredBy, requiredBy: opts.requiredBy });
    return key;
  }

  const depKeys = [];
  if (type === 'mod') {
    const required = (version.dependencies || []).filter((d) => d.dependency_type === 'required' && (d.project_id || d.version_id));
    for (const dep of required) {
      sendProgress('Downloading dependency...', 50);
      try {
        const depKey = await installModrinthProject(ctx, dep.project_id, { requiredBy: key, versionId: dep.version_id });
        if (depKey) depKeys.push(depKey);
      } catch (e) {
        ctx.warnings.push(`Зависимость ${dep.project_id || dep.version_id}: ${e.message}`);
      }
    }
  }

  const file = (version.files || []).find((f) => f.primary) || (version.files || [])[0];
  if (!file) throw new Error('У версии нет файлов');
  const filePath = safeJoin(dir, file.filename);
  const name = await placeDownloaded(ctx, type, filePath, file.filename,
    () => downloadFile(file.url, filePath, file.hashes && file.hashes.sha1));

  track(state, type, key, {
    source: 'modrinth', files: [name], explicit: !opts.requiredBy,
    requiredBy: opts.requiredBy, dependencies: depKeys,
    rawId: String(projectId) === key ? projectId : key
  });
  for (const depKey of depKeys) {
    track(state, type, depKey, { source: 'modrinth', files: [], requiredBy: key });
  }
  ctx.names.push(name);
  return key;
}

function rollbackCreated(ctx) {
  for (const p of ctx.created.reverse()) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) {}
  }
}

async function installFromModrinth({ instance, projectId, mcVersion, loader, projectType = 'mod' }) {
  const type = projectType;
  const dir = contentDir(instance, type);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = {
    state: readState(instance), type, dir, mcVersion, loader, projectType,
    visited: new Set(), created: [], warnings: [], names: []
  };

  try {
    const key = await installModrinthProject(ctx, projectId);
    if (!key) throw new Error('Установка не выполнена');
    writeState(instance, ctx.state);
  } catch (e) {
    rollbackCreated(ctx);
    return { ok: false, error: e.message };
  }

  return { ok: true, file: ctx.names[ctx.names.length - 1] || 'Installed', warnings: ctx.warnings };
}

async function searchCurseForge(query, type, mcVersion, loader, page = 1, limit = 20) {
  const url = new URL('https://api.curseforge.com/v1/mods/search');
  url.searchParams.set('gameId', '432');
  url.searchParams.set('searchFilter', query || '');
  url.searchParams.set('index', (page - 1) * limit);
  url.searchParams.set('pageSize', limit);
  const classMap = { mod: 6, resourcepack: 12, shader: 6552, world: 17, datapack: 6945, modpack: 4471 };
  if (classMap[type]) url.searchParams.set('classId', String(classMap[type]));
  if (mcVersion) url.searchParams.set('gameVersion', mcVersion);
  if (type === 'mod' && CF_LOADER_TYPES[loader]) url.searchParams.set('modLoaderType', String(CF_LOADER_TYPES[loader]));

  const r = await fetch(url.toString(), { headers: { 'x-api-key': CF_API_KEY } });
  if (!r.ok) throw new Error('CF search: HTTP ' + r.status);
  const data = await r.json();
  return {
    items: (data.data || []).map((m) => ({
      id: m.id, title: m.name, description: m.summary,
      icon: m.logo && m.logo.thumbnailUrl, downloads: m.downloadCount, author: m.authors && m.authors[0] ? m.authors[0].name : 'Unknown', source: 'curseforge'
    })),
    total: data.pagination ? data.pagination.totalCount : 0
  };
}

async function getCurseForgeDetails(projectId) {
  const r = await fetch(`https://api.curseforge.com/v1/mods/${projectId}`, { headers: { 'x-api-key': CF_API_KEY } });
  if (!r.ok) throw new Error('CF details: HTTP ' + r.status);
  const data = await r.json();
  return data.data;
}

async function pickCurseForgeFile(modId, { mcVersion, loader, type }) {
  const loaderTypes = [];
  if (type === 'mod' && loader && loader !== 'vanilla') {
    loaderTypes.push(CF_LOADER_TYPES[loader]);
    if (loader === 'quilt') loaderTypes.push(CF_LOADER_TYPES.fabric);
  } else {
    loaderTypes.push(null);
  }

  for (const lt of loaderTypes) {
    const url = new URL(`https://api.curseforge.com/v1/mods/${modId}/files`);
    url.searchParams.set('pageSize', '50');
    if (mcVersion) url.searchParams.set('gameVersion', mcVersion);
    if (lt) url.searchParams.set('modLoaderType', String(lt));
    const data = await jsonFetch(url.toString(), { 'x-api-key': CF_API_KEY, Accept: 'application/json' });
    const files = (data.data || []).filter((f) => f.isAvailable !== false);
    if (files.length === 0) continue;
    files.sort((a, b) => {
      const ra = a.releaseType === 1 ? 0 : 1;
      const rb = b.releaseType === 1 ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return new Date(b.fileDate) - new Date(a.fileDate);
    });
    return files[0];
  }
  return null;
}

function curseForgeDownloadUrl(file) {
  if (file.downloadUrl) return file.downloadUrl;
  const id = String(file.id);
  return `https://edge.forgecdn.net/files/${id.slice(0, -3) || '0'}/${id.slice(-3).replace(/^0+(?=\d)/, '')}/${encodeURIComponent(file.fileName)}`;
}

async function installCurseForgeProject(ctx, modId, opts = {}) {
  const { state, type, dir } = ctx;
  const key = String(modId);
  const bucket = bucketOf(state, type);

  if (ctx.visited.has(key)) {
    if (opts.requiredBy && bucket[key]) track(state, type, key, { source: 'curseforge', files: [], requiredBy: opts.requiredBy });
    return key;
  }
  ctx.visited.add(key);

  const existing = bucket[key];
  const allPresent = existing && existing.files.length > 0
    && existing.files.every((f) => fs.existsSync(safeJoin(dir, f)) || fs.existsSync(safeJoin(dir, f + '.disabled')));
  if (allPresent) {
    track(state, type, key, { source: 'curseforge', files: [], explicit: !opts.requiredBy, requiredBy: opts.requiredBy });
    return key;
  }

  const file = await pickCurseForgeFile(modId, ctx);
  if (!file) {
    if (opts.requiredBy) {
      ctx.warnings.push(`Для зависимости ${modId} нет подходящих файлов`);
      return null;
    }
    throw new Error('No files for this version');
  }

  const depKeys = [];
  if (type === 'mod') {
    for (const dep of file.dependencies || []) {
      if (dep.relationType !== 3) continue;
      sendProgress('Downloading dependency...', 50);
      try {
        const depKey = await installCurseForgeProject(ctx, dep.modId, { requiredBy: key });
        if (depKey) depKeys.push(depKey);
      } catch (e) {
        ctx.warnings.push(`Зависимость ${dep.modId}: ${e.message}`);
      }
    }
  }

  const filePath = safeJoin(dir, file.fileName);
  const sha1 = (file.hashes || []).find((h) => h.algo === 1);
  const name = await placeDownloaded(ctx, type, filePath, file.fileName,
    () => downloadFile(curseForgeDownloadUrl(file), filePath, sha1 && sha1.value));

  track(state, type, key, {
    source: 'curseforge', files: [name], explicit: !opts.requiredBy,
    requiredBy: opts.requiredBy, dependencies: depKeys, rawId: modId
  });
  for (const depKey of depKeys) {
    track(state, type, depKey, { source: 'curseforge', files: [], requiredBy: key });
  }
  ctx.names.push(name);
  return key;
}

async function installFromCurseForge({ instance, projectId, type = 'mod', mcVersion }) {
  const meta = getInstance(instance);
  if (!meta) return { ok: false, error: 'Instance not found' };
  const dir = contentDir(instance, type);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = {
    state: readState(instance), type, dir, mcVersion: mcVersion || meta.mcVersion, loader: meta.loader,
    visited: new Set(), created: [], warnings: [], names: []
  };

  try {
    const key = await installCurseForgeProject(ctx, projectId);
    if (!key) throw new Error('Установка не выполнена');
    writeState(instance, ctx.state);
  } catch (e) {
    rollbackCreated(ctx);
    return { ok: false, error: e.message };
  }

  return { ok: true, file: ctx.names[ctx.names.length - 1] || 'Installed', warnings: ctx.warnings };
}

function findZipEntry(zip, name) {
  return zip.getEntries().find((e) => {
    if (e.isDirectory) return false;
    const parts = e.entryName.split('/');
    return e.entryName === name || (parts.length === 2 && parts[1] === name);
  }) || null;
}

function detectPackLoader(zip) {
  const result = { mcVersion: null, loader: 'vanilla', loaderVersion: null, overrides: 'overrides' };

  const cf = findZipEntry(zip, 'manifest.json');
  if (cf) {
    try {
      const m = JSON.parse(cf.getData().toString('utf8'));
      if (m.minecraft && m.minecraft.version) result.mcVersion = m.minecraft.version;
      if (m.overrides) result.overrides = m.overrides;
      const primary = ((m.minecraft && m.minecraft.modLoaders) || []).find((l) => l.primary) || (m.minecraft && m.minecraft.modLoaders && m.minecraft.modLoaders[0]);
      if (primary && primary.id) {
        const idx = primary.id.indexOf('-');
        const name = primary.id.slice(0, idx);
        if (CF_LOADER_TYPES[name]) {
          result.loader = name;
          result.loaderVersion = primary.id.slice(idx + 1);
        }
      }
      result.manifest = m;
    } catch (e) {}
    return result;
  }

  const mmc = findZipEntry(zip, 'mmc-pack.json');
  if (mmc) {
    try {
      const m = JSON.parse(mmc.getData().toString('utf8'));
      const table = {
        'net.minecraft': null,
        'net.fabricmc.fabric-loader': 'fabric',
        'org.quiltmc.quilt-loader': 'quilt',
        'net.minecraftforge': 'forge',
        'net.neoforged': 'neoforge'
      };
      for (const c of m.components || []) {
        if (c.uid === 'net.minecraft') result.mcVersion = c.version;
        else if (table[c.uid]) {
          result.loader = table[c.uid];
          result.loaderVersion = c.version;
        }
      }
    } catch (e) {}
  }
  return result;
}

function cleanInstanceName(raw) {
  const name = String(raw || '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim().replace(/[. ]+$/, '');
  if (!name || /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(name)) throw new Error('Некорректное имя сборки');
  if (getInstance(name)) throw new Error('Сборка с таким именем уже существует');
  return name;
}

function removeInstanceDir(name) {
  try { fs.rmSync(path.join(INSTANCES_DIR, name), { recursive: true, force: true }); } catch (e) {}
}

async function runPool(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

function extractEntries(zip, base, mapPath) {
  zip.getEntries().forEach((e) => {
    if (e.isDirectory) return;
    const rel = mapPath(e.entryName);
    if (!rel) return;
    const out = safeJoin(base, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, e.getData());
  });
}

async function cfPost(endpoint, body) {
  const r = await fetch('https://api.curseforge.com/v1/' + endpoint, {
    method: 'POST',
    headers: { 'x-api-key': CF_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('CurseForge HTTP ' + r.status);
  const json = await r.json();
  return json.data || [];
}

const CF_CLASS_DIRS = { 6: 'mods', 12: 'resourcepacks', 6552: 'shaderpacks', 17: 'saves' };

async function downloadCurseForgePack(manifest, base, label) {
  const entries = (manifest.files || []).filter((f) => f.fileID && f.projectID);
  const failed = [];
  if (!entries.length) return failed;

  const fileInfo = new Map();
  const modInfo = new Map();
  for (let i = 0; i < entries.length; i += 100) {
    const chunk = entries.slice(i, i + 100);
    for (const f of await cfPost('mods/files', { fileIds: chunk.map((e) => e.fileID) })) fileInfo.set(f.id, f);
    for (const m of await cfPost('mods', { modIds: [...new Set(chunk.map((e) => e.projectID))] })) modInfo.set(m.id, m);
  }

  let done = 0;
  await runPool(entries, 6, async (e) => {
    try {
      const info = fileInfo.get(e.fileID);
      if (!info) throw new Error('Файл ' + e.fileID + ' не найден на CurseForge');
      const mod = modInfo.get(e.projectID);
      const sub = (mod && CF_CLASS_DIRS[mod.classId]) || 'mods';
      const url = info.downloadUrl
        || `https://edge.forgecdn.net/files/${Math.floor(info.id / 1000)}/${info.id % 1000}/${encodeURIComponent(info.fileName)}`;
      const hash = (info.hashes || []).find((h) => h.algo === 1);
      await downloadFile(url, safeJoin(base, path.join(sub, info.fileName)), hash && hash.value);
    } catch (err) {
      failed.push(String(e.fileID));
      console.warn('[import] file failed', e.fileID, err.message);
    }
    done++;
    sendProgress(`${label}: ${done}/${entries.length}`, Math.round((done / entries.length) * 90));
  });
  return failed;
}

function suggestImportName(file, kind) {
  const fallback = path.basename(file).replace(/\.(mrpack|zip)$/i, '') || 'Imported';
  let name = null;
  try {
    const zip = new AdmZip(file);
    if (kind === 'mrpack') {
      const entry = zip.getEntry('modrinth.index.json');
      if (entry) name = JSON.parse(entry.getData().toString('utf8')).name;
    } else if (kind === 'curseforge') {
      const entry = findZipEntry(zip, 'manifest.json');
      if (entry) name = JSON.parse(entry.getData().toString('utf8')).name;
    } else {
      const entry = findZipEntry(zip, 'instance.cfg');
      const match = entry && /^name=(.*)$/m.exec(entry.getData().toString('utf8'));
      if (match) name = match[1];
    }
  } catch (e) {}

  const clean = (value) => String(value || '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim().replace(/[. ]+$/, '');
  const base = clean(name) || clean(fallback) || 'Imported';
  let candidate = base;
  for (let i = 2; getInstance(candidate); i++) candidate = `${base} (${i})`;
  return candidate;
}

async function importMrpack(file, instanceName) {
  const zip = new AdmZip(file);
  const indexEntry = zip.getEntry('modrinth.index.json');
  if (!indexEntry) throw new Error('В архиве нет modrinth.index.json, это не .mrpack');
  const manifest = JSON.parse(indexEntry.getData().toString('utf8'));
  const deps = manifest.dependencies || {};
  const mcVersion = deps.minecraft;
  if (!mcVersion) throw new Error('В .mrpack не указана версия Minecraft');

  const loaderTable = [['fabric-loader', 'fabric'], ['quilt-loader', 'quilt'], ['forge', 'forge'], ['neoforge', 'neoforge']];
  let loader = 'vanilla';
  let loaderVersion = null;
  for (const [dep, key] of loaderTable) {
    if (deps[dep]) {
      loader = key;
      loaderVersion = deps[dep];
      break;
    }
  }

  const name = cleanInstanceName(instanceName);
  createInstance({ name, mcVersion, loader, loaderVersion });

  try {
    const base = path.join(INSTANCES_DIR, name, '.minecraft');
    const files = (manifest.files || []).filter((f) => !(f.env && f.env.client === 'unsupported') && f.downloads && f.downloads.length);
    const failed = [];
    let done = 0;
    sendProgress(name, 0);
    await runPool(files, 6, async (f) => {
      try {
        const dest = safeJoin(base, f.path);
        let lastErr = null;
        for (const url of f.downloads) {
          try {
            await downloadFile(url, dest, f.hashes && f.hashes.sha1);
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err;
          }
        }
        if (lastErr) throw lastErr;
      } catch (err) {
        failed.push(f.path);
        console.warn('[mrpack] file failed', f.path, err.message);
      }
      done++;
      sendProgress(`${name}: ${done}/${files.length}`, Math.round((done / files.length) * 90));
    });

    for (const prefix of ['overrides/', 'client-overrides/']) {
      extractEntries(zip, base, (entry) => (entry.startsWith(prefix) ? entry.slice(prefix.length) : null));
    }
    sendProgress('Готово', 100);
    return { ok: true, instanceName: name, mcVersion, loader, failed: failed.length };
  } catch (e) {
    removeInstanceDir(name);
    throw e;
  }
}

async function importZipArchive(file, instanceName, kind = 'curseforge') {
  const zip = new AdmZip(file);
  const detected = detectPackLoader(zip);
  if (!detected.mcVersion) {
    throw new Error(kind === 'curseforge'
      ? 'В архиве нет корректного manifest.json, это не сборка CurseForge'
      : 'В архиве нет корректного mmc-pack.json, это не сборка Prism');
  }

  const name = cleanInstanceName(instanceName);
  createInstance({
    name,
    mcVersion: detected.mcVersion,
    loader: detected.loader,
    loaderVersion: detected.loaderVersion
  });

  try {
    const base = path.join(INSTANCES_DIR, name, '.minecraft');
    let failed = [];
    sendProgress(name, 0);

    if (kind === 'curseforge') {
      const root = (detected.overrides || 'overrides').replace(/\/+$/, '') + '/';
      extractEntries(zip, base, (entry) => {
        const idx = entry.indexOf(root);
        if (idx === 0 || (idx > 0 && entry.slice(0, idx).split('/').length === 2 && entry[idx - 1] === '/')) return entry.slice(idx + root.length);
        return null;
      });
      if (detected.manifest) failed = await downloadCurseForgePack(detected.manifest, base, name);
    } else {
      const pattern = /(?:^|\/)\.?minecraft\/(.+)$/;
      const hasRoot = zip.getEntries().some((e) => !e.isDirectory && pattern.test(e.entryName));
      extractEntries(zip, base, (entry) => {
        if (hasRoot) {
          const match = pattern.exec(entry);
          return match ? match[1] : null;
        }
        return /(^|\/)(mmc-pack\.json|instance\.cfg)$/.test(entry) ? null : entry;
      });
    }

    sendProgress('Готово', 100);
    return { ok: true, instanceName: name, kind, mcVersion: detected.mcVersion, loader: detected.loader, failed: failed.length };
  } catch (e) {
    removeInstanceDir(name);
    throw e;
  }
}

module.exports = {
  suggestImportName,
  searchModrinth, installFromModrinth, searchCurseForge, installFromCurseForge,
  importMrpack, importZipArchive, deleteMod, removeProject, getModrinthDetails, getCurseForgeDetails,
  listLocalMods, toggleLocalMod
};
