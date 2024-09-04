/**
 * @file This script handles authentication with Google Cloud Platform (GCP) using a service account.
 * It provides functions for resetting authorization and configuring a service for interacting with GCP APIs.
 */

/**
 * Service account credentials for accessing GCP services.
 * **Important:** Replace placeholder values with your actual service account details.
 * Ensure this service account has the necessary permissions (e.g., 'Vertex AI Predictor') for the intended use case.
 */
const SERVICE_ACCOUNT = {
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "blahblablahblablahbla",
  "private_key": "-----BEGIN PRIVATE KEY-----\nblahblablahblablahblablahblablahblablahblablahblablahblablahblablahblablahblablahblablahblablahblablahblablahbla\n-----END PRIVATE KEY-----\n",
  "client_email": "impact-ai@your-project-id.iam.gserviceaccount.com",
  "client_id": "999999999999999999",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/impact-ai%40your-project-id.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

/**
 * Resets the authorization state, allowing for re-authentication.
 */
function resetAuthorization() {
  const service = getGCPService();
  service.reset();
}

/**
 * Configures and returns an OAuth2 service for interacting with GCP APIs.
 *
 * @returns {OAuth2.Service} The configured OAuth2 service.
 */
function getGCPService() {
  const privateKey = SERVICE_ACCOUNT.private_key;
  const clientEmail = SERVICE_ACCOUNT.client_email;

  return OAuth2.createService('GCP')
      // Set the OAuth2 token endpoint URL.
      .setTokenUrl('https://accounts.google.com/o/oauth2/token')

      // Set the service account's private key and issuer email.
      .setPrivateKey(privateKey)
      .setIssuer(clientEmail)

      // Store authorized tokens in the script's properties for persistence.
      .setPropertyStore(PropertiesService.getScriptProperties())

      // Set the required OAuth2 scope for accessing GCP resources.
      // This scope must be authorized during service account setup.
      .setScope(['https://www.googleapis.com/auth/cloud-platform']);
}
