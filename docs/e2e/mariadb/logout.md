# logout

Run 2026-10-06T19:50:50.638Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](logout-get-logout-form.png) | anonymous | `/logout` | GET /logout shows core's confirmation form; the SSO user stays logged in |
| ![](logout-account-menu.png) | anonymous | `/my/page` | Account menu of the SSO user with "Sign out" |
| ![](logout-provider-logout.png) | anonymous | `http://127.0.0.1:3999/logout` | Sign out: Redmine session ended and the browser is at the provider's logout URL |
| ![](logout-login-page-sso-logout-link.png) | anonymous | `/login` | Login page: the plugin adds an "SSO logout" link (outlined) to the anonymous account menu |
| ![](logout-core-logout.png) | anonymous | `/` | No logout URL: core sign out, back on the home page as anonymous |
| ![](logout-prompt-login.png) | anonymous | `http://127.0.0.1:3999/authorize?client_id=redmine-e2e&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Foauth%2Fcallback&scope=openid+email+profile&response_type=code&state=a2a27562fc57cd5df9e25fb9af6d1750&prompt=login&code_challenge=xnesjRSjwwyRl8eEFNqFlMeWSk6Rxra2T9P9_zkJLXA&code_challenge_method=S256` | Next SSO login after a sign out: the provider receives prompt=login (outlined), so it asks for credentials |
