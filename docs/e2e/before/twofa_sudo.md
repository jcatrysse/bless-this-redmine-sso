# twofa_sudo

Run 2026-10-06T20:05:45.276Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](twofa_sudo-twofa-bypass-on.png) | anonymous | `/projects` | 2FA required by core, "Bypass Redmine MFA" on: the SSO user works without 2FA activation |
| ![](twofa_sudo-twofa-bypass-off.png) | anonymous | `/my/twofa/totp/activate/confirm` | 2FA required, bypass off: after the SSO login core sends the user to 2FA activation |
| ![](twofa_sudo-sudo-form.png) | anonymous | `/settings/plugin/bless_this_redmine_sso` | Admin logged in through SSO opens the plugin settings: Redmine 7 first asks for the password (sudo mode) |
| ![](twofa_sudo-sudo-passed.png) | anonymous | `/settings/plugin/bless_this_redmine_sso` | With the account's Redmine password the sudo form passes and the settings are saved |

## Problems

- expectation failed: sudo form shown for the SSO admin when opening the settings
