chrome.runtime.onMessage.addListener(handleMessages);
var reviewUrl;
var profName;

function handleMessages(message) {
  if (message.target !== 'popup') return;

  switch (message.type) {
    case 'review-data':
      fetchAndDisplayData();
      break;
    default:
      console.warn(`Unexpected message type received: '${message.type}'.`);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  fetchAndDisplayData();
});

function fetchAndDisplayData() {
  chrome.storage.local.get(['reviewMap', 'reviewUrl', 'reviewName'], function(result) {
    if (chrome.runtime.lastError) {
      console.error('Error retrieving data:', chrome.runtime.lastError);
      displayData([]);
    } else {
      reviewUrl = result.reviewUrl;
      profName = result.reviewName;
      displayData(result.reviewMap || []);
    
    }
  });
}


function displayData(data) {
  const container = document.getElementById('dataContainer');
  container.innerHTML = '';

  if (profName) {
    const nameDiv = document.createElement('div');
    nameDiv.className = 'cfjPUG';
    nameDiv.innerHTML = `${profName}'s Reviews!`;
    container.appendChild(nameDiv);
  }


  if (!data || data.length === 0) {
    const addRatingUrl = reviewUrl ? `https://www.ratemyprofessors.com/add/professor-rating/${getLastPartOfUrl(reviewUrl)}` : '#';
    
    const noRatingsDiv = document.createElement('div');
    noRatingsDiv.className = 'NoRatings guYQsv';
    noRatingsDiv.innerHTML = `
      <div>There are no ratings yet<span role="img" aria-label="sobbing emoji">😭</span>
      <a id="rateTeacherButton" class="NoRatingsArea_RateTeacherButton gOaITw" href="${addRatingUrl}">Be the first to rate!</a></div>
    `;
    container.appendChild(noRatingsDiv);

    // Add event listener to the "Be the first to rate" button
    const rateTeacherButton = document.getElementById('rateTeacherButton');
    rateTeacherButton.addEventListener('click', function(event) {
      event.preventDefault(); // Prevent default anchor action
      if (reviewUrl) {
        const professorRatingUrl = `https://www.ratemyprofessors.com/add/professor-rating/${getLastPartOfUrl(reviewUrl)}`;
        window.open(professorRatingUrl, '_blank');
      }
    });

    return;
  }



  data.forEach(review => {
    const reviewElement = document.createElement('div');
    reviewElement.classList.add('review');

    const qualityRatingClass = getQualityRatingClass(review.qualityRating);
    const difficultyRatingClass = 'cDKJcc'; // Grey as default

    reviewElement.innerHTML = `
    <div class="RatingCard jcIQzP">
    <div class="RatingBody dGrvXb">
        <div class="RatingValues_Styled gFOUvY">
            <div class="RatingValues_Container DObVa">
                <div class="RatingValues eWZmyX">
                    <div class="QualityHeader fVETNc">Quality</div>
                    <div class="QualityValue ${qualityRatingClass}">${review.qualityRating}</div>
                </div>
            </div>
            <div class="RatingValues_Container DObVa">
                <div class="RatinGvalues eWZmyX">
                    <div class="DifficultyHeader fVETNc">Difficulty</div>
                    <div class="DifficultyValue ${difficultyRatingClass}">${review.difficultyRating}</div>
                </div>
            </div>
        </div>
        <div class="Rating__RatingInfo kEVEoU">
            <div class="RatingHeader__StyledHeader jTpfex">
                <div class="RatingHeader__ClassInfoWrapper hrIcnr">
                    <div class="RatingHeader__StyledClass eXfReS"> <!-- -->${review.className}</div>
                </div>
                <div
                    class="RatingHeader__RatingTimeStamp-sc-1dlkqw1-4 iwwYJD">
                    ${review.datePosted}</div>
            </div>
            <div class="CourseMeta__StyledCourseMeta-x344ms-0 fPJDHT">
                <div class="MetaItem__StyledMetaItem-y0ixml-0 LXClX">Would Take Again<!-- -->: <span>${review.wouldTakeAgain}</span></div>
            </div>
            <div class="Comments__StyledComments gRjWel">${review.comments}</div>
        </div>
    </div>
</div>
    `;

    container.appendChild(reviewElement);
  });

  appendLoadMoreButton(container);

}

function appendLoadMoreButton(container) {
  const loadMoreButton = document.createElement('button');
  loadMoreButton.className = 'eUNaBX';
  loadMoreButton.textContent = 'Load More Ratings';
  loadMoreButton.addEventListener('click', function() {
    if (reviewUrl) {
      window.open(reviewUrl, '_blank');
    } else {
      console.error('No review URL available.');
    }
  });
  container.appendChild(loadMoreButton);
}

function getQualityRatingClass(qualityRating) {
  const rating = parseFloat(qualityRating);
  if (rating <= 2.5) return 'bUneqk'; // Red for low rating
  if (rating <= 3.5) return 'icXUyq'; // Yellow for medium rating
  return 'gcFhmN'; // Green for high rating
}

function getLastPartOfUrl(url) {
  const parts = url.split('/');
  return parts.pop() || parts.pop();
}


