/**
 * Retrieves the currently selected email message.
 *
 * @param {Object} event - The event object containing the access token and message ID.
 * @returns {GmailMessage} The GmailMessage object representing the current email.
 */
function getCurrentMail(event) {
  const accessToken = event.gmail.accessToken;
  const messageId = event.gmail.messageId;

  GmailApp.setCurrentMessageAccessToken(accessToken);
  return GmailApp.getMessageById(messageId);
}

/**
 * Loads the add-on and displays the initial card.
 *
 * @param {Object} event - The event object triggered when the add-on is loaded.
 * @returns {Card[]} An array containing the card to be displayed.
 */
function loadAddOn(event) {
  const mailMessage = getCurrentMail(event);
  const sender = mailMessage.getFrom();

  const generateCalendarEventAction = CardService.newAction().setFunctionName('generateCalendar');

  const generateCalendarEventButton = CardService.newTextButton()
    .setText("🔍 Extract Calendar Events")
    .setOnClickAction(generateCalendarEventAction);

  const card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(generateCalendarEventButton)
    )
    .build();

  return [card];
}

/**
 * Generates a direct link to the given email in Gmail.
 *
 * @param {string} mailId - The ID of the email message.
 * @returns {string} The URL to the email message.
 */
function getMailLink(mailId) {
  return "https://mail.google.com/mail/u/0/#inbox/" + mailId;
}

/**
 * Formats a date object into a short date string (e.g., "Feb 26").
 *
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted short date string.
 */
function formatShortDate(date) {
  const options = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Calculates the number of days from now until the given date.
 *
 * @param {Date} givenDate - The date to calculate the difference from.
 * @returns {number} The number of days from now until the given date, rounded up.
 */
function daysAwayFromNow(givenDate) {
  const now = new Date(); 
  const diffTime = givenDate - now; 
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Returns an emoji representing the urgency based on the number of days left.
 *
 * @param {number} daysLeft - The number of days remaining.
 * @returns {string} The emoji representing the urgency (🟢, 🟠, or 🔴).
 */
function getUgencyEmoji(daysLeft) {
  if (daysLeft > 7) return '🟢';
  if (daysLeft > 1) return '🟠';
  return '🔴';
}

/**
 * Generates cards with suggested calendar events extracted from the email content.
 *
 * @param {Object} event - The event object triggered when the "Extract Calendar Events" button is clicked.
 * @returns {Card[]} An array of cards representing the suggested calendar events.
 */
function generateCalendar(event) {
  const mailMessage = getCurrentMail(event);
  const content = mailMessage.getBody();
  const mailLink = getMailLink(mailMessage.getId());

  const suggestedCalendars = extractMeaningfulDate(content, mailMessage.getDate());

  if (suggestedCalendars == null || suggestedCalendars.detectedEvents.length == 0) {
    return noEventsCard();
  }

  const cards = [];

  suggestedCalendars.detectedEvents.forEach((suggestedCalendar) => {
    
    const startDate = new Date(suggestedCalendar.startDateTime);
    const endDate = new Date(suggestedCalendar.endDateTime);
    const eventTitle = suggestedCalendar.eventTitle;
    const eventDescription = suggestedCalendar.eventDescription + '\n source: ' + mailLink;
    suggestedCalendar.eventDescription = eventDescription;
    const eventLocation = suggestedCalendar.eventLocation;

    const daysAway = daysAwayFromNow(startDate);
    const ugencyEmoji = getUgencyEmoji(daysAway);

    const shortDate = formatShortDate(startDate);

    const generateCalendarEventAction = CardService.newAction()
      .setParameters(suggestedCalendar)
      .setFunctionName('createCalendarEvent');

    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(`${ugencyEmoji} ${eventTitle}`)
        .setSubtitle(`${shortDate} (${daysAway} days)`)
      )
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newDecoratedText().setText(eventTitle).setTopLabel('Title').setWrapText(true))
        .addWidget(CardService.newDecoratedText().setText(startDate).setTopLabel('Start Datetime').setWrapText(true))
        .addWidget(CardService.newDecoratedText().setText(endDate).setTopLabel('End Datetime').setWrapText(true))
        .addWidget(CardService.newDecoratedText().setText(eventDescription).setTopLabel('Description').setWrapText(true))
        .addWidget(CardService.newDecoratedText().setText(eventLocation).setTopLabel('Location'))
        .addWidget(CardService.newTextButton()
          .setText("📅 Add Event to Calendar")
          .setOnClickAction(generateCalendarEventAction))
      )
      .build();

    cards.push(card);
  });

  return cards;
}

/**
 * Creates a card indicating that the event was successfully added to the calendar.
 *
 * @param {string} calendarLink - The URL to the newly created calendar event.
 * @returns {Card} The card displaying the success message and a link to the event.
 */
function doneCard(calendarLink) {
  const card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("✅ Successfully added to calendar"))
      .addWidget(CardService.newTextButton()
        .setOpenLink(CardService.newOpenLink().setUrl(calendarLink).setOpenAs(CardService.OpenAs.FULL_SIZE))
        .setText('🔗 See Event in Calendar'))
    )
    .build();

  return card;
}

/**
 * Creates a card indicating that no events were found in the email.
 *
 * @returns {Card} The card displaying the "no events found" message.
 */
function noEventsCard() {
  const card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("🤷 No events found"))
    )
    .build();

  return card;
}


/**
 * Extracts meaningful dates from the email text using a prompt and an AI model.
 *
 * @param {string} text - The text content of the email.
 * @param {Date} messageDate - The date the email was received.
 * @returns {Object|null} An object containing the detected events or null if no events were found or the JSON parsing failed.
 */
function extractMeaningfulDate(text, messageDate) {
  const prompt = `
given the following email text, extract out the meaningful dates that would be a good calendar events to make in the future, order by the most important first.

If there is a relivant dates return JSON with fields {"detectedEvents" : [ "startDateTime"-> json datetime UTZ, "endDateTime"-> json datetime UTZ, "eventTitle"-> string , "eventDescription" -> string, "eventLocation"-> string | "" ]

if there is no specific time for a date, have the time portion of the datetime be from 12:00 to 18:00 in the current timezone


if there is no relivant dates, return {"detectedEvents" : []}

for context the message was recieved on ${messageDate}

email text :
${text}

---end of email text---

JSON response:
`;

  console.log(prompt);

  const rawResponse = callGemini(prompt); 
  const parsedResponse = extractJSON(rawResponse);

  return parsedResponse;
}

/**
 * Extracts a JSON object from a string.
 *
 * @param {string} str - The string containing the JSON object.
 * @returns {Object|null} The parsed JSON object or null if no valid JSON was found or parsing failed.
 */
function extractJSON(str) {
  let startIndex = str.indexOf('{');
  let endIndex = str.lastIndexOf('}');

  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    return null; 
  }

  let jsonString = str.substring(startIndex, endIndex + 1);

  try {
    let jsonObject = JSON.parse(jsonString);
    return jsonObject;
  } catch (error) {
    return null;
  }
}


/**
 * Generates a link to the Google Calendar event.
 *
 * @param {CalendarEvent} event - The calendar event object.
 * @returns {string} The URL to the calendar event.
 */
function getCalendarLink(event) {
  const eventId = event.getId().split('@')[0];
  const calendarId = CalendarApp.getDefaultCalendar().getId();
  const eventURL = "https://www.google.com/calendar/event?eid=" + Utilities.base64Encode(eventId + " " + calendarId).replace('==', '');
  return eventURL;
}

/**
 * Creates a calendar event based on the provided details.
 *
 * @param {Object} calendarEventDetails - An object containing the details of the event.
 * @returns {Card} A card indicating that the event was created successfully.
 */
function createCalendarEvent(calendarEventDetails) {
  calendarEventDetails = calendarEventDetails.commonEventObject.parameters;

  console.log("calendarEventDetails", calendarEventDetails);

  const startDate = new Date(calendarEventDetails.startDateTime);
  const endDate = new Date(calendarEventDetails.endDateTime);
  const eventTitle = calendarEventDetails.eventTitle;
  const eventDescription = calendarEventDetails.eventDescription;
  const eventLocation = calendarEventDetails.eventLocation;

  const event = createEvent(eventTitle, eventDescription, eventLocation, startDate, endDate);

  const eventLink = getCalendarLink(event);
  console.log('eventLink ', eventLink);
  return doneCard(eventLink);
}

/**
 * Creates a new calendar event.
 *
 * @param {string} eventTitle - The title of the event.
 * @param {string} eventDescription - The description of the event.
 * @param {string} eventLocation - The location of the event.
 * @param {Date} eventStartDate - The start date and time of the event.
 * @param {Date} eventEndDate - The end date and time of the event.
 * @returns {CalendarEvent} The newly created calendar event.
 */
function createEvent(eventTitle, eventDescription, eventLocation, eventStartDate, eventEndDate) {
  const event = CalendarApp.getDefaultCalendar().createEvent(
    eventTitle,
    eventStartDate,
    eventEndDate
  );

  event.setDescription(eventDescription);
  event.setLocation(eventLocation);

  Logger.log("Event created: " + event.getTitle() + " on " + eventStartDate);

  return event;
}
