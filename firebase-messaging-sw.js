self.addEventListener('push', (event) => {
    const pushData = event.data.json().notification;
    
    const notificationOptions = {
        body: pushData.body,
        icon: pushData.icon || '/favicon.ico',
    };

    event.waitUntil(
        self.registration.showNotification(pushData.title, notificationOptions)
    );
});