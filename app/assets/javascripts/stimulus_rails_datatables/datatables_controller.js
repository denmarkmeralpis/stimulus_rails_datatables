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
      const options = {
        lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
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
        scrollX: true,
        language: {
          processing: '<div class="spinner-border"></div><div class="mt-2">Loading...</div>',
          lengthMenu: 'show <span class="px-2">_MENU_</span> entries'
        },
        layout: {
          topStart: 'pageLength',
          topEnd: 'search',
          bottomStart: 'info',
          bottomEnd: 'paging'
        }
      }

      // Add drawCallback to dispatch custom event
      appDataTable = new AppDataTable(`#${datatableId}`, options).table
      if (appDataTable) {
       appDataTable.on('draw', () => {
          this.element.dispatchEvent(new CustomEvent('datatable:drawn', {
            bubbles: true,
            detail: { table: appDataTable }
          }))
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
