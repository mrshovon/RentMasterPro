# Vercel Deployment Guide

This guide will help you deploy RentMaster Pro to Vercel with automatic HTTPS and serverless functions.

## Prerequisites

- GitHub account
- Vercel account (free at vercel.com)
- Firebase project with service account JSON

## Step 1: Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "Add New Project"
3. Click "Import Git Repository"
4. Authorize Vercel to access your GitHub account
5. Select the `RentMasterPro` repository

## Step 2: Configure Project Settings

### Framework Preset
- **Framework Preset:** Other
- **Root Directory:** `./` (leave as default)
- **Build Command:** (leave empty - static site)
- **Output Directory:** `./` (leave as default)

### Environment Variables

Add the following environment variables in Vercel:

**Firebase Client Config (for frontend):**
```
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

**Firebase Service Account (for serverless function):**
```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"rentmasterpro-45672","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**Important:** The `FIREBASE_SERVICE_ACCOUNT_JSON` must be a single-line JSON string with escaped newlines. Get your service account JSON from Firebase Console → Project Settings → Service Accounts → Generate New Private Key, then convert it to a single line.

## Step 3: Deploy

1. Click "Deploy"
2. Wait for deployment to complete (usually 1-2 minutes)
3. Vercel will provide a URL like `https://rentmaster-pro.vercel.app`

## Step 4: Test FCM Notifications

Once deployed:

1. Open the deployed URL
2. Login as a user
3. Click "Enable Notifications"
4. Grant notification permission
5. Close the app
6. Trigger an action (e.g., submit maintenance issue as tenant)
7. Check if notification appears on your device

## Troubleshooting

### Issue: API function not found
**Solution:** Make sure the `api/` directory is in the root of your repository, not in a subdirectory.

### Issue: FCM token registration fails
**Solution:** 
- Ensure you're on HTTPS (Vercel provides this automatically)
- Check browser console for errors
- Verify Firebase config is correct

### Issue: Notifications not sending
**Solution:**
- Check Vercel function logs
- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is set correctly
- Ensure the service account has Firebase Cloud Messaging API enabled

### Issue: Local development
**Solution:** The app automatically detects local development and skips the Vercel API call. Notifications will be stored in the database but not sent via FCM locally.

## Vercel vs Netlify Migration

**What changed:**
- `netlify/functions/` → `api/`
- Netlify function format → Vercel API format
- Endpoint changed from `/.netlify/functions/send-fcm-notification` to `/api/send-fcm-notification`

**What stayed the same:**
- Firebase configuration
- FCM implementation
- Notification logic
- Database structure

## Advantages of Vercel

- Unlimited deployments on free tier
- Automatic HTTPS
- Fast global CDN
- Easy GitHub integration
- Similar workflow to Netlify
- No deployment credits to worry about

## Next Steps

After successful deployment:
1. Test all features
2. Verify FCM notifications work
3. Set up custom domain (optional)
4. Monitor Vercel analytics
