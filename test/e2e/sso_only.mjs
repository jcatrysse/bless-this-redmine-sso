// SSO-only mode and the login button's states: plugin off (no button), on
// (button), SSO-only (no password form, /login goes straight to the provider,
// back_url kept), and enabled but not configured (a clear error, no loop).
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startIdp, IDP } from './_fake_idp.mjs';
import { configure, rails, ssoLogin, loggedInAs, check, showAccount } from './_sso.mjs';

const idp = await startIdp();
const t = await e2e('sso_only');
try {
  // plugin disabled: core login page only
  configure({ oauth_enabled: '0' });
  await t.anonymous();
  await t.go('/login');
  check(t, (await t.page.locator('#oauth-login-submit').count()) === 0, 'disabled: no SSO button');
  await t.shot('disabled-no-button', 'Plugin disabled: the login page is core only, no SSO button');
  await t.go('/oauth/sso/authorize');
  check(t, new URL(t.page.url()).pathname === '/login' && (await t.page.locator('#flash_error').count()) === 1, 'disabled: /oauth/sso/authorize refuses');
  await t.shot('disabled-authorize-refused', 'Plugin disabled: /oauth/sso/authorize goes back to /login with "not configured"');

  // enabled but endpoints missing
  configure({ oauth_token_url: '' });
  await t.anonymous();
  await t.go('/login');
  await t.page.click('#oauth-login-submit');
  await t.settle();
  check(t, new URL(t.page.url()).pathname === '/login', 'not configured: back on /login');
  check(t, (await t.page.locator('#flash_error').count()) === 1, 'not configured: error shown');
  await t.shot('not-configured', 'Enabled but the token URL is empty: the button leads back to /login with an error');

  // SSO-only
  configure({ oauth_sso_only: '1' });
  await t.anonymous();
  await t.page.goto(t.BASE + '/login?back_url=' + encodeURIComponent(t.BASE + '/projects/e2e-project'));
  await t.page.waitForURL(u => u.href.startsWith(IDP), { timeout: 15000 });
  t.check('sso-only /login');
  check(t, idp.last('/authorize').query.client_id === 'redmine-e2e', 'SSO-only: /login lands at the provider');
  await t.shot('sso-only-redirect', 'SSO-only: /login goes straight to the provider (no Redmine password form)');
  await t.page.click('#as-manager');
  await t.page.waitForURL(u => u.href.startsWith(t.BASE));
  await t.settle();
  t.check('sso-only callback');
  check(t, new URL(t.page.url()).pathname === '/projects/e2e-project', `SSO-only keeps back_url (at ${t.page.url()})`);
  check(t, (await loggedInAs(t.page)) === 'manager', 'SSO-only login as manager');
  await showAccount(t.page);
  await t.shot('sso-only-back-url', 'SSO-only login as manager returns to the project page it started from');

  // the password form is not reachable, and a POST with a valid password does not log in
  await t.anonymous();
  const res = await t.page.request.get(t.BASE + '/login', { maxRedirects: 0 });
  check(t, res.status() === 302 && /\/oauth\/sso\/authorize/.test(res.headers().location || ''), `SSO-only GET /login is a 302 to /oauth/sso/authorize (${res.status()} ${res.headers().location})`);
  await t.go('/');
  const token = await t.page.locator('meta[name=csrf-token]').getAttribute('content');
  const post = await t.page.request.post(t.BASE + '/login', {
    form: { authenticity_token: token, username: 'admin', password: 'Redmine7Test!' }, maxRedirects: 0,
  });
  check(t, post.status() === 302 && /\/oauth\/sso\/authorize/.test(post.headers().location || ''), `SSO-only POST /login with a valid password is sent to the provider (${post.status()} ${post.headers().location})`);
  const after = await t.page.request.get(t.BASE + '/my/page', { maxRedirects: 0 });
  check(t, after.status() === 302 && /\/login/.test(after.headers().location || ''), `no session after the POST (${after.status()} ${after.headers().location})`);

  // a protected page as anonymous: login required, then SSO, then back
  await t.anonymous();
  await t.page.goto(t.BASE + '/my/account');
  await t.page.waitForURL(u => u.href.startsWith(IDP), { timeout: 15000 });
  await t.page.click('#as-manager');
  await t.page.waitForURL(u => u.href.startsWith(t.BASE));
  await t.settle();
  check(t, new URL(t.page.url()).pathname === '/my/account', `a protected page leads through SSO and back (at ${t.page.url()})`);
  await t.shot('sso-only-protected-page', 'Anonymous on /my/account in SSO-only mode: provider, then back on /my/account as manager');

  // recovery from a lock-out: the SQL shown on the settings page, run on the
  // live database, re-opens the password form without a restart
  configure({ oauth_sso_only: '1' });
  rails(`ActiveRecord::Base.connection.execute(I18n.t(:warning_sso_only_db_command, scope: :bless_this_redmine_sso, locale: :en))`);
  await t.anonymous();
  await t.go('/login');
  check(t, (await t.page.locator('#username').count()) === 1, 'after the recovery SQL the password form is back');
  await t.shot('recovery-sql-login', 'After the documented recovery SQL: /login shows the password form again (no restart needed)');
  await t.login('admin');
  await t.go('/settings/plugin/bless_this_redmine_sso');
  check(t, !(await t.page.isChecked('#oauth_sso_only_checkbox')), 'settings page shows SSO-only off after recovery');
  check(t, await t.page.isChecked('#settings_oauth_enabled'), 'settings page still shows SSO enabled');
  await t.shot('recovery-sql-settings', 'Settings after recovery: SSO enabled, SSO-only unchecked (stored as \'0\'), so saving keeps it off', { full: false });
} finally {
  configure();
  await idp.close();
  await t.done();
}
