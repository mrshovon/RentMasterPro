# Push Notification System Documentation

## Overview

RentMaster Pro now includes a comprehensive push notification system using OneSignal. This system enables real-time notifications to be sent to owners and tenants for important events without requiring backend deployment.

## What's Implemented

### Infrastructure

- ✅ OneSignal SDK integration
- ✅ Service worker updated to handle push events
- ✅ Notification service module (`notifications.js`)
- ✅ User tagging in OneSignal for targeted notifications
- ✅ Notification permission request UI
- ✅ Automatic user registration on login

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

### 1. User Login & Registration

When a user logs in:

- System requests notification permission via OneSignal
- If granted, device is registered with OneSignal
- User is tagged with their user ID (owner ID or property ID for tenants)
- User is tagged with user type (owner/tenant)
- Registration is stored in Firebase database for backup

### 2. Notification Sending

When an event occurs:

- System retrieves recipient's user ID
- Creates notification using predefined templates
- Sends notification via OneSignal API to devices tagged with that user ID
- OneSignal delivers notification to all registered devices for that user

### 3. Notification Receiving

When a notification arrives:

- OneSignal delivers notification to the device
- System notification appears with app icon
- User can click to open the app
- App focuses on relevant section

## Database Schema Updates

### New Array: `deviceTokens` (for backup/record-keeping)

```javascript
{
  deviceTokens: [
    {
      userId: "owner123", // Owner ID or Property ID for tenants
      userType: "owner", // "owner" or "tenant"
      oneSignalEnabled: true, // OneSignal registration status
      createdAt: "2026-04-26T...",
      lastUsed: "2026-04-26T...",
    },
  ];
}
```

### New Array: `notifications` (for in-app history)

```javascript
{
  notifications: [
    {
      userId: "owner123",
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

### 1. OneSignal Configuration

**Create OneSignal Account:**

1. Go to https://onesignal.com/
2. Sign up (free)
3. Create a new app:
   - Name: RentMaster Pro
   - Platform: Web Push
   - Site URL: https://mrshovon.github.io/RentMasterPro/
4. Choose "Custom Code" integration
5. Select "JavaScript" framework
6. Copy your OneSignal App ID

**Update Code:**

1. Open `index.html`
2. Find line 367: `const oneSignalAppId = 'YOUR_ONESIGNAL_APP_ID';`
3. Replace with your actual OneSignal App ID

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
- Options: GitHub Pages, Netlify, Vercel, or custom SSL

## Current Implementation Status

### ✅ Completed

- OneSignal SDK integration
- Service worker push handling
- Notification service module
- User tagging in OneSignal
- Permission request UI
- All 8 notification triggers implemented
- Notification templates
- Database schema updates
- OneSignal App ID configured

### ✅ Production Ready

- No backend deployment required
- No Node.js needed
- Works directly from client-side JavaScript
- Free tier available (up to 10,000 subscribers)
- Real-time notification delivery via OneSignal

## Testing Notifications

### Local Testing

1. Start local server: `python -m http.server 8000`
2. Open http://localhost:8000
3. Login as owner or tenant
4. Click "Enable Notifications"
5. Grant permission
6. Check browser console for: "OneSignal initialized" and "OneSignal external user ID set"
7. Check OneSignal Dashboard → Audience → Subscriptions to see device registered
8. Send test notification from OneSignal Dashboard

### Mobile Testing

1. Deploy to HTTPS server (GitHub Pages)
2. Install PWA on mobile device
3. Enable notifications
4. Test notification triggers
5. Verify notifications appear in system notification center
6. Check OneSignal Dashboard for delivery status

## Troubleshooting

### Notifications Not Working

1. **Check HTTPS**: Ensure site is served over HTTPS (or localhost)
2. **Check Permission**: Verify notification permission is granted
3. **Check OneSignal App ID**: Ensure App ID is correct in `index.html`
4. **Check Service Worker**: Verify service worker is registered
5. **Check Console**: Look for errors in browser console
6. **Check OneSignal Dashboard**: Verify device is registered in Audience → Subscriptions

### User Registration Fails

1. Check OneSignal SDK is loaded
2. Verify OneSignal App ID is correct
3. Check browser supports Web Push API
4. Ensure service worker is active
5. Check console for OneSignal initialization errors

### Notifications Not Received

1. Verify recipient has enabled notifications
2. Check user is tagged with correct user ID in OneSignal
3. Check OneSignal Dashboard → Messages for delivery status
4. Verify notification is being sent to correct user ID
5. Check if user has blocked notifications in browser settings

## Browser Support

| Browser        | Push Support | Status         |
| -------------- | ------------ | -------------- |
| Chrome         | ✅ Full      | Supported      |
| Edge           | ✅ Full      | Supported      |
| Firefox        | ✅ Full      | Supported      |
| Safari (iOS)   | ⚠️ Limited   | iOS 16.4+ only |
| Safari (macOS) | ✅ Full      | Supported      |
| Opera          | ✅ Full      | Supported      |

## Security Considerations

### Current Implementation

- User IDs stored in Firebase Realtime Database
- OneSignal handles secure notification delivery
- OneSignal provides built-in security features
- Suitable for production use

### Production Recommendations

1. **Add Firebase Authentication**: Secure user sessions
2. **Validate Recipients**: Verify sender has permission to notify recipient
3. **Rate Limiting**: OneSignal provides built-in rate limiting
4. **User Verification**: Verify user identity before tagging
5. **Encryption**: OneSignal provides encrypted connections

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

- `requestNotificationPermission()` - Request browser permission via OneSignal
- `registerDeviceToken(userId, userType)` - Tag user in OneSignal and store in database
- `sendPushNotification(userIds, notification)` - Send notification via OneSignal
- `initializeNotifications(userId, userType)` - Initialize on login
- `getUserTokens(userId, userType)` - Get user registration info (for backup)
- `getOwnerTokens(ownerId)` - Get owner's registration info
- `getTenantTokens(propertyId)` - Get tenant's registration info

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
2. Review OneSignal Dashboard for device registration
3. Verify all setup steps are completed
4. Test on multiple browsers/devices
5. Check ONESIGNAL_SETUP.md for detailed troubleshooting
6. Review OneSignal documentation: https://documentation.onesignal.com/

---

**Version:** 2.0  
**Last Updated:** April 26, 2026  
**Status:** ✅ Implemented with OneSignal (production ready)
