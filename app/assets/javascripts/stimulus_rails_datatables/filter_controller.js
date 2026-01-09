/* eslint-disable */
// Disabling eslint since this is a library file and may not conform to all rules

import { Controller } from '@hotwired/stimulus'

export default class extends Controller {
  static targets = ['select', 'customFields']

  get filterDtId() {
    return this.element.dataset.filterDatatableId
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

    // if there are remote selects with dependencies, disable them initially
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

    // Replace URL template variables with actual values
    url = decodeURIComponent(url).replace(/{(\w+)}/g, (_, key) => {
      const input = this.element.querySelector(`[data-filter-field-name='${key}']`)
      return input ? input.value : ''
    })

    // Check if all dependencies are satisfied
    if (select.dataset.filterDependsOn) {
      const dependencies = this.getDependencies(select)
      const allSatisfied = dependencies.every(depKey => {
        const depEl = this.element.querySelector(`[data-filter-field-name='${depKey}']`)
        return depEl && depEl.value
      })

      if (!allSatisfied) {
        select.innerHTML = `<option value="">${placeholder}</option>`
        select.disabled = true
        return false
      }
    }

    if (!url) return false

    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch ${url}`)
      const data = await response.json()

      select.innerHTML = `<option value="">${placeholder}</option>`
      data.forEach(item => {
        const option = document.createElement('option')
        option.value = item[valueKey]
        option.textContent = item[labelKey]
        select.appendChild(option)
      })

      select.disabled = false
      return true
    } catch (e) {
      console.error('[Filter] fetch error:', e)
      select.disabled = false
      return false
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

  // Helper to set select value, ensuring the option exists
  setSelectValue(select, value) {
    if (!value) return false

    // Check if the option exists
    const optionExists = Array.from(select.options).some(opt => opt.value === value)

    if (optionExists) {
      select.value = value
      // Trigger change event if needed for any listeners
      // select.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    } else {
      console.warn(`[Filter] Option with value "${value}" not found in select "${select.dataset.filterFieldName}"`)
      return false
    }
  }

  // restoreState waits for all remote populates+restore to finish,
  // then dispatches "filters:ready" with { params: currentParams() }
  async restoreState() {
    const saved = this.loadState()
    const rootKey = this.element.dataset.filterRootKey
    const savedParams = saved[rootKey] || {}

    // First, restore all non-remote select fields (static dropdowns)
    this.element.querySelectorAll('select:not([data-filter-remote-url-value])[data-filter-field-name]').forEach(select => {
      const key = select.dataset.filterFieldName
      if (savedParams[key]) {
        this.setSelectValue(select, savedParams[key])
      }
    })

    // restore simple non-select input fields (text, date, etc.)
    Object.entries(savedParams).forEach(([key, value]) => {
      const el = this.element.querySelector(`[data-filter-field-name='${key}']`)
      if (el && !el.dataset.filterRemoteUrlValue && el.tagName !== 'SELECT') {
        el.value = value
      }
    })

    // collect remote selects (as an array)
    this.selects = Array.from(this.element.querySelectorAll('select[data-filter-remote-url-value]'))

    // find root remote selects (no depends_on)
    const roots = this.selects.filter(s => !s.dataset.filterDependsOn)

    // populate each root -> then recursively populate dependents and restore values
    await Promise.all(roots.map(async (root) => {
      const populated = await this.populate(root)
      // after root options exist, restore saved root value (if any)
      if (populated) {
        const sv = savedParams[root.dataset.filterFieldName]
        if (sv) {
          this.setSelectValue(root, sv)
        }
      }
      // cascade down children
      await this.populateDependents(root, savedParams)
    }))

    // After all roots and their cascades, check for any dependent selects that have
    // ALL their dependencies satisfied (important for multi-dependency selects)
    await this.populateAllSatisfiedDependents(savedParams)

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

    // Reload the datatable with restored filters
    if (Object.keys(savedParams).length > 0) {
      this.reloadAppDatatable()
    }
  }

  // Helper to get dependencies as an array (supports comma-separated values)
  getDependencies(select) {
    const dependsOn = select.dataset.filterDependsOn
    if (!dependsOn) return []
    return dependsOn.split(',').map(dep => dep.trim()).filter(Boolean)
  }

  // Populate all dependent selects that have all their dependencies satisfied
  // Process in waves to handle multi-level dependencies
  async populateAllSatisfiedDependents(savedParams = {}) {
    const maxIterations = 10 // Prevent infinite loops
    let iteration = 0
    let anyPopulated = true

    while (anyPopulated && iteration < maxIterations) {
      anyPopulated = false
      iteration++

      // Get all dependent selects that aren't yet populated (disabled or no options)
      const dependents = this.selects.filter(s => {
        if (!s.dataset.filterDependsOn) return false
        // Check if it's already populated (enabled and has options beyond placeholder)
        return s.disabled || s.options.length <= 1
      })

      for (const select of dependents) {
        const allDeps = this.getDependencies(select)
        const allSatisfied = allDeps.every(depKey => {
          const depEl = this.element.querySelector(`[data-filter-field-name='${depKey}']`)
          return depEl && depEl.value
        })

        if (allSatisfied) {
          const populated = await this.populate(select)
          if (populated) {
            anyPopulated = true
            // Restore saved value if exists
            const savedValue = savedParams[select.dataset.filterFieldName]
            if (savedValue) {
              this.setSelectValue(select, savedValue)
            }
          }
        }
      }
    }
  }

  // recursively populate children of parent, restore each child's saved value, then recurse
  async populateDependents(parent, savedParams = {}) {
    this.selects = this.selects || Array.from(this.element.querySelectorAll('select[data-filter-remote-url-value]'))
    const parentKey = parent.dataset.filterFieldName

    // Find children that depend on this parent (supports multiple dependencies)
    const children = this.selects.filter(s => {
      const deps = this.getDependencies(s)
      return deps.includes(parentKey)
    })

    for (const child of children) {
      // Check if all dependencies are satisfied before populating
      const allDeps = this.getDependencies(child)
      const allSatisfied = allDeps.every(depKey => {
        const depEl = this.element.querySelector(`[data-filter-field-name='${depKey}']`)
        return depEl && depEl.value
      })

      if (allSatisfied) {
        // populate child using parent's current value substituted by populate()
        const populated = await this.populate(child)
        // restore child's saved value if exists and populate was successful
        if (populated) {
          const childSaved = savedParams[child.dataset.filterFieldName]
          if (childSaved) {
            this.setSelectValue(child, childSaved)
          }
        }
        // recurse deeper
        await this.populateDependents(child, savedParams)
      } else {
        // Reset child if dependencies are not satisfied
        child.value = ''
        child.innerHTML = `<option value="">${child.dataset.filterPlaceholder || 'Select'}</option>`
        child.disabled = true
      }
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
