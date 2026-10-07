# password

Run 2026-10-07T16:00:32.844Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](password-sso-user-my-account.png) | anonymous | `/my/account` | manager after an SSO login: My account without "Change password" (the password lives at the provider) |
| ![](password-sso-user-my-password-refused.png) | anonymous | `/my/account` | manager opens /my/password directly: refused with core's message, back on My account |
| ![](password-sso-user-lost-password-refused.png) | anonymous | `/account/lost_password` | Lost password for the SSO user's address: refused with core's message, no recovery mail sent |
| ![](password-password-user-reporter.png) | reporter | `/my/password` | reporter never signed in through SSO: "Change password" opens core's password form |
| ![](password-password-user-outsider.png) | outsider | `/my/password` | outsider never signed in through SSO: "Change password" opens core's password form |
| ![](password-password-user-lost-password.png) | anonymous | `/login` | Lost password for outsider (password login only): core sends the recovery mail as before |
| ![](password-admin-can-set-password.png) | anonymous | `/users/5/edit` | Admin (signed in through SSO, no password prompt) on the SSO user's account: the password fields are still there as a recovery path |
| ![](password-sso-off-block-lifted.png) | manager | `/my/account` | With OAuth SSO turned off, manager has "Change password" again |
