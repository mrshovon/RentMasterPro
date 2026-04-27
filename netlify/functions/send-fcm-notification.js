const https = require('https');

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

    // Firebase Legacy API endpoint
    const fcmServerKey = process.env.FCM_SERVER_KEY;
    if (!fcmServerKey) {
      throw new Error('FCM_SERVER_KEY environment variable not set');
    }

    const postData = JSON.stringify({
      registration_ids: tokens,
      notification: notification,
      data: data || {}
    });

    const options = {
      hostname: 'fcm.googleapis.com',
      port: 443,
      path: '/fcm/send',
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => { responseData += chunk; });
        res.on('end', () => {
          console.log('FCM response status:', res.statusCode);
          console.log('FCM response body:', responseData);
          try {
            const result = JSON.parse(responseData);
            if (res.statusCode === 200) {
              resolve({ statusCode: 200, body: JSON.stringify({ success: true, result }) });
            } else {
              resolve({ statusCode: res.statusCode, body: JSON.stringify({ success: false, error: result }) });
            }
          } catch (error) {
            resolve({ statusCode: 500, body: JSON.stringify({ success: false, error: 'Parse error' }) });
          }
        });
      });
      req.on('error', error => {
        console.log('Request error:', error);
        resolve({ statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) });
      });
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.log('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
