# frozen_string_literal: true

require 'ajax-datatables-rails'

module StimulusRailsDatatables
  class Engine < ::Rails::Engine
    isolate_namespace StimulusRailsDatatables

    config.autoload_paths << File.expand_path('../../app/helpers', __dir__)
    config.autoload_paths << File.expand_path('../../app/datatables', __dir__)

    initializer 'stimulus_rails_datatables.helpers' do
      ActiveSupport.on_load(:action_controller_base) do
        helper StimulusRailsDatatables::DatatableHelper
        helper StimulusRailsDatatables::FilterHelper
      end
    end

    initializer 'stimulus_rails_datatables.importmap', before: 'importmap' do |app|
      if app.config.respond_to?(:importmap)
        app.config.importmap.paths << root.join('config/importmap.rb')

        # Register the vendor JavaScript files
        app.config.importmap.cache_sweepers << root.join('vendor/assets/javascripts')
      end
    end

    initializer 'stimulus_rails_datatables.assets' do |app|
      # Add vendor assets to asset paths
      app.config.assets.paths << root.join('vendor/assets/javascripts') if app.config.respond_to?(:assets)

      # For propshaft
      if app.config.respond_to?(:assets) && app.config.assets.respond_to?(:paths)
        app.config.assets.paths << root.join('app/assets/javascripts')
        app.config.assets.paths << root.join('vendor/assets/javascripts')
      end
    end
  end
end
