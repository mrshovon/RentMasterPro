importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDTyvem4AV1deCh5WzG20NzR0fOBPQ2qjc",
  authDomain: "rentmasterpro-45672.firebaseapp.com",
  databaseURL: "https://rentmasterpro-45672-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rentmasterpro-45672",
  storageBucket: "rentmasterpro-45672.firebasestorage.app",
  messagingSenderId: "970817206915",
  appId: "1:970817206915:web:10ffa2182b9f7ac7ef39b6",
  measurementId: "G-QRF9V9LLLY"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
