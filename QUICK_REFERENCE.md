# StimulusRailsDatatables Quick Reference

## Installation

```ruby
# Gemfile
gem 'stimulus_rails_datatables'
```

```bash
bundle install
```

## JavaScript Setup

```javascript
// app/javascript/controllers/index.js
import DatatableController from 'stimulus_rails_datatables/datatables_controller'
import FilterController from 'stimulus_rails_datatables/filter_controller'
import { AppDataTable } from 'stimulus_rails_datatables/app_datatable'

application.register('datatable', DatatableController)
application.register('filter', FilterController)
window.AppDataTable = AppDataTable
```

## Basic Usage

### Simple DataTable

```ruby
<%= datatable_for 'users-table', source: users_path do |dt| %>
  <% dt.column :id, title: 'ID', width: '80px' %>
  <% dt.column :name, title: 'Name' %>
  <% dt.column :email, title: 'Email' %>
  <% dt.column :actions, title: 'Actions', orderable: false %>
<% end %>
```

### Custom Header Content

```ruby
<%= datatable_for 'users-table', source: users_path do |dt| %>
  <% dt.column class: 'text-center' do %>
    <div>My Custom Div</div>
  <% end %>
<% end %>
```

### With Filters

```ruby
<%= filter_for 'users-table' do |f| %>
  <%= f.status do |opts| %>
    <%= opts.option '', 'All Statuses' %>
    <%= opts.option 'active', 'Active' %>
    <%= opts.option 'inactive', 'Inactive' %>
  <% end %>
<% end %>
```

### Remote Filter

```ruby
<%= f.role_id(
  remote: {
    url: roles_path,
    label: 'name',
    value: 'id',
    placeholder: 'Select Role'
  }
) %>
```

### Dependent Filters

```ruby
<%= f.location(
  province_url: provinces_path,
  city_url: cities_path(province_id: '{province_id}'),
  barangay_url: barangays_path(city_id: '{city_id}')
) %>
```

### Date Range Filter

```ruby
<%= f.duration do |opts| %>
  <%= opts.option '', 'All Time' %>
  <%= opts.option 'today', 'Today' %>
  <%= opts.option 'this_week', 'This Week' %>
  <%= opts.option 'this_month', 'This Month' %>
  <%= opts.option 'custom', 'Custom Range' %>
<% end %>
```

## Backend Implementation

### Controller

```ruby
class UsersController < ApplicationController
  def index
    respond_to do |format|
      format.html
      format.json { render json: UserDatatable.new(params) }
    end
  end
end
```

### Datatable Class

```ruby
class UserDatatable < StimulusRailsDatatables::BaseDatatable
  def view_columns
    @view_columns ||= {
      id: { source: "User.id", cond: :eq },
      name: { source: "User.name", cond: :like },
      email: { source: "User.email", cond: :like },
      status: { source: "User.status" }
    }
  end

  def data
    records.map do |user|
      {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        actions: view.link_to('Edit', edit_user_path(user))
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

## JavaScript API

```javascript
// Reload a specific datatable
AppDataTable.reload('#users-table')

// Load with new URL
AppDataTable.load('#users-table', '/users?status=active')

// Reload all datatables
AppDataTable.reloadAll()
```

## Options

### DataTable Options

```ruby
<%= datatable_for 'users-table',
  source: users_path,
  order: [[1, 'desc']],
  classes: 'table table-striped',
  searching: true,
  length_change: true do |dt|
  # columns...
<% end %>
```

### Column Options

```ruby
dt.column :name,
  title: 'Name',
  class: 'text-center',
  orderable: true,
  searchable: true,
  width: '200px'
```

## Helper Methods

### In BaseDatatable

```ruby
# Get current page offset
current_page

# Get filter parameters (symbolized and compacted)
query_filters

# Search across multiple models/fields with OR
or_search_by_fields(User => [:name, :email], Profile => [:bio])
```

## Events

### Filter Events

```javascript
// Fired when filters are restored and ready
document.addEventListener('filters:ready', (e) => {
  console.log('Filters ready with params:', e.detail.params)
})
```

## Troubleshooting

### Table Not Loading
- Check browser console for errors
- Verify source URL returns valid JSON
- Ensure Stimulus controllers are registered

### Filters Not Working
- Check localStorage is enabled
- Verify filter controller is registered
- Check network tab for filter requests

### State Not Persisting
- Clear localStorage and try again
- Check filter_datatable_id matches table id
- Verify filterState key in localStorage

## Common Patterns

### Conditional Columns

```ruby
def data
  records.map do |user|
    {
      name: user.name,
      actions: current_user.admin? ? admin_actions(user) : user_actions(user)
    }
  end
end
```

### Formatted Data

```ruby
def data
  records.map do |user|
    {
      created_at: user.created_at.strftime('%Y-%m-%d %H:%M'),
      amount: view.number_to_currency(user.amount)
    }
  end
end
```

### Complex Filters

```ruby
def apply_filters(relation)
  if query_filters[:date_from].present? && query_filters[:date_to].present?
    relation = relation.where(created_at: query_filters[:date_from]..query_filters[:date_to])
  end

  if query_filters[:search].present?
    relation = relation.where(
      'name LIKE ? OR email LIKE ?',
      "%#{query_filters[:search]}%",
      "%#{query_filters[:search]}%"
    )
  end

  relation
end
```

## Resources

- [DataTables.net Documentation](https://datatables.net/)
- [Stimulus Handbook](https://stimulus.hotwired.dev/)
- [ajax-datatables-rails](https://github.com/jbox-web/ajax-datatables-rails)
