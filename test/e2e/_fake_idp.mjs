// A small OpenID Connect provider for the end-to-end scenarios, so the whole
// SSO flow (authorize -> login at the provider -> callback -> token -> id_token
// signature via JWKS -> userinfo -> Redmine user) runs against the real server
// from start_server.sh without a real IdP or credentials.
//
//   import { startIdp } from './fake_idp.mjs';
//   const idp = await startIdp();          // http://127.0.0.1:3999
//   idp.requests                           // what Redmine sent (authorize, token, ...)
//   await idp.close();
//
// The login page at the provider lists the identities below; clicking one sends
// the browser back to Redmine with a code. Some identities misbehave on purpose
// (bad signature, error answer) to drive the plugin's failure paths.
import http from 'node:http';
import crypto from 'node:crypto';

export const IDP_PORT = Number(process.env.RMP_IDP_PORT || 3999);
export const IDP = `http://127.0.0.1:${IDP_PORT}`;
export const CLIENT_ID = 'redmine-e2e';
export const CLIENT_SECRET = 'e2e-client-secret';

// claims returned by userinfo (and put into the id_token)
export const IDENTITIES = {
  newbie: { sub: 'sub-newbie', preferred_username: 'sso.newbie', email: 'sso.newbie@example.net', given_name: 'Nora', family_name: 'Newbie', employee_id: 'E-1001' },
  manager: { sub: 'sub-manager', preferred_username: 'manager', email: 'manager@example.net', given_name: 'Managed', family_name: 'ByIdP' },
  MANAGER: { sub: 'sub-manager-upper', preferred_username: 'MANAGER', email: 'manager@example.net', given_name: 'Manager', family_name: 'E2E' },
  mailmatch: { sub: 'sub-mailmatch', preferred_username: 'r.porter', email: 'reporter@example.net', given_name: 'Reporter', family_name: 'E2E' },
  locked: { sub: 'sub-locked', preferred_username: 'sso.locked', email: 'sso.locked@example.net', given_name: 'Locked', family_name: 'User' },
  invalid: { sub: 'sub-invalid', preferred_username: 'bad login!', email: 'not-an-email', given_name: 'Invalid', family_name: 'Claims' },
  admin: { sub: 'sub-admin', preferred_username: 'admin', email: 'admin@example.net', given_name: 'Redmine', family_name: 'E2E' },
  badsig: { sub: 'sub-badsig', preferred_username: 'sso.badsig', email: 'sso.badsig@example.net', given_name: 'Bad', family_name: 'Signature', badSignature: true },
};

export async function startIdp() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const rogue = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const kid = 'e2e-key-1';
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid, use: 'sig', alg: 'RS256' };
  const codes = new Map();
  const tokens = new Map();
  const requests = [];

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  function idToken(claims, key) {
    const now = Math.floor(Date.now() / 1000);
    const head = b64({ alg: 'RS256', typ: 'JWT', kid });
    const body = b64({ iss: IDP, aud: CLIENT_ID, iat: now, exp: now + 300, ...claims });
    const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url');
    return `${head}.${body}.${sig}`;
  }
  const json = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const esc = (s) => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const readBody = (req) => new Promise(r => { let d = ''; req.on('data', c => { d += c; }); req.on('end', () => r(d)); });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, IDP);
    const q = Object.fromEntries(url.searchParams);
    const body = req.method === 'POST' ? Object.fromEntries(new URLSearchParams(await readBody(req))) : {};
    requests.push({ method: req.method, path: url.pathname, query: q, body });

    if (url.pathname === '/.well-known/openid-configuration') {
      return json(res, 200, {
        issuer: IDP, authorization_endpoint: `${IDP}/authorize`, token_endpoint: `${IDP}/token`,
        userinfo_endpoint: `${IDP}/userinfo`, jwks_uri: `${IDP}/jwks`, end_session_endpoint: `${IDP}/logout`,
        scopes_supported: ['openid', 'email', 'profile'], response_types_supported: ['code'],
        code_challenge_methods_supported: ['S256'], id_token_signing_alg_values_supported: ['RS256'],
      });
    }
    if (url.pathname === '/jwks') return json(res, 200, { keys: [jwk] });

    if (url.pathname === '/authorize') {
      const rows = Object.keys(IDENTITIES).map(name =>
        `<li><a id="as-${name}" href="/approve?${new URLSearchParams({ ...q, who: name })}">${esc(name)}</a></li>`).join('');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><title>FakeIdP</title><style>body{font-family:sans-serif;margin:2em}code{background:#eee}</style>
<h1>FakeIdP sign-in</h1><p>Request from <code>${esc(q.client_id)}</code>, prompt=<code id="prompt">${esc(q.prompt || '(none)')}</code>,
PKCE <code id="pkce">${esc(q.code_challenge_method || 'off')}</code>, scope <code>${esc(q.scope)}</code></p>
<p>Sign in as:</p><ul>${rows}</ul><p><a id="deny" href="/approve?${new URLSearchParams({ ...q, who: '', deny: '<b>access_denied</b>' })}">Deny</a></p>`);
    }
    if (url.pathname === '/approve') {
      const back = new URL(q.redirect_uri);
      back.searchParams.set('state', q.state || '');
      if (q.deny) {
        back.searchParams.set('error', q.deny);
      } else {
        const code = crypto.randomBytes(12).toString('hex');
        codes.set(code, { who: q.who, challenge: q.code_challenge, redirect_uri: q.redirect_uri });
        back.searchParams.set('code', code);
      }
      res.writeHead(302, { Location: back.toString() });
      return res.end();
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      const grant = codes.get(body.code);
      codes.delete(body.code);
      if (!grant || body.client_id !== CLIENT_ID || body.client_secret !== CLIENT_SECRET || body.redirect_uri !== grant.redirect_uri) {
        return json(res, 400, { error: 'invalid_grant' });
      }
      if (grant.challenge) {
        const expected = crypto.createHash('sha256').update(body.code_verifier || '').digest('base64url');
        if (expected !== grant.challenge) return json(res, 400, { error: 'invalid_grant', error_description: 'PKCE mismatch' });
      }
      const claims = IDENTITIES[grant.who];
      const access = crypto.randomBytes(16).toString('hex');
      tokens.set(access, claims);
      return json(res, 200, {
        access_token: access, token_type: 'Bearer', expires_in: 300,
        id_token: idToken({ sub: claims.sub, email: claims.email }, claims.badSignature ? rogue : privateKey),
      });
    }
    if (url.pathname === '/userinfo') {
      const claims = tokens.get((req.headers.authorization || '').replace(/^Bearer /, ''));
      if (!claims) return json(res, 401, { error: 'invalid_token' });
      const { badSignature, ...rest } = claims;
      return json(res, 200, rest);
    }
    if (url.pathname === '/logout') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><title>FakeIdP</title><h1 id="idp-logged-out">Signed out at FakeIdP</h1>');
    }
    json(res, 404, { error: 'not_found' });
  });

  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(IDP_PORT, '127.0.0.1', resolve); });
  return {
    requests,
    last(path) { return [...requests].reverse().find(r => r.path === path); },
    close: () => new Promise(r => server.close(r)),
  };
}
