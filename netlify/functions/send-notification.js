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
    const { title, message, url } = JSON.parse(event.body);
    const pushAlertApiKey = 'f597dda938deaf66cef63486a98dee93';

    const postData = JSON.stringify({
      title: title,
      message: message,
      url: url || 'https://idyllic-lollipop-8131e9.netlify.app/'
    });

    const options = {
      hostname: 'api.pushalert.co',
      port: 443,
      path: '/rest/v1/send',
      method: 'POST',
      headers: {
        'Authorization': `api_key=${pushAlertApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (res.statusCode === 200 && result.success) {
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
            resolve({
              statusCode: 500,
              body: JSON.stringify({ success: false, error: 'Parse error' })
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ success: false, error: error.message })
        });
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
