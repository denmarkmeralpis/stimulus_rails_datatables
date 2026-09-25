# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-09-25

### Added
- `resetPaging` global config option (`window.datatablesConfig` or `setDatatablesConfig`) to go back to the first page when filters change; defaults to `false`
- `reset_paging` option for the `datatable_for` helper, which overrides the global `resetPaging` value per datatable

## [0.6.0] - 2026-08-03

### Added
- Tom-Select support for remote filter selects via the `tomselect` option
- `multiple` option for remote filter selects, sending the selected values as array params (`filters[key][]=`)
- `set_values` remote option to preselect multiple values
- Summary label showing the number of selected items on Tom-Select multi-selects

### Changed
- The `location` filter's barangay select is now a Tom-Select multi-select
- The filter controller imports `tom-select`, so the host app must pin it in its importmap

## [0.5.1] - 2026-07-28

### Changed
- Updated system dependencies
- Bumped concurrent-ruby, erb, json, loofah, net-imap, parser, rails-html-sanitizer, and rubocop; updated Bundler version

## [0.5.0] - 2026-06-08

### Added
- Additional data handling for DataTables, with the JavaScript controller now dispatching additional-data events
- Updated README with usage details for the new additional data events

## [0.4.0] - 2026-06-05

### Added
- Custom header support in the DataTable helper
- Support for dependent location filters, with enhancements to the filter controller

## [0.3.1] - 2026-01-14

### Changed
- Updated the filter controller's local storage handling

## [0.3.0] - 2026-01-09

### Added
- `set_value` option for filters, allowing programmatic selection of filter values

## [0.2.3] - 2025-12-17

### Changed
- Enhanced DataTables configuration handling and updated installation instructions

## [0.2.2] - 2025-12-17

### Fixed
- Fixed initializer for ActionController loading in the Engine

## [0.2.1] - 2025-12-02

### Added
- `scrollX` and `stateSave` configuration options for datatables

## [0.2.0] - 2025-12-01

### Added
- `scroll_x` option support

## [0.1.3] - 2025-11-25

### Added
- `state_save` option to the `datatable_for` helper method

## [0.1.2] - 2025-11-11

### Changed
- Refactored DataTable initialization to use custom options and added a draw callback event
- Set a global DataTables default for `orderSequence`

## [0.1.1] - 2025-11-09

### Added
- Support for overriding DataTables configuration via a generated config file

## [0.1.0] - 2025-11-09

### Added
- Initial release
- DataTable helper for creating server-side DataTables
- Filter helper with advanced filtering capabilities
- Stimulus controllers for datatables and filters
- BaseDatatable class for easy backend integration
- Support for dependent filters and remote data loading
- LocalStorage state persistence for filters
- Bootstrap 5 theme support
- Bundled DataTables.net JavaScript libraries
