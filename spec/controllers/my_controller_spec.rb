# frozen_string_literal: true

require_relative '../rails_helper'

if defined?(MyController) && defined?(Setting)
  # Jan, 2026-10-07: SSO users cannot change a local password; core's own
  # refusal for users whose password is managed elsewhere applies.
  RSpec.describe MyController, type: :controller do
    render_views

    let(:user) do
      login = "sso_my_#{SecureRandom.hex(4)}"
      u = User.new(login: login, firstname: 'Sso', lastname: 'User', mail: "#{login}@example.net")
      u.password = u.password_confirmation = 'Passw0rd!Passw0rd'
      u.save!
      u
    end

    before do
      Redmine::SudoMode.disable!
      Setting.plugin_bless_this_redmine_sso = { 'oauth_enabled' => '1' }
      session[:user_id] = user.id
      session[:tk] = user.generate_session_token
    end

    after do
      Redmine::SudoMode.enable!
      user.destroy
    end

    it 'refuses /my/password for an SSO user' do
      user.mark_as_bless_this_sso_user!
      get :password
      expect(response).to redirect_to(my_account_path)
      expect(flash[:error]).to eq(I18n.t(:notice_can_t_change_password))
    end

    it 'does not change the password of an SSO user on POST' do
      user.mark_as_bless_this_sso_user!
      post :password, params: { password: 'Passw0rd!Passw0rd', new_password: 'N3w!Passw0rdxx', new_password_confirmation: 'N3w!Passw0rdxx' }
      expect(User.find(user.id).check_password?('Passw0rd!Passw0rd')).to be(true)
    end

    it 'hides "Change password" on My account for an SSO user' do
      user.mark_as_bless_this_sso_user!
      get :account
      expect(response.body).not_to include('/my/password')
    end

    it 'keeps "Change password" for a user who signs in with a password' do
      get :account
      expect(response.body).to include('/my/password')
    end
  end
end
