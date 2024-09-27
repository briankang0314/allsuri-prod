import { FillTheBody } from '../main.js';



export async function SetupLoginPage() {
    // Handle logo link click
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            FillTheBody('home');
        });
    }

    // Handle Kakao login button click
    const kakaoLoginBtn = document.getElementById('kakao-login-btn');
    if (kakaoLoginBtn) {
        kakaoLoginBtn.addEventListener('click', function () {
            console.log('Attempting Kakao login');
            Kakao.Auth.authorize({
                redirectUri: 'https://allsuri-test.netlify.app/oauth/callback',
            });
        });
    }

    // Handle back button click
    const backButton = document.getElementById('back-btn');
    if (backButton) {
        backButton.addEventListener('click', () => FillTheBody('home'));
    }
}