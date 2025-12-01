# frozen_string_literal: true

module StimulusRailsDatatables
  module DatatableHelper
    def datatable_for(id, source:, order: [[2, 'desc']], **options)
      classes = options.fetch(:classes, 'align-middle table w-100')
      searching = options.fetch(:searching, true)
      length_change = options.fetch(:length_change, true)
      state_save = options.fetch(:state_save, true)
      columns = []

      yield DatatableBuilder.new(columns)

      data = {
        controller: 'datatable',
        datatable_id_value: id,
        datatable_source_value: source,
        datatable_order_value: order.to_json,
        datatable_columns_value: columns.to_json,
        datatable_searching_value: searching,
        datatable_length_change_value: length_change,
        datatable_state_save_value: state_save
      }

      content_tag(:div, data: data) do
        content_tag(:table, class: classes, id: id) do
          content_tag(:thead, class: 'table-light align-middle') do
            content_tag(:tr) do
              safe_join(columns.map do |col|
                content_tag(:th, col[:title] || col[:data].to_s.titleize, class: col[:class])
              end)
            end
          end
        end
      end
    end

    class DatatableBuilder
      attr_reader :columns

      def initialize(columns)
        @columns = columns
      end

      def column(data, **options)
        @columns << options.merge(data: data)
        nil
      end
    end
  end
end
