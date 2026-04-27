const admin = require('firebase-admin');

// Initialize Firebase Admin with service account from environment variable
// Handle different newline formats in environment variable
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
console.log('Private key length:', privateKey ? privateKey.length : 'undefined');
console.log('Private key starts with:', privateKey ? privateKey.substring(0, 50) : 'undefined');
console.log('Has newlines:', privateKey ? privateKey.includes('\n') : 'undefined');

if (privateKey && !privateKey.includes('\n')) {
  // If no actual newlines, try to replace escaped ones
  privateKey = privateKey.replace(/\\n/g, '\n');
  console.log('After replace - has newlines:', privateKey.includes('\n'));
}

const serviceAccount = {
  "type": "service_account",
  "project_id": "rentmasterpro-45672",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": privateKey,
  "client_email": "firebase-adminsdk-fbsvc@rentmasterpro-45672.iam.gserviceaccount.com",
  "client_id": "114194030969990893008",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40rentmasterpro-45672.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'rentmasterpro-45672'
  });
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { tokens, notification, data } = JSON.parse(event.body);

    console.log('Incoming request - tokens:', tokens.length, 'notification:', notification);

    // Send message using Firebase Admin SDK
    const message = {
      notification: notification,
      data: data || {},
      tokens: tokens
    };

    const response = await admin.messaging().sendMulticast(message);

    console.log('FCM response - success:', response.successCount, 'failure:', response.failureCount);

    if (response.failureCount > 0) {
      console.log('Failed tokens:', response.responses.filter(r => !r.success));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      })
    };
  } catch (error) {
    console.log('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
