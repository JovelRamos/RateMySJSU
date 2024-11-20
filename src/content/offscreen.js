chrome.runtime.onMessage.addListener(handleMessages);


async function handleMessages(message) {
  if (message.target !== 'offscreen') {
    return false;
  }
  const response = await fetch(message.data);
  const htmlString = await response.text();

  switch (message.type) {
    case 'scrape-professor-data':
      scrapeProfessorData(htmlString);
      break;
    case 'raw-review-data':
      scrapeReviewData(htmlString);
      break;
    default:
      console.warn(`Unexpected message type received: '${message.type}'.`);
      return false;
  }
}

function scrapeProfessorData(htmlString) {

  const parser = new DOMParser();
  const document = parser.parseFromString(htmlString, 'text/html');
  const professorsMap = {};

  document.querySelectorAll("[class^='TeacherCard__StyledTeacherCard-syjs0d-0']").forEach(function (card) {
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
    professorsMap[key] = {
      firstName,
      lastName,
      overallRating,
      wouldTakeAgain,
      levelOfDifficulty,
      numberOfRatings,
      legacyID
    };
  });

  sendToBackground('scrape-professor-data', professorsMap);
}

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
