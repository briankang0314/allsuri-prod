import { FillTheBody } from './main.js';
import { LoginByKakao } from './auth/auth.js';
import { KAKAO_APP_KEY } from './utils/constants.js';
import { ShowIncompleteProfileWarning } from './pages/myProfilePage.js';
import { CheckProfileCompleteness } from './pages/editProfilePage.js';



document. addEventListener('DOMContentLoaded', async () => {
	if (window.matchMedia('(display-mode: standalone)').matches) {
		if (!window.Kakao.isInitialized()) { window.Kakao.init(KAKAO_APP_KEY); }

		if (window.location.pathname === '/oauth/callback') { await LoginByKakao(); return; }

        const deviceToken = localStorage.getItem('DeviceToken');
		if (Notification.permission !== 'granted' || !deviceToken) {
            await FillTheBody('notification');
            return;
        }

		if (!localStorage.getItem('user') || !localStorage.getItem('tokens')) { await FillTheBody('login'); return; }
        else { if (!await CheckProfileCompleteness()) {await FillTheBody('my-profile'); ShowIncompleteProfileWarning(); return;} }

		await FillTheBody('home');
	} else {
		if (navigator.userAgent.toLowerCase().indexOf('kakao') >= 0) { 
			location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
			return;
		}

		await FillTheBody('landing');
	}
})