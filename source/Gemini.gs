/**
 * This script demonstrates how to call the Gemini API from Google Apps Script.
 * It includes functions to:
 * - Authenticate with the Vertex AI API using a service account.
 * - Send a request to the Gemini API.
 * - Parse the response from the Gemini API.
 */

// Constants for Vertex AI API.
const REGION = 'us-central1';
const PROJECT_ID = SERVICE_ACCOUNT.project_id;
const MODEL = 'gemini-1.5-flash-001'; // Choose the desired Gemini model.

// Get the service object for interacting with the Vertex AI API.
const service = getService();

/**
 * Calls the Gemini API with the given prompt and returns the response.
 *
 * @param {string} prompt The text prompt to send to Gemini.
 * @return {string} The text response from Gemini.
 */
function callGemini(prompt) {
  console.log('Calling Gemini on Vertex AI');

  // Get an access token for authentication.
  const token = service.getAccessToken();

  // Check if the service account has access to the Vertex AI API.
  if (!service.hasAccess()) {
    Logger.log('Error: ', service.getLastError());
    return;
  }

  // Construct the API request URL.
  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODEL}:generateContent`;

  // Construct the API request payload.
  const payload = {
    "contents": {
      "role": "user",
      "parts": {
        "text": prompt
      }
    },
    "safety_settings": {
      "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      "threshold": "BLOCK_LOW_AND_ABOVE"
    },
    "generation_config": {
      "temperature": 0.2,
      "topP": 0.8,
      "topK": 40
    }
  };

  // Construct the API request options.
  const options = {
    "method": "POST",
    "headers": {
      "Authorization": 'Bearer ' + token
    },
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  // Send the API request.
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseContent = JSON.parse(response.getContentText());

  // Log the response code.
  Logger.log("Response code: " + responseCode);

  // Parse and return the Gemini response.
  return parseGeminiResponse(responseContent);
}

/**
 * Parses the response from the Gemini API and returns the generated text.
 *
 * @param {object} response The JSON response from the Gemini API.
 * @return {string} The generated text from Gemini.
 */
function parseGeminiResponse(response) {
  return response.candidates[0].content.parts[0].text;
}

/**
 * Test function to call Gemini with a sample prompt.
 */
function test_gemini() {
  const response = callGemini('hello');
  console.log(response);
}
