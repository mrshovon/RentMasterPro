# Configuration Setup Guide

This application uses environment variables to store sensitive information securely. The actual values are not committed to git and are injected directly into the HTML during build.

## File Structure

```
RentMasterPro/
├── assets/           # Images and static assets
│   ├── icon-192x192.png
│   └── icon-512x512.png
├── css/              # Stylesheets
│   └── styles.css
├── js/               # JavaScript files
│   ├── app.js
│   ├── notifications.js
│   ├── sw.js
│   └── firebase-messaging-sw.js
├── netlify/          # Netlify functions
│   └── functions/
│       └── send-fcm-notification.js
├── .env.example      # Environment variable template (committed)
├── .gitignore        # Blocks sensitive files
└── index.html        # Main HTML (config injected here)
```

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

3. **Netlify will automatically replace the placeholders** in `index.html` and `firebase-messaging-sw.js` during the build process.

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

3. **For local development, manually edit index.html** to replace the `${VARIABLE}` placeholders with actual values.

## Security Notes

- **No config.js file exists** - Configuration is injected directly into HTML
- **Never commit .env to git** - it contains your actual keys
- **.gitignore is configured** to block sensitive files
- **Netlify environment variables** are secure and never exposed in the codebase
- **Firebase client config is public by design** - This is unavoidable for client-side Firebase apps

## Firebase Service Account (Server-side)

For the Netlify function, you need to set the service account JSON in Netlify:

**Environment Variable:** `FIREBASE_SERVICE_ACCOUNT_JSON`

**Value:** Single-line JSON string with escaped newlines (see previous setup instructions)

## Troubleshooting

### Issue: "window.appConfig is undefined"

**Solution:** Netlify environment variables not set. Check Netlify dashboard and trigger new deployment.

### Issue: Environment variables not working on Netlify

**Solution:**

1. Verify environment variables are set in Netlify dashboard
2. Trigger a new deployment
3. Check Netlify build logs for errors

### Issue: Local development not working

**Solution:** Manually replace `${VARIABLE}` placeholders in index.html with actual values.

## Migration from Old Setup

If you have the old `firebase-config.js` file:

1. Copy the values from it to your Netlify environment variables
2. Delete firebase-config.js
3. Follow the setup instructions above
