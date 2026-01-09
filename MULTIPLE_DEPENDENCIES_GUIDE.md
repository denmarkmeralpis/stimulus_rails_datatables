# Multiple Dependencies Guide

This guide explains how to use the multiple dependencies feature for filter selects.

## Overview

The filter controller now supports filters that depend on multiple parent fields. This is useful for scenarios like:
- City filter depending on both country AND region
- Product filter depending on category AND brand
- Branch filter depending on region AND company

## How It Works

### 1. Filter State Persistence
- Filter states are now persisted across browser reloads (removed daily reset)
- Uses localStorage with key: `filterState:{datatableId}`
- Automatically restores filter values on page load
- Datatable reloads with restored filters

### 2. Multiple Dependencies Support
- Use comma-separated field names for multiple dependencies
- All dependencies must have values before the dependent field is populated
- Cascading resets: if a parent changes and dependencies aren't satisfied, child resets

## Usage Examples

### Example 1: Single Dependency (existing functionality)

```erb
<%= filter_for('users_table', root_key: 'filters') do |f| %>
  <!-- Country select (no dependency) -->
  <%= f.country_id(
    remote: {
      url: '/api/countries',
      label: 'name',
      value: 'id',
      placeholder: 'Select Country'
    }
  ) %>

  <!-- City depends on country_id -->
  <%= f.city_id(
    remote: {
      url: '/api/cities?country_id={country_id}',
      label: 'name',
      value: 'id',
      placeholder: 'Select City'
    },
    depends_on: :country_id
  ) %>
<% end %>
```

### Example 2: Multiple Dependencies (new functionality)

```erb
<%= filter_for('users_table', root_key: 'filters') do |f| %>
  <!-- Country select (no dependency) -->
  <%= f.country_id(
    remote: {
      url: '/api/countries',
      label: 'name',
      value: 'id',
      placeholder: 'Select Country'
    }
  ) %>

  <!-- Region depends on country_id -->
  <%= f.region_id(
    remote: {
      url: '/api/regions?country_id={country_id}',
      label: 'name',
      value: 'id',
      placeholder: 'Select Region'
    },
    depends_on: :country_id
  ) %>

  <!-- City depends on BOTH country_id AND region_id -->
  <%= f.city_id(
    remote: {
      url: '/api/cities?country_id={country_id}&region_id={region_id}',
      label: 'name',
      value: 'id',
      placeholder: 'Select City'
    },
    depends_on: [:country_id, :region_id]  # Array of dependencies
  ) %>
<% end %>
```

### Example 3: Using Location Helper with Custom Dependencies

```erb
<%= filter_for('users_table', root_key: 'filters') do |f| %>
  <!-- Add a company filter first -->
  <%= f.company_id(
    remote: {
      url: '/api/companies',
      label: 'name',
      value: 'id',
      placeholder: 'Select Company'
    }
  ) %>

  <!-- Location helper with city depending on company AND province -->
  <%= f.location(
    province_url: '/api/provinces',
    city_url: '/api/cities?province_id={province_id}&company_id={company_id}',
    barangay_url: '/api/barangays?city_id={city_id}',
    city_depends_on: [:province_id, :company_id]  # Custom city dependencies
  ) %>
<% end %>
```

### Example 4: Complex Cascading Dependencies

```erb
<%= filter_for('products_table', root_key: 'filters') do |f| %>
  <!-- Level 0: Independent filters -->
  <%= f.category_id(
    remote: {
      url: '/api/categories',
      label: 'name',
      value: 'id',
      placeholder: 'All Categories'
    }
  ) %>

  <%= f.brand_id(
    remote: {
      url: '/api/brands',
      label: 'name',
      value: 'id',
      placeholder: 'All Brands'
    }
  ) %>

  <!-- Level 1: Depends on category_id -->
  <%= f.subcategory_id(
    remote: {
      url: '/api/subcategories?category_id={category_id}',
      label: 'name',
      value: 'id',
      placeholder: 'All Subcategories'
    },
    depends_on: :category_id
  ) %>

  <!-- Level 2: Depends on BOTH category AND brand -->
  <%= f.product_id(
    remote: {
      url: '/api/products?category_id={category_id}&brand_id={brand_id}',
      label: 'name',
      value: 'id',
      placeholder: 'Select Product'
    },
    depends_on: [:category_id, :brand_id]
  ) %>

  <!-- Level 3: Depends on product AND subcategory -->
  <%= f.variant_id(
    remote: {
      url: '/api/variants?product_id={product_id}&subcategory_id={subcategory_id}',
      label: 'name',
      value: 'id',
      placeholder: 'Select Variant'
    },
    depends_on: [:product_id, :subcategory_id]
  ) %>
<% end %>
```

## API Endpoint Requirements

Your API endpoints should accept multiple query parameters:

```ruby
# Example controller
class Api::CitiesController < ApplicationController
  def index
    cities = City.all

    # Filter by country_id if provided
    cities = cities.where(country_id: params[:country_id]) if params[:country_id].present?

    # Filter by region_id if provided
    cities = cities.where(region_id: params[:region_id]) if params[:region_id].present?

    # Filter by company_id if provided (for your business logic)
    cities = cities.joins(:branches).where(branches: { company_id: params[:company_id] }) if params[:company_id].present?

    render json: cities
  end
end
```

## URL Template Syntax

Use curly braces `{field_name}` in your URLs to reference other filter field values:

```ruby
# Single dependency
url: '/api/cities?country_id={country_id}'

# Multiple dependencies
url: '/api/cities?country_id={country_id}&region_id={region_id}'

# With additional static params
url: '/api/cities?country_id={country_id}&region_id={region_id}&active=true'
```

## JavaScript API (Advanced Usage)

If you need to manually trigger filter operations:

```javascript
// Get the filter controller
const filterController = document.querySelector('[data-controller="filter"]')

// Manually populate a select
const select = document.querySelector('[data-filter-field-name="city_id"]')
await filterController.populate(select)

// Get current filter parameters
const params = filterController.currentParams()
// Returns: { filters: { country_id: '1', region_id: '2', ... } }

// Manually reload datatable with current filters
await filterController.reloadAppDatatable()

// Get dependencies of a select
const deps = filterController.getDependencies(select)
// Returns: ['country_id', 'region_id']
```

## How Dependencies Work

### Dependency Resolution Flow

1. **Initial Load**:
   - Root filters (no dependencies) are populated first
   - Saved values from localStorage are restored
   - Child filters are populated only when ALL dependencies have values

2. **User Changes Filter**:
   - New value is saved to localStorage
   - All dependent children are checked
   - If all dependencies satisfied → populate child
   - If any dependency missing → reset and disable child
   - Datatable reloads with new filter values

3. **Browser Reload**:
   - Filters restored from localStorage
   - Same cascade logic applies
   - Datatable automatically reloads with restored filters

### Example Flow

```
User selects Country → City disabled (needs Region too)
User selects Region → City enabled & populated (both deps satisfied)
User changes Country → City reset & disabled (Region might not be valid)
User selects new Region → City enabled & populated again
```

## Troubleshooting

### Filter not populating
- Check that ALL dependencies have values
- Verify URL template has correct `{field_name}` placeholders
- Check browser console for fetch errors

### Filter state not persisting
- Ensure `data-filter-datatable-id` matches your datatable ID
- Check localStorage is enabled in browser
- Verify no errors in browser console

### Datatable not reloading
- Ensure `data-filter-datatable-id` attribute is set on filter form
- Check that AppDataTable is properly initialized
- Verify datatable ID matches filter's datatable ID

## Benefits

✅ **Flexible Dependencies**: Support for any number of dependencies
✅ **State Persistence**: Filters survive page reloads
✅ **Smart Cascading**: Automatic enable/disable based on dependencies
✅ **Clean URLs**: Template-based URL construction
✅ **Backward Compatible**: Single dependencies work as before
✅ **Type Safe**: Works with symbols or strings in Ruby
