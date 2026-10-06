# frozen_string_literal: true

require_relative 'spec_helper'

# Minimal stubs only when the real classes are unavailable.
unless defined?(ApplicationController)
  class ApplicationController
    def self.skip_before_action(*); end
  end
end

unless defined?(Setting)
  class Setting
    PASSWORD_CHAR_CLASSES = { 'special_chars' => /[!@#\$%\^&*]/ }.freeze

    def self.password_required_char_classes
      ['special_chars']
    end
  end
else
  unless Setting.const_defined?(:PASSWORD_CHAR_CLASSES)
    Setting.const_set(:PASSWORD_CHAR_CLASSES, { 'special_chars' => /[!@#\$%\^&*]/ }.freeze)
  end
  unless Setting.respond_to?(:password_required_char_classes)
    def Setting.password_required_char_classes
      ['special_chars']
    end
  end
end

require_relative '../app/controllers/oauth_controller'

RSpec.describe OauthController do
  describe '#generate_random_password' do
    before do
      allow(Setting).to receive(:password_required_char_classes).and_return(['special_chars']) if defined?(Setting)
    end

    # The generator draws its specials from Setting::PASSWORD_CHAR_CLASSES (all
    # ASCII punctuation in Redmine 5.1 to 7.0), so the expectation uses the same
    # class; a fixed "!@#$%^&*" list failed about 1 run in 30.
    it 'includes at least one uppercase letter and one special character' do
      special = Setting::PASSWORD_CHAR_CLASSES['special_chars']
      200.times do
        password = OauthController.new.send(:generate_random_password)
        expect(password).to match(/[A-Z]/)
        expect(password).to match(special)
      end
    end
  end
end

