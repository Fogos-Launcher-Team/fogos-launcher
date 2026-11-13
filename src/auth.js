const fetch = require('node-fetch');
const crypto = require('crypto');
const http = require('http');
const { shell } = require('electron');
const { Auth } = require('msmc');

function authOffline(nickname) {
  if (!/^[A-Za-z0-9_]{3,16}$/.test(nickname)) {
    throw new Error('Ник: 3-16 символов, только a-z A-Z 0-9 _');
  }
  const raw = crypto.createHash('md5').update('OfflinePlayer:' + nickname).digest('hex');
  const uuid = raw.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
  return {
    type: 'offline',
    name: nickname,
    uuid,
    accessToken: '0'.repeat(32),
    clientToken: '0'.repeat(32)
  };
}

function cancelledError() {
  const err = new Error('Вход отменён');
  err.cancelled = true;
  return err;
}

const MS_ERRORS = {
  'error.auth.xsts.userNotFound': 'У этого аккаунта Microsoft нет профиля Xbox. Создайте его на xbox.com и повторите вход.',
  'error.auth.xsts.child': 'Детский аккаунт: добавьте его в семейную группу Microsoft и разрешите онлайн-игры.',
  'error.auth.xsts.bannedCountry': 'Xbox Live недоступен в вашей стране.',
  'error.auth.minecraft.profile': 'На этом аккаунте нет профиля Minecraft: Java Edition.',
  'error.auth.minecraft.entitlements': 'На этом аккаунте Microsoft не куплена Minecraft: Java Edition.'
};

function microsoftError(e) {
  const text = typeof e === 'string' ? e : (e && e.message) || String(e);
  if (/gui\.closed/i.test(text)) return cancelledError();
  return new Error('Microsoft: ' + (MS_ERRORS[text] || text));
}

function microsoftAccount(xbox, mc, previous) {
  const data = mc.mclc();
  return {
    type: 'microsoft',
    name: data.name,
    uuid: data.uuid,
    accessToken: data.access_token,
    clientToken: (previous && previous.clientToken) || data.client_token || crypto.randomUUID().replace(/-/g, ''),
    refreshToken: xbox.save(),
    expiresAt: Date.now() + 20 * 60 * 60 * 1000
  };
}

let microsoftBusy = false;

async function authMicrosoft() {
  if (microsoftBusy) throw new Error('Вход через Microsoft уже выполняется');
  microsoftBusy = true;
  try {
    const authManager = new Auth('select_account');
    const xbox = await authManager.launch('electron');
    const mc = await xbox.getMinecraft();
    return microsoftAccount(xbox, mc, null);
  } catch (e) {
    throw microsoftError(e);
  } finally {
    microsoftBusy = false;
  }
}

async function refreshMicrosoft(account) {
  if (!account || !account.refreshToken) throw new Error('Сессия Microsoft истекла, войдите в аккаунт заново.');
  try {
    const xbox = await new Auth('select_account').refresh(account.refreshToken);
    const mc = await xbox.getMinecraft();
    return { ...account, ...microsoftAccount(xbox, mc, account) };
  } catch (e) {
    throw new Error('Сессия Microsoft истекла, войдите в аккаунт заново. (' + microsoftError(e).message + ')');
  }
}

const ELY_CLIENT_ID = 'fogos-launcher';
const ELY_CLIENT_SECRET = process.env.FOGOS_ELY_CLIENT_SECRET || '';
const ELY_PORT = 38481;
const ELY_REDIRECT = `http://localhost:${ELY_PORT}/callback`;
const ELY_SCOPE = 'account_info minecraft_server_session offline_access';
const ELY_AUTHORIZE_URL = 'https://account.ely.by/oauth2/v1';
const ELY_TOKEN_URL = 'https://account.ely.by/api/oauth2/v1/token';
const ELY_INFO_URL = 'https://account.ely.by/api/account/v1/info';

let cancelEly = null;

function cancelElyLogin() {
  if (cancelEly) cancelEly();
}

function elyResultPage(success) {
  const text = success ? 'Вход выполнен. Это окно можно закрыть и вернуться в Fogos Launcher.' : 'Не удалось выполнить вход. Вернитесь в Fogos Launcher.';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Fogos Launcher</title></head><body style="font-family:Segoe UI,Arial,sans-serif;background:#14161c;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Fogos Launcher</h2><p>${text}</p></div></body></html>`;
}

function waitForElyCode(state, authorizeUrl) {
  return new Promise((resolve, reject) => {
    let done = false;
    let timer = null;
    let server = null;

    const finish = (err, code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cancelEly = null;
      if (server) {
        server.close();
        if (server.closeAllConnections) server.closeAllConnections();
      }
      if (err) reject(err);
      else resolve(code);
    };

    server = http.createServer((req, res) => {
      const url = new URL(req.url, ELY_REDIRECT);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end();
        return;
      }
      const code = url.searchParams.get('code');
      const valid = !!code && url.searchParams.get('state') === state;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(elyResultPage(valid));
      if (valid) finish(null, code);
      else finish(new Error('Ely.by: ' + (url.searchParams.get('error_message') || url.searchParams.get('error') || 'вход отклонён')));
    });

    server.on('error', (e) => {
      finish(new Error(e.code === 'EADDRINUSE' ? `Порт ${ELY_PORT} занят другой программой` : e.message));
    });

    cancelEly = () => finish(cancelledError());
    timer = setTimeout(() => finish(new Error('Время ожидания входа истекло')), 5 * 60 * 1000);
    server.listen(ELY_PORT, '127.0.0.1', () => shell.openExternal(authorizeUrl));
  });
}

async function elyToken(params) {
  const body = { client_id: ELY_CLIENT_ID, ...params };
  if (ELY_CLIENT_SECRET) body.client_secret = ELY_CLIENT_SECRET;
  const r = await fetch(ELY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(body).toString()
  });
  let data = null;
  try { data = await r.json(); } catch (e) {}
  if (!r.ok || !data || !data.access_token) {
    const reason = data && (data.error_message || data.error_description || data.error);
    throw new Error('Ely.by: ' + (reason || 'HTTP ' + r.status));
  }
  return data;
}

async function elyAccount(tokens, previous) {
  const r = await fetch(ELY_INFO_URL, { headers: { Authorization: 'Bearer ' + tokens.access_token } });
  if (!r.ok) throw new Error('Ely.by: не удалось получить профиль (' + r.status + ')');
  const info = await r.json();
  return {
    type: 'ely',
    name: info.username,
    uuid: String(info.uuid).replace(/-/g, ''),
    accessToken: tokens.access_token,
    clientToken: (previous && previous.clientToken) || crypto.randomUUID().replace(/-/g, ''),
    refreshToken: tokens.refresh_token || (previous && previous.refreshToken),
    expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined
  };
}

async function authEly() {
  if (cancelEly) throw new Error('Вход через Ely.by уже выполняется');
  const state = crypto.randomBytes(16).toString('hex');
  const authorizeUrl = ELY_AUTHORIZE_URL + '?' + new URLSearchParams({
    client_id: ELY_CLIENT_ID,
    redirect_uri: ELY_REDIRECT,
    response_type: 'code',
    scope: ELY_SCOPE,
    state,
    prompt: 'select_account'
  }).toString();
  const code = await waitForElyCode(state, authorizeUrl);
  const tokens = await elyToken({ grant_type: 'authorization_code', code, redirect_uri: ELY_REDIRECT });
  return elyAccount(tokens, null);
}

async function refreshEly(account) {
  if (!account || !account.refreshToken) throw new Error('Сессия Ely.by истекла, войдите в аккаунт заново.');
  try {
    const tokens = await elyToken({ grant_type: 'refresh_token', refresh_token: account.refreshToken, scope: ELY_SCOPE });
    return { ...account, ...(await elyAccount(tokens, account)) };
  } catch (e) {
    throw new Error('Сессия Ely.by истекла, войдите в аккаунт заново. (' + e.message + ')');
  }
}

module.exports = { authOffline, authEly, refreshEly, cancelElyLogin, authMicrosoft, refreshMicrosoft };
