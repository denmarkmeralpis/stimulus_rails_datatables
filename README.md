# StimulusRailsDatatables

A comprehensive Rails gem that provides DataTables integration with server-side processing, advanced filtering, and Stimulus controllers for modern Rails applications.

## Features

- **Server-side DataTables**: Full integration with ajax-datatables-rails
- **Advanced Filtering**: Dynamic filters with dependent selects and date ranges
- **Stimulus Controllers**: Modern JavaScript integration using Hotwire Stimulus
- **Bootstrap 5 Support**: Beautiful, responsive tables out of the box
- **LocalStorage State**: Filter and table state persistence
- **Flexible API**: Easy-to-use Ruby helpers and JavaScript API

## Installation

Add this line to your application's Gemfile:

```ruby
gem 'stimulus_rails_datatables'
```

And then execute:

```bash
$ bundle install
$ rails generate stimulus_rails_datatables:install
```

This will create:
- `config/initializers/stimulus_rails_datatables.rb`
- `app/javascript/datatables_config.js`

### Setup JavaScript Controllers

In `app/javascript/controllers/index.js`:

```javascript
import DatatableController from 'stimulus_rails_datatables/datatables_controller'
import FilterController from 'stimulus_rails_datatables/filter_controller'

application.register('datatable', DatatableController)
application.register('filter', FilterController)
```

In `app/javascript/application.js`:

```javascript
import 'datatables_config'
```

## Usage

### Helpers

#### Basic DataTable

```ruby
<%= datatable_for 'users-table', source: users_path do |dt| %>
  <% dt.column :id, title: 'ID' %>
  <% dt.column :name, title: 'Name' %>
  <% dt.column :email, title: 'Email' %>
  <% dt.column :created_at, title: 'Created', orderable: false %>
<% end %>
```

#### Custom Header Content

Pass a block to render custom HTML in the column header instead of using `title:`.

```ruby
<%= datatable_for 'users-table', source: users_path do |dt| %>
  <% dt.column :name, title: 'Name' %>

  <% dt.column class: 'text-center' do %>
    <div>My Custom Div</div>
  <% end %>
<% end %>
```

#### With Filters

```ruby
<%= filter_for 'users-table' do |f| %>
  <%= f.status do |opts| %>
    <%= opts.option '', 'All Statuses' %>
    <%= opts.option 'active', 'Active' %>
    <%= opts.option 'inactive', 'Inactive' %>
  <% end %>

# If set_value matches, it will be mark as selected
# When set_value is present, localStorage restoration is skipped
# so the default is not overridden on page reload.
  <%= f.role(
    remote: {
      url: roles_path,
      label: 'name',
      value: 'id',
      placeholder: 'Select Role',
      set_value: 1
    }
  ) %>

  <%= f.duration do |opts| %>
    <%= opts.option '', 'All Time' %>
    <%= opts.option 'today', 'Today' %>
    <%= opts.option 'this_week', 'This Week' %>
    <%= opts.option 'custom', 'Custom Range' %>
  <% end %>
<% end %>
```

#### Dependent Location Filters

Use dependent remote selects when one filter should load its options from the value of another filter. The built-in `location` helper creates three filters named `province_id`, `city_id`, and `barangay_id`.

```ruby
<%= filter_for 'locations-table' do |f| %>
  <%= f.location(
    province_url: provinces_path(format: :json),
    city_url: cities_path(province_id: '{province_id}', format: :json),
    barangay_url: barangays_path(city_id: '{city_id}', format: :json)
  ) %>
<% end %>

<%= datatable_for 'locations-table', source: locations_path(format: :json) do |dt| %>
  <% dt.column :name, title: 'Name' %>
  <% dt.column :province_name, title: 'Province' %>
  <% dt.column :city_name, title: 'City' %>
  <% dt.column :barangay_name, title: 'Barangay' %>
<% end %>
```

The `{province_id}` and `{city_id}` placeholders are replaced in the browser before fetching the next select's options:

- changing province fetches `cities_path(... province_id: selected_province_id)`
- changing city fetches `barangays_path(... city_id: selected_city_id)`
- changing any filter reloads the datatable with params such as `filters[province_id]=1&filters[city_id]=2`

Your JSON endpoints should return an array using the keys configured by the helper: `location_id` for the option value and `name` for the label.

```ruby
class ProvincesController < ApplicationController
  def index
    render json: Province.select(:location_id, :name)
  end
end

class CitiesController < ApplicationController
  def index
    cities = City.where(province_id: params[:province_id])
    render json: cities.select(:location_id, :name)
  end
end

class BarangaysController < ApplicationController
  def index
    barangays = Barangay.where(city_id: params[:city_id])
    render json: barangays.select(:location_id, :name)
  end
end
```

Then apply the selected filters inside your datatable class:

```ruby
def get_raw_records
  Location.all.then { |relation| apply_filters(relation) }
end

def apply_filters(relation)
  relation = relation.where(province_id: query_filters[:province_id]) if query_filters[:province_id].present?
  relation = relation.where(city_id: query_filters[:city_id]) if query_filters[:city_id].present?
  relation = relation.where(barangay_id: query_filters[:barangay_id]) if query_filters[:barangay_id].present?
  relation
end
```

To load the table already filtered from the page URL, use normal nested filter params:

```text
/locations?filters[province_id]=1&filters[city_id]=2&filters[barangay_id]=3
```

Pass those params into the datatable source on the initial render:

```ruby
<% location_filters = params[:filters]&.permit(:province_id, :city_id, :barangay_id) || {} %>

<%= datatable_for 'locations-table',
  source: locations_path(format: :json, filters: location_filters) do |dt| %>
  <% dt.column :name, title: 'Name' %>
  <% dt.column :province_name, title: 'Province' %>
  <% dt.column :city_name, title: 'City' %>
  <% dt.column :barangay_name, title: 'Barangay' %>
<% end %>
```

### Backend DataTable Class

```ruby
class UserDatatable < StimulusRailsDatatables::BaseDatatable
  def view_columns
    @view_columns ||= {
      id: { source: "User.id" },
      name: { source: "User.name" },
      email: { source: "User.email" },
      created_at: { source: "User.created_at" }
    }
  end

  def data
    records.map do |record|
      {
        id: record.id,
        name: record.name,
        email: record.email,
        created_at: record.created_at.strftime('%Y-%m-%d')
      }
    end
  end

  def get_raw_records
    User.all.then { |relation| apply_filters(relation) }
  end

  private

  def apply_filters(relation)
    relation = relation.where(status: query_filters[:status]) if query_filters[:status].present?
    relation = relation.where(role_id: query_filters[:role_id]) if query_filters[:role_id].present?
    relation
  end
end
```

### Additional Data

You can return extra fields alongside the standard DataTables JSON response by defining `additional_data` in your datatable class. This is useful for displaying aggregate stats (e.g. counts, totals) that are scoped to the current filtered result set.

```ruby
class OrdersDatatable < StimulusRailsDatatables::BaseDatatable
  def additional_data
    { unread_orders_count: get_raw_records.where(is_read: false).count }
  end

  # ...
end
```

Any element with a `data-datatable-field` attribute matching a key from `additional_data` will have its text content updated automatically after every draw (page change, sort, filter):

```html
<span data-datatable-field="unread_orders_count">0</span> unread orders
```

When you have **multiple datatables on the same page**, scope the element to a specific table using `data-for-datatable`:

```html
<span data-datatable-field="unread_orders_count" data-for-datatable="orders-table">0</span>
```

You can also listen for the `datatable:additional-data` event for custom JavaScript handling:

```javascript
document.addEventListener('datatable:additional-data', (e) => {
  console.log(e.detail) // { unread_orders_count: 5 }
})
```

### JavaScript API

```javascript
// Access via window.AppDataTable or import directly
import { AppDataTable } from 'stimulus_rails_datatables/app_datatable'

// Reload a specific datatable
AppDataTable.reload('#users-table')

// Load with new URL
AppDataTable.load('#users-table', '/users?status=active')

// Reload all datatables on page
AppDataTable.reloadAll()
```

## Controller Setup

In your Rails controller, respond to JSON format for DataTables:

```ruby
class UsersController < ApplicationController
  def index
    respond_to do |format|
      format.html
      format.json { render json: UsersDatatable.new(view_context) }
    end
  end
end
```

## Configuration

### Customizing DataTables Settings

Edit `app/javascript/datatables_config.js` to customize the DataTables appearance and behavior:

```javascript
window.datatablesConfig = {
  // Language strings for DataTables UI
  language: {
    processing: '<div class="spinner-border"></div><div class="mt-2">Loading...</div>',
    lengthMenu: '_MENU_',
    search: `<div class="input-group">
              <span class="input-group-text"><i class="material-symbols-outlined">search</i></span>
              _INPUT_
              <span class="input-group-text">
                <kbd>ctrl + k</kbd>
              </span>
            </div>`,
    info: 'Showing _START_ to _END_ of _TOTAL_ entries',
    paginate: {
      first: 'First',
      last: 'Last',
      next: 'Next',
      previous: 'Previous'
    }
  },

  // Layout configuration
  layout: {
    topStart: 'pageLength',
    topEnd: 'search',
    bottomStart: 'info',
    bottomEnd: 'paging'
  },

  // Length menu options
  lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]]
}
```

### Available Stimulus Controllers

The gem automatically registers the following Stimulus controllers:

- `datatable` - Main DataTable controller with server-side processing
- `filter` - Filter controller with state management and localStorage persistence

## Dependencies

- Rails >= 7.0
- ajax-datatables-rails ~> 1.4
- importmap-rails
- @hotwired/stimulus
- DataTables.net with Bootstrap 5 theme

## Development

After checking out the repo, run `bin/setup` to install dependencies. Then, run `rake spec` to run the tests.

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/denmarkmeralpis/stimulus_rails_datatables.

## License

The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
