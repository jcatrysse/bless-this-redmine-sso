# rake_tasks

Run 2026-10-06T19:45:32.660Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](rake_tasks-after-configure.png) | anonymous | `/login` | After `rake configure` with discovery: SSO is on, the button carries the configured provider name |
| ![](rake_tasks-after-enable-sso-only.png) | anonymous | `http://127.0.0.1:3999/authorize?client_id=redmine-e2e&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Foauth%2Fcallback&scope=openid+email+profile&response_type=code&state=ac65b3939994da37cf99469030151ee7&code_challenge=i0yjSKpvhZsD_hf-FM9OZOFdd-OqBeUiXoFnut36KX8&code_challenge_method=S256` | After `rake enable_sso_only`: /login goes straight to the provider |
| ![](rake_tasks-after-disable-sso-only.png) | anonymous | `/login` | After `rake disable_sso_only`: the password form is back next to the SSO button |
| ![](rake_tasks-after-disable.png) | anonymous | `/login` | After `rake disable`: no SSO button |
