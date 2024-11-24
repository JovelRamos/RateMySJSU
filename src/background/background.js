const OFFSCREEN_DOCUMENT_PATH = 'src/content/offscreen.html';

//Queries all RateMyProfessors' data for SJSU professors
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

    console.log("All professors exctracted.");
    
    const completeData = {
      data: {
        search: {
          teachers: {
            edges: allEdges
          }
        }
      }
    };

    const professorsMap = {};

    completeData.data.search.teachers.edges.forEach(({ node }) => {

      const firstNameParts = node.firstName.split(' ');
      const lastNameParts = node.lastName.split(' ');


      const firstName = firstNameParts[0];
      const lastName = lastNameParts[lastNameParts.length - 1];
      const key = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
      
      professorsMap[key] = {
        firstName: node.firstName,
        lastName: node.lastName,
        overallRating: node.avgRating?.toString() || 'No Rating',
        wouldTakeAgain: (node.wouldTakeAgainPercent === -1 ? 'No Rating' : Math.round(node.wouldTakeAgainPercent)?.toString() + '%') || 'No Rating',
        levelOfDifficulty: node.avgDifficulty?.toString() || 'No Rating',
        numberOfRatings: node.numRatings?.toString() || '0',
        legacyID: node.legacyId?.toString()
      };
    });
  
    chrome.storage.local.set({ 'professorsMap': professorsMap });
  }
});



chrome.runtime.onMessage.addListener(handleMessages);

// message handler for background.js
async function handleMessages(message) {
  if (message.target !== 'background') {
    return;
  }
  switch (message.type) {
    case 'fetch-review-data':
      fetchReviewData(message.data);
      break;
    case 'notification':
      showNotification(message.data);
    break;
    default:
      console.warn(`Unexpected message type received: '${message.type}'.`);
  }
}

// fetches review data from user-selected professor 
async function fetchReviewData(professorId) {
  const reviewData = [];
  const graphqlEndpoint = 'https://www.ratemyprofessors.com/graphql';
 
  const graphqlQuery = {
    query: `query RatingsListQuery(
      $count: Int!
      $id: ID!
    ) {
      node(id: $id) {
        ... on Teacher {
          ratings(first: $count) {
            edges {
              node {
                helpfulRating
                difficultyRating  
                comment
                wouldTakeAgain
                class
                date
              }
            }
          }
        }
      }
    }`,
    variables: {
      count: 5,
      id: professorId
    }
  };
 
  try {
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
    const edges = data.data.node.ratings.edges;
    
    edges.forEach(edge => {
      reviewData.push({
        qualityRating: edge.node.helpfulRating?.toFixed(1) || '0.0',
        difficultyRating: edge.node.difficultyRating?.toFixed(1) || '0.0',
        comments: edge.node.comment,
        wouldTakeAgain: edge.node.wouldTakeAgain ? 'Yes' : 'No',
        className: edge.node.class,
        datePosted: new Date(edge.node.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short', 
          day: 'numeric'
        })
      });
    });
 
  } catch (error) {
    console.error('Fetch error:', error);
  }
 
  chrome.storage.local.set({ 'reviewMap': reviewData }, function() {
    if (chrome.runtime.lastError) {
      console.error(`Error storing review data: ${chrome.runtime.lastError}`);
    } else {
      chrome.runtime.sendMessage({
        type: 'review-data',
        target: 'popup'
      });
    }
  });
 }

 // notifies user of newly available review
function showNotification(professorName){
  const notificationMessage = `Click the extension icon to see ${professorName}'s reviews!`;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/icons/icon128.png',
    title: 'Review Comment',
    message: notificationMessage,
    priority: 2
  });
}
