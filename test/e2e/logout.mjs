// Logout: with a provider logout URL (Redmine session ends, browser goes to the
// provider), GET /logout only shows core's confirmation form, without a logout
// URL the next SSO login asks the provider for credentials (prompt=login), and
// the "SSO logout" link the plugin adds to the anonymous account menu.
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
  check(t, !idp.last('/logout'), 'GET /logout does not go to the provider');
  await t.shot('get-logout-form', 'GET /logout shows core\'s confirmation form; the SSO user stays logged in');

  // the real sign out (POST from the account menu)
  await t.go('/my/page');
  await showAccount(t.page);
  await t.shot('account-menu', 'Account menu of the SSO user with "Sign out"');
  await t.page.click('#account a.logout');
  await t.page.waitForURL(u => u.href.startsWith(IDP + '/logout'), { timeout: 15000 });
  t.check('sign out');
  check(t, (await t.page.locator('#idp-logged-out').count()) === 1, 'provider logout page reached');
  await t.shot('provider-logout', 'Sign out: Redmine session ended and the browser is at the provider\'s logout URL');
  await t.go('/my/page');
  check(t, new URL(t.page.url()).pathname === '/login', 'Redmine session is gone after provider logout');

  // anonymous login page: the plugin adds an "SSO logout" link to the account menu
  await t.go('/login');
  const link = t.page.locator('#top-menu #account a.logout');
  check(t, (await link.count()) === 1 && (await link.getAttribute('href')) === `${IDP}/logout`, 'SSO logout link on the login page');
  await link.evaluate(el => { el.style.outline = '2px solid red'; });
  await t.shot('login-page-sso-logout-link', 'Login page: the plugin adds an "SSO logout" link (outlined) to the anonymous account menu');

  // without a logout URL: core logout, then the provider must ask again
  configure();
  await t.anonymous();
  await ssoLogin(t, 'manager');
  await t.go('/my/page');
  await showAccount(t.page);
  await t.page.click('#account a.logout');
  await t.page.waitForURL(u => !u.pathname.startsWith('/my'), { timeout: 15000 });
  await t.settle();
  check(t, (await loggedInAs(t.page)) === null, 'core logout without a logout URL');
  await t.shot('core-logout', 'No logout URL: core sign out, back on the home page as anonymous');
  await t.go('/login');
  await t.page.click('#oauth-login-submit');
  await t.page.waitForURL(u => u.href.startsWith(IDP));
  check(t, idp.last('/authorize').query.prompt === 'login', 'next SSO login sends prompt=login');
  await t.page.locator('#prompt').evaluate(el => { el.style.outline = '2px solid red'; });
  await t.shot('prompt-login', 'Next SSO login after a sign out: the provider receives prompt=login (outlined), so it asks for credentials');
  await t.page.click('#as-manager');
  await t.page.waitForURL(u => u.href.startsWith(t.BASE));
  await t.settle();
  check(t, (await loggedInAs(t.page)) === 'manager', 'login after prompt=login works');
} finally {
  configure();
  await idp.close();
  await t.done();
}
