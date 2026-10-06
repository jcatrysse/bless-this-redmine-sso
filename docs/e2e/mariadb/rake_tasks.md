# rake_tasks

Run 2026-10-06T19:53:34.590Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](rake_tasks-after-configure.png) | anonymous | `/login` | After `rake configure` with discovery: SSO is on, the button carries the configured provider name |
| ![](rake_tasks-after-enable-sso-only.png) | anonymous | `http://127.0.0.1:3999/authorize?client_id=redmine-e2e&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Foauth%2Fcallback&scope=openid+email+profile&response_type=code&state=eb9fd091da3f9dc1f8c6a2d28a1bd11e&code_challenge=UWX9VVzye0fHFzo9pCiCKt1a60Z1odz6CT6s292Mz4k&code_challenge_method=S256` | After `rake enable_sso_only`: /login goes straight to the provider |
| ![](rake_tasks-after-disable-sso-only.png) | anonymous | `/login` | After `rake disable_sso_only`: the password form is back next to the SSO button |
| ![](rake_tasks-after-disable.png) | anonymous | `/login` | After `rake disable`: no SSO button |
