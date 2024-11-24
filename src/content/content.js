let professorData = {};
let dataTable;

removeButton();


loadProfessorData().then(() => {
  if (window.jQuery && jQuery.fn.DataTable.isDataTable('#classSchedule')) {
    dataTable = jQuery('#classSchedule').DataTable();
  }
  modifyTable();
});

//remove "Load Class Schedule button"
function removeButton() {
  var button = document.getElementById('btnLoadTable');
  if (button) {
    button.parentNode.removeChild(button);
  }
}

// loads professor data from chrome.storage.local
function loadProfessorData() {

  return new Promise((resolve, reject) => {
    chrome.storage.local.get('professorsMap', (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving professor data:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        professorData = result.professorsMap;
        resolve();
      }
    });
  });
}

//send message to background script to fetch review data
function sendToBackground(type, data) {
  chrome.runtime.sendMessage({
    type,
    target: 'background',
    data
  }, response => {
    if (chrome.runtime.lastError) {
      console.error('Connection error:', chrome.runtime.lastError.message);
    }
  });
}


// modifies and enhances class schedule table, adding RMP values
function modifyTable() {
  // Custom sorting for ratings
  jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    "rating-pre": function (data) {
      return data === 'No Rating' ? -1 : parseFloat(data) || 0;
    },
    "rating-asc": function (a, b) {
      return a < b ? -1 : (a > b ? 1 : 0);
    },
    "rating-desc": function (a, b) {
      return a < b ? 1 : (a > b ? -1 : 0);
    }
  });


  if (!window.jQuery) {
    console.error('jQuery is not available.');
    return;
  }

  if (typeof jQuery.fn.DataTable !== 'function') {
    setTimeout(modifyTable, 100);
    return;
  }

  const COLUMN_INDICES = {
    OVERALL_RATING: 14,
    DIFFICULTY_RATING: 15,
    RETAKE_PERCENTAGE: 16,
    NUMBER_OF_RATINGS: 17,
    INSTRUCTOR_NAME: 9
  };

  // Destroy existing DataTable if it exists
  if (jQuery.fn.DataTable.isDataTable('#classSchedule')) {
    jQuery('#classSchedule').DataTable().destroy();
  }

  // add new columns
  const newColumns = ['Average Rating', 'Difficulty Level', 'Would Take Again %', 'Review Count', 'Reviews'];
  const theadTr = jQuery('#classSchedule thead tr');
  newColumns.forEach(col => theadTr.append(`<th>${col}</th>`));

  // Add empty cells for new columns
  const tbodyTrs = jQuery('#classSchedule tbody tr');
  tbodyTrs.each(function() {
    jQuery(this).append('<td></td>'.repeat(4));
    jQuery(this).append('<td class="actions-cell"></td>');
  });

  // Initialize DataTable
  const commentButtonSrc = chrome.runtime.getURL("./icons/comment.png");
  const dataTable = jQuery('#classSchedule').DataTable({
    columnDefs: [
      { className: "dt-center", targets: "_all" },
      { searchable: false, targets: [3, 5, 6, 7, 8, 10, 11, 12, 13, 14] },
      { type: "rating", targets: [COLUMN_INDICES.OVERALL_RATING, COLUMN_INDICES.DIFFICULTY_RATING, COLUMN_INDICES.RETAKE_PERCENTAGE] },
      {
        targets: -1,
        orderable: false,
        data: null,
        defaultContent: `<button class="action-btn comment-btn"><img src="${commentButtonSrc}" alt="Comment"/></button>`
      }
    ],
    drawCallback: function(settings) {
      const api = new jQuery.fn.dataTable.Api(settings);
      api.rows().every(function() {
        const row = this.node();
        const instructorName = getInstructorName(this.data()[COLUMN_INDICES.INSTRUCTOR_NAME]);
        if (instructorName) {
          const professorKey = getProfessorKey(instructorName);
          if (professorKey && professorData[professorKey]) {
            jQuery(row).find('.comment-btn').show();
          }
        }
      });
    },
    destroy: true
  });

  // helper functions
  function getInstructorName(cellHtml) {
    return jQuery('<div>').html(cellHtml).find('a').text() || '';
  }

  function getProfessorKey(instructorName) {
    const names = instructorName.split(' ');
    return names.length >= 2 ? `${names[0].toLowerCase()}_${names[names.length - 1].toLowerCase()}` : null;
  }

  function updateCellData(row, professorInfo) {
    const defaultData = {
      [COLUMN_INDICES.OVERALL_RATING]: 'No Rating',
      [COLUMN_INDICES.DIFFICULTY_RATING]: 'No Rating',
      [COLUMN_INDICES.RETAKE_PERCENTAGE]: 'No Rating',
      [COLUMN_INDICES.NUMBER_OF_RATINGS]: '0'
    };

    if (!professorInfo || parseInt(professorInfo.numberOfRatings) === 0) {
      Object.entries(defaultData).forEach(([index, value]) => {
        dataTable.cell(row, index).data(value);
      });
      return;
    }

    let displayRating = professorInfo.overallRating;
    if (displayRating !== 'No Rating' && displayRating.endsWith('.0')) {
      displayRating = displayRating.slice(0, -2);
    }

    dataTable.cell(row, COLUMN_INDICES.OVERALL_RATING).data(
      displayRating !== 'No Rating' ? `${displayRating}/5` : 'No Rating'
    );
    dataTable.cell(row, COLUMN_INDICES.DIFFICULTY_RATING).data(professorInfo.levelOfDifficulty);
    dataTable.cell(row, COLUMN_INDICES.RETAKE_PERCENTAGE).data(professorInfo.wouldTakeAgain);
    dataTable.cell(row, COLUMN_INDICES.NUMBER_OF_RATINGS).data(parseInt(professorInfo.numberOfRatings));
  }

  // handle comment button clicks
  jQuery('#classSchedule').on('click', '.comment-btn', function() {
    const rowData = dataTable.row(jQuery(this).parents('tr')).data();
    const instructorName = getInstructorName(rowData[COLUMN_INDICES.INSTRUCTOR_NAME]);
    
    if (instructorName) {
      const professorKey = getProfessorKey(instructorName);
      const professorInfo = professorData[professorKey];
      
      if (professorInfo?.legacyID) {
        const encodedId = btoa(`Teacher-${professorInfo.legacyID}`);
        chrome.storage.local.set({ 
          'reviewUrl': `https://www.ratemyprofessors.com/professor/${professorInfo.legacyID}`,
          'reviewName': instructorName 
        });
        sendToBackground('fetch-review-data', encodedId);
        sendToBackground('notification', instructorName);
      }
    }
  });

  // Update all rows with professor data
  dataTable.rows().every(function() {
    const row = this.node();
    const instructorName = getInstructorName(this.data()[COLUMN_INDICES.INSTRUCTOR_NAME]);
    
    if (instructorName) {
      const professorKey = getProfessorKey(instructorName);
      const professorInfo = professorData[professorKey];
      
      updateCellData(row, professorInfo);
      
      if (professorInfo) {
        jQuery(row).find('.action-btn, .comment-btn').show();
      }
    } else {
      updateCellData(row, null);
    }
  });

  jQuery('#classSchedule').removeClass('hide');
  dataTable.columns.adjust().draw();
}


