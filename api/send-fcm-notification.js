const https = require('https');

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokens, notification, data } = req.body;

    console.log('Incoming request - tokens:', tokens.length, 'notification:', notification);

    // Get access token using service account
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable not set');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    // Get OAuth token
    const accessToken = await getAccessToken(serviceAccount);

    // Send message using FCM V1 API
    const message = {
      message: {
        token: tokens[0], // V1 API sends to one token at a time
        notification: notification,
        data: data || {}
      }
    };

    const postData = JSON.stringify(message);

    const options = {
      hostname: 'fcm.googleapis.com',
      port: 443,
      path: `/v1/projects/${serviceAccount.project_id}/messages:send`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const fcmResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => { responseData += chunk; });
        res.on('end', () => {
          console.log('FCM response status:', res.statusCode);
          console.log('FCM response body:', responseData);
          try {
            const result = JSON.parse(responseData);
            resolve({ statusCode: res.statusCode, body: result });
          } catch (error) {
            resolve({ statusCode: 500, body: { error: 'Parse error' } });
          }
        });
      });
      req.on('error', error => {
        console.log('Request error:', error);
        resolve({ statusCode: 500, body: { error: error.message } });
      });
      req.write(postData);
      req.end();
    });

    if (fcmResponse.statusCode === 200) {
      return res.status(200).json({ success: true, result: fcmResponse.body });
    } else {
      return res.status(fcmResponse.statusCode).json({ success: false, error: fcmResponse.body });
    }
  } catch (error) {
    console.log('Handler error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getAccessToken(serviceAccount) {
  const jwt = createJWT(serviceAccount);
  
  const postData = JSON.stringify({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt
  });

  const options = {
    hostname: 'oauth2.googleapis.com',
    port: 443,
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result.access_token);
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function createJWT(serviceAccount) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const headerBase64 = base64UrlEncode(JSON.stringify(header));
  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signRS256(headerBase64 + '.' + payloadBase64, serviceAccount.private_key);

  return headerBase64 + '.' + payloadBase64 + '.' + signature;
}

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function signRS256(data, privateKey) {
  const crypto = require('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
