/* eslint-disable */
// Disabling eslint since this is a library file and may not conform to all rules

import { Controller } from '@hotwired/stimulus'
import TomSelect from 'tom-select'

export default class extends Controller {
  static targets = ['select', 'customFields']

  get filterDtId() {
    const today = new Date()
    const key = today.toISOString().split('T')[0]
    return `${key}:${this.element.dataset.filterDatatableId}`
  }

  connect() {
    this.tomSelects = new Map()
    this.remoteSelects = Array.from(
      this.element.querySelectorAll('select[data-filter-remote-url-value]')
    )

    this.remoteSelects.forEach(select => {
      if (select.dataset.filterTomselect !== 'true') return

      const isMultiple = select.multiple
      const ts = new TomSelect(select, {
        maxItems: isMultiple ? null : 1,
        placeholder: select.dataset.filterPlaceholder || 'Select',
        create: false,
        hideSelected: isMultiple ? false : undefined,
        render: isMultiple ? { item: () => '<div class="ts-hidden-item"></div>' } : {}
      })

      if (isMultiple) {
        const originalOnOptionSelect = ts.onOptionSelect.bind(ts)
        ts.onOptionSelect = (evt, option) => {
          const value = option.dataset.value
          if (ts.items.includes(value)) {
            evt.preventDefault()
            ts.removeItem(value)
            ts.refreshOptions(false)
          } else {
            originalOnOptionSelect(evt, option)
          }
        }
        this.updateSummaryLabel(select, ts)
        ts.on('item_add', () => this.updateSummaryLabel(select, ts))
        ts.on('item_remove', () => this.updateSummaryLabel(select, ts))
      }

      this.tomSelects.set(select, ts)

      if (select.dataset.filterDependsOn) ts.disable()
    })

    // begin restore; it is async but will dispatch filters:ready when done
    this.restoreState()

    // single delegated listener — saves and triggers dependent populates
    this.element.addEventListener('change', async (event) => {
      if (!event.target.matches('[data-filter-field-name]')) return

      // if this field has dependents, reset stale child values and re-populate them
      await this.populateDependents(event.target)

      // persist the user's change after dependent filters have been cleaned up
      this.saveState()

      // trigger datatable reload
      this.reloadAppDatatable()
    })
  }

  disconnect() {
    this.tomSelects?.forEach(ts => ts.destroy())
    this.tomSelects?.clear()
  }

  // --- helpers: single source of truth for reading/writing a field, Tom-Select-aware ---
  getFieldValue(el) {
    const ts = this.tomSelects.get(el)
    return ts ? ts.getValue() : el.value
  }

  isValueEmpty(value) {
    return Array.isArray(value) ? value.length === 0 : !value
  }

  setFieldValue(el, value, silent = true) {
    const ts = this.tomSelects.get(el)
    if (ts) ts.setValue(value, silent)
    else el.value = value
  }

  updateSummaryLabel(select, ts) {
    const count = ts.items.length
    const placeholder = select.dataset.filterPlaceholder || 'Select'

    let label = ts.control.querySelector('.ts-summary-label')
    if (!label) {
      label = document.createElement('div')
      label.className = 'ts-summary-label'
      ts.control.prepend(label)
    }

    const hasSelection = count > 0
    label.textContent = hasSelection ? `${count} Barangay${count > 1 ? 's' : ''} selected` : ''
    label.style.display = hasSelection ? 'block' : 'none'

    if (hasSelection) {
      ts.control_input.style.setProperty('display', 'none', 'important')
    } else {
      ts.control_input.style.removeProperty('display')
      ts.control_input.setAttribute('placeholder', placeholder)
    }
  }

  toQuery(obj, prefix) {
    const pairs = []

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key

      if (Array.isArray(value)) {
        value.forEach(v => pairs.push(`${encodeURIComponent(fullKey)}[]=${encodeURIComponent(v)}`))
      }
      else if (value !== null && typeof value === 'object') {
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
    const ts = this.tomSelects.get(select)
    let url = select.dataset.filterRemoteUrlValue
    const labelKey = select.dataset.filterLabelKey
    const valueKey = select.dataset.filterValueKey
    const setValues = (select.dataset.filterSetValues || select.dataset.filterSetValue || '')
      .split(',').map(v => v.trim()).filter(Boolean)

    url = decodeURIComponent(url).replace(/{(\w+)}/g, (_, key) => {
      const input = this.element.querySelector(`[data-filter-field-name='${key}']`)
      return input ? input.value : ''
    })

    if (!url) return

    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch ${url}`)
      const data = await response.json()

      if (ts) {
        ts.clear(true)            // clear current selection (silent — no change event)
        ts.clearOptions()         // wipe stale option list
        if (!select.multiple) {
          const placeholder = select.dataset.filterPlaceholder || 'All'
          ts.addOption({ value: '', text: placeholder })
        }
        ts.addOptions(data.map(item => ({ value: String(item[valueKey]), text: item[labelKey] })))
        if (setValues.length) this.setFieldValue(select, select.multiple ? setValues : setValues[0])
        ts.enable()
        if (select.multiple) this.updateSummaryLabel(select, ts)
      } else {
        select.innerHTML = ''

        const placeholder = select.dataset.filterPlaceholder || 'All'
        const blankOption = document.createElement('option')
        blankOption.value = ''
        blankOption.textContent = placeholder
        select.appendChild(blankOption)

        data.forEach(item => {
          const option = document.createElement('option')
          option.value = item[valueKey]
          option.textContent = item[labelKey]
          if (setValues.includes(String(item[valueKey]))) option.selected = true
          select.appendChild(option)
        })
        select.disabled = false
      }
    } catch (e) {
      console.error('[Filter] fetch error:', e)
      if (ts) ts.enable()
      else select.disabled = false
    }
  }

  resetSelect(select, disabled = true) {
    const ts = this.tomSelects.get(select)
    if (ts) {
      ts.clear(true)
      ts.clearOptions()
      disabled ? ts.disable() : ts.enable()
    } else {
      const placeholder = select.dataset.filterPlaceholder || 'Select'
      select.innerHTML = `<option value="">${placeholder}</option>`
      select.value = ''
      select.disabled = disabled
    }
  }

  currentParams() {
    const rootKey = this.element.dataset.filterRootKey
    const params = {}

    this.element.querySelectorAll('[data-filter-field-name]').forEach(el => {
      const value = this.getFieldValue(el)
      if (!this.isValueEmpty(value)) params[el.dataset.filterFieldName] = value
    })

    return { [rootKey]: params }
  }

  saveState() {
    const state = this.currentParams()
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

    const roots = this.remoteSelects.filter(s => !s.dataset.filterDependsOn)

    await Promise.all(roots.map(async (root) => {
      await this.populate(root)
      const sv = savedParams[root.dataset.filterFieldName]
      const hasSetValue = root.dataset.filterSetValue || root.dataset.filterSetValues
      if (sv && !hasSetValue) this.setFieldValue(root, sv)
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

    // emit event so any listener can catch
    const payload = this.currentParams()
    this.element.dispatchEvent(new CustomEvent('filters:ready', { detail: { params: payload }, bubbles: true }))

    try {
      localStorage.setItem(`filterState:${this.filterDtId}`, JSON.stringify(payload))
    } catch (e) {}

    if (Object.keys(payload[rootKey] || {}).length > 0) {
      this.reloadAppDatatable()
    }
  }

  // recursively populate children of parent, restore each child's saved value, then recurse
  async populateDependents(parent, savedParams = {}) {
    const parentKey = parent.dataset.filterFieldName
    const children = this.remoteSelects.filter(s => s.dataset.filterDependsOn === parentKey)

    for (const child of children) {
      this.resetSelect(child)

      const parentValue = this.getFieldValue(parent)
      if (this.isValueEmpty(parentValue)) {
        await this.populateDependents(child, savedParams)
        continue
      }

      await this.populate(child)

      const childSaved = savedParams[child.dataset.filterFieldName]
      const hasSetValue = child.dataset.filterSetValue || child.dataset.filterSetValues
      if (childSaved && !hasSetValue) this.setFieldValue(child, childSaved)

      await this.populateDependents(child, savedParams)
    }
  }

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