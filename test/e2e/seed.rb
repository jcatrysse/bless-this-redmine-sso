# Plugin data for the end-to-end scenarios, run by start_server.sh after the
# generic seed. Idempotent. The plugin settings themselves are set per scenario
# (test/e2e/_sso.mjs), pointing at the fake provider in _fake_idp.mjs.

group = Group.find_by(lastname: 'SSO staff') || Group.create!(lastname: 'SSO staff')

UserCustomField.find_by(name: 'Employee ID') ||
  UserCustomField.create!(name: 'Employee ID', field_format: 'string', visible: true, editable: true)

locked = User.find_by(login: 'sso.locked') ||
         User.new(login: 'sso.locked', firstname: 'Locked', lastname: 'User', mail: 'sso.locked@example.net')
locked.password = locked.password_confirmation = SecureRandom.hex(16) + 'Aa1!'
locked.status = User::STATUS_LOCKED
locked.save!(validate: false)

puts "SSO seed: group #{group.id}, locked user #{locked.id}"
