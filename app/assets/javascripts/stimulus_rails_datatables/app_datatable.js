import DataTable from 'datatables.net-responsive-bs5'

// Set global DataTables default for orderSequence
Object.assign(DataTable.defaults.column, {
  orderSequence: ['desc', 'asc']
})

class AppDataTable {
  constructor(selector, options) {
    // Initialize the DataTable just like the original one
    this.table = new DataTable(selector, options)
    this.id = selector.replace('#', '') // Extract ID from selector
  }

  // Reload a specific DataTable by ID
  static reload(datatableID) {
    const datatable = new AppDataTable(datatableID).table

    if (datatable.context.length === 1) {
      datatable.ajax.reload(null, false)
    }
  }

  // Change the data source & reload
  static load(datatableID, url) {
    const datatable = new AppDataTable(datatableID).table

    if (datatable.context.length === 1) {
      datatable.ajax.url(url).load()
    }
  }

  // Reload all DataTables
  static reloadAll() {
    DataTable.tables({ api: true }).ajax.reload(null, false)
  }
}

export { AppDataTable }
