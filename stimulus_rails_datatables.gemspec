# frozen_string_literal: true

require_relative 'lib/stimulus_rails_datatables/version'

Gem::Specification.new do |spec|
  spec.name        = 'stimulus_rails_datatables'
  spec.version     = StimulusRailsDatatables::VERSION
  spec.authors     = ['Den Meralpis']
  spec.email       = ['denmarkmeralpis@gmail.com']
  spec.homepage    = 'https://github.com/denmarkmeralpis/stimulus_rails_datatables'
  spec.summary     = 'Rails integration for DataTables with filters and remote data support'
  spec.description = 'A comprehensive Rails gem that provides DataTables integration with server-side processing, advanced filtering, and Stimulus controllers'
  spec.license     = 'MIT'
  spec.required_ruby_version = '>= 3.0'

  spec.metadata['homepage_uri'] = spec.homepage
  spec.metadata['source_code_uri'] = "#{spec.homepage}/tree/main"
  spec.metadata['changelog_uri'] = "#{spec.homepage}/blob/main/CHANGELOG.md"

  spec.files = Dir.chdir(File.expand_path(__dir__)) do
    Dir['{app,config,lib,vendor}/**/*', 'MIT-LICENSE', 'Rakefile', 'README.md', 'CHANGELOG.md']
  end

  spec.require_paths = ['lib']

  # Runtime dependencies
  spec.add_dependency 'ajax-datatables-rails', '~> 1.4'
  spec.add_dependency 'importmap-rails', '>= 2', '< 3'
  spec.add_dependency 'rails', '>= 7.0', '< 8.3'

  # Development dependencies
  spec.add_development_dependency 'rspec-rails', '~> 6.0'
  spec.add_development_dependency 'rubocop', '~> 1.0'
end
