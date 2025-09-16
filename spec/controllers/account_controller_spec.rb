# frozen_string_literal: true

require_relative '../rails_helper'

if defined?(AccountController) && defined?(Setting)
  RSpec.describe AccountController, type: :controller do
    describe 'GET #logout' do
      let(:logout_url) { 'https://example.com/logout' }

      context 'when OAuth is enabled and logout URL is configured' do
        before do
          Setting.plugin_bless_this_redmine_sso = {
            'oauth_enabled' => '1',
            'oauth_logout_url' => logout_url
          }
        end

        context 'without oauth session flag' do
          it 'does not redirect to the SSO logout URL' do
            get :logout
            expect(response).not_to redirect_to(logout_url)
          end
        end

        context 'with oauth session flag' do
          before { session[:oauth_logged_in] = true }

          it 'redirects to the SSO logout URL' do
            get :logout
            expect(response).to redirect_to(logout_url)
          end
        end
      end

      context 'when OAuth is disabled' do
        before do
          Setting.plugin_bless_this_redmine_sso = {
            'oauth_enabled' => '0',
            'oauth_logout_url' => logout_url
          }
        end

        it 'does not redirect to the SSO logout URL' do
          get :logout
          expect(response).not_to redirect_to(logout_url)
        end
      end
    end

    describe 'GET #login' do
      before do
        Setting.plugin_bless_this_redmine_sso = {
          'oauth_enabled' => '1',
          'oauth_sso_only' => '1'
        }
      end

      it 'carries the back_url through the SSO redirect' do
        get :login, params: { back_url: 'https://example.com/issues/42' }

        uri = URI.parse(response.location)
        expect(uri.path).to eq('/oauth/authorize')
        params = Rack::Utils.parse_nested_query(uri.query)
        expect(params['back_url']).to eq('https://example.com/issues/42')
        expect(params).not_to have_key('prompt')
      end

      it 'includes the prompt parameter when required' do
        session[:oauth_prompt_login] = true

        get :login, params: { back_url: 'https://example.com/issues/42' }

        uri = URI.parse(response.location)
        expect(uri.path).to eq('/oauth/authorize')
        params = Rack::Utils.parse_nested_query(uri.query)
        expect(params['back_url']).to eq('https://example.com/issues/42')
        expect(params['prompt']).to eq('login')
      end
    end
  end
else
  RSpec.describe 'AccountController', type: :controller do
    it 'is skipped because AccountController is not defined' do
      skip 'AccountController not available. Run specs within a Redmine environment.'
    end
  end
end
