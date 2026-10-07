// Two things around Redmine's own security after an SSO login:
// - "Bypass Redmine MFA": with core 2FA required for everyone, an SSO login
//   skips the 2FA activation when the option is on, and gets it when off.
// - Sudo mode (on by default in Redmine 7): a successful SSO login starts it,
//   like a password login does (Jan, 2026-10-07). An admin who signed in
//   through SSO, also one that only exists through SSO and has no password of
//   its own, opens and saves sudo-protected pages without a password prompt.
//   Sudo mode gives no rights: a non-admin is still refused.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startIdp } from './_fake_idp.mjs';
import { configure, rails, ssoLogin, loggedInAs, check, showAccount } from './_sso.mjs';

const idp = await startIdp();
const t = await e2e('twofa_sudo');
try {
  // --- 2FA required by core
  rails(`Setting.twofa = '2'`);
  configure({ oauth_bypass_twofa: '1' });
  await t.anonymous();
  await ssoLogin(t, 'manager');
  check(t, new URL(t.page.url()).pathname === '/my/page', `bypass on: straight to My page (at ${t.page.url()})`);
  await t.go('/projects');
  check(t, !/twofa/.test(t.page.url()), 'bypass on: no 2FA activation afterwards');
  await showAccount(t.page);
  await t.shot('twofa-bypass-on', '2FA required by core, "Bypass Redmine MFA" on: the SSO user works without 2FA activation');

  configure({ oauth_bypass_twofa: '0' });
  await t.anonymous();
  await ssoLogin(t, 'manager');
  await t.go('/projects').catch(() => {});
  check(t, /twofa/.test(t.page.url()), `bypass off: 2FA activation is enforced (at ${t.page.url()})`);
  check(t, (await t.page.locator('#sudo_password').count()) === 0, 'bypass off: the 2FA activation is not blocked by a password prompt (sudo started by the SSO login)');
  await t.shot('twofa-bypass-off', '2FA required, bypass off: core sends the SSO user to 2FA activation, which opens without a password prompt because the SSO login started sudo mode');
  rails(`Setting.twofa = '1'`);

  // --- sudo mode started by the SSO login: admin with a local password
  configure();
  await t.anonymous();
  await ssoLogin(t, 'admin');
  check(t, (await loggedInAs(t.page)) === 'admin', 'admin logged in through SSO');
  await t.go('/settings/plugin/bless_this_redmine_sso');
  check(t, (await t.page.locator('#sudo_password').count()) === 0, 'SSO admin: no sudo prompt when opening the settings');
  await t.page.fill('#settings_oauth_provider_name', 'FakeIdP (sudo test)');
  await t.page.click('form[action*="settings/plugin"] input[type=submit]');
  await t.settle();
  check(t, (await t.page.locator('#sudo_password').count()) === 0, 'SSO admin: no sudo prompt when saving');
  check(t, (await t.page.locator('#flash_notice').count()) === 1, 'SSO admin: settings saved');
  check(t, rails(`puts Setting.plugin_bless_this_redmine_sso['oauth_provider_name']`) === 'FakeIdP (sudo test)', 'setting stored');
  await t.shot('sudo-sso-admin', 'Admin signed in through SSO saves the plugin settings without a password prompt: the SSO login started sudo mode');
  await t.go('/users/new');
  check(t, (await t.page.locator('#sudo_password').count()) === 0 && (await t.page.locator('#user_login').count()) === 1, 'SSO admin: new user form without sudo prompt');

  // --- an admin that only exists through SSO (random password it does not know)
  rails(`u = User.find_by_login('sso.newbie'); u ||= User.new(login: 'sso.newbie', firstname: 'Nora', lastname: 'Newbie', mail: 'sso.newbie@example.net'); u.random_password; u.admin = true; u.status = 1; u.save!`);
  configure();
  await t.anonymous();
  await ssoLogin(t, 'newbie');
  check(t, (await loggedInAs(t.page)) === 'sso.newbie', 'SSO-only admin logged in');
  await t.go('/settings/plugin/bless_this_redmine_sso');
  check(t, (await t.page.locator('#sudo_password').count()) === 0, 'SSO-only admin: no sudo prompt');
  await t.page.fill('#settings_oauth_provider_name', 'FakeIdP (sudo by SSO admin)');
  await t.page.click('form[action*="settings/plugin"] input[type=submit]');
  await t.settle();
  check(t, (await t.page.locator('#flash_notice').count()) === 1, 'SSO-only admin: settings saved');
  check(t, rails(`puts Setting.plugin_bless_this_redmine_sso['oauth_provider_name']`) === 'FakeIdP (sudo by SSO admin)', 'SSO-only admin: stored');
  await t.shot('sudo-sso-only-admin', 'Admin that only exists through SSO (no password of its own) saves the plugin settings: no password prompt, saved');

  // --- refusals: sudo mode gives no rights
  for (const who of ['manager']) {
    await t.anonymous();
    await ssoLogin(t, who);
    await t.go('/settings/plugin/bless_this_redmine_sso', { status: 403 });
    await t.shot(`sudo-no-rights-${who}`, `${who} signed in through SSO: sudo mode is on but the plugin settings still answer 403`);
  }
  for (const who of ['reporter', 'outsider']) {
    await t.login(who);
    await t.go('/settings/plugin/bless_this_redmine_sso', { status: 403 });
  }
  await t.anonymous();
  await t.go('/settings/plugin/bless_this_redmine_sso');
  check(t, new URL(t.page.url()).pathname === '/login', 'anonymous: settings ask to log in');
} finally {
  rails(`Setting.twofa = '1'; User.find_by_login('sso.newbie')&.update_column(:admin, false)`);
  configure();
  await idp.close();
  await t.done();
}
