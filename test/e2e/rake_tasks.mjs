// The plugin's rake tasks (redmine:bless_this_sso:*) against the running
// instance's database, with their effect checked in the browser: configure
// from OpenID discovery, status, enable/disable, SSO-only on/off, the flag
// toggles, test, help, reset. The output of each task goes to
// docs/e2e/rake_tasks-output.txt.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startIdp, IDP } from './_fake_idp.mjs';
import { configure, rails, check } from './_sso.mjs';

const REDMINE_DIR = process.env.REDMINE_DIR || 'redmine';
const OUT = process.env.RMP_E2E_OUT || 'docs/e2e';
const log = [];
// async: the fake provider runs in this process and must answer while rake waits
function rake(task, env = {}) {
  return new Promise(resolve => {
    execFile('bundle', ['exec', 'rake', `redmine:bless_this_sso:${task}`], {
      cwd: REDMINE_DIR, env: { ...process.env, RAILS_ENV: process.env.RMP_SERVER_ENV || 'production', ...env },
    }, (err, stdout, stderr) => {
      const ok = !err;
      const out = `${stdout}${ok ? '' : stderr}`;
      const shown = Object.entries(env).map(([k, v]) => `${k}=${/SECRET/.test(k) ? '***' : v} `).join('');
      log.push(`$ ${shown}rake redmine:bless_this_sso:${task}   (exit ${ok ? 0 : 'non-zero'})\n${out.trim()}\n`);
      resolve({ ok, out });
    });
  });
}
const flag = (k) => rails(`puts Setting.plugin_bless_this_redmine_sso['${k}'].inspect`);

const idp = await startIdp();
const t = await e2e('rake_tasks');
try {
  configure({ oauth_enabled: '0' });
  const c = await rake('configure', {
    OAUTH_DISCOVERY_URL: `${IDP}/.well-known/openid-configuration`, OAUTH_CLIENT_ID: 'redmine-e2e',
    OAUTH_CLIENT_SECRET: 'e2e-client-secret', OAUTH_PROVIDER_NAME: 'FakeIdP (rake)', OAUTH_PKCE: '1',
  });
  check(t, c.ok && /Loaded discovery metadata/.test(c.out), 'configure loads discovery');
  check(t, !c.out.includes('e2e-client-secret'), 'configure does not print the client secret');
  check(t, flag('oauth_authorize_url') === JSON.stringify(`${IDP}/authorize`), 'configure stored the discovered authorize URL');
  await t.anonymous();
  await t.go('/login');
  check(t, (await t.page.locator('#oauth-login-submit').inputValue()) === 'Login with FakeIdP (rake)', 'button after configure');
  await t.shot('after-configure', 'After `rake configure` with discovery: SSO is on, the button carries the configured provider name');

  const s = await rake('status');
  check(t, s.ok && /Status: ✓ Enabled/.test(s.out) && /Login: \/oauth\/sso\/authorize/.test(s.out), 'status shows enabled and the new entry point');
  check(t, !s.out.includes('e2e-client-secret'), 'status does not print the client secret');

  check(t, (await rake('test')).ok, 'test task passes on a complete configuration');

  await rake('enable_sso_only');
  check(t, flag('oauth_sso_only') === '"1"', 'enable_sso_only stores 1');
  await t.anonymous();
  await t.page.goto(t.BASE + '/login');
  await t.page.waitForURL(u => u.href.startsWith(IDP), { timeout: 15000 });
  await t.shot('after-enable-sso-only', 'After `rake enable_sso_only`: /login goes straight to the provider');

  await rake('disable_sso_only');
  check(t, flag('oauth_sso_only') === 'nil', 'disable_sso_only removes the flag');
  await t.anonymous();
  await t.go('/login');
  check(t, (await t.page.locator('#username').count()) === 1, 'password form back after disable_sso_only');
  await t.shot('after-disable-sso-only', 'After `rake disable_sso_only`: the password form is back next to the SSO button');

  for (const [on, off, key] of [['enable_pkce', 'disable_pkce', 'oauth_pkce'], ['enable_match_by_email', 'disable_match_by_email', 'oauth_match_by_email'],
    ['enable_case_insensitive_login', 'disable_case_insensitive_login', 'oauth_case_insensitive_login'], ['enable_bypass_twofa', 'disable_bypass_twofa', 'oauth_bypass_twofa']]) {
    await rake(on); check(t, flag(key) === '"1"', `${on} stores 1 (got ${flag(key)})`);
    await rake(off); check(t, ['nil', '"0"'].includes(flag(key)), `${off} turns it off (got ${flag(key)})`);
  }

  await rake('disable');
  check(t, flag('oauth_enabled') === 'nil', 'disable removes oauth_enabled');
  await t.anonymous();
  await t.go('/login');
  check(t, (await t.page.locator('#oauth-login-submit').count()) === 0, 'no button after disable');
  await t.shot('after-disable', 'After `rake disable`: no SSO button');
  check(t, !(await rake('test')).ok, 'test task fails when SSO is disabled');
  await rake('enable');
  check(t, flag('oauth_enabled') === '"1"', 'enable stores 1');

  check(t, /Available OAuth SSO rake tasks/.test((await rake('help')).out), 'help lists the tasks');
  await rake('reset');
  check(t, rails(`puts Setting.plugin_bless_this_redmine_sso['oauth_client_id'].inspect`) !== '"redmine-e2e"', 'reset clears the configuration');
} finally {
  fs.writeFileSync(path.join(OUT, 'rake_tasks-output.txt'), log.join('\n'));
  configure();
  await idp.close();
  await t.done();
}
