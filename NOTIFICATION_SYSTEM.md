# Push Notification System Documentation

## Overview
RentMaster Pro now includes a comprehensive push notification system using Firebase Cloud Messaging (FCM). This system enables real-time notifications to be sent to owners and tenants for important events.

## What's Implemented

### Infrastructure
- ✅ Firebase Cloud Messaging SDK integration
- ✅ Service worker updated to handle push events
- ✅ Notification service module (`notifications.js`)
- ✅ Device token registration in database
- ✅ Notification permission request UI
- ✅ Automatic token registration on login

### Notification Triggers

#### High Priority Notifications
1. **Owner initiates rent bill** → Tenant receives notification
   - Message: "New Rent Bill - [month] - ৳[amount] for [property]"
   - Function: `createBillWithDetails()`

2. **Tenant marks rent as sent** → Owner receives notification
   - Message: "[Tenant name] has sent rent for [month] - ৳[amount]"
   - Function: `tenantNotifyPay()`

3. **Owner confirms payment** → Tenant receives notification
   - Message: "Your payment for [month] (৳[amount]) has been confirmed"
   - Function: `savePaidPayment()`

4. **Tenant submits maintenance issue** → Owner receives notification
   - Message: "[Tenant name] reported an issue at [property]: [issue]"
   - Function: `submitIssue()`

#### Medium Priority Notifications
5. **Owner resolves maintenance issue** → Tenant receives notification
   - Message: "Your maintenance issue at [property] has been resolved"
   - Function: `fixIssue()`

6. **Owner creates new property with tenant** → Tenant receives notification
   - Message: "Welcome! You've been registered at [property]. Owner: [owner]"
   - Function: `createNewProperty()`

7. **Owner vacates tenant** → Tenant receives notification
   - Message: "Your tenancy at [property] has ended. Thank you for staying!"
   - Function: `processVacate()`

8. **Owner changes rent** → Tenant receives notification
   - Message: "Rent for [property] changed from ৳[old] to ৳[new]"
   - Function: `savePropEdit()`

## How It Works

### 1. User Login & Token Registration
When a user logs in:
- System requests notification permission
- If granted, Firebase generates a device token
- Token is stored in Firebase database under `deviceTokens` array
- Token is associated with user ID and user type (owner/tenant)

### 2. Notification Sending
When an event occurs:
- System retrieves device tokens for the recipient
- Creates notification using predefined templates
- Stores notification in database
- (Production) Sends via Firebase Cloud Functions

### 3. Notification Receiving
When a notification arrives:
- Service worker intercepts the push event
- Displays system notification with app icon
- User can click to open the app
- App focuses on relevant section

## Database Schema Updates

### New Array: `deviceTokens`
```javascript
{
  deviceTokens: [
    {
      userId: "owner123",           // Owner ID or Property ID for tenants
      userType: "owner",            // "owner" or "tenant"
      token: "fcm_token_string",    // FCM device token
      createdAt: "2026-04-26T...",
      lastUsed: "2026-04-26T..."
    }
  ]
}
```

### New Array: `notifications` (for in-app history)
```javascript
{
  notifications: [
    {
      token: "fcm_token_string",
      title: "New Rent Bill",
      body: "Rent bill for April...",
      data: { type: "rent_bill", month: "April", ... },
      createdAt: "2026-04-26T...",
      read: false
    }
  ]
}
```

## Setup Requirements

### 1. Firebase Console Configuration

**Enable Cloud Messaging:**
1. Go to Firebase Console → Project Settings
2. Navigate to Cloud Messaging tab
3. Enable Cloud Messaging API (V1)
4. Note down your Server Key and Sender ID

**Get VAPID Key:**
1. In Firebase Console → Project Settings → Cloud Messaging
2. Click "Generate key pair" under Web Push certificates
3. Copy the VAPID key (public key)
4. Replace `YOUR_VAPID_KEY_HERE` in `notifications.js` line 37

### 2. Service Worker Configuration

The service worker (`sw.js`) is already configured to:
- Handle push events
- Display notifications
- Handle notification clicks
- Focus or open app window

### 3. HTTPS Requirement
Push notifications **require HTTPS**:
- Local testing: Use `localhost` (works without HTTPS)
- Production: Must use HTTPS
- Options: Firebase Hosting, Netlify, Vercel, or custom SSL

## Current Implementation Status

### ✅ Completed
- FCM SDK integration
- Service worker push handling
- Notification service module
- Device token registration
- Permission request UI
- All 8 notification triggers implemented
- Notification templates
- Database schema updates

### ⚠️ Requires Configuration
- **VAPID Key**: Must be added to `notifications.js`
- **Firebase Cloud Functions**: For actual push delivery (current implementation stores in DB)

### 📱 Client-Side Limitations
The current implementation stores notifications in the database but doesn't send actual push notifications from the client. For production use, you need:

**Option 1: Firebase Cloud Functions (Recommended)**
```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendNotification = functions.https.onCall(async (data, context) => {
  const { tokens, notification } = data;
  const message = {
    notification: {
      title: notification.title,
      body: notification.body
    },
    tokens: tokens
  };

  const response = await admin.messaging().sendMulticast(message);
  return { success: response.successCount, failure: response.failureCount };
});
```

**Option 2: Third-Party Service**
- OneSignal
- Pusher
- Twilio

## Testing Notifications

### Local Testing
1. Start local server: `python -m http.server 8000`
2. Open http://localhost:8000
3. Login as owner or tenant
4. Click "Enable Notifications"
5. Grant permission
6. Trigger an event (e.g., create bill)
7. Check browser console for logs
8. Check database for stored notifications

### Mobile Testing
1. Deploy to HTTPS server
2. Install PWA on mobile device
3. Enable notifications
4. Test notification triggers
5. Verify notifications appear in system notification center

## Troubleshooting

### Notifications Not Working
1. **Check HTTPS**: Ensure site is served over HTTPS (or localhost)
2. **Check Permission**: Verify notification permission is granted
3. **Check VAPID Key**: Ensure VAPID key is set in `notifications.js`
4. **Check Service Worker**: Verify service worker is registered
5. **Check Console**: Look for errors in browser console
6. **Check Firebase**: Verify Firebase project is configured correctly

### Token Registration Fails
1. Check Firebase messaging is initialized
2. Verify VAPID key is correct
3. Check browser supports Web Push API
4. Ensure service worker is active

### Notifications Not Received
1. Verify recipient has registered device token
2. Check notification is stored in database
3. For production: Verify Cloud Functions are deployed
4. Check Firebase Console for delivery status

## Browser Support

| Browser | Push Support | Status |
|---------|-------------|--------|
| Chrome | ✅ Full | Supported |
| Edge | ✅ Full | Supported |
| Firefox | ✅ Full | Supported |
| Safari (iOS) | ⚠️ Limited | iOS 16.4+ only |
| Safari (macOS) | ✅ Full | Supported |
| Opera | ✅ Full | Supported |

## Security Considerations

### Current Implementation
- Tokens stored in Firebase Realtime Database
- No authentication on notification endpoints
- Suitable for development/testing

### Production Recommendations
1. **Add Firebase Authentication**: Secure user sessions
2. **Validate Recipients**: Verify sender has permission to notify recipient
3. **Rate Limiting**: Prevent notification spam
4. **Token Validation**: Verify tokens are valid before sending
5. **Encryption**: Encrypt sensitive notification data

## Future Enhancements

### Planned Features
- [ ] In-app notification center UI
- [ ] Notification history view
- [ ] Notification preferences (enable/disable specific types)
- [ ] Scheduled notifications (e.g., rent reminders)
- [ ] Notification grouping
- [ ] Rich notifications with images/actions
- [ ] Notification analytics

### Optional Features
- [ ] Email notifications as fallback
- [ ] SMS notifications for critical alerts
- [ ] WhatsApp integration
- [ ] Notification sounds customization

## API Reference

### NotificationService

#### Methods
- `requestNotificationPermission()` - Request browser permission
- `getDeviceToken()` - Get FCM device token
- `registerDeviceToken(userId, userType)` - Register token in database
- `getUserTokens(userId, userType)` - Get tokens for user
- `getOwnerTokens(ownerId)` - Get owner's device tokens
- `getTenantTokens(propertyId)` - Get tenant's device tokens
- `sendPushNotification(tokens, notification)` - Send notification
- `initializeNotifications(userId, userType)` - Initialize on login
- `cleanupOldTokens()` - Remove tokens older than 90 days

#### Notification Templates
- `rentBillInitiated(month, amount, propertyName)`
- `rentPaymentSent(tenantName, month, amount)`
- `rentPaymentConfirmed(month, amount)`
- `maintenanceIssueSubmitted(tenantName, propertyName, issue)`
- `maintenanceIssueResolved(propertyName)`
- `tenantRegistered(propertyName, ownerName)`
- `tenantVacated(propertyName)`
- `rentChanged(oldRent, newRent, propertyName)`

## Support

For issues or questions:
1. Check browser console for errors
2. Review Firebase Console for configuration
3. Verify all setup steps are completed
4. Test on multiple browsers/devices
5. Check this documentation for troubleshooting tips

---

**Version:** 1.0  
**Last Updated:** April 26, 2026  
**Status:** ✅ Implemented (requires VAPID key configuration for production)
