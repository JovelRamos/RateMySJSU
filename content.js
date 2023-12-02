let professorData = {};
let dataTable;

loadProfessorData().then(() => {
  if (window.jQuery && jQuery.fn.DataTable.isDataTable('#classSchedule')) {
    dataTable = jQuery('#classSchedule').DataTable();
  }
  modifyTable();
});

function loadProfessorData() {
  console.log('loadProfessorData called');

  return new Promise((resolve, reject) => {
    chrome.storage.local.get('professorsMap', (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving professor data:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log('Retrieved professor data:', result.professorsMap);
        professorData = result.professorsMap;
        resolve();
      }
    });
  });
}

function modifyTable() {
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

      const tbodyTrs = jQuery('#classSchedule tbody tr');
      tbodyTrs.each(function () {
        jQuery(this).append('<td></td>');
        jQuery(this).append('<td></td>');
        jQuery(this).append('<td></td>');
        jQuery(this).append('<td></td>');
      });

      dataTable = jQuery('#classSchedule').DataTable({
        "columnDefs": [
          { "searchable": false, "targets": [3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] }
        ],
        "destroy": true
      });

      dataTable.rows().every(function () {
        var row = this.node();
        var rowData = this.data();
        var cellHtml = rowData[9];

        var instructorName = jQuery('<div>').html(cellHtml).find('a').text();
        console.log('Instructor Name:', instructorName);

        if (instructorName) {
          var names = instructorName.split(' ');
          if (names.length >= 2) {
            var key = `${names[0].toLowerCase()}_${names[1].toLowerCase()}`;
            console.log('Generated key:', key);

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

      dataTable.draw();

    } else {
      setTimeout(modifyTable, 100);
    }
  } else {
    console.error('jQuery is not available.');
  }
}

