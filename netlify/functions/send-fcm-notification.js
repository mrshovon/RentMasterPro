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

    // Firebase FCM API endpoint
    const fcmApiKey = 'BOie5s_MUJ-gWc2HLWxUN5cgdDXrQ-4XX4Qffo41KBIM6gSmoYKzLVoWFUFrs5XSaG4D9upsf2VXCwYmDi27eII';
    const projectId = 'rentmasterpro-97e04'; // Your Firebase project ID

    const postData = JSON.stringify({
      message: {
        tokens: tokens,
        notification: notification,
        data: data || {}
      }
    });

    const options = {
      hostname: 'fcm.googleapis.com',
      port: 443,
      path: `/v1/projects/${projectId}/messages:send`,
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          console.log('FCM response status:', res.statusCode);
          console.log('FCM response body:', responseData);

          try {
            const result = JSON.parse(responseData);
            if (res.statusCode === 200) {
              resolve({
                statusCode: 200,
                body: JSON.stringify({ success: true, result })
              });
            } else {
              resolve({
                statusCode: res.statusCode,
                body: JSON.stringify({ success: false, error: result })
              });
            }
          } catch (error) {
            console.log('Parse error:', error);
            resolve({
              statusCode: 500,
              body: JSON.stringify({ success: false, error: 'Parse error' })
            });
          }
        });
      });

      req.on('error', (error) => {
        console.log('Request error:', error);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ success: false, error: error.message })
        });
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
