# Changelog

## 1.0.0 - 2025-06-26
- Original version by Blessthis.software  
  Copyright (c) 2025 Blessthis.software
- Licensed under the MIT License (see LICENSE file for details).

## 2.0.0 - 2025-09-13
- Adapted and extended by Jan Catrysse  
  Copyright (c) 2025 Jan Catrysse
- Licensed under the MIT License (see LICENSE file for details).
- **BETA RELEASE:** due to the extensive refactoring this version still needs further testing.
   Don't use in production.

### Security
- Reactivate Redmine's authenticity_token protection.
- Implement PKCE support in OAuth flow.
- Add support for `id_token` / JWKS handling.
- Add timeouts and error handling for HTTP requests.

### OAuth Flow
- OAuth endpoints accessible without prior Redmine login or when login is disabled (authorize/callback skip `check_if_login_required`).
- Full OAuth `validate_flow` rake task to inspect code → token → userinfo and resolved mappings.
- Provider logout support with redirect via configurable Logout URL.

### User & Provisioning
- Configurable user mapping (login/email/first/last), presets (generic/microsoft/google), and mapping to User Custom Fields.
- Provisioning options: toggles for auto-create and update-existing; default group assignment for new users.
- MFA bypass option for SSO logins.
- Configurable login-or-email vs. login-only matching.
- Email matching/updates now case-insensitive via `EmailAddress`.
- Case-insensitive login matching to align with mixed-case SSO usernames, configurable via the admin UI and rake tasks.

### Localization & UI
- Localized UI and flash messages; new locales (en, nl, fr, de, es, it, pt).
- Login screen redesign.

### Tooling
- Automatic OAuth setup.
- Expanded rake suite: `enable|disable`, `enable_bypass_twofa|disable_bypass_twofa`, `validate_flow`.
- Added RSpec tests and GitHub Actions workflows for Redmine 5.1 and 6.0.

### Fixes
- Consistent boolean parsing (`1/true`).
- Minor fixes, updates, and refactoring

## Unreleased - Redmine 7 migration
- SSO entry point moved from `/oauth/authorize` (taken by core's OAuth2 provider on Redmine 6.1+) to `/oauth/sso/authorize`; the callback stays `/oauth/callback`.
- Logout: the provider logout applies on POST only (core shows a confirmation form on GET); after a Redmine logout the next SSO login sends `prompt=login`.
- Escape provider, id_token and validation messages in flash messages.
- Settings page: flags stored as `0` are shown unchecked (saving no longer re-enables SSO-only).
- SSO-only recovery SQL matches the YAML that Redmine stores.
- Case-sensitive login matching works on MySQL/MariaDB.
- Discovery reports timeouts, TLS and URL errors instead of failing with a 500.
- Admin menu icon on Redmine 6+.
- End-to-end scenarios against a fake OpenID provider (`test/e2e`).
