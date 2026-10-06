# frozen_string_literal: true

require_relative '../rails_helper'

if defined?(Redmine::MenuManager)
  RSpec.describe 'BlessThis SSO admin menu item' do
    let(:item) { Redmine::MenuManager.items(:admin_menu).detect { |i| i.name == :bless_this_sso } }

    it 'is registered and points to the plugin settings' do
      expect(item).not_to be_nil
      expect(item.url).to eq(controller: 'settings', action: 'plugin', id: 'bless_this_redmine_sso')
    end

    # Redmine 6+ draws menu icons from the SVG sprite (MenuItem#icon); the
    # icon-* CSS classes no longer show anything. Redmine 5.1 has no #icon and
    # ignores the option, keeping the CSS class.
    it 'carries a sprite icon on Redmine 6 and later' do
      skip 'Redmine < 6 has no sprite icons' unless item.respond_to?(:icon)
      expect(item.icon).to eq('user')
    end
  end
end
