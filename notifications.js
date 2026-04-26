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
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
    }

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
            vapidKey: 'BOie5s_MUJ-gWc2HLWxUN5cgdDXrQ-4XX4Qffo41KBIM6gSmoYKzLVoWFUFrs5XSaG4D9upsf2VXCwYmDi27eII'
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
 * Register device token in database
 * @param {string} userId - User ID (owner ID or property ID for tenant)
 * @param {string} userType - 'owner' or 'tenant'
 */
async function registerDeviceToken(userId, userType) {
    const token = await getDeviceToken();
    if (!token) {
        console.warn('No device token to register');
        return false;
    }

    try {
        const db = await getDB();
        
        // Initialize deviceTokens array if not exists
        if (!db.deviceTokens) {
            db.deviceTokens = [];
        }

        // Check if token already registered for this user
        const existingIndex = db.deviceTokens.findIndex(
            t => t.userId === userId && t.token === token
        );

        if (existingIndex === -1) {
            // Add new token
            db.deviceTokens.push({
                userId: userId,
                userType: userType,
                token: token,
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            });
        } else {
            // Update last used timestamp
            db.deviceTokens[existingIndex].lastUsed = new Date().toISOString();
        }

        await setDB(db);
        console.log('Device token registered successfully');
        return true;
    } catch (error) {
        console.error('Error registering device token:', error);
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

        return db.deviceTokens.filter(
            t => t.userId === userId && t.userType === userType
        );
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
 * Send push notification to specific tokens
 * Note: This requires Firebase Cloud Functions or a backend server
 * For client-side only, we'll store notifications in database and let service worker handle them
 * @param {Array} tokens - Array of device tokens
 * @param {Object} notification - Notification object {title, body, data}
 */
async function sendPushNotification(tokens, notification) {
    // For client-side implementation, we'll store notifications in database
    // In production, use Firebase Cloud Functions to send actual push notifications
    
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
        
        // In production, you would call Firebase Cloud Functions here
        // Example: await fetch('https://your-cloud-function-url/sendNotification', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ tokens, notification })
        // });

        return true;
    } catch (error) {
        console.error('Error sending notification:', error);
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
