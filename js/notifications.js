// Notification Service Module for RentMaster Pro
// Handles Firebase Cloud Messaging (FCM) integration

let deviceToken = null;
let messaging = null;
let tokenRefreshListener = null;
let messageListener = null;

// Wait for Firebase to be initialized
let messagingReadyInterval = setInterval(function() {
    if (window.firebase && window.firebase.messaging) {
        messaging = window.firebase.messaging;
        clearInterval(messagingReadyInterval);
        console.log('Firebase Messaging ready');
    }
}, 50);

/**
 * Request notification permission from user
 * PushAlert handles this automatically via their subscription prompt
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
    }

    try {
        // PushAlert handles permission automatically
        // Just check current status
        if (Notification.permission === 'granted') {
            console.log('Notification permission already granted');
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Notification permission granted');
                return true;
            } else {
                console.warn('Notification permission denied');
                return false;
            }
        }

        return false;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
}

/**
 * Get FCM device token
 */
async function getDeviceToken() {
    if (!messaging) {
        console.warn('Firebase Messaging not initialized');
        return null;
    }

    try {
        const currentToken = await window.firebaseGetToken(messaging, {
            vapidKey: window.appConfig.fcm.vapidKey
        });

        if (currentToken) {
            console.log('Device token obtained:', currentToken);
            deviceToken = currentToken;
            return currentToken;
        } else {
            console.warn('No registration token available');
            return null;
        }
    } catch (error) {
        console.error('Error getting device token:', error);
        return null;
    }
}

/**
 * Register device in Firebase database for record-keeping
 * Get actual FCM token from Firebase Messaging SDK
 * @param {string} userId - User ID (owner ID or property ID for tenants)
 * @param {string} userType - 'owner' or 'tenant'
 */
async function registerDeviceToken(userId, userType) {
    try {
        // Get FCM token from Firebase Messaging SDK
        const messaging = window.firebase?.messaging;
        if (!messaging) {
            console.error('Firebase Messaging not initialized');
            return false;
        }

        // Request permission and get token
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return false;
        }

        // Get FCM token with service worker registration
        const token = await window.firebaseGetToken(messaging, {
            vapidKey: window.appConfig.fcm.vapidKey,
            serviceWorkerRegistration: await navigator.serviceWorker.register('./firebase-messaging-sw.js')
        });

        if (!token) {
            console.error('Failed to get FCM token');
            return false;
        }

        console.log('FCM Token obtained:', token.substring(0, 20) + '...');

        // Store in Firebase database
        const db = await getDB();
        if (!db.deviceTokens) {
            db.deviceTokens = [];
        }

        // Remove old entries for this user
        db.deviceTokens = db.deviceTokens.filter(t => t.userId !== userId);

        // Add new entry with actual FCM token
        db.deviceTokens.push({
            userId: userId,
            userType: userType,
            fcmToken: token,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        });

        await setDB(db);
        console.log('Device registered for:', userId, userType);
        return true;
    } catch (error) {
        console.error('Error registering device:', error);
        return false;
    }
}

/**
 * Get device tokens for a specific user
 * @param {string} userId - User ID
 * @param {string} userType - 'owner' or 'tenant'
 */
async function getUserTokens(userId, userType) {
    try {
        const db = await getDB();
        if (!db.deviceTokens) {
            return [];
        }

        const tokens = db.deviceTokens.filter(
            t => t.userId === userId && t.userType === userType
        );

        // Return actual FCM tokens
        return tokens.map(t => t.fcmToken).filter(t => t);
    } catch (error) {
        console.error('Error getting user tokens:', error);
        return [];
    }
}

/**
 * Get device tokens for owner (by owner ID)
 * @param {string} ownerId - Owner ID
 */
async function getOwnerTokens(ownerId) {
    return getUserTokens(ownerId, 'owner');
}

/**
 * Get device tokens for tenant (by property ID)
 * @param {string} propertyId - Property ID (used as tenant ID)
 */
async function getTenantTokens(propertyId) {
    return getUserTokens(propertyId, 'tenant');
}

/**
 * Send push notification to specific users
 * Uses Netlify function to call Firebase FCM API
 * @param {Array} userIds - Array of user IDs (device tokens)
 * @param {Object} notification - Notification object {title, body, data, url}
 */
async function sendPushNotification(userIds, notification) {
    try {
        // Send notification via Netlify function
        const response = await fetch('/.netlify/functions/send-fcm-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tokens: userIds,
                notification: {
                    title: notification.title,
                    body: notification.body
                },
                data: notification.data || {}
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log('FCM notification sent via Netlify function:', result);
            // Store in database for record-keeping
            await storeNotificationInDatabase(userIds, notification);
            return true;
        } else {
            console.error('Netlify function error:', result);
            // Fallback to database storage
            return await storeNotificationInDatabase(userIds, notification);
        }
    } catch (error) {
        console.error('Error sending notification via Netlify function:', error);
        // Fallback to database storage if function fails
        return await storeNotificationInDatabase(userIds, notification);
    }
}

/**
 * Store notification in database (fallback method)
 * @param {Array} tokens - Array of device tokens
 * @param {Object} notification - Notification object {title, body, data}
 */
async function storeNotificationInDatabase(tokens, notification) {
    try {
        const db = await getDB();
        if (!db.notifications) {
            db.notifications = [];
        }

        // Store notification for each token
        tokens.forEach(token => {
            db.notifications.push({
                token: token,
                title: notification.title,
                body: notification.body,
                data: notification.data || {},
                createdAt: new Date().toISOString(),
                read: false
            });
        });

        await setDB(db);
        console.log('Notification stored in database:', notification);
        return true;
    } catch (error) {
        console.error('Error storing notification:', error);
        return false;
    }
}

/**
 * Notification Templates
 */
const NotificationTemplates = {
    rentBillInitiated: (month, amount, propertyName) => ({
        title: 'New Rent Bill',
        body: `Rent bill for ${month} - ৳${amount.toLocaleString()} for ${propertyName}`,
        data: { type: 'rent_bill', month, amount, propertyName }
    }),

    rentPaymentSent: (tenantName, month, amount) => ({
        title: 'Rent Payment Received',
        body: `${tenantName} has sent rent for ${month} - ৳${amount.toLocaleString()}`,
        data: { type: 'payment_sent', tenantName, month, amount }
    }),

    rentPaymentConfirmed: (month, amount) => ({
        title: 'Payment Confirmed',
        body: `Your payment for ${month} (৳${amount.toLocaleString()}) has been confirmed`,
        data: { type: 'payment_confirmed', month, amount }
    }),

    maintenanceIssueSubmitted: (tenantName, propertyName, issue) => ({
        title: 'New Maintenance Issue',
        body: `${tenantName} reported an issue at ${propertyName}: ${issue.substring(0, 50)}...`,
        data: { type: 'maintenance_issue', tenantName, propertyName, issue }
    }),

    maintenanceIssueResolved: (propertyName) => ({
        title: 'Issue Resolved',
        body: `Your maintenance issue at ${propertyName} has been resolved`,
        data: { type: 'maintenance_resolved', propertyName }
    }),

    tenantRegistered: (propertyName, ownerName) => ({
        title: 'Welcome to RentMaster Pro',
        body: `You've been registered at ${propertyName}. Owner: ${ownerName}`,
        data: { type: 'tenant_registered', propertyName, ownerName }
    }),

    tenantVacated: (propertyName) => ({
        title: 'Tenancy Ended',
        body: `Your tenancy at ${propertyName} has ended. Thank you for staying!`,
        data: { type: 'tenant_vacated', propertyName }
    }),

    rentChanged: (oldRent, newRent, propertyName) => ({
        title: 'Rent Updated',
        body: `Rent for ${propertyName} changed from ৳${oldRent.toLocaleString()} to ৳${newRent.toLocaleString()}`,
        data: { type: 'rent_changed', oldRent, newRent, propertyName }
    })
};

/**
 * Initialize notification service
 * @param {string} userId - User ID
 * @param {string} userType - 'owner' or 'tenant'
 */
async function initializeNotifications(userId, userType) {
    const permissionGranted = await requestNotificationPermission();
    if (permissionGranted) {
        await registerDeviceToken(userId, userType);
        
        // Listen for token refresh
        if (messaging && !tokenRefreshListener) {
            tokenRefreshListener = window.firebaseOnMessage(messaging, (payload) => {
                console.log('Message received:', payload);
                // Handle foreground messages
                if (Notification.permission === 'granted') {
                    new Notification(payload.notification?.title || 'RentMaster Pro', {
                        body: payload.notification?.body,
                        icon: '/icon-192x192.png',
                        data: payload.data
                    });
                }
            });
        }
    }
}

/**
 * Cleanup: Remove old device tokens (older than 90 days)
 */
async function cleanupOldTokens() {
    try {
        const db = await getDB();
        if (!db.deviceTokens) {
            return;
        }

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const originalCount = db.deviceTokens.length;
        db.deviceTokens = db.deviceTokens.filter(
            t => new Date(t.lastUsed) > ninetyDaysAgo
        );

        if (db.deviceTokens.length !== originalCount) {
            await setDB(db);
            console.log(`Cleaned up ${originalCount - db.deviceTokens.length} old tokens`);
        }
    } catch (error) {
        console.error('Error cleaning up tokens:', error);
    }
}

// Expose functions globally
window.NotificationService = {
    requestNotificationPermission,
    getDeviceToken,
    registerDeviceToken,
    getUserTokens,
    getOwnerTokens,
    getTenantTokens,
    sendPushNotification,
    NotificationTemplates,
    initializeNotifications,
    cleanupOldTokens
};

console.log('Notification Service loaded');
