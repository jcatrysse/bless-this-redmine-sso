# frozen_string_literal: true

require_relative '../rails_helper'

if defined?(BlessThisRedmineSso::Hooks) && defined?(Setting)
  RSpec.describe BlessThisRedmineSso::Hooks do
    let(:hooks) { described_class.instance }

    before do
      Setting.plugin_bless_this_redmine_sso = {
        'oauth_enabled' => '1',
        'oauth_sso_only' => '0',
        'oauth_provider_name' => 'Example'
      }
    end

    describe '#view_account_login_top' do
      it 'adds a hidden back_url field when present' do
        request = double('request', params: { back_url: 'https://example.com/issues/7' })

        html = hooks.view_account_login_top(request: request)

        expect(html).to include('name="back_url"')
        expect(html).to include('https://example.com/issues/7')
      end

      it 'omits the hidden field when no back_url is provided' do
        request = double('request', params: {})

        html = hooks.view_account_login_top(request: request)

        expect(html).not_to include('name="back_url"')
      end
    end
  end
else
  RSpec.describe 'BlessThisRedmineSso::Hooks' do
    it 'is skipped because the Redmine environment is unavailable' do
      skip 'Hooks are only available within a Redmine environment.'
    end
  end
end
