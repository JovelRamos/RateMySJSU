let professorData = {};
let dataTable;

removeButton();

loadProfessorData().then(() => {
  if (window.jQuery && jQuery.fn.DataTable.isDataTable('#classSchedule')) {
    dataTable = jQuery('#classSchedule').DataTable();
  }
  modifyTable();
});

function removeButton() {
  var button = document.getElementById('btnLoadTable');
  if (button) {
    button.parentNode.removeChild(button);
  }
}

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


function sendToBackground(type, data) {
  chrome.runtime.sendMessage({
    type,
    target: 'background',
    data
  });
}



function modifyTable() {

  jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    "rating-pre": function (data) {
      return data === 'No Rating' ? -1 : parseFloat(data) || 0;
    },
    "rating-asc": function (a, b) {
      return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    },
    "rating-desc": function (a, b) {
      return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    }
  });


  if (window.jQuery) {
    if (typeof jQuery.fn.DataTable === 'function') {
      if (jQuery.fn.DataTable.isDataTable('#classSchedule')) {
        dataTable = jQuery('#classSchedule').DataTable();
        dataTable.destroy();
      }

      const OVERALL_RATING_INDEX = 14;
      const DIFFICULTY_RATING_INDEX = 15;
      const RETAKE_PERCENTAGE_INDEX = 16;
      const NUMBER_OF_RATINGS_INDEX = 17;

      jQuery('#classSchedule').removeClass('hide');

      const theadTr = jQuery('#classSchedule thead tr');
      theadTr.append('<th>Average Rating</th>');
      theadTr.append('<th>Difficulty Level</th>');
      theadTr.append('<th>Would Take Again %</th>');
      theadTr.append('<th>Review Count</th>');
      theadTr.append('<th>Reviews</th>');
      

      const tbodyTrs = jQuery('#classSchedule tbody tr');
      tbodyTrs.each(function () {
        jQuery(this).append('<td></td>');
        jQuery(this).append('<td></td>');
        jQuery(this).append('<td></td>');
        jQuery(this).append('<td></td>');
        jQuery(this).append('<td class="actions-cell"></td>');
      });

      var addButtonSrc = chrome.runtime.getURL("./icons/add.png");
      var commentButtonSrc = chrome.runtime.getURL("./icons/comment.png");

      dataTable = jQuery('#classSchedule').DataTable({
        "columnDefs": [
          { "className": "dt-center", "targets": "_all" },
          { "searchable": false, "targets": [3, 5, 6, 7, 8, 10, 11, 12, 13, 14] },
          { "type": "rating", "targets": [OVERALL_RATING_INDEX, DIFFICULTY_RATING_INDEX, RETAKE_PERCENTAGE_INDEX] },
          {
            "targets": -1,
            "orderable": false,
            "data": null,
            "defaultContent": '<button class="action-btn action-btn-spacing add-btn"><img src="' + addButtonSrc + '" alt="Add"/></button>' +
            '<button class="action-btn comment-btn"><img src="' + commentButtonSrc + '" alt="Comment"/></button>'
          }
        ],
        "drawCallback": function(settings) {
          // This function runs every time the table is drawn (e.g., pagination change)
          var api = new jQuery.fn.dataTable.Api(settings);
          api.rows().every(function () {
            var row = this.node();
            var data = this.data();
            var instructorName = jQuery('<div>').html(data[9]).find('a').text(); // Adjust the index if necessary
            
            if (instructorName) {
              var names = instructorName.split(' ');
              if (names.length >= 2) {
                var key = `${names[0].toLowerCase()}_${names[1].toLowerCase()}`;
                var professorInfo = professorData[key];
    
                if (professorInfo) {
                  jQuery(row).find('.action-btn').show();
                  jQuery(row).find('.comment-btn').show();
              }
            }
          }
          });
        },
        "destroy": true
      });



      $('#classSchedule').on('click', '.add-btn', function () {
        var rowData = dataTable.row(jQuery(this).parents('tr')).data();
        var instructorName = jQuery('<div>').html(rowData[9]).find('a').text();
        
        if (instructorName) {
          var names = instructorName.split(' ');
          if (names.length >= 2) {
            var key = `${names[0].toLowerCase()}_${names[1].toLowerCase()}`;
            var professorInfo = professorData[key];
            if (professorInfo && professorInfo.legacyID) {
              var addUrl = 'https://www.ratemyprofessors.com/add/professor-rating/' + professorInfo.legacyID;
              window.open(addUrl, '_blank');
            }
          }
        }
      });
      
      $('#classSchedule').on('click', '.comment-btn', function () {
        var rowData = dataTable.row(jQuery(this).parents('tr')).data();
        var instructorName = jQuery('<div>').html(rowData[9]).find('a').text();
        
        if (instructorName) {
          var names = instructorName.split(' ');
          if (names.length >= 2) {
            var key = `${names[0].toLowerCase()}_${names[1].toLowerCase()}`;
            var professorInfo = professorData[key];
            if (professorInfo && professorInfo.legacyID) {
                var theURL = `https://www.ratemyprofessors.com/professor/${professorInfo.legacyID}`;
                chrome.storage.local.set({ 'reviewUrl': theURL });
                chrome.storage.local.set({ 'reviewName': instructorName });
                sendToBackground('raw-review-data', theURL);
                sendToBackground('notification', instructorName);
            }
          }
        }
      });

      dataTable.rows().every(function () {
        var row = this.node();
        var rowData = this.data();
        var cellHtml = rowData[9];

        var instructorName = jQuery('<div>').html(cellHtml).find('a').text();

        if (instructorName) {
          var names = instructorName.split(' ');
          if (names.length >= 2) {
            var key = `${names[0].toLowerCase()}_${names[1].toLowerCase()}`;

            var professorInfo = professorData[key];
            if (professorInfo) {
              if (parseInt(professorInfo.numberOfRatings) === 0) {
                dataTable.cell(row, OVERALL_RATING_INDEX).data('No Rating');
                dataTable.cell(row, DIFFICULTY_RATING_INDEX).data('No Rating');
                dataTable.cell(row, RETAKE_PERCENTAGE_INDEX).data('No Rating');
                dataTable.cell(row, NUMBER_OF_RATINGS_INDEX).data('0');
              } else {
              var displayRating = professorInfo.overallRating;
              if (displayRating !== 'No Rating' && displayRating.endsWith('.0')) {
                displayRating = displayRating.slice(0, -2);
              }

              dataTable.cell(row, OVERALL_RATING_INDEX).data(
                displayRating !== 'No Rating' ? displayRating + '/5' : 'No Rating'
              );
              dataTable.cell(row, DIFFICULTY_RATING_INDEX).data(
                professorInfo.levelOfDifficulty !== 'No Rating' ? professorInfo.levelOfDifficulty : 'No Rating'
              );
              dataTable.cell(row, RETAKE_PERCENTAGE_INDEX).data(
                professorInfo.wouldTakeAgain !== 'No Rating' ? professorInfo.wouldTakeAgain : 'No Rating'
              );
              dataTable.cell(row, NUMBER_OF_RATINGS_INDEX).data(parseInt(professorInfo.numberOfRatings));
              }
              jQuery(row).find('.action-btn').show();
              jQuery(row).find('.comment-btn').show();

              

            } else {
              dataTable.cell(row, OVERALL_RATING_INDEX).data('No Rating');
              dataTable.cell(row, DIFFICULTY_RATING_INDEX).data('No Rating');
              dataTable.cell(row, RETAKE_PERCENTAGE_INDEX).data('No Rating');
              dataTable.cell(row, NUMBER_OF_RATINGS_INDEX).data('0');
            }
          } else {
            console.error('Instructor name does not have at least two parts:', instructorName);
          }
        } else {
          dataTable.cell(row, OVERALL_RATING_INDEX).data('No Rating');
          dataTable.cell(row, DIFFICULTY_RATING_INDEX).data('No Rating');
          dataTable.cell(row, RETAKE_PERCENTAGE_INDEX).data('No Rating');
          dataTable.cell(row, NUMBER_OF_RATINGS_INDEX).data('0');
        }
      });

      dataTable.columns.adjust().draw();
      dataTable.draw();

    } else {
      setTimeout(modifyTable, 100);
    }
  } else {
    console.error('jQuery is not available.');
  }

  
}


