# frozen_string_literal: true

require_relative '../rails_helper'

if defined?(SettingsController) && defined?(Setting)
  RSpec.describe SettingsController, type: :controller do
    render_views

    let(:flags) do
      %w[oauth_enabled oauth_sso_only oauth_bypass_twofa oauth_pkce oauth_auto_create oauth_update_existing oauth_match_by_email]
    end

    before do
      Redmine::SudoMode.disable! if defined?(Redmine::SudoMode)
      admin = User.where(admin: true).first
      session[:user_id] = admin.id
      session[:tk] = admin.generate_session_token
    end

    after { Redmine::SudoMode.enable! if defined?(Redmine::SudoMode) }

    def checkbox(name)
      Nokogiri::HTML(response.body).at_css("input[type=checkbox][name='settings[#{name}]']")
    end

    # Rake tasks and the documented SQL recovery store '0'; check_box_tag
    # treats that string as checked, and saving the form then switched the
    # flag (SSO-only mode included) back on.
    it "renders flags stored as '0' unchecked" do
      Setting.plugin_bless_this_redmine_sso = flags.to_h { |f| [f, '0'] }
      get :plugin, params: { id: 'bless_this_redmine_sso' }
      expect(response).to have_http_status(:ok)
      flags.each { |f| expect(checkbox(f)['checked']).to be_nil, "#{f} should be unchecked" }
    end

    it "renders flags stored as '1' checked" do
      Setting.plugin_bless_this_redmine_sso = flags.to_h { |f| [f, '1'] }
      get :plugin, params: { id: 'bless_this_redmine_sso' }
      flags.each { |f| expect(checkbox(f)['checked']).not_to be_nil, "#{f} should be checked" }
    end

    it 'renders missing flags unchecked' do
      Setting.plugin_bless_this_redmine_sso = { 'oauth_provider_name' => 'X' }
      get :plugin, params: { id: 'bless_this_redmine_sso' }
      flags.each { |f| expect(checkbox(f)['checked']).to be_nil, "#{f} should be unchecked" }
    end
  end
end
