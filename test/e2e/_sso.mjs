// Shared by the SSO scenarios: plugin settings through `rails runner` on the
// running instance's database, and the SSO login through the fake provider.
import { execFileSync } from 'node:child_process';
import { IDP, CLIENT_ID, CLIENT_SECRET } from './_fake_idp.mjs';

const REDMINE_DIR = process.env.REDMINE_DIR || 'redmine';

// Runs Ruby in the server's environment (production by default) and returns stdout.
export function rails(code) {
  return execFileSync('bundle', ['exec', 'rails', 'runner', code], {
    cwd: REDMINE_DIR,
    env: { ...process.env, RAILS_ENV: process.env.RMP_SERVER_ENV || 'production' },
    stdio: ['ignore', 'pipe', 'inherit'],
  }).toString().trim();
}

export const DEFAULTS = {
  oauth_enabled: '1', oauth_sso_only: '0', oauth_provider_name: 'FakeIdP',
  oauth_client_id: CLIENT_ID, oauth_client_secret: CLIENT_SECRET,
  oauth_authorize_url: `${IDP}/authorize`, oauth_token_url: `${IDP}/token`,
  oauth_userinfo_url: `${IDP}/userinfo`, oauth_jwks_url: `${IDP}/jwks`,
  oauth_expected_issuer: IDP, oauth_expected_client_id: '', oauth_scope: 'openid email profile',
  oauth_redirect_uri: '', oauth_logout_url: '', oauth_pkce: '1', oauth_bypass_twofa: '1',
  oauth_mapping_preset: 'generic', oauth_login_field: 'preferred_username', oauth_email_field: 'email',
  oauth_firstname_field: 'given_name', oauth_lastname_field: 'family_name',
  oauth_auto_create: '1', oauth_update_existing: '1', oauth_match_by_email: '0',
  oauth_case_insensitive_login: '1', oauth_default_groups: '',
};

// Replaces the plugin settings with DEFAULTS + overrides. "<group:Name>" and
// "<cf:Name>" are resolved to ids on the server.
export function configure(overrides = {}) {
  const settings = { ...DEFAULTS, ...overrides };
  return rails(`
    s = JSON.parse(${JSON.stringify(JSON.stringify(settings))})
    s.transform_values! { |v| v.to_s.gsub(/<group:([^>]+)>/) { Group.find_by!(lastname: $1).id.to_s } }
    s.keys.grep(/<cf:/).each { |k| s[k.sub(/<cf:([^>]+)>/) { UserCustomField.find_by!(name: $1).id.to_s }] = s.delete(k) }
    Setting.plugin_bless_this_redmine_sso = s
    puts Setting.plugin_bless_this_redmine_sso.size`);
}

// Clicks the SSO button on /login (or follows the SSO-only redirect from
// `start`), picks `who` at the provider and waits until the browser is back.
export async function ssoLogin(t, who, { start = '/login', button = true } = {}) {
  await t.page.goto(t.BASE + start);
  if (button) await t.page.click('#oauth-login-submit');
  await t.page.waitForURL(u => u.href.startsWith(IDP), { timeout: 15000 });
  await t.page.click(`#as-${who}`);
  await t.page.waitForURL(u => u.href.startsWith(t.BASE), { timeout: 15000 });
  await t.settle();
}

// The login shown in the account menu, or null when anonymous.
export async function loggedInAs(page) {
  const el = page.locator('#account .user-login, #loggedas a');
  return (await el.count()) ? (await el.first().textContent()).trim().replace(/^@/, '') : null;
}

export function check(t, ok, what) {
  if (!ok) t.problems.push(`expectation failed: ${what}`);
}

// Opens the account menu so a screenshot shows who is logged in (@login).
export async function showAccount(page) {
  const trigger = page.locator('#account .dropdown-trigger');
  if (await trigger.count()) await trigger.click();
}
