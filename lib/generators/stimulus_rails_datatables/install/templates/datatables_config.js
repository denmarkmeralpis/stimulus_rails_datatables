// Import the functions to set and get the config
import { setDatatablesConfig } from 'stimulus_rails_datatables/config'

// DataTables Configuration Override
// Customize these settings to match your application's needs
// This file overrides the default gem configuration
export const datatablesConfig = {
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
  lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]]
}

// Apply the custom configuration
setDatatablesConfig(datatablesConfig)
