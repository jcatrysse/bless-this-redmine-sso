# frozen_string_literal: true

require_relative '../rails_helper'

if defined?(User) && defined?(Setting)
  # Jan, 2026-10-07: no local password management for users who sign in
  # through SSO; their password lives at the provider.
  RSpec.describe BlessThisRedmineSso::Patches::UserPatch do
    let(:user) do
      login = "sso_pw_#{SecureRandom.hex(4)}"
      u = User.new(login: login, firstname: 'Sso', lastname: 'User', mail: "#{login}@example.net")
      u.password = u.password_confirmation = 'Passw0rd!Passw0rd'
      u.save!
      u
    end

    before { Setting.plugin_bless_this_redmine_sso = { 'oauth_enabled' => '1' } }
    after { user.destroy }

    it 'is prepended to User, not aliased' do
      expect(User.ancestors.index(described_class)).to be < User.ancestors.index(User)
    end

    it 'leaves local password management to users who never signed in through SSO' do
      expect(user.change_password_allowed?).to be(true)
    end

    it 'blocks local password management once the user signed in through SSO' do
      user.mark_as_bless_this_sso_user!
      expect(User.find(user.id).change_password_allowed?).to be(false)
    end

    it 'keeps the mark in the user preferences, not in a custom field' do
      expect { user.mark_as_bless_this_sso_user! }.not_to change(CustomField, :count)
      expect(UserPreference.find_by(user_id: user.id)[:bless_this_sso_user]).to eq('1')
    end

    it 'lifts the block when SSO is turned off' do
      user.mark_as_bless_this_sso_user!
      Setting.plugin_bless_this_redmine_sso = { 'oauth_enabled' => '0' }
      expect(User.find(user.id).change_password_allowed?).to be(true)
    end

    it 'keeps the LDAP rule for users without the mark' do
      source = AuthSource.new(name: 'x')
      allow(source).to receive(:allow_password_changes?).and_return(false)
      user.auth_source = source
      expect(user.change_password_allowed?).to be(false)
    end
  end
end
