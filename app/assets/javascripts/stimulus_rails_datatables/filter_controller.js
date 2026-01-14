/* eslint-disable */
// Disabling eslint since this is a library file and may not conform to all rules

import { Controller } from '@hotwired/stimulus'

export default class extends Controller {
  static targets = ['select', 'customFields']

  get filterDtId() {
    const today = new Date()
    const key = today.toISOString().split('T')[0]
    return `${key}:${this.element.dataset.filterDatatableId}`
  }

  connect() {
    // begin restore; it is async but will dispatch filters:ready when done
    this.restoreState()

    // single delegated listener — saves and triggers dependent populates
    this.element.addEventListener('change', (event) => {
      if (!event.target.matches('[data-filter-field-name]')) return

      // persist the user's change
      this.saveState()

      // if this field has dependents, re-populate them
      this.populateDependents(event.target, this.currentParams()[this.element.dataset.filterRootKey] || {})

      // trigger datatable reload
      this.reloadAppDatatable()
    })

    // collect selects for later use
    this.selects = Array.from(this.element.querySelectorAll('select[data-filter-remote-url-value]'))

    // if there are top-level remote selects we want them available for manual changes
    this.selects.forEach(select => {
      if (select.dataset.filterDependsOn) {
        select.disabled = true
      }
    })
  }

  toQuery(obj, prefix) {
    const pairs = []

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key

      if (value !== null && typeof value === 'object') {
        pairs.push(this.toQuery(value, fullKey))
      }
      else if (value !== '' && value !== null && value !== undefined) {
        pairs.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`)
      }
    }

    return pairs.join('&')
  }

  // reloadAppDatatable reloads the datatable with current params
  async reloadAppDatatable() {
    var id = this.element.dataset.filterDatatableId

    if (!id) {
      return
    }
    else {
      const datatable = new AppDataTable(`#${id}`).table
      const datatableUrl = datatable.ajax.url().split('?')[0]
      const params = this.toQuery(this.currentParams())

      datatable.ajax.url(`${datatableUrl}?${params}`).load(null, false)
    }

  }

  // async populate returns when options appended
  async populate(select) {
    let url = select.dataset.filterRemoteUrlValue
    const labelKey = select.dataset.filterLabelKey
    const valueKey = select.dataset.filterValueKey
    const placeholder = select.dataset.filterPlaceholder || 'Select'
    const set_value = select.dataset.filterSetValue || ''

    url = decodeURIComponent(url).replace(/{(\w+)}/g, (_, key) => {
      const input = this.element.querySelector(`[data-filter-field-name='${key}']`)
      return input ? input.value : ''
    })

    if (!url) return

    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch ${url}`)
      const data = await response.json()

      select.innerHTML = `<option value="">${placeholder}</option>`
      data.forEach(item => {
        const option = document.createElement('option')
        option.value = item[valueKey]
        option.textContent = item[labelKey]

        // If set_value matches, mark as selected
        if (set_value && item[valueKey] == set_value) {
          option.selected = true
        }

        select.appendChild(option)
      })

      select.disabled = false
    } catch (e) {
      console.error('[Filter] fetch error:', e)
      select.disabled = false
    }
  }

  currentParams() {
    const rootKey = this.element.dataset.filterRootKey
    const params = {}

    this.element.querySelectorAll('[data-filter-field-name]').forEach(el => {
      if (el.value) params[el.dataset.filterFieldName] = el.value
    })

    const clean = Object.entries(params).reduce((acc, [k, v]) => {
      if (v !== '' && v !== null && v !== undefined) acc[k] = v
      return acc
    }, {})

    return { [rootKey]: clean }
  }

  saveState() {
    const state = this.currentParams()
    // deterministic storage key that datatable can read
    try {
      localStorage.setItem(`filterState:${this.filterDtId}`, JSON.stringify(state))
    } catch (e) {
      // ignore quota errors
    }
  }

  loadState() {
    try {
      const raw = localStorage.getItem(`filterState:${this.filterDtId}`)
      return raw ? JSON.parse(raw) : {}
    } catch (e) {
      return {}
    }
  }

  // restoreState waits for all remote populates+restore to finish,
  // then dispatches "filters:ready" with { params: currentParams() }
  async restoreState() {
    const saved = this.loadState()
    const rootKey = this.element.dataset.filterRootKey
    const savedParams = saved[rootKey] || {}

    // restore simple (non-remote) fields immediately
    Object.entries(savedParams).forEach(([key, value]) => {
      const el = this.element.querySelector(`[data-filter-field-name='${key}']`)
      if (el && !el.dataset.filterRemoteUrlValue) el.value = value
    })

    // collect remote selects (as an array)
    this.selects = Array.from(this.element.querySelectorAll('select[data-filter-remote-url-value]'))

    // find root remote selects (no depends_on)
    const roots = this.selects.filter(s => !s.dataset.filterDependsOn)

    // populate each root -> then recursively populate dependents and restore values
    await Promise.all(roots.map(async (root) => {
      await this.populate(root)
      // after root options exist, restore saved root value (if any)
      const sv = savedParams[root.dataset.filterFieldName]
      const set_value = root.dataset.filterSetValue || ''

      if (sv && !set_value) root.value = sv
      // cascade down children
      await this.populateDependents(root, savedParams)
    }))

    // restore start_date/end_date fields if duration was 'custom'
    if (savedParams['duration'] === 'custom') {
      this.durationChanged({ target: this.element.querySelector('[data-filter-field-name="duration"]') })
      if (savedParams['start_date']) {
        const sd = this.element.querySelector('[data-filter-field-name="start_date"]')
        if (sd) sd.value = savedParams['start_date']
      }

      if (savedParams['end_date']) {
        const ed = this.element.querySelector('[data-filter-field-name="end_date"]')
        if (ed) ed.value = savedParams['end_date']
      }
    }

    // emit event (use document, bubbles already) so any listener can catch
    const payload = this.currentParams()
    this.element.dispatchEvent(new CustomEvent('filters:ready', { detail: { params: payload }, bubbles: true }))

    // also update deterministic storage (in case other code reads it)
    try {
      localStorage.setItem(`filterState:${this.filterDtId}`, JSON.stringify(payload))
    } catch (e) {}
  }

  // recursively populate children of parent, restore each child's saved value, then recurse
  async populateDependents(parent, savedParams = {}) {
    this.selects = this.selects || Array.from(this.element.querySelectorAll('select[data-filter-remote-url-value]'))
    const parentKey = parent.dataset.filterFieldName
    const children = this.selects.filter(s => s.dataset.filterDependsOn === parentKey)

    for (const child of children) {
      // populate child using parent's current value substituted by populate()
      await this.populate(child)
      // restore child's saved value if exists
      const childSaved = savedParams[child.dataset.filterFieldName]
      const set_value = child.dataset.filterSetValue || ''

      if (childSaved && !set_value) {
        child.value = childSaved
      }
      // recurse deeper
      await this.populateDependents(child, savedParams)
    }
  }

  // duration handler (unchanged)
  durationChanged(event) {
    const select = event.target

    if (select.value === 'custom') {
      const fromDate = `<input type="date"
               name="${select.name.replace('[duration]', '[start_date]')}"
               class="textbox-n form-control form-control-sm mx-2 customDurationField"
               data-filter-field-name="start_date" />`

      const toDate = `<input type="date"
              name="${select.name.replace('[duration]', '[end_date]')}"
              class="textbox-n form-control form-control-sm customDurationField"
              data-filter-field-name="end_date" />`

      select.insertAdjacentHTML('afterend', toDate)
      select.insertAdjacentHTML('afterend', fromDate)
    } else {
      document.querySelectorAll('.customDurationField').forEach(el => el.remove())
    }
  }
}
