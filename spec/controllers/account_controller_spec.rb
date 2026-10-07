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
            post :logout
            expect(response).not_to redirect_to(logout_url)
          end

          # Jan, 2026-10-07: signing out ends the Redmine session only; the
          # next SSO login must not force the provider to ask again.
          it 'does not ask the provider for credentials on the next SSO login' do
            user = User.find_by(login: 'admin') || User.first
            session[:user_id] = user.id
            session[:tk] = user.generate_session_token
            post :logout
            expect(session[:user_id]).to be_nil
            expect(session[:oauth_prompt_login]).to be_nil
          end
        end

        # Core logs out on POST only; these used GET, which core answers with a
        # confirmation form since Redmine 3.x.
        context 'with oauth session flag' do
          before { session[:oauth_logged_in] = true }

          # Jan, 2026-10-07: sign out ends only the Redmine session, the
          # provider session stays (the login page has a separate SSO Logout
          # link). This used to redirect to the provider's logout URL.
          it 'ends only the Redmine session and does not go to the SSO logout URL' do
            user = User.find_by(login: 'admin') || User.first
            session[:user_id] = user.id
            session[:tk] = user.generate_session_token
            post :logout
            expect(response).not_to redirect_to(logout_url)
            expect(response).to redirect_to(home_url)
            expect(session[:user_id]).to be_nil
          end

          it 'does not log out or leave Redmine on GET' do
            user = User.find_by(login: 'admin') || User.first
            session[:user_id] = user.id
            session[:tk] = user.generate_session_token
            get :logout
            expect(response).not_to redirect_to(logout_url)
            expect(session[:oauth_logged_in]).to be(true)
            expect(session[:user_id]).to eq(user.id)
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
          post :logout
          expect(response).not_to redirect_to(logout_url)
          expect(session[:oauth_prompt_login]).to be_nil
        end
      end
    end

    # Jan, 2026-10-07: no lost-password mail for SSO users; core refuses it
    # for accounts whose password is managed elsewhere.
    describe 'POST #lost_password' do
      let(:user) do
        login = "sso_lost_#{SecureRandom.hex(4)}"
        u = User.new(login: login, firstname: 'Sso', lastname: 'Lost', mail: "#{login}@example.net")
        u.password = u.password_confirmation = 'Passw0rd!Passw0rd'
        u.save!
        u
      end

      before do
        Setting.plugin_bless_this_redmine_sso = { 'oauth_enabled' => '1' }
        allow(Setting).to receive(:lost_password?).and_return(true)
      end

      after { user.destroy }

      it 'sends no recovery token to an SSO user' do
        user.mark_as_bless_this_sso_user!
        expect { post :lost_password, params: { mail: user.mail } }.not_to change { Token.where(user_id: user.id, action: 'recovery').count }
        expect(flash[:error]).to eq(I18n.t(:notice_can_t_change_password))
      end

      it 'still sends one to a user who signs in with a password' do
        expect { post :lost_password, params: { mail: user.mail } }.to change { Token.where(user_id: user.id, action: 'recovery').count }.by(1)
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
        expect(uri.path).to eq('/oauth/sso/authorize')
        params = Rack::Utils.parse_nested_query(uri.query)
        expect(params['back_url']).to eq('https://example.com/issues/42')
        expect(params).not_to have_key('prompt')
      end

      # Jan, 2026-10-07: sign out ends the Redmine session only, so the
      # SSO-only redirect never asks the provider to prompt again (this
      # spec used to expect prompt=login after a logout).
      it 'does not add a prompt parameter, even with a flag left in the session' do
        session[:oauth_prompt_login] = true

        get :login, params: { back_url: 'https://example.com/issues/42' }

        uri = URI.parse(response.location)
        expect(uri.path).to eq('/oauth/sso/authorize')
        params = Rack::Utils.parse_nested_query(uri.query)
        expect(params['back_url']).to eq('https://example.com/issues/42')
        expect(params).not_to have_key('prompt')
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
