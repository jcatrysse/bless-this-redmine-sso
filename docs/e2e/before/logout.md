# logout

Run 2026-10-06T19:59:58.616Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](logout-get-logout-form.png) | anonymous | `http://127.0.0.1:3999/logout` | GET /logout shows core's confirmation form; the SSO user stays logged in |
| ![](logout-account-menu.png) | anonymous | `/login?back_url=http%3A%2F%2F127.0.0.1%3A3000%2Fmy%2Fpage` | Account menu of the SSO user with "Sign out" |
| ![](logout-provider-logout.png) | anonymous | `http://127.0.0.1:3999/logout` | Sign out: Redmine session ended and the browser is at the provider's logout URL |
| ![](logout-login-page-sso-logout-link.png) | anonymous | `/login` | Login page: the plugin adds an "SSO logout" link (outlined) to the anonymous account menu |
| ![](logout-core-logout.png) | anonymous | `/` | No logout URL: core sign out, back on the home page as anonymous |
| ![](logout-prompt-login.png) | anonymous | `http://127.0.0.1:3999/authorize?client_id=redmine-e2e&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Foauth%2Fcallback&scope=openid+email+profile&response_type=code&state=add1bddbffea624283699a5f4cea9933&code_challenge=_mTKlp-im4ec6sKSB965XQ8OBPLmiGByFlT7ojcDC60&code_challenge_method=S256` | Next SSO login after a sign out: the provider receives prompt=login (outlined), so it asks for credentials |

## Problems

- expectation failed: GET /logout keeps the session
- expectation failed: GET /logout does not go to the provider
- expectation failed: next SSO login sends prompt=login
