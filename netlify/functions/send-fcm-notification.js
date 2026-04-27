const admin = require('firebase-admin');

// Initialize Firebase Admin with service account from environment variable
// Use base64 encoded service account JSON to avoid newline issues
let serviceAccount;
try {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountBase64) {
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(serviceAccountJson);
    console.log('Service account loaded from base64 environment variable');
  } else {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable not set');
  }
} catch (error) {
  console.error('Error loading service account:', error);
  throw error;
}

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
