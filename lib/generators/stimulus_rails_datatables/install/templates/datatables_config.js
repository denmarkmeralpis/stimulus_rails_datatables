// DataTables Configuration Override
// Set window.datatablesConfig to customize DataTables settings
// This will override the gem's default configuration

window.datatablesConfig = {
  // Language strings for DataTables UI
  language: {
    processing: '<div class="spinner-border"></div><div class="mt-2">Loading...</div>',
    lengthMenu: 'show <span class="px-2">_MENU_</span> entries',

    // Uncomment and customize any of these as needed:
    // search: `<div class="ms-auto d-flex flex-wrap btn-list">
    //           <div class="input-group input-group-flat w-auto" data-controller="kbd-focus">
    //             <span class="input-group-text"><i class="material-symbols-outlined">search</i></span>
    //             _INPUT_
    //             <span class="input-group-text">
    //               <kbd>ctrl + k</kbd>
    //             </span>
    //           </div>
    //         </div>`,

    // info: 'Showing _START_ to _END_ of _TOTAL_ entries',
    // infoEmpty: 'Showing 0 to 0 of 0 entries',
    // infoFiltered: '(filtered from _MAX_ total entries)',
    // paginate: {
    //   first: 'First',
    //   last: 'Last',
    //   next: 'Next',
    //   previous: 'Previous'
    // },
    // emptyTable: 'No data available',
    // zeroRecords: 'No matching records found'
  },

  // Default layout configuration
  layout: {
    topStart: 'pageLength',
    topEnd: 'search',
    bottomStart: 'info',
    bottomEnd: 'paging'
  },

  // Length menu options
  lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],

  // Go back to the first page when filters change (override per table with datatable_for reset_paging:)
  resetPaging: false
}
