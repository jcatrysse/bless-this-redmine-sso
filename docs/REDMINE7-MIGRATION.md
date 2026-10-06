# Redmine 7 migration: bless-this-redmine-sso

Start a Claude Code (or Codex) session on this repository, branch `redmine70-migration`, with:

> Read CLAUDE.md and docs/REDMINE7-MIGRATION.md, then carry out the Redmine 7 migration of this
> plugin as described there, on branch redmine70-migration. That includes the plugin's tests on
> PostgreSQL and MariaDB, every function exercised end to end on a real running Redmine in a
> browser (with and without permissions, failure paths included) with screenshots you looked at,
> and an OpenAI review of the diff when OPENAI_API_KEY is set. Report to me in Dutch at the end.

This file is the plan and the memory of that work. Update it as you go: verdicts, results,
what is left. Written 2026-10-06 from a measured analysis (report at the bottom).

## Status

| | |
|---|---|
| Plugin id | `bless_this_redmine_sso` |
| GEOxyz runs today | `feature_version_2.0.0` |
| Upstream | murich/bless-this-redmine-sso master @ a5dc2eb (2025-10-08) |
| Runs on Redmine 7 as is | DEELS (before this branch); JA on this branch |
| Upstream sync | NIET NODIG |
| After sync | n.v.t. |
| Complexity (1 trivial .. 5 rewrite) | 2 |
| Measured on | Redmine 7.0.1 (7.0-stable-GEOxyz + latest 7.0-stable), Rails 8.1.3.1, Ruby 3.3.6, PostgreSQL 16 and MariaDB 10.11 |
| Branch head when this file was written | `5222a63` |
| Migration session | 2026-10-06, see "Results of the migration session" below |

## Already on this branch

- `52b359d` Move SSO entry point off /oauth/authorize, taken by core on Redmine 6.1+
- Migration session 2026-10-06 (one concern per commit, each with a test that fails without it):
  - `f732638` test_setup.sh: create the PostgreSQL role as root without sudo (tooling)
  - `d022b7a` Fix the flaky password generator spec (work list 4)
  - `2104c03` Honour case-sensitive login matching on MySQL/MariaDB (found on MariaDB)
  - `c1d14b2` Escape provider, token and validation text in callback flash messages (security)
  - `138fc01` Logout: POST only, and make prompt=login reach the provider
  - `ee8a7a7` Admin menu: show the user icon on Redmine 6+ (`2e0181d` spec order fix)
  - `42408e8` Settings page: render flags stored as '0' unchecked
  - `87dbf12` Fix the SSO-only recovery SQL: settings are YAML, not JSON
  - `d2fb45f` Discovery: report timeouts, TLS and URL errors instead of crashing
  - `26f38d4`, `607f24e`, `401c7e7` end-to-end scenarios with a fake OpenID provider, evidence for PostgreSQL and MariaDB

## Work list for the migration session

In this order: things that break, security, the GEOxyz changes, the open items, then the checks.

**Decided by Jan (2026-10-06), do not reopen**

- Sudo mode stays as Redmine 7 ships it (on), no change in the plugin or in configuration.yml. Only verify on a running Redmine that an admin who logs in through SSO can still confirm a sudo action, and write the result here.

**Open items from the analysis** (Dutch; where they conflict with a decision or a priority item above, those win)

1. Log in on staging with the real IdP incl. SSO-only and provider logout (real OAuth flow not exercisable here); redirect URI stays /oauth/callback
2. Update bookmarks/docs from /oauth/authorize to /oauth/sso/authorize
3. Decide on upstream features (block local password for SSO users); do not merge as-is: they log the client secret and auto-create a custom field
4. Fix flaky spec/password_generator_spec.rb:42 (expects !@#$%^&* only, generator uses all ASCII punctuation)

**Checks**

5. Run the plugin's whole test suite on Redmine 7.0-stable-GEOxyz with PostgreSQL AND MariaDB, and once on 5.1-stable if the branch is meant to stay 5.1-compatible.
6. Check Redmine 7 webhooks against this plugin (see "Rules"), and note the result here even if nothing is needed.
7. Verify every feature of the plugin by hand on a running Redmine 7 (screenshots).

**Work list status (2026-10-06)**

| # | item | status |
|---|---|---|
| sudo | Verify an SSO admin can confirm a sudo action | DONE, result: only with a known local Redmine password. See "Sudo mode and SSO" below and open question Q1. |
| 1 | Real IdP on staging | OPEN for ansif: needs Entra ID credentials. Everything else of the flow is now exercised end to end against a fake OpenID provider (`test/e2e/_fake_idp.mjs`): authorize, PKCE, token, RS256 id_token via JWKS, userinfo, provisioning, SSO-only, provider logout. |
| 2 | Bookmarks/docs to /oauth/sso/authorize | DONE in the repo (README, rake output, `52b359d`); GEOxyz bookmarks and intranet docs: production step below. |
| 3 | Upstream "block local password for SSO users" | NOT BUILT, open question Q3. Upstream code not merged (logs the client secret, creates a custom field at runtime). |
| 4 | Flaky password generator spec | DONE `d022b7a` (measured 73/2000 failures before). |
| 5 | Tests on R7 PostgreSQL + MariaDB, and 5.1 | DONE, numbers below. |
| 6 | Webhooks | NOTHING NEEDED: the plugin adds, hides or changes no issue data; it only touches login, logout and users. |
| 7 | Every feature in the browser | DONE, inventory below, 50 plugin screenshots per database, all looked at. |

**Test results (2026-10-06)**

| run | result |
|---|---|
| Baseline, before any change: R7.0-stable-GEOxyz (`8067e23`), PostgreSQL 16 | rspec 56 examples, 0 failures; e2e smoke 13 + core 6, 0 problems (`docs/e2e/baseline`) |
| Baseline, MariaDB 10.11 | rspec 56 examples, **1 failure** (case-sensitive login matching, fixed in `2104c03`) |
| R7.0-stable-GEOxyz, PostgreSQL 16, Ruby 3.3.6 | rspec 78 examples, 0 failures (76 before the review's two added specs) |
| R7.0-stable-GEOxyz, MariaDB 10.11 | rspec 78 examples, 0 failures |
| Redmine 5.1.13 (5.1-stable), PostgreSQL 16, Ruby 3.2.3 | rspec 76 examples, 0 failures, 1 pending (sprite icon check, Redmine 6+ only) |
| R7 with redmine_impersonate, redmine_ldap_sync, view_customize, redmine_user_specific_theme, redmine_stealth (all `redmine70-migration`) | rspec 76/0; e2e 8 runs, 69 screenshots, 0 problems |
| e2e R7 PostgreSQL, production mode (`docs/e2e`) | smoke 13, core 6, plugin scenarios 6 files / 50 screenshots, 0 problems |
| e2e R7 MariaDB, production mode (`docs/e2e/mariadb`) | same, 0 problems |
| e2e before: feature_version_2.0.0 on 5.1.13 (`docs/e2e/before`) | 67 screenshots; 11 failed expectations, all the behaviour fixed here |
| Migrations | none in this plugin |

**Review**

- Own adversarial review of the whole diff: no defect found (checked anonymous POST logout,
  the prompt whitelist, the STI scope of the case-sensitive lookup, YAML quoting of the
  recovery SQL on both databases).
- OpenAI review (gpt-5, diff since `feature_version_2.0.0`), three rounds, every finding has a
  `Resolution:` line in `docs/reviews/`:
  - `openai-2026-10-06-177e21f.md`: 4 findings; 1 fixed (locale spec fallback), 2 not
    reproducible and pinned by new specs (provider name escaping, error text without a flow),
    1 pre-existing and recorded (relative_url_root).
  - `openai-2026-10-06-7f91628.md`: 1 new finding fixed (SSO-only e2e now really POSTs a
    password), relative_url_root repeated.
  - `openai-2026-10-06-7c89cec.md`: 1 "blocker" that does not reproduce (Ruby local variable
    scoping, shown), relative_url_root repeated. Nothing new accepted: loop ended.

**Sudo mode and SSO (Jan's decision: sudo stays on, verify only)**

Measured on R7 (`docs/e2e/twofa_sudo-*.png`): a password login starts sudo mode
(core `AccountController#password_authentication` calls `update_sudo_timestamp!`), an SSO
login does not. So an admin who signs in through SSO is asked for the Redmine password
already when *opening* the plugin settings (core `require_sudo_mode :index, :edit, :plugin`),
and for every other sudo action (users, groups, roles, members, webhooks, 2FA). An admin whose
account has a known local password passes; an account created by SSO only has the random
password the plugin generated and cannot pass at all. Related: with "Bypass Redmine MFA" off
and 2FA required, core's 2FA activation is also behind sudo, so SSO-created users cannot
activate 2FA (`twofa_sudo-twofa-bypass-off.png`). No change made; see Q1.

## GEOxyz changes to review or re-apply

These GEOxyz commits are on the branch GEOxyz runs today and therefore on this branch. Review each one against the code it now sits on (upstream merges and Redmine 7 core): drop it if upstream or core now does the same, rewrite it if it is not up to the quality rules below (tests, I18n, security, portability), keep it otherwise. Record the verdict per commit in this file.

| commit | date | subject | verdict (2026-10-06) |
|---|---|---|---|
| `7c9cb89` | 2025-11-05 | Defect: resolve back_url not working | KEEP. Neither core nor upstream does this. back_url verified end to end (button and SSO-only). Fixed on top: case-sensitive matching was case-insensitive on MySQL/MariaDB (`2104c03`); the prompt=login flag it passes was always lost and never sent (`138fc01`). |
| `2899662` | 2025-09-15 | Feature: exchange_code_for_token and get_user_info specs | KEEP. Specs only, all green on R7 PG/MariaDB and 5.1. |
| `5639df4` | 2025-09-15 | Feature: Automatic OAuth setup | KEEP. Discovery verified in the browser and through `rake configure` against the fake provider. Fixed on top: timeouts/TLS/bad URL escaped as a 500 (`d2fb45f`). |
| `f68286d` | 2025-09-15 | Feature: Add support for id_token handling | KEEP. RS256 via JWKS verified end to end, a token signed with a foreign key is refused. Fixed on top: error text went unescaped into the flash (`c1d14b2`). |
| `d4e4cef` | 2025-09-15 | Feature: Implement PKCE support in OAuth flow | KEEP. The fake provider checks the S256 challenge against the verifier; verified end to end. |
| `440d3d5` | 2025-09-15 | Feature: Add timeouts and error handling for HTTP requests | KEEP. Discovery lacked the same handling, added in `d2fb45f`. |
| `483c1d3` | 2025-09-15 | Patch: Update SSO button design and sso logout functionality | KEEP. Button and the anonymous "SSO logout" link work in the Redmine 7 header (screenshots). |
| `57f8e1c` | 2025-09-14 | Feature: comprehensive update (see changelog) | KEEP, with fixes: flags stored as '0' rendered checked so saving re-enabled SSO-only (`42408e8`); the documented SQL recovery never matched (`87dbf12`); GET /logout logged SSO users out (`138fc01`); flash escaping (`c1d14b2`). Workflows are workflow_dispatch only. |

## Inventory of functions

Every function, how a user reaches it, the scenario that exercises it and its screenshots
(in `docs/e2e/`, the same names under `docs/e2e/mariadb/`). Users: plugin has no project
permissions; everything is admin-only or anonymous/login related.

| function | how a user reaches it | scenario | screenshots |
|---|---|---|---|
| Admin menu entry "BlessThis SSO" | Administration | settings.mjs | settings-admin-menu |
| Settings page (admin only; 403 for manager, reporter, outsider; login for anonymous) | Administration > BlessThis SSO | settings.mjs | settings-page, settings-refused-* |
| SSO-only lock-out warning | ticking SSO-only on the settings page | settings.mjs | settings-sso-only-warning |
| Mapping presets | settings page, Mapping preset | settings.mjs | settings-mapping-preset |
| OpenID discovery (POST /oauth/discover, admin only) | settings page, "Load settings from discovery" | settings.mjs | settings-discovery-success, settings-discovery-failure, settings-refused-* |
| Saving settings (sudo mode) | settings page, Apply | settings.mjs, twofa_sudo.mjs | settings-saved, settings-login-button-after-save, twofa_sudo-sudo-* |
| Login button, back_url | /login | sso_login.mjs, sso_only.mjs | sso_login-login-page, sso_only-disabled-no-button |
| Authorize redirect (state, PKCE, scope, prompt) and "not configured" | button, /oauth/sso/authorize | sso_login.mjs, sso_only.mjs | sso_login-provider-page, sso_only-not-configured, sso_only-disabled-authorize-refused |
| Callback: token, id_token RS256/JWKS, userinfo | provider redirect to /oauth/callback | sso_login.mjs | sso_login-new-user-back-url, sso_login-bad-signature-refused |
| Auto-create user, default groups, custom field mapping | first SSO login | sso_login.mjs | sso_login-new-user-*, sso_login-auto-create-off-refused |
| Update existing user on/off | SSO login of an existing user | sso_login.mjs | sso_login-existing-user-updated, sso_login-update-existing-off |
| Case-insensitive / case-sensitive login matching | SSO login | sso_login.mjs | sso_login-case-insensitive, sso_login-case-sensitive-refused |
| Match by email | SSO login | sso_login.mjs | sso_login-match-by-email |
| Refusals: locked user, invalid claims, provider error, forged state | SSO login | sso_login.mjs | sso_login-locked-refused, -invalid-claims-refused, -provider-error-escaped, -forged-state-refused |
| SSO-only mode (redirect, back_url, protected pages) | /login, any page needing login | sso_only.mjs | sso_only-sso-only-* |
| SSO-only recovery SQL | database, after a lock-out | sso_only.mjs (+ spec on both DBs) | sso_only-recovery-sql-* |
| Logout: provider logout URL, POST only, prompt=login after core logout | account menu > Sign out | logout.mjs | logout-* |
| "SSO logout" link for anonymous users | login page header | logout.mjs | logout-login-page-sso-logout-link |
| Bypass Redmine MFA on/off | SSO login with 2FA required | twofa_sudo.mjs | twofa_sudo-twofa-bypass-on, -off |
| Rake tasks (configure, status, test, enable/disable, SSO-only, flags, help, reset) | `rake redmine:bless_this_sso:*` | rake_tasks.mjs | rake_tasks-after-*, rake_tasks-output.txt |
| validate_flow rake task | `rake redmine:bless_this_sso:validate_flow` | not run: interactive, needs a code from a real provider login | - |
| Stylesheet (login button) | every page head | smoke + all | no missing assets in any run |
| Webhooks | - | n/a | plugin does not touch issue data |

## Findings not fixed (written down, not in scope)

- Hard-coded `/oauth/...` paths ignore `relative_url_root` (hooks, login patch). Pre-existing; GEOxyz runs at the root.
- `OAuth user info: ...` is logged at info level with names and e-mail (PII, no secrets). Pre-existing.
- No OIDC `nonce` is sent or checked; state + PKCE protect the flow. Would be a new feature.
- Settings hints (`<em>`) wrap beside the wide inputs instead of under them; identical on 5.1 (core `em.info` would fix it). Cosmetic.
- SSO users still see "Change password" in My account (upstream feature, Q3).

## Open questions for Jan

Built as recommended below, nothing waiting; each can be changed later.

- **Q1 Sudo mode for SSO admins.** Today (R7, decision "sudo stays on"): SSO admins need a known local password for every admin page behind sudo, SSO-created admins cannot use them at all, and with MFA bypass off SSO users cannot activate 2FA. Options: (a) keep as is, give every admin a local password (current, no code); (b) let the plugin start sudo mode at a successful SSO login, like a password login does (one line, `update_sudo_timestamp!` in the callback; the IdP login counts as re-authentication for 15 minutes); (c) turn sudo off in configuration.yml. Recommendation: (b) if admins use SSO-only accounts, else (a). Not built, because the decision of 2026-10-06 says no change in the plugin.
- **Q2 prompt=login after sign out.** Built (`138fc01`): after a Redmine sign out without a provider logout URL, the next SSO login sends `prompt=login`, so Entra ID asks which account / credentials instead of logging straight back in. This was the intent of 7c9cb89 but never worked. Option: drop it if users find the extra prompt annoying. Recommendation: keep; in SSO-only mode sign out is otherwise impossible.
- **Q3 Block local password for SSO users** (upstream feature). Not built. Options: (a) leave; (b) build within the 2.0.0 design (no runtime custom field, no secret logging). Recommendation: (a) for the migration; (b) as a separate change if wanted, it interacts with Q1 (sudo needs a password).

## After the upgrade (production)

Actions the person doing the upgrade must take, or know about, for this plugin:

- The login entry point moved from /oauth/authorize to /oauth/sso/authorize (core OAuth2 provider owns the old path). The IdP redirect URI /oauth/callback is unchanged; update bookmarks and docs.
- No migrations, no new settings, no data fix.
- Admins who sign in through SSO need their Redmine password for sudo actions (Redmine 7 sudo mode, on). Make sure every admin account has a local password it knows, or decide Q1 first.
- If SSO-only was ever turned off with the old SQL from the settings page: that statement never matched; check `rake redmine:bless_this_sso:status`. Use the corrected statement (settings page, README) or `rake redmine:bless_this_sso:disable_sso_only`.
- Behaviour changes users may notice: after "Sign out" (without a provider logout URL) the next SSO login asks the provider for credentials (prompt=login); a GET on /logout no longer signs SSO users out (core confirmation form instead).
- Stage with the real IdP before production (work list 1): login, SSO-only, sign out with and without the logout URL.

## How to test

```sh
./.codex/redmine_clone.sh 7.0-stable-GEOxyz      # or 5.1-stable / 6.1-stable / 7.0-stable
./.codex/test_setup.sh                                 # RMP_DB=mariadb for MariaDB, RMP_PROVISION_DB=0 if a server runs
./.codex/test_plugin.sh                                # minitest + rspec of this plugin
```

```sh
./.codex/start_server.sh       # real Redmine (production mode) with this plugin, seeded users and projects
./.codex/e2e.sh                # browser: smoke over the plugin's pages, core issue flows, test/e2e/*.mjs
./.codex/openai_review.sh      # independent OpenAI review of the diff, only when OPENAI_API_KEY is set
```
Write one scenario per function in `test/e2e/<function>.mjs` (example at the top of
`.codex/e2e/lib.mjs`); screenshots and a table per scenario land in `docs/e2e/`. Users:
`admin`, `manager` (every permission), `reporter` (no plugin permissions), `outsider` (no
membership); password `Redmine7Test!`. Needs Node with Playwright and Chromium
(`npm install -g playwright && npx playwright install --with-deps chromium`).

On GitHub the same runs by hand only: Actions > "Redmine tests (manual)" > Run workflow (tick
"e2e" for the browser run; screenshots come back as an artifact).

The coordinator's harness (`plugin-check.sh` in the migration kit, kept outside this repo) adds a
browser smoke test of every page the plugin adds and runs all GEOxyz plugins together; the
results quoted in the analysis come from it.

## How the migration session works (same for every plugin)

1. **Start**: `git fetch && git checkout redmine70-migration && git pull`. Read this whole file,
   including the analysis report at the bottom. Do not reopen decisions recorded here.
2. **Baseline, before you change anything**:
   - the plugin's tests on Redmine 7.0-stable-GEOxyz with PostgreSQL and with MariaDB;
   - a real running Redmine with this plugin (`./.codex/start_server.sh`) and the browser run
     (`./.codex/e2e.sh`: smoke over every page the plugin adds, plus the core issue flows).
   Write the numbers here. Something already broken now is a finding, not your regression.
3. **Inventory of functions**: list every function of the plugin in this file, in a table
   "function | how a user reaches it | scenario | screenshot". Take them from the README,
   `init.rb` (permissions, menus, settings, project modules), routes, hooks and view
   overrides, macros, mail handling, API endpoints, rake tasks and cron jobs. This table is the
   coverage list for step 8; a function that is not in it will not be tested.
4. **GEOxyz changes**: go through the table above, one item at a time. Each kept or re-made change
   is its own commit with a test that proves it. Record the verdict in the table.
5. **Work list**: then the numbered list, in order. One concern per commit.
6. **Portability**: everything must run on Redmine's supported databases (PostgreSQL,
   MySQL/MariaDB; SQLite where the plugin already supports it). Migrations must be reversible and
   are run down and up on PostgreSQL and MariaDB.
7. **Together**: run with the other GEOxyz plugins installed (the migration kit's harness, or
   `RMP_EXTRA_PLUGINS`). A failure that only appears in combination is a finding to record here.
8. **End to end, visually, every function**: on the real Redmine from `start_server.sh`
   (production mode, the way GEOxyz runs it), write one scenario per function in
   `test/e2e/<function>.mjs` with `.codex/e2e/lib.mjs` and run them with `./.codex/e2e.sh`.
   - Each function as the users that matter: `admin`, `manager` (every permission, the
     plugin's included), `reporter` (member without the plugin's permissions), `outsider`
     (no membership, private project must stay invisible).
   - The failure paths too: setting off, permission absent, empty state, invalid input, the
     value that used to raise. A refusal that is shown is evidence as much as a success.
   - One screenshot per function and per path, with a caption saying what it proves. Open
     every screenshot and look at it: a picture nobody looked at proves nothing. Commit them
     in `docs/e2e/` and list them in the inventory table.
   - Functions without a page (mail in and out, REST API, rake tasks, cron, webhooks): exercise
     them against the same running instance (mails land in `redmine/tmp/mails`, `t.mails()`
     reads them; API through `t.page.request`) and record command and result.
   - Before pictures where behaviour or layout changes: the branch GEOxyz runs today, on
     Redmine 5.1, same scenarios, `RMP_E2E_OUT=docs/e2e/before`.
   - Run the whole e2e set once on MariaDB as well (`RMP_DB=mariadb`, then `start_server.sh --reset`).
9. **Independent review**: first your own, adversarial: re-read the whole diff as if someone
   else wrote it and you are paid to reject it. Then, **when `OPENAI_API_KEY` is set in the
   session**, `./.codex/openai_review.sh`: it sends the diff of this branch to an OpenAI model
   and writes `docs/reviews/openai-<date>-<sha>.md`. Every finding gets a `Resolution:` line
   there (fixed in <commit>, with a test, or why not). Fix, re-run the tests and the e2e set,
   and run the review again until it has nothing new that you accept. Without the key: write
   "OpenAI review: skipped, no OPENAI_API_KEY" in the report; never send code anywhere else.
10. **After the upgrade**: anything the production upgrade must do for this plugin (data fixes,
    settings, cron, files, removed features) goes into the section "After the upgrade".
11. **Finish**: update "Status", the inventory and the work list in this file, push
    `redmine70-migration`, and report: what changed, test numbers on both databases, e2e
    numbers (scenarios, screenshots, problems), the review result, what is left, what needs Jan.

### Stop and ask Jan when
- a GEOxyz change would be lost or behave differently for users;
- a new gem, a new setting with user impact, or a schema change not required by Redmine 7 seems needed;
- the change would send data to an external service (the OpenAI review of the code diff is the
  one exception Jan approved, and only when the key is present);
- upstream and GEOxyz disagree on behaviour and both are defensible.

## Rules

- **Target**: Redmine 7.0-stable-GEOxyz (https://github.com/jcatrysse/redmine), Rails 8.1, Ruby 3.3+.
  Core sources for comparison: branches `5.1-stable`, `6.1-stable`, `7.0-stable`, `7.0-stable-GEOxyz`.
- **Evidence**: never report a test, lint, browser check or review as passed without having seen
  it. Quote the summary lines; list the screenshots. "Should work" is not a result, and a green
  test suite is not proof that a feature works in the browser.
- **Tests**: never skip, delete or weaken a test. A test that encodes Redmine 5 markup or
  behaviour is updated to Redmine 7, with the reason in the commit. Every fix gets a test that
  fails without it.
- **Minimal diffs** in the plugin's own style. No reformatting, no unrelated refactoring.
  Something wrong elsewhere: write it down here, do not fix it in passing.
- **Security**: authorization on every action and entry point; `safe_attributes`, never
  `to_unsafe_hash` into `update`; no SQL built from params; no secrets in logs; no `html_safe` on
  user input.
- **Webhooks (new in Redmine 7)**: core sends issue payloads (core `issues/show.api.rsb`, rendered
  as the webhook owner) to webhook endpoints, past plugin hooks and controller patches. If the
  plugin hides, adds or changes issue data, make webhooks consistent with that or record why not.
- **Redmine 7 conventions**: SVG icons through `sprite_icon` (the `icon icon-*` CSS is gone),
  Propshaft assets under `assets/` (`/assets/plugin_assets/<id>/...`), the new header and user menu,
  `ContextMenus::*Controller`, Loofah-based text formatting, Chart.js as an ES module, sudo mode
  (on by default: `t.sudo()` in a scenario). The breaker list is in the migration kit's CHECKLIST.md.
- **Locales**: keep the locales the plugin ships in sync; translate a new key by matching the
  closest existing key in the same file, not from scratch; do not add new languages.
- **5.1 compatibility**: prefer fixes that also run on Redmine 5.1 so they can be merged early;
  say so when a fix cannot.
- **Git**: work on `redmine70-migration` only; never push to the default branch; never force-push
  a branch someone else uses. Descriptive commit messages (what and why). Push after every
  commit, together with the updated status in this file: a cloud session can stop at a usage
  limit, and work that is not pushed is lost with its container.
- **GitHub Actions**: manual only (`workflow_dispatch`). Do not add push, pull_request or schedule
  triggers.

## Definition of done

- All items of the work list are done or explicitly deferred with a reason, in this file.
- The plugin's tests are green on Redmine 7.0-stable-GEOxyz with PostgreSQL and MariaDB
  (numbers in this file); boot, production-like eager load, migrations up/down OK.
- Every function in the inventory exercised end to end on a real running Redmine, with and
  without permissions and on its failure paths; `./.codex/e2e.sh` green; screenshots looked at,
  committed in `docs/e2e/` and listed.
- Review done: your own, and the OpenAI review when the key is present, every finding resolved
  in `docs/reviews/`.
- No new failure when run together with the other GEOxyz plugins.
- "After the upgrade" lists every action production needs; "Status" is current.


## Analysis report (2026-10-06, Dutch)

# bless-this-redmine-sso
- Gebruikte branch: feature_version_2.0.0 @ 7c9cb89 (2025-11-05) - plugin id bless_this_redmine_sso, versie 2.0.0
- Upstream: murich/bless-this-redmine-sso - upstream HEAD master @ a5dc2eb (2025-10-08), enige branch
- Fork t.o.v. upstream: feature_version_2.0.0 heeft 8 eigen commits (GEOxyz-herwerking 2.0.0: PKCE, id_token/JWKS, discovery, mapping, provisioning, i18n, 56 specs); 4 upstream-commits ontbreken (2de1218, e789c8c, 8c46d05, a5dc2eb). Fork-master (54fb053) = upstream a5dc2eb + GitHub Actions, maar mist het 2.0.0-werk.
- Andere relevante branches: geen andere, upstream heeft geen Redmine 6/7-branch.
- Gemfile: `jwt`, `rspec-rails` (dev/test). Geen migraties. Tests: 56 rspec-voorbeelden.

## Is de plugin overbodig in Redmine 7?   NEE
Nagekeken in /home/user/wt/r70 (7.0.1): core kent alleen lokale wachtwoorden, LDAP (`AuthSourceLdap` is de enige `AuthSource`-subklasse) en 2FA. Geen omniauth/OIDC/SAML-gem, geen "login met provider", geen OAuth-client. OpenID-login is in 5.0 geschrapt (#35755). Wat 6.1 toevoegde (#24808, Doorkeeper) is een OAuth2-*provider*: externe apps vragen een token aan na login *in* Redmine, en dat token telt alleen voor de REST API (`ApplicationController#find_current_user`, enkel als REST aan staat en `accept_api_auth?`). Dat is geen SSO-login. De plugin blijft nodig.

## 1. Werkt out of the box op Redmine 7?   DEELS
- Harness (results/1006-092818-...): OK boot 2.0.0, eager load, migraties, smoke 62/62 (2 plugin-routes); rspec 56 voorbeelden, 1 failure = flaky spec (zie 4). Eerdere handmatige run op dezelfde ref: 56/0.
- Maar SSO-login werkt niet: core tekent Doorkeeper-routes vóór plugin-routes, inclusief `GET /oauth/authorize` (routes.txt regel 3 vs plugin regel 443). Live bewezen: de knop "Login with FakeIdP" (form action `/oauth/authorize`) komt bij `Doorkeeper::AuthorizationsController#new` uit -> 302 terug naar `/login`. In SSO-only-modus wordt dat een lus /login <-> /oauth/authorize. De smoke-test ziet dit niet (geen 500) en de controller-specs omzeilen routing.

## 2. Upstream sync?   NIET NODIG
- De 4 upstream-commits zijn features, geen Redmine 6/7-compat: profielvelden read-only voor OAuth-users (JS in `<head>`), `/my/password` blokkeren voor OAuth-users (MyControllerPatch), flashberichten. Ze maken bij runtime een UserCustomField "OAuth User" aan, gebruiken een 5-minutenheuristiek om OAuth-users te herkennen, en de MyControllerPatch logt `Setting.plugin_bless_this_redmine_sso.inspect` op info-niveau = client secret in het productielog.
- Trial-merge van a5dc2eb in feature_version_2.0.0: 3 conflicten (app/controllers/oauth_controller.rb, init.rb, lib/bless_this_redmine_sso/hooks.rb) tegen de 2.0.0-herwerking. Afgebroken, scratch-branch verwijderd.
- Advies: als "geen lokaal wachtwoord voor SSO-users" gewenst is, binnen het 2.0.0-ontwerp opnieuw bouwen (zonder secret-logging), niet mergen.

## 3. Werkt na sync op Redmine 7?   n.v.t.

## 4. Complexiteit en blokkers   score 2
- Blokkers:
  - config/routes.rb:2 + lib/bless_this_redmine_sso/hooks.rb:25 + patches/account_controller_patch.rb:28 - `/oauth/authorize` botst met core Doorkeeper (Redmine 6.1+) - ingangspunt verplaatst naar `/oauth/sso/authorize` - gefixt in 52b359d. `/oauth/callback` (geregistreerd bij de IdP) en `/oauth/discover` botsen niet en blijven; bij de IdP verandert niets. Specs (2 verwachte paden), rake-uitvoer en README volgen het nieuwe pad. Live geverifieerd: knop -> `OauthController#authorize` -> 302 naar de IdP met client_id/redirect_uri/scope/state; back_url wordt doorgegeven; SSO-only: /login -> /oauth/sso/authorize -> IdP; callback met valse state -> /login; core `/oauth/authorize` blijft van Doorkeeper.
- Stille breuken:
  - spec/password_generator_spec.rb:42 is flaky (pre-existing, niet R7): de generator kiest uit alle ASCII-leestekens (core `PASSWORD_CHAR_CLASSES['special_chars']`, gelijk in 5.1 en 7.0), de spec aanvaardt enkel `!@#$%^&*`. Bevinding, niet aangepast.
  - Admin-menu `icon icon-user` toont in 7.0 geen icoon (cosmetisch).
  - Het SSO-logout-script op de loginpagina zoekt `#top-menu #account ul`: voor anonieme gebruikers bestaat dat nog in 7.0 (gecontroleerd, link wordt toegevoegd).
  - Hardgecodeerde `/oauth/...`-paden negeren `relative_url_root` (pre-existing).
- Niet uitgeoefend: echte OAuth-flow (token-uitwisseling, userinfo, id_token/JWKS, aanmaak/bijwerken van users, provider-logout) - vraagt echte IdP en credentials.
- Overlap met Redmine 7 core: geen (zie boven); wel padconflict met de OAuth2-provider, opgelost.
- Open werk voor ansif:
  - Op staging met de echte IdP (Entra ID) inloggen, incl. SSO-only en logout; redirect URI blijft `/oauth/callback`.
  - Bladwijzers/documentatie die naar `/oauth/authorize` wijzen aanpassen naar `/oauth/sso/authorize`.
  - Beslissen of de upstream-features (wachtwoordbeheer blokkeren voor SSO-users) gewenst zijn; zo ja zelf bouwen.
  - Flaky spec rechtzetten (verwachting afstemmen op core-tekenklasse).

## Branch redmine70-migration
- Basis: origin/feature_version_2.0.0 @ 7c9cb89
- Commits: 52b359d Move SSO entry point off /oauth/authorize, taken by core on Redmine 6.1+
- Eindresultaat harness (results/1006-092634-s3-bless-this-redmine-sso_redmine70-migration, na harness-fix): OK bundle, OK boot 2.0.0, OK eager load, OK migraties dev+test, OK rspec 56 examples, 0 failures, OK smoke 62/62 (2 plugin-routes). Handmatige rspec-herhaling: 56/0.
- Rollback migraties: n.v.t. (geen migraties)

