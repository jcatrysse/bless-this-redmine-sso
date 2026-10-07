require 'rack/utils'

module BlessThisRedmineSso
  module Patches
    module AccountControllerPatch
      def self.included(base)
        base.class_eval do
          prepend InstanceMethods
        end
      end

      module InstanceMethods
        def login
          # Check if SSO-only mode is enabled
          settings = Setting.plugin_bless_this_redmine_sso
          if %w[1 true].include?(settings['oauth_enabled'].to_s.downcase) &&
             %w[1 true].include?(settings['oauth_sso_only'].to_s.downcase)
            # Redirect to OAuth authorization unless this is a callback
            unless request.path.include?('/oauth/')
              Rails.logger.info "SSO-only mode enabled, redirecting to OAuth provider"
              query_params = {}
              if (back_url = params[:back_url]).present?
                query_params[:back_url] = back_url
              end
              url = '/oauth/sso/authorize'
              if query_params.present?
                query_string = Rack::Utils.build_query(query_params)
                url = "#{url}?#{query_string}"
              end
              redirect_to url
              return
            end
          end
          
          # Call original login method
          super
        end

        # No logout override: signing out of Redmine ends only the Redmine
        # session (core, POST only). The provider session stays; the login
        # page offers a separate "SSO Logout" link to the provider's logout URL.
      end
    end
  end
end

# Apply the patch
unless AccountController.included_modules.include?(BlessThisRedmineSso::Patches::AccountControllerPatch)
  AccountController.send(:include, BlessThisRedmineSso::Patches::AccountControllerPatch)
end
