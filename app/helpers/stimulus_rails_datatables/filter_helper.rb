# frozen_string_literal: true


module StimulusRailsDatatables
  module FilterHelper
    def filter_for(datatable_id, root_key: 'filters', &)
      content_tag(
        :div, class: 'filter-form', data: {
          controller: 'filter',
          filter_root_key: root_key,
          filter_datatable_id: datatable_id
        }
      ) do
        builder = FilterBuilder.new(self, root_key)
        capture(builder, &)
      end
    end

    class FilterBuilder
      def initialize(view, root_key)
        @view = view
        @root_key = root_key
      end

      def respond_to_missing?; end

      def method_missing(name, *_args, **options, &block)
        field_name = "#{@root_key}[#{name}]"
        html_class = options[:class] || 'form-control'

        if block
          @view.content_tag(
            :select,
            name: field_name,
            class: html_class,
            data: { filter_field_name: name }
          ) do
            yield(OptionBuilder.new(@view))
          end
        else
          remote = options[:remote] || {}
          depends_on = options[:depends_on]
          multiple = options[:multiple] || false

          attrs = {
            filter_field_name: name,
            filter_remote_url_value: remote[:url],
            filter_label_key: remote[:label],
            filter_value_key: remote[:value],
            filter_depends_on: depends_on&.to_s,
            filter_placeholder: remote[:placeholder] || 'Select an option',
            filter_set_value: remote[:set_value],
            filter_set_values: remote[:set_values],
            filter_tomselect: options[:tomselect] 

          }

          select_options = {
            data: attrs,
            class: html_class,
            multiple: multiple
          }

          # Only disable if it depends on another field
          select_options[:disabled] = true if depends_on.present?
          field_name = "#{field_name}[]" if multiple


          @view.select_tag(field_name, @view.options_for_select([]), **select_options)
        end
      end

      def location(province_url:, city_url:, barangay_url:, **options)
        html_class = options[:class] || 'form-select'

        province = province_id(
          remote: {
            url: province_url,
            label: 'name',
            value: 'location_id',
            placeholder: 'All Provinces'
          },
          class: html_class
        )

        city = city_id(
          remote: {
            url: city_url,
            label: 'name',
            value: 'location_id',
            placeholder: 'All Cities'
          },
          depends_on: :province_id,
          class: html_class
        )

        barangay = barangay_id(
          remote: {
            url: barangay_url,
            label: 'name',
            value: 'location_id',
            placeholder: 'All Barangays'
          },
          depends_on: :city_id,
          multiple: true,
          tomselect: true,
          class: html_class
        )

        # Concatenate them so Rails captures the HTML
        province + city + barangay
      end

      def duration(field_name = :duration, **options, &block)
        full_name = "#{@root_key}[#{field_name}]"
        html_class = options[:class] || 'form-control'

        attrs = {
          action: 'change->filter#durationChanged',
          filter_duration_target: 'select',
          filter_field_name: field_name
        }

        @view.content_tag(
          :select,
          name: full_name,
          id: "#{@root_key}-duration",
          class: html_class,
          style: 'width: 100px;',
          data: attrs
        ) do
          yield(OptionBuilder.new(@view)) if block
        end
      end
    end

    class OptionBuilder
      def initialize(view)
        @view = view
      end

      def option(value, label)
        @view.content_tag(:option, label, value: value)
      end
    end
  end
end
