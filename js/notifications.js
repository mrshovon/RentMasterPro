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

        // Check if running locally (service workers don't work well with HTTP)
        const isLocal = window.location.hostname === '127.0.0.1' ||
                        window.location.hostname === 'localhost' ||
                        window.location.protocol === 'file:';

        if (isLocal) {
            console.log('Running locally - skipping FCM token registration (service workers require HTTPS)');
            return false;
        }

        // Get FCM token with service worker registration
        let swRegistration;
        try {
            swRegistration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
        } catch (swError) {
            console.warn('Service worker registration failed, continuing without FCM:', swError);
            return false;
        }

        const token = await window.firebaseGetToken(messaging, {
            vapidKey: window.appConfig.fcm.vapidKey,
            serviceWorkerRegistration: swRegistration
        });

        if (!token) {
            console.error('Failed to get FCM token');
            return false;
        }

        // Validate token format (FCM tokens are typically 100+ characters)
        if (typeof token !== 'string' || token.length < 50) {
            console.error('Invalid FCM token format received:', token);
            console.error('Token length:', token.length);
            return false;
        }

        console.log('FCM Token obtained:', token.substring(0, 20) + '...');
        console.log('Token length:', token.length);

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

        // Return actual FCM tokens with validation
        const validTokens = tokens.map(t => t.fcmToken).filter(t => {
            // Validate token format (FCM tokens are typically 100+ characters)
            if (!t || typeof t !== 'string' || t.length < 50) {
                console.warn('Invalid FCM token detected, skipping:', t);
                return false;
            }
            return true;
        });

        console.log(`Found ${validTokens.length} valid FCM tokens for ${userType} ${userId}`);
        return validTokens;
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
 * Uses Vercel API function to call Firebase FCM API
 * @param {Array} userIds - Array of user IDs (device tokens)
 * @param {Object} notification - Notification object {title, body, data, url}
 */
async function sendPushNotification(userIds, notification) {
    try {
        // Check if we have valid tokens
        if (!userIds || userIds.length === 0) {
            console.warn('No valid FCM tokens available, skipping FCM send');
            return await storeNotificationInDatabase([], notification);
        }

        console.log(`Attempting to send FCM notification to ${userIds.length} token(s)`);
        console.log('First token preview:', userIds[0].substring(0, 30) + '...');

        // Check if running locally (no Vercel API available)
        const isLocal = window.location.hostname === '127.0.0.1' ||
                        window.location.hostname === 'localhost' ||
                        window.location.protocol === 'file:';

        if (isLocal) {
            console.log('Running locally - skipping Vercel API, storing notification in database only');
            return await storeNotificationInDatabase(userIds, notification);
        }

        // Send notification via Vercel API
        const response = await fetch('/api/send-fcm-notification', {
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
            console.log('FCM notification sent via Vercel API:', result);
            // Store in database for record-keeping
            await storeNotificationInDatabase(userIds, notification);
            return true;
        } else {
            console.error('Vercel API error:', result);
            // If token is invalid, remove it from database
            if (result.error?.error?.message?.includes('not a valid FCM registration token')) {
                console.warn('Invalid FCM token detected, removing from database');
                await removeInvalidToken(userIds[0]);
            }
            // Fallback to database storage
            return await storeNotificationInDatabase(userIds, notification);
        }
    } catch (error) {
        console.error('Error sending notification via Vercel API:', error);
        // Fallback to database storage if function fails
        return await storeNotificationInDatabase(userIds, notification);
    }
}

/**
 * Remove invalid FCM token from database
 * @param {string} invalidToken - The invalid FCM token to remove
 */
async function removeInvalidToken(invalidToken) {
    try {
        const db = await getDB();
        if (!db.deviceTokens) {
            return;
        }

        const initialCount = db.deviceTokens.length;
        db.deviceTokens = db.deviceTokens.filter(t => t.fcmToken !== invalidToken);
        const removedCount = initialCount - db.deviceTokens.length;

        if (removedCount > 0) {
            await setDB(db);
            console.log(`Removed ${removedCount} invalid FCM token(s) from database`);
        }
    } catch (error) {
        console.error('Error removing invalid token:', error);
    }
}

/**
 * Clear all invalid FCM tokens from database
 * This should be called to clean up old/bad data
 */
async function clearAllInvalidTokens() {
    try {
        const db = await getDB();
        if (!db.deviceTokens) {
            console.log('No device tokens in database');
            return 0;
        }

        const initialCount = db.deviceTokens.length;
        db.deviceTokens = db.deviceTokens.filter(t => {
            const token = t.fcmToken;
            // Valid FCM tokens are 100+ characters
            if (!token || typeof token !== 'string' || token.length < 50) {
                console.warn('Removing invalid token:', token);
                return false;
            }
            return true;
        });
        const removedCount = initialCount - db.deviceTokens.length;

        if (removedCount > 0) {
            await setDB(db);
            console.log(`Cleared ${removedCount} invalid FCM token(s) from database`);
        } else {
            console.log('No invalid tokens found');
        }

        return removedCount;
    } catch (error) {
        console.error('Error clearing invalid tokens:', error);
        return 0;
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
        data: { type: 'rent_bill', month, amount: String(amount), propertyName }
    }),

    rentPaymentSent: (tenantName, month, amount) => ({
        title: 'Rent Payment Received',
        body: `${tenantName} has sent rent for ${month} - ৳${amount.toLocaleString()}`,
        data: { type: 'payment_sent', tenantName, month, amount: String(amount) }
    }),

    rentPaymentConfirmed: (month, amount) => ({
        title: 'Payment Confirmed',
        body: `Your payment for ${month} (৳${amount.toLocaleString()}) has been confirmed`,
        data: { type: 'payment_confirmed', month, amount: String(amount) }
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
        body: `Your rent at ${propertyName} has been updated from ৳${oldRent.toLocaleString()} to ৳${newRent.toLocaleString()}`,
        data: { type: 'rent_changed', oldRent: String(oldRent), newRent: String(newRent), propertyName }
    })
};

/**
 * Initialize notification service
 * @param {string} userId - User ID
 * @param {string} userType - 'owner' or 'tenant'
 */
async function initializeNotifications(userId, userType) {
    // Clear any invalid tokens from database first
    await clearAllInvalidTokens();

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
                        icon: '/assets/icon-192x192.png',
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
