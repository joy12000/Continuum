export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log("This browser does not support desktop notification");
        return 'denied';
    }
    const permission = await Notification.requestPermission();
    return permission;
}
