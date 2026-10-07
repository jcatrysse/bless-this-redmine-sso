// Local password management for SSO users (Jan, 2026-10-07): once a user has
// signed in through SSO, their password lives at the provider. Redmine then
// hides "Change password", refuses /my/password and sends no lost-password
// mail, with core's own message. Users who sign in with a password keep all of
// it; an admin can still set a password in Administration > Users; turning SSO
// off lifts the block.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startIdp } from './_fake_idp.mjs';
import { configure, rails, ssoLogin, loggedInAs, check, showAccount } from './_sso.mjs';

const idp = await startIdp();
const t = await e2e('password');
const CHANGE = 'a[href$="/my/password"]';
try {
  configure();
  rails(`%w[admin manager reporter outsider].each { |l| u = User.find_by_login(l); u.pref[:bless_this_sso_user] = nil; u.pref.save }`);

  // manager signs in through SSO: from now on an SSO user
  await t.anonymous();
  await ssoLogin(t, 'manager');
  check(t, (await loggedInAs(t.page)) === 'manager', 'manager signed in through SSO');
  check(t, rails(`puts User.find_by_login('manager').change_password_allowed?`) === 'false', 'manager marked as SSO user');
  await t.go('/my/account');
  check(t, (await t.page.locator(CHANGE).count()) === 0, 'SSO user: no "Change password" on My account');
  await t.shot('sso-user-my-account', 'manager after an SSO login: My account without "Change password" (the password lives at the provider)');
  await t.go('/my/password');
  check(t, new URL(t.page.url()).pathname === '/my/account', 'SSO user: /my/password goes back to My account');
  check(t, /external authentication source/i.test(await t.page.locator('#flash_error').textContent().catch(() => '')), 'SSO user: core\'s refusal message');
  await t.shot('sso-user-my-password-refused', 'manager opens /my/password directly: refused with core\'s message, back on My account');

  // the same user with a password login is still an SSO account
  await t.login('manager');
  await t.go('/my/account');
  check(t, (await t.page.locator(CHANGE).count()) === 0, 'SSO account stays SSO after a password login');

  // lost password for the SSO user's address: refused, no mail
  await t.anonymous();
  const since = Date.now();
  await t.go('/account/lost_password');
  await t.page.fill('#mail', 'manager@example.net');
  await t.page.click('input[type=submit]');
  await t.settle();
  check(t, (await t.page.locator('#flash_error').count()) === 1, 'lost password for an SSO user: refused');
  check(t, !t.mails(since).some(m => m.body.includes('manager@example.net')), 'no recovery mail for the SSO user');
  await t.shot('sso-user-lost-password-refused', 'Lost password for the SSO user\'s address: refused with core\'s message, no recovery mail sent');

  // users who never signed in through SSO keep local password management
  for (const who of ['reporter', 'outsider']) {
    await t.login(who);
    await t.go('/my/account');
    check(t, (await t.page.locator(CHANGE).count()) === 1, `${who} (password login only): "Change password" shown`);
    await t.page.click(CHANGE);
    await t.settle();
    check(t, (await t.page.locator('#new_password').count()) === 1, `${who}: password form opens`);
    await t.shot(`password-user-${who}`, `${who} never signed in through SSO: "Change password" opens core's password form`);
  }
  await t.anonymous();
  const since2 = Date.now();
  await t.go('/account/lost_password');
  await t.page.fill('#mail', 'outsider@example.net');
  await t.page.click('input[type=submit]');
  await t.settle();
  check(t, (await t.page.locator('#flash_notice').count()) === 1, 'lost password for a password user: mail sent');
  await t.shot('password-user-lost-password', 'Lost password for outsider (password login only): core sends the recovery mail as before');
  check(t, t.mails(since2).length >= 1, 'recovery mail written for outsider');

  // admin through SSO: own password blocked, but can still set one for a user
  await t.anonymous();
  await ssoLogin(t, 'admin');
  await t.go('/my/account');
  check(t, (await t.page.locator(CHANGE).count()) === 0, 'SSO admin: no "Change password" for itself');
  const managerId = rails(`puts User.find_by_login('manager').id`);
  await t.go(`/users/${managerId}/edit`);
  check(t, await t.page.locator('#user_password').isVisible(), 'admin can still set a password for the SSO user');
  await t.page.locator('#password_fields').scrollIntoViewIfNeeded();
  await t.shot('admin-can-set-password', 'Admin (signed in through SSO, no password prompt) on the SSO user\'s account: the password fields are still there as a recovery path');

  // SSO turned off: the block is lifted
  configure({ oauth_enabled: '0' });
  await t.login('manager');
  await t.go('/my/account');
  check(t, (await t.page.locator(CHANGE).count()) === 1, 'SSO off: "Change password" back for the former SSO user');
  await t.shot('sso-off-block-lifted', 'With OAuth SSO turned off, manager has "Change password" again');
} finally {
  configure();
  await idp.close();
  await t.done();
}
