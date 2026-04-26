// Firebase Cloud Functions for RentMaster Pro
// Handles push notification delivery via Firebase Cloud Messaging

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Cloud Function to send push notifications to multiple devices
 * Callable from the client application
 */
exports.sendNotification = functions.https.onCall(async (data, context) => {
  try {
    const { tokens, notification } = data;

    // Validate input
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'No device tokens provided'
      );
    }

    if (!notification || !notification.title || !notification.body) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid notification payload'
      );
    }

    // Create the message
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: '/RentMasterPro/icon-192x192.png',
        badge: '/RentMasterPro/icon-192x192.png',
        clickAction: notification.url || '/'
      },
      data: notification.data || {},
      tokens: tokens
    };

    // Send the notification
    const response = await admin.messaging().sendMulticast(message);

    // Log results
    console.log(`Notification sent: ${response.successCount} success, ${response.failureCount} failures`);

    // Return results
    return {
      success: response.successCount,
      failure: response.failureCount,
      results: response.responses
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send notification'
    );
  }
});

/**
 * Cloud Function to send notification to a single device
 * Callable from the client application
 */
exports.sendSingleNotification = functions.https.onCall(async (data, context) => {
  try {
    const { token, notification } = data;

    // Validate input
    if (!token) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'No device token provided'
      );
    }

    if (!notification || !notification.title || !notification.body) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid notification payload'
      );
    }

    // Create the message
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: '/RentMasterPro/icon-192x192.png',
        badge: '/RentMasterPro/icon-192x192.png',
        clickAction: notification.url || '/'
      },
      data: notification.data || {},
      token: token
    };

    // Send the notification
    const response = await admin.messaging().send(message);

    console.log('Notification sent successfully:', response);

    return {
      success: true,
      messageId: response
    };
  } catch (error) {
    console.error('Error sending single notification:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send notification'
    );
  }
});
