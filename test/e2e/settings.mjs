// The plugin's settings page (Administration > BlessThis SSO): who can open it,
// the SSO-only warning, the mapping presets, OpenID discovery against the fake
// provider (success, failure, refused for non-admins), and saving.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { startIdp, IDP } from './_fake_idp.mjs';
import { configure, rails, check } from './_sso.mjs';

const idp = await startIdp();
const t = await e2e('settings');
const SETTINGS = '/settings/plugin/bless_this_redmine_sso';
try {
  configure({ oauth_enabled: '0', oauth_authorize_url: '', oauth_token_url: '', oauth_userinfo_url: '', oauth_jwks_url: '', oauth_expected_issuer: '' });

  await t.login('admin');
  await t.go('/admin');
  const item = t.page.locator('#admin-menu a.bless-this-sso, a.bless-this-sso');
  check(t, (await item.locator('svg').count()) === 1, 'admin menu item has a sprite icon');
  await t.shot('admin-menu', 'Administration menu: "BlessThis SSO" with the user icon like the core entries');
  await item.first().click();
  await t.settle();
  check(t, new URL(t.page.url()).pathname === SETTINGS, 'menu item opens the plugin settings');
  await t.shot('page', 'Plugin settings page as admin', { full: true });

  // SSO-only warning appears with the checkbox
  await t.page.check('#oauth_sso_only_checkbox');
  check(t, await t.page.locator('#oauth_sso_only_warning').isVisible(), 'SSO-only warning visible');
  await t.page.locator('#oauth_sso_only_warning').scrollIntoViewIfNeeded();
  await t.shot('sso-only-warning', 'Ticking SSO-only shows the lock-out warning with the recovery commands', { full: false });
  await t.page.uncheck('#oauth_sso_only_checkbox');

  // mapping preset fills the claim fields
  await t.page.selectOption('#oauth_mapping_preset', 'microsoft');
  check(t, (await t.page.inputValue('#settings_oauth_login_field')) === 'userPrincipalName', 'Microsoft preset fills the login claim');
  await t.page.locator('#oauth_mapping_preset').scrollIntoViewIfNeeded();
  await t.shot('mapping-preset', 'Choosing the Microsoft preset fills login/email/name claims (userPrincipalName, mail, givenName, sn)', { full: false });
  await t.page.selectOption('#oauth_mapping_preset', 'generic');

  // discovery: failure, then success
  await t.page.selectOption('#oauth_discovery_provider', 'custom');
  await t.page.fill('#oauth_discovery_url', `${IDP}/no-such-discovery`);
  await t.page.click('#oauth_discovery_button');
  await t.page.waitForSelector('#oauth_discovery_result.error', { timeout: 15000 });
  t.check('discovery failure', { requests: ['422 fetch /oauth/discover'] });
  await t.page.locator('#oauth_discovery_result').scrollIntoViewIfNeeded();
  await t.shot('discovery-failure', 'Discovery against a URL that answers 404: an error under the button, no field changed', { full: false });

  await t.page.fill('#oauth_discovery_url', `${IDP}/.well-known/openid-configuration`);
  await t.page.click('#oauth_discovery_button');
  await t.page.waitForSelector('#oauth_discovery_result.notice', { timeout: 15000 });
  t.check('discovery success');
  check(t, (await t.page.inputValue('#settings_oauth_authorize_url')) === `${IDP}/authorize`, 'discovery fills the authorize URL');
  check(t, (await t.page.inputValue('#settings_oauth_jwks_url')) === `${IDP}/jwks`, 'discovery fills the JWKS URL');
  check(t, (await t.page.inputValue('#settings_oauth_expected_issuer')) === IDP, 'discovery fills the issuer');
  await t.shot('discovery-success', 'Discovery from the provider\'s openid-configuration fills endpoints, issuer and JWKS URL', { full: true });

  // save (sudo mode asks for the password)
  await t.page.check('#settings_oauth_enabled');
  await t.page.fill('#settings_oauth_client_id', 'redmine-e2e');
  await t.page.fill('#settings_oauth_client_secret', 'e2e-client-secret');
  await t.page.fill('#settings_oauth_provider_name', 'FakeIdP saved');
  await t.page.click('form[action*="settings/plugin"] input[type=submit]');
  await t.settle();
  await t.sudo();
  check(t, (await t.page.locator('#flash_notice').count()) === 1, 'settings saved');
  const saved = JSON.parse(rails(`puts Setting.plugin_bless_this_redmine_sso.slice('oauth_enabled', 'oauth_provider_name', 'oauth_authorize_url', 'oauth_jwks_url').to_json`));
  check(t, saved.oauth_enabled === '1' && saved.oauth_provider_name === 'FakeIdP saved' && saved.oauth_authorize_url === `${IDP}/authorize` && saved.oauth_jwks_url === `${IDP}/jwks`, `stored: ${JSON.stringify(saved)}`);
  await t.shot('saved', 'Saved after the sudo password: notice shown, values from discovery stored', { full: false });
  await t.anonymous();
  await t.go('/login');
  check(t, (await t.page.locator('#oauth-login-submit').inputValue()).includes('FakeIdP saved'), 'login button uses the saved provider name');
  await t.shot('login-button-after-save', 'Login page after saving: the button carries the saved provider name');

  // refusals: settings page and discovery endpoint are admin only
  for (const who of ['manager', 'reporter', 'outsider']) {
    await t.login(who);
    await t.go(SETTINGS, { status: 403 });
    const res = await t.page.request.post(t.BASE + '/oauth/discover', {
      data: { discovery_url: `${IDP}/.well-known/openid-configuration` },
      headers: { 'X-CSRF-Token': await t.page.locator('meta[name=csrf-token]').getAttribute('content') },
    });
    check(t, res.status() === 403, `${who}: POST /oauth/discover refused (${res.status()})`);
    await t.shot(`refused-${who}`, `${who} (not admin): the settings page answers 403, and POST /oauth/discover answers 403`);
  }
  await t.anonymous();
  await t.go(SETTINGS);
  check(t, new URL(t.page.url()).pathname === '/login', 'anonymous: settings page asks to log in');
  const anon = await t.page.request.post(t.BASE + '/oauth/discover', { data: {}, maxRedirects: 0 });
  check(t, [302, 401, 403, 422].includes(anon.status()), `anonymous: POST /oauth/discover refused (${anon.status()})`);
  await t.shot('refused-anonymous', 'Anonymous: the settings page sends to /login; POST /oauth/discover is refused');
} finally {
  configure();
  await idp.close();
  await t.done();
}
