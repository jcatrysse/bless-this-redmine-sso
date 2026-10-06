# rake_tasks

Run 2026-10-06T20:02:06.113Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](rake_tasks-after-configure.png) | anonymous | `/login` | After `rake configure` with discovery: SSO is on, the button carries the configured provider name |
| ![](rake_tasks-after-enable-sso-only.png) | anonymous | `http://127.0.0.1:3999/authorize?client_id=redmine-e2e&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Foauth%2Fcallback&scope=openid+email+profile&response_type=code&state=dcc8f9cb2bf8b8f82182ef668d30240f&code_challenge=B0kJurQtMUrgY2iO93W8r7ISA-1l6Ow7VVQA-ol7O4o&code_challenge_method=S256` | After `rake enable_sso_only`: /login goes straight to the provider |
| ![](rake_tasks-after-disable-sso-only.png) | anonymous | `/login` | After `rake disable_sso_only`: the password form is back next to the SSO button |
| ![](rake_tasks-after-disable.png) | anonymous | `/login` | After `rake disable`: no SSO button |

## Problems

- expectation failed: status shows enabled and the new entry point
