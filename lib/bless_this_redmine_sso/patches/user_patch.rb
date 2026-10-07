module BlessThisRedmineSso
  module Patches
    # A user who signs in through SSO keeps their password at the provider, so
    # Redmine offers no local password management for them: no "Change
    # password", no /my/password, no lost-password mail (Jan, 2026-10-07).
    # Core uses the same switch for LDAP users. The mark lives in the user's
    # preferences: no custom field, no schema change. Admins can still set a
    # password in Administration > Users, and turning SSO off lifts the block.
    module UserPatch
      SSO_USER_PREF = :bless_this_sso_user

      def change_password_allowed?
        return false if bless_this_sso_user?

        super
      end

      def bless_this_sso_user?
        settings = Setting.plugin_bless_this_redmine_sso || {}
        return false unless %w[1 true].include?(settings['oauth_enabled'].to_s.downcase)

        preference.present? && preference[SSO_USER_PREF].to_s == '1'
      end

      def mark_as_bless_this_sso_user!
        return if pref[SSO_USER_PREF].to_s == '1'

        pref[SSO_USER_PREF] = '1'
        pref.save
      end
    end
  end
end

User.prepend(BlessThisRedmineSso::Patches::UserPatch) unless User < BlessThisRedmineSso::Patches::UserPatch
