import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';


export async function GetDeviceToken() {
    let deviceToken = localStorage.getItem('DeviceToken');
    if (!deviceToken) {
        try {
            deviceToken = await SaveDeviceToken();
        } catch (error) {
            console.error('Failed to get new device token:', error);
            return null;
        }
    }
    return deviceToken;
}

export async function SaveDeviceToken() {
    const firebaseConfig = {
        apiKey: "AIzaSyD0TopF4AXzudCBoNWTbFwXAuaV76TPke8",
        authDomain: "allsuri-prod.firebaseapp.com",
        projectId: "allsuri-prod",
        storageBucket: "allsuri-prod.appspot.com",
        messagingSenderId: "64688660310",
        appId: "1:64688660310:web:22c5a4cca7d6097a1740f7",
        measurementId: "G-L1JSJVYKLY"
    };
    const firebaseVapidKey = "BCPVfu1anuHyvCD2M5o56ZsMoll8xzhoofJzjXo3bgvp9h1BhWpP1owCbveh1Z2bmaeKDHt45bSbH4WlZTZQjQE";

    try {
        const app = initializeApp(firebaseConfig);

        if ('serviceWorker' in navigator) {
            // Register the service worker
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker registration successful with scope:', registration.scope);

            // Initialize Firebase Messaging
            const messaging = getMessaging(app);

            // Request permission if not already granted
            if (Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    throw new Error('Notification permission not granted');
                }
            }

            // Get the device token
            const deviceToken = await getToken(messaging, {
                vapidKey: firebaseVapidKey,
                serviceWorkerRegistration: registration,
            });

            if (deviceToken) {
                localStorage.setItem('DeviceToken', deviceToken);
                console.log('New device token obtained and saved');
                return deviceToken;
            } else {
                throw new Error('Failed to obtain new device token');
            }
        } else {
            throw new Error('Service workers are not supported in this browser');
        }
    } catch (error) {
        console.error('Error saving device token:', error);
        throw error;
    }
}