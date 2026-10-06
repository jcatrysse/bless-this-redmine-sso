# frozen_string_literal: true

require_relative '../rails_helper'

if defined?(Setting) && defined?(ActiveRecord::Base)
  # The settings page, the rake task and the README tell a locked-out admin to
  # run this SQL. Redmine stores plugin settings as YAML, so the statement must
  # match YAML (the former JSON pattern never matched), on PostgreSQL and MySQL.
  RSpec.describe 'SSO-only recovery SQL' do
    after { Setting.plugin_bless_this_redmine_sso = { 'oauth_enabled' => '1', 'oauth_sso_only' => '0' } }

    it 'turns SSO-only mode off' do
      Setting.plugin_bless_this_redmine_sso = { 'oauth_enabled' => '1', 'oauth_sso_only' => '1', 'oauth_provider_name' => 'X' }
      sql = I18n.t(:warning_sso_only_db_command, scope: :bless_this_redmine_sso, locale: :en)

      ActiveRecord::Base.connection.execute(sql)
      Setting.clear_cache

      settings = Setting.plugin_bless_this_redmine_sso
      expect(settings['oauth_sso_only']).to eq('0')
      expect(settings['oauth_enabled']).to eq('1')
      expect(settings['oauth_provider_name']).to eq('X')
    end

    it 'is the same statement in every shipped locale' do
      # raise: true so a locale missing the key cannot pass through the English fallback
      statements = %w[en nl de fr es it pt].map do |l|
        I18n.t(:warning_sso_only_db_command, scope: :bless_this_redmine_sso, locale: l, raise: true, fallback: false)
      end
      expect(statements.uniq.size).to eq(1)
    end
  end
end
