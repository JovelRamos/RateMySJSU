chrome.runtime.onMessage.addListener(handleMessages);


async function handleMessages(message) {
  if (message.target !== 'offscreen') {
    return false;
  }

  switch (message.type) {
    case 'scrape-professor-data':
      scrapeProfessorData(message.data);
      break;
    case 'raw-review-data':
      scrapeReviewData(message.data);
      break;
    default:
      console.warn(`Unexpected message type received: '${message.type}'.`);
      return false;
  }
}

function scrapeProfessorData(data) {
  console.log('Received data in scrapeProfessorData:', data);
  const professorsMap = {};
  
  // Correctly navigate the GraphQL response structure
  if (data?.data?.search?.teachers?.edges) {
    console.log('Number of professors found:', data.data.search.teachers.edges.length);
    
    data.data.search.teachers.edges.forEach(({ node }) => {
      console.log('Processing professor:', node);
      const firstName = node.firstName;
      const lastName = node.lastName;
      const key = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
      
      professorsMap[key] = {
        firstName,
        lastName,
        overallRating: node.avgRating?.toString() || 'No Rating',
        wouldTakeAgain: (node.wouldTakeAgainPercent === -1 ? 'No Rating' : node.wouldTakeAgainPercent?.toString() + '%') || 'No Rating',
        levelOfDifficulty: node.avgDifficulty?.toString() || 'No Rating',
        numberOfRatings: node.numRatings?.toString() || '0',
        legacyID: node.legacyId?.toString()
      };
    });
    
    console.log('Processed professors map:', professorsMap);
  } else {
    console.error('Invalid data structure:', data);
  }

  sendToBackground('scrape-professor-data', professorsMap);
}

//NOT WORKING ATM
function scrapeReviewData(htmlString) {

  const parser = new DOMParser();
  const document = parser.parseFromString(htmlString, 'text/html');

  const scrapedData = [];

  Array.from(document.querySelectorAll("[class^='Rating__StyledRating-sc-1rhvpxz-1 jcIQzP']"))
  .slice(0, 3)
  .forEach(function (card) {

    const qualityRating = card.querySelector("[class*='CardNumRating__CardNumRatingNumber-sc-17t4b9u-']")?.textContent.trim();
    const difficultyRating = card.querySelector(".CardNumRating__CardNumRatingNumber-sc-17t4b9u-2.cDKJcc")?.textContent.trim();
    const comments = card.querySelector(".Comments__StyledComments-dzzyvm-0")?.textContent.trim();
    const wouldTakeAgain = card.querySelector("span")?.textContent.trim();
    const className = card.querySelector(".RatingHeader__StyledClass-sc-1dlkqw1-3.eXfReS")?.textContent.trim();
    const datePosted = card.querySelector(".TimeStamp__StyledTimeStamp-sc-9q2r30-0.bXQmMr")?.textContent.trim();

    scrapedData.push({
      qualityRating,
      difficultyRating,
      comments,
      wouldTakeAgain,
      className,
      datePosted
    });
});

  
  sendToBackground('scrape-review-data', scrapedData);

}

function sendToBackground(type, data) {

  chrome.runtime.sendMessage({
    type,
    target: 'background',
    data
  });
}
