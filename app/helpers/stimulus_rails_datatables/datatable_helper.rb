# frozen_string_literal: true

module StimulusRailsDatatables
  module DatatableHelper
    def datatable_for(id, source:, order: [[2, 'desc']], **options, &block)
      classes = options.fetch(:classes, 'align-middle table w-100')
      searching = options.fetch(:searching, true)
      length_change = options.fetch(:length_change, true)
      state_save = options.fetch(:state_save, true)
      responsive = options.fetch(:responsive, true)
      columns = []

      capture(DatatableBuilder.new(self, columns), &block)
      datatable_columns = columns.map { |column| column.reject { |key, _| key == :header_content } }

      data = {
        controller: 'datatable',
        datatable_id_value: id,
        datatable_source_value: source,
        datatable_order_value: order.to_json,
        datatable_columns_value: datatable_columns.to_json,
        datatable_searching_value: searching,
        datatable_length_change_value: length_change,
        datatable_state_save_value: state_save,
        datatable_responsive_value: responsive
      }

      content_tag(:div, data: data) do
        content_tag(:table, class: classes, id: id) do
          content_tag(:thead, class: 'table-light align-middle') do
            content_tag(:tr) do
              safe_join(columns.map do |col|
                header = col[:header_content] || col[:title] || col[:data].to_s.titleize

                content_tag(:th, header, class: col[:class])
              end)
            end
          end
        end
      end
    end

    class DatatableBuilder
      attr_reader :columns

      def initialize(view, columns)
        @view = view
        @columns = columns
      end

      def column(data = nil, **options, &block)
        header_content = @view.capture(&block) if block

        @columns << options.merge(data: data, header_content: header_content).compact
        nil
      end
    end
  end
end
