# Configuration Setup Guide

This application uses environment variables to store sensitive information securely. The actual values are not committed to git.

## Files

- **.env.example** - Template with placeholder values (committed to git)
- **.env** - Your actual environment variables (NOT committed to git)
- **config.js** - Configuration file that reads from environment variables (NOT committed to git)

## Setup Instructions

### For Netlify Deployment

1. **Go to Netlify Dashboard** → **Site Settings** → **Environment variables**

2. **Add the following environment variables:**

   ```
   FIREBASE_API_KEY=your_actual_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   FIREBASE_MEASUREMENT_ID=your_measurement_id
   FIREBASE_VAPID_KEY=your_vapid_key
   ```

3. **Netlify will automatically replace the placeholders** in `config.js` and `firebase-messaging-sw.js` during the build process.

### For Local Development

1. **Copy the template file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env with your actual values:**
   ```env
   FIREBASE_API_KEY=AIzaSyDTyvem4AV1deCh5WzG20NzR0fOBPQ2qjc
   FIREBASE_AUTH_DOMAIN=rentmasterpro-45672.firebaseapp.com
   FIREBASE_DATABASE_URL=https://rentmasterpro-45672-default-rtdb.asia-southeast1.firebasedatabase.app
   FIREBASE_PROJECT_ID=rentmasterpro-45672
   FIREBASE_STORAGE_BUCKET=rentmasterpro-45672.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=970817206915
   FIREBASE_APP_ID=1:970817206915:web:10ffa2182b9f7ac7ef39b6
   FIREBASE_MEASUREMENT_ID=G-QRF9V9LLLY
   FIREBASE_VAPID_KEY=BOie5s_MUJ-gWc2HLWxUN5cgdDXrQ-4XX4Qffo41KBIM6gSmoYKzLVoWFUFrs5XSaG4D9upsf2VXCwYmDi27eII
   ```

3. **For local development, you need to manually create config.js:**
   ```javascript
   const config = {
     firebase: {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       databaseURL: "YOUR_DATABASE_URL",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID",
       measurementId: "YOUR_MEASUREMENT_ID"
     },
     fcm: {
       vapidKey: "YOUR_VAPID_KEY"
     }
   };
   window.appConfig = config;
   ```

## Security Notes

- **Never commit .env to git** - it contains your actual keys
- **Never commit config.js to git** - it will contain actual values in production
- **.gitignore is configured** to prevent these files from being committed
- **Netlify environment variables** are secure and never exposed in the codebase

## Firebase Service Account (Server-side)

For the Netlify function, you need to set the service account JSON in Netlify:

**Environment Variable:** `FIREBASE_SERVICE_ACCOUNT_JSON`

**Value:** Single-line JSON string with escaped newlines (see previous setup instructions)

## Troubleshooting

### Issue: "window.appConfig is undefined"
**Solution:** Make sure config.js is loaded before other scripts. Check that it exists and is not blocked by .gitignore.

### Issue: Environment variables not working on Netlify
**Solution:** 
1. Verify environment variables are set in Netlify dashboard
2. Trigger a new deployment
3. Check Netlify build logs for errors

### Issue: Local development not working
**Solution:** Create config.js manually with your actual values (see step 3 in local development setup).

## Migration from Old Setup

If you have the old `firebase-config.js` file:
1. Copy the values from it to your .env file
2. Delete firebase-config.js
3. Follow the setup instructions above
