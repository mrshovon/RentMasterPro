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
 * Uses OneSignal for permission request and subscription
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
    }

    try {
        if (window.OneSignal && window.OneSignalDeferred) {
            // Request permission via OneSignal
            const permission = await new Promise((resolve) => {
                window.OneSignalDeferred.push(function(OneSignal) {
                    OneSignal.Notifications.requestPermission().then(resolve);
                });
            });

            if (permission === 'granted') {
                console.log('OneSignal permission granted');
                return true;
            } else {
                console.warn('OneSignal permission denied');
                return false;
            }
        } else {
            // Fallback to browser API
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
 * Register device token in Firebase database and tag user in OneSignal
 * @param {string} userId - User ID (owner ID or property ID for tenants)
 * @param {string} userType - 'owner' or 'tenant'
 */
async function registerDeviceToken(userId, userType) {
    try {
        // Tag user in OneSignal
        if (window.OneSignal && window.OneSignalDeferred) {
            await new Promise((resolve) => {
                window.OneSignalDeferred.push(function(OneSignal) {
                    OneSignal.setExternalUserId(userId).then(resolve);
                });
            });
            console.log('OneSignal external user ID set:', userId);

            // Tag user with user type
            await new Promise((resolve) => {
                window.OneSignalDeferred.push(function(OneSignal) {
                    OneSignal.sendTag('userType', userType).then(resolve);
                });
            });
            console.log('OneSignal tag set:', userType);
        }

        // Also store in Firebase database for backup
        const db = await getDB();
        if (!db.deviceTokens) {
            db.deviceTokens = [];
        }

        // Remove old tokens for this user
        db.deviceTokens = db.deviceTokens.filter(t => t.userId !== userId);

        // Add new entry (we'll store the OneSignal subscription ID if available)
        db.deviceTokens.push({
            userId: userId,
            userType: userType,
            oneSignalEnabled: true,
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
 * Send push notification to specific users
 * Uses OneSignal to send actual push notifications
 * @param {Array} userIds - Array of user IDs (owner IDs or property IDs for tenants)
 * @param {Object} notification - Notification object {title, body, data, url}
 */
async function sendPushNotification(userIds, notification) {
    try {
        // Use OneSignal to send notification
        if (window.OneSignal && window.OneSignalDeferred) {
            // Wait for OneSignal to be ready
            await new Promise(resolve => {
                if (window.OneSignal.isPushNotificationsEnabled()) {
                    resolve();
                } else {
                    window.OneSignalDeferred.push(function(OneSignal) {
                        OneSignal.isPushNotificationsEnabled().then(resolve);
                    });
                }
            });

            // Send notification to users by their tags
            // We tag users with their user ID when they enable notifications
            const contents = {
                en: notification.body
            };

            const headings = {
                en: notification.title
            };

            // Send to each user
            for (const userId of userIds) {
                await window.OneSignalDeferred.push(async function(OneSignal) {
                    try {
                        await OneSignal.sendNotification({
                            contents: contents,
                            headings: headings,
                            include_external_user_ids: [userId],
                            data: notification.data || {},
                            url: notification.url || window.location.href
                        });
                        console.log('OneSignal notification sent to user:', userId);
                    } catch (error) {
                        console.error('OneSignal send error:', error);
                    }
                });
            }

            return true;
        } else {
            console.warn('OneSignal not initialized, storing in database instead');
            return await storeNotificationInDatabase(userIds, notification);
        }
    } catch (error) {
        console.error('Error sending notification via OneSignal:', error);
        // Fallback to database storage if OneSignal fails
        console.log('Falling back to database storage');
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
