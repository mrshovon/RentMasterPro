# OneSignal Push Notification Setup Guide

This guide explains how to set up OneSignal for push notifications in RentMaster Pro. OneSignal is a third-party service that provides push notification delivery without requiring backend deployment.

## Why OneSignal?

- **No backend required** - Works directly from client-side JavaScript
- **Free tier available** - Up to 10,000 subscribers
- **Easy setup** - No Node.js or Cloud Functions needed
- **Cross-platform** - Works on web, iOS, Android
- **Real-time delivery** - Instant push notifications

## Step-by-Step Setup

### Step 1: Create OneSignal Account

1. Go to https://onesignal.com/
2. Click "Sign Up" (free)
3. Sign up with Google, GitHub, or email
4. Verify your email address

### Step 2: Create a New App

1. After logging in, click "New App/Website"
2. Fill in the form:
   - **Name:** RentMaster Pro
   - **Platform:** Web Push
   - **Site URL:** https://mrshovon.github.io/RentMasterPro/
   - **Google/Firebase Project:** Select your Firebase project (optional)
3. Click "Next"

### Step 3: Configure Web Push

1. **Choose Integration:** Select "Website Builder" or "Custom Code"
2. **Select Framework:** Choose "JavaScript"
3. **Copy Your App ID** - You'll need this for the code

### Step 4: Get Your OneSignal Credentials

After setup, you'll have:
- **App ID** - Required for SDK initialization
- **REST API Key** - For server-side sending (optional)

Copy your **App ID** - you'll need it in Step 5.

### Step 5: Update Code

The code has already been updated to use OneSignal. You just need to add your App ID.

Open `index.html` and find the OneSignal initialization section (around line 348):

```javascript
const oneSignalAppId = 'YOUR_ONESIGNAL_APP_ID'; // Replace with your App ID
```

Replace `YOUR_ONESIGNAL_APP_ID` with your actual OneSignal App ID.

### Step 6: Test Notifications

1. Open RentMaster Pro in your browser
2. Login as owner or tenant
3. Click "Enable Notifications" button
4. Grant permission when prompted
5. Check OneSignal dashboard - you should see the device registered
6. Send a test notification from OneSignal dashboard

## How It Works

### Registration Flow
1. User clicks "Enable Notifications"
2. OneSignal SDK requests permission
3. If granted, device is registered with OneSignal
4. User is tagged with their user ID (owner or tenant)
5. Device token is stored in OneSignal

### Notification Sending
1. Event occurs (e.g., maintenance issue submitted)
2. App retrieves recipient's user ID
3. OneSignal sends notification to devices tagged with that user ID
4. User receives notification instantly

## OneSignal Dashboard Features

### Send Test Notifications
1. Go to OneSignal Dashboard
2. Click "Messages" → "New Push"
3. Write your message
4. Send to "All Subscribed Users" or specific segments
5. Click "Send Message"

### View Subscribers
1. Go to "Audience" → "Subscriptions"
2. View all registered devices
3. See user tags and segments

### Analytics
1. Go to "Analytics"
2. View notification delivery rates
3. See open rates and click rates
4. Monitor engagement

## Advanced Features

### User Segmentation
Tag users with custom segments:
- Owners vs Tenants
- Property-specific notifications
- Notification preferences

### Scheduled Notifications
Schedule notifications for later:
- Rent reminders
- Payment due alerts
- Maintenance follow-ups

### Automated Triggers
Set up automated notification rules:
- New bill created → Notify tenant
- Payment received → Notify owner
- Maintenance resolved → Notify tenant

## Troubleshooting

### Notifications Not Showing

**Check:**
1. Browser notification permission is granted
2. OneSignal App ID is correct
3. Service worker is registered
4. No errors in browser console
5. Device is subscribed in OneSignal dashboard

**Fix:**
- Clear browser cache and reload
- Re-enable notifications
- Check OneSignal dashboard for errors

### Service Worker Issues

**Check:**
1. `sw.js` is in project root
2. Service worker is registered (check browser DevTools)
3. No CORS errors

**Fix:**
- Reload page
- Unregister service worker in DevTools
- Reload again

### Permission Denied

**Check:**
1. Browser settings allow notifications
2. Not in incognito/private mode
3. HTTPS is enabled (required for web push)

**Fix:**
- Enable notifications in browser settings
- Use normal browser window (not incognito)
- Ensure site is served over HTTPS

## Cost

OneSignal Free Tier:
- Up to 10,000 subscribers
- Unlimited messages
- Basic analytics
- Email support

For RentMaster Pro, the free tier should be sufficient.

## Security

OneSignal provides:
- Encrypted connections
- Secure API keys
- User authentication
- GDPR compliance

## Comparison: OneSignal vs Firebase Cloud Functions

| Feature | OneSignal | Firebase Cloud Functions |
|---------|-----------|-------------------------|
| Setup Difficulty | Easy | Complex |
| Backend Required | No | Yes |
| Node.js Required | No | Yes |
| Free Tier | 10,000 subscribers | 125,000 invocations |
| Analytics | Built-in | Manual |
| Segmentation | Built-in | Manual |
| Scheduling | Built-in | Manual |

## Updating OneSignal Configuration

To change OneSignal settings:
1. Go to OneSignal Dashboard
2. Select your app
3. Update settings
4. Changes apply immediately

## Removing OneSignal

To remove OneSignal:
1. Delete OneSignal SDK from `index.html`
2. Revert `notifications.js` changes
3. Unregister service worker
4. Delete app from OneSignal dashboard

## Support

- OneSignal Docs: https://documentation.onesignal.com/
- OneSignal Support: https://onesignal.com/contact
- Community Forum: https://community.onesignal.com/

---

**Next Steps:**
1. Create OneSignal account
2. Get your App ID
3. Update the code with your App ID
4. Test notifications
5. Deploy to production
