// Configuration - Read from environment variables (Netlify)
// For local development, copy .env.example to .env and fill in values

const config = {
  firebase: {
    apiKey: "${FIREBASE_API_KEY}",
    authDomain: "${FIREBASE_AUTH_DOMAIN}",
    databaseURL: "${FIREBASE_DATABASE_URL}",
    projectId: "${FIREBASE_PROJECT_ID}",
    storageBucket: "${FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${FIREBASE_APP_ID}",
    measurementId: "${FIREBASE_MEASUREMENT_ID}"
  },
  fcm: {
    vapidKey: "${FIREBASE_VAPID_KEY}"
  }
};

// Export for use in other files
window.appConfig = config;
