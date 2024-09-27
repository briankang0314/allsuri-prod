import { FillTheBody } from '../main.js';
import { ShowErrorMessage, ShowSuccessMessage } from '../utils/helpers.js';
import { SaveDeviceToken } from '../api/firebaseService.js';


export async function SetupNotificationsPage() {
    // Show or hide sections based on notification permission
    document.getElementById('default').style.display = 'none';
    document.getElementById('denied').style.display = 'none';

    switch (Notification.permission) {
        case 'default':
            document.getElementById('default').style.display = 'block';
            const allowButton = document.getElementById('button_notification_allow');
            if (allowButton) {
                allowButton.addEventListener('click', async function () {
                    try {
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                            console.log('Notification permission granted');
                            allowButton.style.display = 'none';
                            const deviceTokenElement = document.getElementById('device_token');
                            if (deviceTokenElement) {
                                deviceTokenElement.style.display = 'block';
                            }

                            await SaveDeviceToken();

                            setTimeout(() => {
                                ShowSuccessMessage('알림 설정이 완료되었습니다. 로그인 해주세요.');
                                FillTheBody('login');  // Navigate to login page instead of home
                            }, 2000);
                        } else {
                            console.log('Notification permission denied');
                            document.getElementById('default').style.display = 'none';
                            document.getElementById('denied').style.display = 'block';
                        }
                    } catch (error) {
                        console.error('Error requesting notification permission:', error);
                        ShowErrorMessage('알림 권한 요청 중 오류가 발생했습니다. 다시 시도해주세요.');
                    }
                });
            }
            break;

        case 'denied':
            document.getElementById('denied').style.display = 'block';
            const retryButton = document.getElementById('retry-button');
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    window.location.reload();
                });
            }
            break;

        case 'granted':
            const deviceToken = localStorage.getItem('DeviceToken');
            if (!deviceToken) {
                // Attempt to save the device token again
                try {
                    await SaveDeviceToken();
                    ShowSuccessMessage('알림 설정이 완료되었습니다. 로그인 해주세요.');
                    setTimeout(() => {
                        FillTheBody('login');
                    }, 2000);
                } catch (error) {
                    console.error('Error saving device token:', error);
                    ShowErrorMessage('디바이스 토큰 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
                }
            } else {
                ShowSuccessMessage('알림 권한이 허용되어 있습니다.');
                setTimeout(() => {
                    FillTheBody('home');
                }, 1500);
            }
            break;
    }
}