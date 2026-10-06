// SSO login through the provider, end to end: the button on /login, the
// redirect with state and PKCE, the callback, token exchange, id_token
// signature (RS256 via JWKS), userinfo, and what happens to the Redmine user:
// auto-create (default group, custom field), login of an existing user, update
// of names, case-insensitive and email matching. Then every refusal: auto-create
// off, locked user, invalid claims, case-sensitive clash, bad id_token
// signature, provider error, forged state.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startIdp, IDP } from './_fake_idp.mjs';
import { configure, rails, ssoLogin, loggedInAs, check, showAccount } from './_sso.mjs';

const idp = await startIdp();
const t = await e2e('sso_login');
try {
  rails(`User.where(login: %w[sso.newbie sso.badsig r.porter]).each(&:destroy)
         m = User.find_by_login('manager'); m.update!(firstname: 'Manager', lastname: 'E2E')`);
  // the custom field mapping is stored as oauth_custom_field_<id>
  configure({ oauth_default_groups: '<group:SSO staff>', 'oauth_custom_field_<cf:Employee ID>': 'employee_id' });

  // 1. New user, created on first SSO login, sent back to where they started
  await t.anonymous();
  await t.go('/login?back_url=' + encodeURIComponent(t.BASE + '/issues/1'));
  await t.shot('login-page', 'Login page with the "Login with FakeIdP" button above the password form');
  await t.page.click('#oauth-login-submit');
  await t.page.waitForURL(u => u.href.startsWith(IDP));
  const auth = idp.last('/authorize').query;
  check(t, auth.state && auth.state.length === 32, 'authorize sends a 32-char state');
  check(t, auth.code_challenge_method === 'S256' && auth.code_challenge, 'authorize sends a PKCE S256 challenge');
  check(t, auth.redirect_uri === t.BASE + '/oauth/callback', `redirect_uri is /oauth/callback (got ${auth.redirect_uri})`);
  check(t, !auth.prompt, 'no prompt on a first login');
  await t.shot('provider-page', 'At the provider: request from redmine-e2e with PKCE S256, no prompt');
  await t.page.click('#as-newbie');
  await t.page.waitForURL(u => u.href.startsWith(t.BASE));
  await t.settle();
  t.check('sso login newbie');
  check(t, idp.last('/token').body.code_verifier, 'token request carries the PKCE code_verifier');
  check(t, new URL(t.page.url()).pathname === '/issues/1', `back_url honoured (at ${t.page.url()})`);
  check(t, (await loggedInAs(t.page)) === 'sso.newbie', 'logged in as the new user sso.newbie');
  await showAccount(t.page);
  await t.shot('new-user-back-url', 'New user sso.newbie created and logged in, landed on /issues/1 (back_url)');
  const created = JSON.parse(rails(`u = User.find_by_login('sso.newbie'); puts({mail: u.mail, name: u.name, groups: u.groups.map(&:lastname), emp: u.custom_field_value(UserCustomField.find_by(name: 'Employee ID')), active: u.active?}.to_json)`));
  check(t, created.mail === 'sso.newbie@example.net' && created.name === 'Nora Newbie', `user data from the provider (${JSON.stringify(created)})`);
  check(t, created.groups.includes('SSO staff'), 'default group SSO staff assigned');
  check(t, created.emp === 'E-1001', 'custom field Employee ID mapped from employee_id');
  await t.login('admin');
  await t.go('/users?name=sso.newbie');
  await t.page.click('a:text-is("sso.newbie")');
  await t.settle();
  await t.shot('new-user-admin-view', 'Admin view of the created user: name, e-mail, Employee ID E-1001, group SSO staff');

  // 2. Existing user, names updated from the provider (update existing on)
  await t.anonymous();
  await ssoLogin(t, 'manager');
  t.check('sso login manager');
  check(t, (await loggedInAs(t.page)) === 'manager', 'existing user manager logged in');
  check(t, new URL(t.page.url()).pathname === '/my/page', 'without back_url the user lands on My page');
  check(t, rails(`puts User.find_by_login('manager').name`) === 'Managed ByIdP', 'names updated from the provider');
  await showAccount(t.page);
  await t.shot('existing-user-updated', 'Existing user manager logged in through SSO; name now "Managed ByIdP" from the provider');

  // 3. Update existing off: names stay
  rails(`User.find_by_login('manager').update!(firstname: 'Manager', lastname: 'E2E')`);
  configure({ oauth_update_existing: '0' });
  await t.anonymous();
  await ssoLogin(t, 'manager');
  check(t, rails(`puts User.find_by_login('manager').name`) === 'Manager E2E', 'update existing off keeps the Redmine names');
  await showAccount(t.page);
  await t.shot('update-existing-off', 'Update existing off: manager logged in, name stays "Manager E2E"');

  // 4. Case-insensitive matching (default on): MANAGER is manager
  configure({ oauth_update_existing: '0' });
  await t.anonymous();
  await ssoLogin(t, 'MANAGER');
  check(t, (await loggedInAs(t.page)) === 'manager', 'MANAGER from the provider logs in as manager');
  await showAccount(t.page);
  await t.shot('case-insensitive', 'Provider sends MANAGER; case-insensitive matching logs in the existing manager');

  // 5. Case-sensitive: MANAGER does not match, and creating it clashes with manager
  configure({ oauth_case_insensitive_login: '0' });
  await t.anonymous();
  await ssoLogin(t, 'MANAGER');
  check(t, new URL(t.page.url()).pathname === '/login', 'case-sensitive clash ends on /login');
  check(t, (await t.page.locator('#flash_error').count()) === 1, 'case-sensitive clash shows an error');
  check(t, (await loggedInAs(t.page)) === null, 'case-sensitive clash: nobody logged in');
  await t.shot('case-sensitive-refused', 'Case-sensitive on: MANAGER is not manager, and creating it is refused (login taken)');

  // 6. Email matching off then on
  configure({ oauth_auto_create: '0' });
  await t.anonymous();
  await ssoLogin(t, 'mailmatch');
  check(t, (await loggedInAs(t.page)) === null, 'auto-create off and no match: refused');
  await t.shot('auto-create-off-refused', 'Auto-create off, login r.porter unknown, email matching off: refused with an error');
  configure({ oauth_auto_create: '0', oauth_match_by_email: '1' });
  await t.anonymous();
  await ssoLogin(t, 'mailmatch');
  check(t, (await loggedInAs(t.page)) === 'reporter', 'email matching links r.porter to reporter@example.net');
  await showAccount(t.page);
  await t.shot('match-by-email', 'Match by email on: provider login r.porter, e-mail reporter@example.net, logged in as reporter');

  // 7. Refusals
  configure();
  await t.anonymous();
  await ssoLogin(t, 'locked');
  check(t, (await loggedInAs(t.page)) === null, 'locked user refused');
  await t.shot('locked-refused', 'A locked Redmine user is refused after a valid SSO login');

  await t.anonymous();
  await ssoLogin(t, 'invalid');
  check(t, (await t.page.locator('#flash_error').textContent()).includes('Login'), 'invalid claims: validation errors shown');
  await t.shot('invalid-claims-refused', 'Claims that fail user validation (login "bad login!", e-mail "not-an-email"): errors shown, no user created');

  await t.anonymous();
  await ssoLogin(t, 'badsig');
  check(t, (await loggedInAs(t.page)) === null, 'bad id_token signature refused');
  check(t, rails(`puts User.where(login: 'sso.badsig').count`) === '0', 'no user created for a bad id_token');
  await t.shot('bad-signature-refused', 'id_token signed with a key not in the JWKS: refused, no user created');

  await t.anonymous();
  await t.page.goto(t.BASE + '/login');
  await t.page.click('#oauth-login-submit');
  await t.page.waitForURL(u => u.href.startsWith(IDP));
  await t.page.click('#deny');
  await t.page.waitForURL(u => u.href.startsWith(t.BASE));
  await t.settle();
  const flash = await t.page.locator('#flash_error').innerHTML();
  check(t, flash.includes('&lt;b&gt;access_denied&lt;/b&gt;'), `provider error shown escaped (${flash})`);
  await t.shot('provider-error-escaped', 'Provider answers error=<b>access_denied</b>: refused, the markup is shown as text, not rendered');

  await t.anonymous();
  await t.go('/oauth/callback?state=forged&code=abc');  // 302 to /login, which answers 200
  check(t, new URL(t.page.url()).pathname === '/login', 'forged state ends on /login');
  check(t, (await t.page.locator('#flash_error').count()) === 1, 'forged state shows an error');
  await t.shot('forged-state-refused', 'Callback with a state that is not in the session: refused');
} finally {
  configure();
  await idp.close();
  await t.done();
}
