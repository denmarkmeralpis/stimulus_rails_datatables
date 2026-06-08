/* eslint-disable */
// Disabling eslint since this is a library file and may not conform to all rules

import { AppDataTable } from 'stimulus_rails_datatables/app_datatable'
import { Controller } from '@hotwired/stimulus'
import { getDatatablesConfig } from 'stimulus_rails_datatables/config'

export default class extends Controller {
  static values = {
    id: String,
    source: String,
    columns: { type: Array, default: [] },
    order: { type: Array, default: [[1, 'desc']] },
    stateSave: { type: Boolean, default: true },
    serverSide: { type: Boolean, default: true },
    processing: { type: Boolean, default: true },
    pagingType: { type: String, default: 'simple_numbers' },
    searching: { type: Boolean, default: true },
    lengthChange: { type: Boolean, default: true },
    responsive: { type: Boolean, default: true }
  }

  connect() {
    this.datatablesConfig = getDatatablesConfig();

    // try to use saved filters if present, else listen for filters:ready
    const filterEl = document.querySelector('.filter-form[data-filter-root-key]')
    if (filterEl) {
      const dtid = filterEl.dataset.filterDatatableId
      const raw = localStorage.getItem(`filterState:${dtid}`)
      if (raw) {
        try {
          const saved = JSON.parse(raw)
          this.initializeWithParams(saved)
          return
        } catch (e) { /* fallthrough to event listening */ }
      }

      // if no saved params, wait for filters:ready once
      document.addEventListener('filters:ready', (e) => {
        this.initializeWithParams(e.detail.params)
      }, { once: true })

      // safety fallback: if no filters:ready arrives, init after 2s with normal source
      this._initFallbackTimer = setTimeout(() => {
        this.initializeDataTable()
      }, 2000)
    } else {
      // no filter form on page — init normally
      this.initializeDataTable()
    }
  }

  disconnect() {
    if (this._initFallbackTimer) clearTimeout(this._initFallbackTimer)
  }

  // e.g. params = { filters: { a: 1, b: 2 } }
  initializeWithParams(paramsObj) {
    if (!paramsObj || Object.keys(paramsObj).length === 0) {
      this.initializeDataTable()
      return
    }

    // if fallback timer set, cancel it
    if (this._initFallbackTimer) {
      clearTimeout(this._initFallbackTimer)
      this._initFallbackTimer = null
    }

    // build query string (supports nested like filters[a]=1)
    const qs = this.toQuery(paramsObj)
    const base = this.sourceValue || this.source
    const ajaxUrl = qs ? `${base}?${qs}` : base
    this.initializeDataTable(ajaxUrl)
  }

  initializeDataTable(url = this.sourceValue) {
    const datatableId = this.idValue
    const datatableWrapper = document.getElementById(`${datatableId}_wrapper`)
    let appDataTable = null

    if (datatableWrapper === null) {
      Turbo.cache.exemptPageFromCache()

      // Get config - prioritize window.datatablesConfig, fallback to defaults
      const defaultConfig = getDatatablesConfig()
      const userConfig = window.datatablesConfig || {}
      const config = {
        language: { ...defaultConfig.language, ...(userConfig.language || {}) },
        layout: { ...defaultConfig.layout, ...(userConfig.layout || {}) },
        lengthMenu: userConfig.lengthMenu || defaultConfig.lengthMenu
      }

      const responsiveValue = this.responsiveValue
      const options = {
        lengthMenu: config.lengthMenu,
        searching: this.searchingValue,
        lengthChange: this.lengthChangeValue,
        processing: this.processingValue,
        serverSide: this.serverSideValue,
        stateSave: this.stateSaveValue,
        ajax: url,
        pagingType: this.pagingTypeValue,
        order: this.orderValue,
        columns: this.columnsValue,
        responsive: this.responsiveValue,
        language: config.language,
        layout: config.layout,
        initComplete: function() {
          if (responsiveValue === false) {
            // Add overflow-x only to the table wrapper (not the whole layout) this is alternative of scrollX
            const tableWrapper = document.querySelector(`#${datatableId}_wrapper .dt-layout-table`)
            if (tableWrapper) {
              tableWrapper.classList.add('overflow-x-scroll')
            }
          }
        }
      }

      // Add drawCallback to dispatch custom event
      const appDataTable = new AppDataTable(`#${datatableId}`, options).table
      if (appDataTable) {
       appDataTable.on('draw', () => {
          this.element.dispatchEvent(new CustomEvent('datatable:drawn', {
            bubbles: true,
            detail: { table: appDataTable }
          }))
        })

        // Dispatch additional_data returned by the server alongside standard DataTables fields
        const STANDARD_DT_KEYS = new Set(['draw', 'recordsTotal', 'recordsFiltered', 'data', 'error'])
        appDataTable.on('xhr', (_e, _settings, json) => {
          if (!json) return
          const additionalData = Object.fromEntries(
            Object.entries(json).filter(([key]) => !STANDARD_DT_KEYS.has(key))
          )
          if (Object.keys(additionalData).length === 0) return

          // Dispatch event so consumers can react programmatically
          this.element.dispatchEvent(new CustomEvent('datatable:additional-data', {
            bubbles: true,
            detail: additionalData
          }))

          // Auto-update elements: <span data-datatable-field="unread_orders_count">
          // Scope with optional data-for-datatable="<id>" to support multiple tables per page
          // Single DOM query for all field elements, then group by field name to avoid N queries per key
          document.querySelectorAll('[data-datatable-field]').forEach(el => {
            const key = el.dataset.datatableField
            if (!(key in additionalData)) return
            const forId = el.dataset.forDatatable
            if (!forId || forId === datatableId) {
              el.textContent = additionalData[key]
            }
          })
        })
      }
    }

    return appDataTable
  }

  // helper to serialize nested object like { filters: { a: 1 } } => filters[a]=1
  toQuery(obj, prefix) {
    const pairs = []
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key
      if (value !== null && typeof value === "object") {
        pairs.push(this.toQuery(value, fullKey))
      } else if (value !== "" && value !== null && value !== undefined) {
        pairs.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`)
      }
    }
    return pairs.filter(Boolean).join("&")
  }
}
