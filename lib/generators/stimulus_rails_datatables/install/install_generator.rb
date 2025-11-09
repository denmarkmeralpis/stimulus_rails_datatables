# frozen_string_literal: true

module StimulusRailsDatatables
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path('templates', __dir__)

      desc 'Creates StimulusRailsDatatables initializer for your application'

      def copy_initializer
        template 'stimulus_rails_datatables.rb', 'config/initializers/stimulus_rails_datatables.rb'
      end

      def copy_config
        template 'datatables_config.js', 'app/javascript/datatables_config.js'
      end

      def show_readme
        readme 'README' if behavior == :invoke
      end

      private

      def readme(filename)
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
        say "   window.AppDataTable = AppDataTable"
        say ''
        say '3. Customize app/javascript/datatables_config.js to override default settings'
        say '4. Create your datatable classes inheriting from StimulusRailsDatatables::BaseDatatable'
        say '5. Use the datatable_for and filter_for helpers in your views'
        say ''
        say 'For more information, see: https://github.com/denmarkmeralpis/stimulus_rails_datatables'
        say '=' * 80
        say ''
      end
    end
  end
end
