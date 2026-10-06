// Two things around Redmine's own security after an SSO login:
// - "Bypass Redmine MFA": with core 2FA required for everyone, an SSO login
//   skips the 2FA activation when the option is on, and gets it when off.
// - Sudo mode (on by default in Redmine 7, decided to stay on): an admin who
//   logged in through SSO opens a sudo-protected page (plugin settings). The
//   sudo form asks for the Redmine password: an admin matched to an account with
//   a known local password passes; an admin created by SSO only has the random
//   password the plugin set, so cannot (recorded in the migration plan).
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
  check(t, /\/my\/twofa|twofa/.test(t.page.url()), `bypass off: 2FA activation is enforced (at ${t.page.url()})`);
  await t.shot('twofa-bypass-off', '2FA required, bypass off: after the SSO login core sends the user to 2FA activation');
  rails(`Setting.twofa = '1'`);

  // --- sudo mode for an SSO admin with a known local password
  configure();
  await t.anonymous();
  await ssoLogin(t, 'admin');
  check(t, (await loggedInAs(t.page)) === 'admin', 'admin logged in through SSO');
  // A password login starts sudo mode (core AccountController#password_authentication);
  // an SSO login does not, so the settings page itself asks for the password.
  await t.go('/settings/plugin/bless_this_redmine_sso');
  check(t, (await t.page.locator('#sudo_password').count()) === 1, 'sudo form shown for the SSO admin when opening the settings');
  await t.shot('sudo-form', 'Admin logged in through SSO opens the plugin settings: Redmine 7 first asks for the password (sudo mode)');
  await t.sudo('Redmine7Test!');
  await t.page.fill('#settings_oauth_provider_name', 'FakeIdP (sudo test)');
  await t.page.click('form[action*="settings/plugin"] input[type=submit]');
  await t.settle();
  check(t, (await t.page.locator('#sudo_password').count()) === 0, 'within the sudo window no second password prompt');
  check(t, (await t.page.locator('#flash_notice').count()) === 1, 'sudo with the local password: settings saved');
  check(t, rails(`puts Setting.plugin_bless_this_redmine_sso['oauth_provider_name']`) === 'FakeIdP (sudo test)', 'setting stored');
  await t.shot('sudo-passed', 'With the account\'s Redmine password the sudo form passes and the settings are saved');

  // --- sudo mode for an admin that only exists through SSO
  rails(`u = User.find_by_login('sso.newbie'); u ||= User.new(login: 'sso.newbie', firstname: 'Nora', lastname: 'Newbie', mail: 'sso.newbie@example.net'); u.random_password; u.admin = true; u.status = 1; u.save!`);
  configure();
  await t.anonymous();
  await ssoLogin(t, 'newbie');
  check(t, (await loggedInAs(t.page)) === 'sso.newbie', 'SSO-only admin logged in');
  await t.go('/settings/plugin/bless_this_redmine_sso');
  await t.page.fill('#sudo_password', 'guessing-does-not-help');
  await t.page.locator('#sudo_password').press('Enter');
  await t.settle();
  check(t, (await t.page.locator('#sudo_password').count()) === 1, 'SSO-only admin: wrong password, sudo form again');
  check(t, (await t.page.locator('#settings_oauth_provider_name').count()) === 0, 'SSO-only admin: settings page not reachable');
  check(t, rails(`puts Setting.plugin_bless_this_redmine_sso['oauth_provider_name']`) === 'FakeIdP', 'SSO-only admin: nothing saved');
  await t.shot('sudo-sso-only-admin', 'Admin created by SSO has no password of its own: the sudo form cannot be passed, the settings page stays closed');
} finally {
  rails(`Setting.twofa = '1'; User.find_by_login('sso.newbie')&.update_column(:admin, false)`);
  configure();
  await idp.close();
  await t.done();
}
