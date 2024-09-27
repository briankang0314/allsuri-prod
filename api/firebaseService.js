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
    const firebaseConfig = { apiKey: "AIzaSyC31o_5NeICP4lmMM-siuiL0FpnT2bxHxc", authDomain: "allsuri-test-e2c8f.firebaseapp.com", projectId: "allsuri-test-e2c8f", storageBucket: "allsuri-test-e2c8f.appspot.com", messagingSenderId: "1018254528358", appId: "1:1018254528358:web:e76064107baac031b982a7", measurementId: "G-GL43C8EQCL" };
    const firebaseVapidKey = "BCqZ54Dgg6pEqMHIIRrS1zm5x-frIlYikBsFb6mKiS_p1P7gkUI9HVmRKFU7-ANI6zxiR6zUWC8uRtzndJvufWk";

    try {
        const deviceToken = await getToken((getMessaging(initializeApp(firebaseConfig))), { firebaseVapidKey });

        if (deviceToken) {
            localStorage.setItem('DeviceToken', deviceToken);
            console.log('New device token obtained and saved');
            return deviceToken;
        } else {
            throw new Error('Failed to obtain new device token');
        }
    } catch (error) {
        console.error('Error saving device token:', error);
        throw error;
    }
}