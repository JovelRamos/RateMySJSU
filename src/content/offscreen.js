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
        wouldTakeAgain: (node.wouldTakeAgainPercent === -1 ? 'No Rating' : Math.round(node.wouldTakeAgainPercent)?.toString() + '%') || 'No Rating',
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


function sendToBackground(type, data) {

  chrome.runtime.sendMessage({
    type,
    target: 'background',
    data
  });
}
