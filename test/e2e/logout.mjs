// Signing out (Jan, 2026-10-07): "Sign out" ends only the Redmine session; the
// provider session stays and the next SSO login does not ask for credentials
// again (no prompt=login). The provider logout URL is only offered as the
// separate "SSO Logout" link on the login page. GET /logout shows core's
// confirmation form and signs nobody out.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startIdp, IDP } from './_fake_idp.mjs';
import { configure, ssoLogin, loggedInAs, check, showAccount } from './_sso.mjs';

const idp = await startIdp();
const t = await e2e('logout');
try {
  configure({ oauth_logout_url: `${IDP}/logout` });

  await t.anonymous();
  await ssoLogin(t, 'manager');
  check(t, (await loggedInAs(t.page)) === 'manager', 'logged in through SSO');

  // GET /logout (a link or image elsewhere) must not end the session
  await t.go('/logout');
  check(t, (await loggedInAs(t.page)) === 'manager', 'GET /logout keeps the session');
  await t.shot('get-logout-form', 'GET /logout shows core\'s confirmation form; the SSO user stays logged in');

  // Sign out from the account menu (POST): Redmine only, the provider is not contacted
  await t.go('/my/page');
  await showAccount(t.page);
  await t.shot('account-menu', 'Account menu of the SSO user with "Sign out"');
  const before = idp.requests.length;
  await t.page.click('#account a.logout');
  await t.page.waitForURL(u => u.href.startsWith(t.BASE) && !u.pathname.startsWith('/my'), { timeout: 15000 });
  await t.settle();
  t.check('sign out');
  check(t, new URL(t.page.url()).origin === new URL(t.BASE).origin, `sign out stays in Redmine (at ${t.page.url()})`);
  check(t, !idp.requests.slice(before).some(r => r.path === '/logout'), 'sign out does not call the provider logout URL');
  check(t, (await loggedInAs(t.page)) === null, 'Redmine session ended');
  await t.shot('sign-out-redmine-only', 'Sign out with a provider logout URL configured: back on Redmine\'s home page as anonymous, the provider was not contacted');

  // the next SSO login goes through without prompt=login
  await t.go('/login');
  await t.page.click('#oauth-login-submit');
  await t.page.waitForURL(u => u.href.startsWith(IDP));
  check(t, !idp.last('/authorize').query.prompt, 'next SSO login sends no prompt');
  await t.page.locator('#prompt').evaluate(el => { el.style.outline = '2px solid red'; });
  await t.shot('next-login-no-prompt', 'Next SSO login after signing out: no prompt=login (outlined "(none)"), the provider session is reused');
  await t.page.click('#as-manager');
  await t.page.waitForURL(u => u.href.startsWith(t.BASE));
  await t.settle();
  check(t, (await loggedInAs(t.page)) === 'manager', 'signed in again through SSO');

  // the provider logout stays available as a separate link on the login page
  await t.page.click('#account .dropdown-trigger');
  await t.page.click('#account a.logout');
  await t.page.waitForURL(u => !u.pathname.startsWith('/my'), { timeout: 15000 });
  await t.go('/login');
  const link = t.page.locator('#top-menu #account a.logout');
  check(t, (await link.count()) === 1 && (await link.getAttribute('href')) === `${IDP}/logout`, 'SSO logout link on the login page');
  await link.evaluate(el => { el.style.outline = '2px solid red'; });
  await t.shot('login-page-sso-logout-link', 'Login page: the separate "SSO Logout" link (outlined) to the provider\'s logout URL, for whoever wants to end the provider session too');
  await link.click();
  await t.page.waitForURL(u => u.href.startsWith(IDP + '/logout'), { timeout: 15000 });
  check(t, (await t.page.locator('#idp-logged-out').count()) === 1, 'the link reaches the provider logout');
  await t.shot('sso-logout-link-followed', 'Following "SSO Logout": the provider\'s logout page');

  // without a logout URL: no link, sign out is the same
  configure();
  await t.anonymous();
  await t.go('/login');
  check(t, (await t.page.locator('#top-menu #account a.logout').count()) === 0, 'no SSO logout link without a logout URL');
  await t.shot('no-logout-url', 'No logout URL configured: no "SSO Logout" link on the login page');
} finally {
  configure();
  await idp.close();
  await t.done();
}
