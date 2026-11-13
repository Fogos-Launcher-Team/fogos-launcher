const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lmAPI', {
  minimize: () => ipcRenderer.invoke('win:minimize'),
  close: () => ipcRenderer.invoke('win:close'),
  authOffline: (nick) => ipcRenderer.invoke('auth:offline', nick),
  authEly: () => ipcRenderer.invoke('auth:ely'),
  cancelEly: () => ipcRenderer.invoke('auth:elyCancel'),
  authMicrosoft: () => ipcRenderer.invoke('auth:microsoft'),
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (patch) => ipcRenderer.invoke('config:set', patch)
  },
  instances: {
    list: () => ipcRenderer.invoke('instances:list'),
    create: (o) => ipcRenderer.invoke('instances:create', o),
    update: (n, p) => ipcRenderer.invoke('instances:update', n, p),
    delete: (n) => ipcRenderer.invoke('instances:delete', n)
  },
  versions: {
    install: (v) => ipcRenderer.invoke('versions:install', v),
    list: () => ipcRenderer.invoke('versions:list'),
    repairAssets: (v) => ipcRenderer.invoke('assets:repair', v)
  },
  loader: {
    install: (a) => ipcRenderer.invoke('loader:install', a),
    versions: (l, v) => ipcRenderer.invoke('loader:versions', l, v)
  },
  modrinth: {
    search: (q, t, l, v, page, limit) => ipcRenderer.invoke('modrinth:search', q, t, l, v, page, limit),
    install: (a) => ipcRenderer.invoke('modrinth:install', a),
    details: (id) => ipcRenderer.invoke('modrinth:details', id)
  },
  curseforge: {
    search: (q, t, v, l, page, limit) => ipcRenderer.invoke('cf:search', q, t, v, l, page, limit),
    install: (a) => ipcRenderer.invoke('cf:install', a),
    details: (id) => ipcRenderer.invoke('cf:details', id)
  },
  import: { suggestName: (f, k) => ipcRenderer.invoke('import:suggestName', f, k) },
  mrpack: { import: (f, n) => ipcRenderer.invoke('mrpack:import', f, n) },
  zip: { import: (f, n, k) => ipcRenderer.invoke('zip:import', f, n, k) },
  export: {
    mrpack: (n) => ipcRenderer.invoke('export:mrpack', n),
    zip: (n) => ipcRenderer.invoke('export:zip', n)
  },
  mods: {
    delete: (i, f, t) => ipcRenderer.invoke('mods:delete', i, f, t),
    listLocal: (i, t) => ipcRenderer.invoke('mods:listLocal', i, t),
    toggleLocal: (i, f, t) => ipcRenderer.invoke('mods:toggleLocal', i, f, t),
    importLocal: (i, p, t) => ipcRenderer.invoke('mods:importLocal', i, p, t),
    deleteByProjectId: (i, id, t) => ipcRenderer.invoke('mods:deleteByProjectId', i, id, t)
  },
  game: {
    launch: (o) => ipcRenderer.invoke('game:launch', o),
    kill: () => ipcRenderer.invoke('game:kill')
  },
  dialog: { openFile: (f) => ipcRenderer.invoke('dialog:openFile', f) },
  shell: {
    openFolder: (i) => ipcRenderer.invoke('shell:openFolder', i),
    openInstanceMods: (i, t) => ipcRenderer.invoke('shell:openInstanceMods', i, t),
    openLog: (i) => ipcRenderer.invoke('shell:openLog', i)
  },
  onProgress: (cb) => ipcRenderer.on('progress', (_, data) => cb(data)),
  onGameClosed: (cb) => ipcRenderer.on('game:closed', (_, data) => cb(data))
});