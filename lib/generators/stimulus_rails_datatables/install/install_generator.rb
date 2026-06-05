# frozen_string_literal: true

module StimulusRailsDatatables
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path('templates', __dir__)

      desc 'Creates StimulusRailsDatatables initializer for your application'

      def copy_config
        template 'datatables_config.js', 'app/javascript/datatables_config.js'
      end

      def show_readme
        readme 'README' if behavior == :invoke
      end

      private

      def readme(_filename)
        say ''
        say '=' * 80
        say 'StimulusRailsDatatables has been installed!'
        say '=' * 80
        say ''
        say 'To use StimulusRailsDatatables in your application:'
        say ''
        say '1. Make sure you have @hotwired/stimulus installed'
        say '2. Register the controllers in your app/javascript/controllers/index.js:'
        say ''
        say "   import DatatableController from 'stimulus_rails_datatables/datatables_controller'"
        say "   import FilterController from 'stimulus_rails_datatables/filter_controller'"
        say "   import { AppDataTable } from 'stimulus_rails_datatables/app_datatable'"
        say ''
        say "   application.register('datatable', DatatableController)"
        say "   application.register('filter', FilterController)"
        say '   window.AppDataTable = AppDataTable'
        say ''
        say '3. Import app/javascript/datatables_config.js in your application.js:'
        say ''
        say "   import './datatables_config'"
        say ''
        say '4. Customize app/javascript/datatables_config.js to override default settings'
        say '5. Create your datatable classes inheriting from StimulusRailsDatatables::BaseDatatable'
        say '6. Use the datatable_for and filter_for helpers in your views'
        say ''
        say 'To override the default configuration, edit app/javascript/datatables_config.js and the ff:'
        say '1. pin it in config/importmap.rb if using importmap:'
        say "   pin 'datatables_config', to: 'datatables_config.js'"
        say '2. import and set the config in app/javascript/application.js:'
        say "   import 'datatables_config'"
        say ''
        say 'For more information, see: https://github.com/denmarkmeralpis/stimulus_rails_datatables'
        say '=' * 80
        say ''
      end
    end
  end
end
