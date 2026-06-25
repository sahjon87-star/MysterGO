/* eslint-disable */
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

// The configuration will be passed via URL parameter to the service worker in production
// Since we don't have build step for public files, this should be handled properly
const urlParams = new URL(location).searchParams;
const apiKey = urlParams.get('apiKey');

if (apiKey) {
  firebase.initializeApp({
    apiKey: apiKey,
    authDomain: urlParams.get('authDomain') || "rajmistri-1.firebaseapp.com",
    projectId: urlParams.get('projectId') || "rajmistri-1",
    storageBucket: urlParams.get('storageBucket') || "rajmistri-1.firebasestorage.app",
    messagingSenderId: urlParams.get('messagingSenderId') || "331898998990",
    appId: urlParams.get('appId') || "1:331898998990:web:79144c83397b99e9dfc09f"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'Notification';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn("Firebase SW initialization skipped: apiKey not provided in URL");
}
