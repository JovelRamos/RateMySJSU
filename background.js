const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install" || details.reason === "update") {
    const rmpDataUrl = chrome.runtime.getURL('rmpData.html');
    sendMessageToOffscreenDocument(
      'scrape-professor-data',
      rmpDataUrl
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
    default:
      console.warn(`Unexpected message type received: '${message.type}'.`);
  }
}

async function handleScrapedProfessorData(data) {
  console.log('Received scraped professor data', data);


  chrome.storage.local.set({ 'professorsMap': data }, function() {
    if (chrome.runtime.lastError) {
      console.error(`Error storing professors data: ${chrome.runtime.lastError}`);
    } else {
      console.log('Professor data stored successfully.');
    }
  });

  await chrome.offscreen.closeDocument();
}

async function handleScrapedReviewData(data) {
  console.log('Received scraped review data', data);


  chrome.storage.local.set({ 'reviewMap': data }, function() {
    if (chrome.runtime.lastError) {
      console.error(`Error storing professors data: ${chrome.runtime.lastError}`);
    } else {
      console.log('Professor data stored successfully.');
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
