# Firebase Cloud Functions Setup Guide

This guide explains how to deploy Firebase Cloud Functions for RentMaster Pro to enable actual push notification delivery.

## Prerequisites

1. **Node.js** (version 18 or higher) installed
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Firebase CLI** installed
   - Run: `npm install -g firebase-tools`
   - Verify installation: `firebase --version`

3. **Firebase Project** already configured
   - Project: `rentmasterpro-97e04`
   - Already configured in your app

## Step-by-Step Deployment

### Step 1: Initialize Firebase in Project Directory

Open a terminal in your project directory (`f:\Moshfeq\Projects\RentMasterPro`) and run:

```bash
firebase login
```

This will open a browser to authenticate with your Google account.

### Step 2: Initialize Firebase Functions

```bash
firebase init functions
```

When prompted:
- **Which Firebase features do you want to set up?** → Select `Functions`
- **Please select an option:** → Use an existing project
- **Select a default Firebase project for this directory:** → `rentmasterpro-97e04`
- **What language would you like to use to write Cloud Functions?** → JavaScript
- **Do you want to use ESLint?** → No
- **Do you want to install dependencies now?** → Yes

This will create a `functions` folder with necessary files.

### Step 3: Replace Generated Files

The `functions` folder already exists in your project with the correct files:
- `functions/index.js` - Cloud Functions code
- `functions/package.json` - Dependencies

If the initialization created different files, replace them with the ones in your project.

### Step 4: Install Dependencies

Navigate to the functions folder and install dependencies:

```bash
cd functions
npm install
cd ..
```

### Step 5: Deploy Cloud Functions

Deploy the functions to Firebase:

```bash
firebase deploy --only functions
```

This will:
- Build your functions
- Upload them to Firebase
- Deploy them to the Cloud Functions backend

You should see output like:
```
i  deploying functions
i  functions: ensuring necessary APIs are enabled...
✔  functions: APIs necessary for all functions are enabled
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (X.XX KB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: uploading functions in progress...
✔  functions: sendNotification(us-central1) successful
✔  functions: sendSingleNotification(us-central1) successful
✔  Deploy complete!
```

### Step 6: Verify Deployment

Check your deployed functions in Firebase Console:
1. Go to https://console.firebase.google.com/
2. Select your project: `rentmasterpro-97e04`
3. Navigate to Functions (left sidebar)
4. You should see `sendNotification` and `sendSingleNotification` listed

## Testing Cloud Functions

### Test 1: Enable Notifications on Your Device

1. Open RentMaster Pro in your browser
2. Login as owner or tenant
3. Click "Enable Notifications" button in the dashboard header
4. Grant browser permission
5. Check console for: "Device token obtained: [token]"

### Test 2: Trigger a Notification

1. On PC browser: Login as tenant
2. Submit a maintenance issue
3. On mobile device: Login as owner
4. Enable notifications on mobile
5. Check if notification appears on mobile

### Test 3: Check Cloud Function Logs

1. Go to Firebase Console → Functions
2. Click on `sendNotification` function
3. View logs to see if function is being called
4. Check for errors or success messages

## Troubleshooting

### Error: "Functions: APIs necessary for all functions are enabled"

**Solution:**
- Wait a few minutes and try again
- Or manually enable Cloud Functions API in Firebase Console → Project Settings → APIs & Services

### Error: "No Firebase App '[DEFAULT]' has been created"

**Solution:**
- Ensure `admin.initializeApp()` is called in `functions/index.js`
- Check Firebase project configuration

### Error: "Permission denied"

**Solution:**
- Ensure you're logged in with correct Google account
- Run `firebase login` again
- Check Firebase project permissions

### Notifications Not Received

**Check:**
1. Device token is registered in Firebase database
2. Cloud Function is deployed successfully
3. Browser console shows no errors
4. Firebase Console → Functions logs show function calls
5. Notification permission is granted
6. Service worker is registered

### Cloud Function Not Called

**Check:**
1. Firebase Functions SDK is loaded in `index.html`
2. `window.firebaseFunctions` is available in browser console
3. No CORS errors in browser console
4. Firebase project has Cloud Functions API enabled

## Cloud Function Details

### sendNotification

**Purpose:** Send notifications to multiple devices

**Parameters:**
- `tokens` (array): Array of device tokens
- `notification` (object):
  - `title` (string): Notification title
  - `body` (string): Notification body
  - `data` (object, optional): Additional data
  - `url` (string, optional): Click action URL

**Returns:**
- `success` (number): Number of successful sends
- `failure` (number): Number of failed sends
- `results` (array): Detailed results for each token

### sendSingleNotification

**Purpose:** Send notification to a single device

**Parameters:**
- `token` (string): Device token
- `notification` (object): Same as above

**Returns:**
- `success` (boolean): Success status
- `messageId` (string): Firebase message ID

## Current Implementation

The notification system now works as follows:

1. **Event Triggered** (e.g., maintenance issue submitted)
2. **Recipient Tokens Retrieved** from Firebase database
3. **Cloud Function Called** via Firebase Functions SDK
4. **Cloud Function Sends** push notification via FCM
5. **Device Receives** notification
6. **User Taps** notification to open app

**Fallback:** If Cloud Function fails, notification is stored in database for later retrieval.

## Cost Considerations

Firebase Cloud Functions has a free tier:
- 125,000 invocations per month
- 40,000 GB-seconds of execution time
- 10 GB of network egress

For RentMaster Pro usage, this should be sufficient for most use cases.

## Updating Functions

To update Cloud Functions after making changes:

```bash
firebase deploy --only functions
```

This will redeploy all functions with the latest code.

## Deleting Functions

To delete Cloud Functions:

```bash
firebase functions:delete sendNotification
firebase functions:delete sendSingleNotification
```

Or use Firebase Console → Functions → Select function → Delete.

## Monitoring

Monitor your Cloud Functions in Firebase Console:
- View logs and errors
- Check invocation counts
- Monitor execution time
- Set up alerts for failures

## Security

The Cloud Functions are secured by Firebase Authentication. Only authenticated users can call them. Additional security rules can be added if needed.

## Next Steps

After deployment:
1. Test notifications on multiple devices
2. Monitor Cloud Function logs
3. Set up error alerts
4. Consider adding notification analytics
5. Add notification preferences for users

---

**Need Help?**
- Firebase Cloud Functions Docs: https://firebase.google.com/docs/functions
- Firebase Support: https://firebase.google.com/support
