chrome.runtime.onMessage.addListener(handleMessages);


async function handleMessages(message) {
  if (message.target !== 'offscreen') {
    return false;
  }


  switch (message.type) {
    case 'scrape-professor-data':
      const response = await fetch(message.data);
      const htmlString = await response.text();
      scrapeProfessorData(htmlString);
      break;
    default:
      console.warn(`Unexpected message type received: '${message.type}'.`);
      return false;
  }
}

function scrapeProfessorData(htmlString) {
  console.log("Scraping data from HTML string.");

  const parser = new DOMParser();
  const document = parser.parseFromString(htmlString, 'text/html');
    const scrapedProfessors = [];
    document
    .querySelectorAll("[class^='TeacherCard__StyledTeacherCard-syjs0d-0']").forEach(function (card) {
      const nameText = card.querySelector("[class^='CardName__StyledCardName-sc-1gyrgim-0']").textContent;
      const nameParts = nameText.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
  
      const overallRating = card.querySelector("[class^='CardNumRating__CardNumRatingNumber-sc-17t4b9u-2']").textContent;
      const wouldTakeAgain = card.querySelectorAll("[class^='CardFeedback__CardFeedbackNumber-lq6nix-2']")[0].textContent;
      const levelOfDifficulty = card.querySelectorAll("[class^='CardFeedback__CardFeedbackNumber-lq6nix-2']")[1].textContent;
      const numberOfRatings = card.querySelector("[class^='CardNumRating__CardNumRatingCount-sc-17t4b9u-3']").textContent;
      const legacyIDHref = card.getAttribute("href");
      const legacyID = legacyIDHref.split("/")[4];
  
      const key = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
      scrapedProfessors.push({
        key,
        firstName,
        lastName,
        overallRating,
        wouldTakeAgain,
        levelOfDifficulty,
        numberOfRatings,
        legacyID
      });
    });
  
    
    const professorsMap = {};
    scrapedProfessors.forEach(professor => {
      const key = `${professor.firstName.toLowerCase()}_${professor.lastName.toLowerCase()}`;
      professorsMap[key] = {
        firstName: professor.firstName,
        lastName: professor.lastName,
        overallRating: professor.overallRating,
        wouldTakeAgain: professor.wouldTakeAgain,
        levelOfDifficulty: professor.levelOfDifficulty,
        numberOfRatings: professor.numberOfRatings,
        legacyID: professor.legacyID
      };
    });

    sendToBackground('scrape-professor-data', professorsMap);
}

function sendToBackground(type, data) {
  chrome.runtime.sendMessage({
    type,
    target: 'background',
    data
  });
}
