const OFFSCREEN_DOCUMENT_PATH = 'src/content/offscreen.html';


chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install" || details.reason === "update") {
    const graphqlEndpoint = 'https://www.ratemyprofessors.com/graphql';
    let allEdges = [];
    let cursor = null;
    
    do {
      const graphqlQuery = {
        query: `query TeacherSearchPaginationQuery(
          $count: Int!
          $cursor: String
          $query: TeacherSearchQuery!
        ) {
          search: newSearch {
            teachers(query: $query, first: $count, after: $cursor) {
              edges {
                node {
                  id
                  legacyId
                  firstName
                  lastName
                  avgRating
                  numRatings
                  wouldTakeAgainPercent
                  avgDifficulty
                }
              }
              resultCount
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }`,
        variables: {
          count: 1000,
          cursor: cursor,
          query: {
            text: "",
            schoolID: "U2Nob29sLTg4MQ==",
            fallback: true
          }
        }
      };

      try {
        console.log('Sending GraphQL request with cursor:', cursor);
        const response = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic dGVzdDp0ZXN0',
            'X-RMP-COMP-ID': 'eZis9xx8zC-20241120'
          },
          body: JSON.stringify(graphqlQuery)
        });
        
        const data = await response.json();
        const edges = data.data.search.teachers.edges;
        allEdges = [...allEdges, ...edges];
        
        console.log('Total results:', data.data.search.teachers.resultCount);
        console.log('Retrieved edges so far:', allEdges.length);
        
        // Get the next cursor
        cursor = data.data.search.teachers.pageInfo.endCursor;
        const hasNextPage = data.data.search.teachers.pageInfo.hasNextPage;
        
        if (!hasNextPage || !cursor) break;
        
        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('Fetch error:', error);
        break;
      }
    } while (true);

    const completeData = {
      data: {
        search: {
          teachers: {
            edges: allEdges
          }
        }
      }
    };
    
    console.log('Final number of professors:', allEdges.length);
    sendMessageToOffscreenDocument(
      'scrape-professor-data',
      completeData
    );
  }
});

async function sendMessageToOffscreenDocument(type, data) {

  if (!(await hasDocument())) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: 'Parse DOM'
    });
  }

  chrome.runtime.sendMessage({
    type,
    target: 'offscreen',
    data
  });
}

chrome.runtime.onMessage.addListener(handleMessages);


async function handleMessages(message) {
  if (message.target !== 'background') {
    return;
  }
  switch (message.type) {
    case 'scrape-professor-data':
      handleScrapedProfessorData(message.data);
      break;
    case 'raw-review-data':
      sendMessageToOffscreenDocument('raw-review-data', message.data);
      break;
    case 'scrape-review-data':
      handleScrapedReviewData(message.data);
      break;
    case 'notification':
      showNotification(message.data);
    break;
    default:
      console.warn(`Unexpected message type received: '${message.type}'.`);
  }
}

async function handleScrapedProfessorData(data) {

  chrome.storage.local.set({ 'professorsMap': data }, function() {
    
    if (chrome.runtime.lastError) {
      console.error(`Error storing professors data: ${chrome.runtime.lastError}`);
    }
  });
  await chrome.offscreen.closeDocument();
}

async function handleScrapedReviewData(data) {


  chrome.storage.local.set({ 'reviewMap': data }, function() {
    if (chrome.runtime.lastError) {
      console.error(`Error storing professors data: ${chrome.runtime.lastError}`);
    } else {
      chrome.runtime.sendMessage({
        type: 'review-data',
        target: 'popup'
      });
    }
  });


}

async function hasDocument() {
  const matchedClients = await clients.matchAll();
  for (const client of matchedClients) {
    if (client.url.endsWith(OFFSCREEN_DOCUMENT_PATH)) {
      return true;
    }
  }
  return false;
}

function showNotification(professorName){
  const notificationMessage = `Click the extension icon to see ${professorName}'s reviews!`;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: './icons/icon128.png',
    title: 'Review Comment',
    message: notificationMessage,
    priority: 2
  });
}
