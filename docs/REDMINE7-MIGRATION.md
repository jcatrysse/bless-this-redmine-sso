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
| Runs on Redmine 7 as is | DEELS |
| Upstream sync | NIET NODIG |
| After sync | n.v.t. |
| Complexity (1 trivial .. 5 rewrite) | 2 |
| Measured on | Redmine 7.0.1 (7.0-stable-GEOxyz + latest 7.0-stable), Rails 8.1.3.1, Ruby 3.3.6, PostgreSQL 16 and MariaDB 10.11 |
| Branch head when this file was written | `5222a63` |

## Already on this branch

- `52b359d` Move SSO entry point off /oauth/authorize, taken by core on Redmine 6.1+

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

## GEOxyz changes to review or re-apply

These GEOxyz commits are on the branch GEOxyz runs today and therefore on this branch. Review each one against the code it now sits on (upstream merges and Redmine 7 core): drop it if upstream or core now does the same, rewrite it if it is not up to the quality rules below (tests, I18n, security, portability), keep it otherwise. Record the verdict per commit in this file.

| commit | date | subject |
|---|---|---|
| `7c9cb89` | 2025-11-05 | Defect: resolve back_url not working |
| `2899662` | 2025-09-15 | Feature: exchange_code_for_token and get_user_info specs |
| `5639df4` | 2025-09-15 | Feature: Automatic OAuth setup |
| `f68286d` | 2025-09-15 | Feature: Add support for id_token handling |
| `d4e4cef` | 2025-09-15 | Feature: Implement PKCE support in OAuth flow |
| `440d3d5` | 2025-09-15 | Feature: Add timeouts and error handling for HTTP requests |
| `483c1d3` | 2025-09-15 | Patch: Update SSO button design and sso logout functionality |
| `57f8e1c` | 2025-09-14 | Feature: comprehensive update (see changelog) |

## After the upgrade (production)

Actions the person doing the upgrade must take, or know about, for this plugin:

- The login entry point moved from /oauth/authorize to /oauth/sso/authorize (core OAuth2 provider owns the old path). The IdP redirect URI /oauth/callback is unchanged; update bookmarks and docs.

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

