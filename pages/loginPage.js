import { FillTheBody } from '../main.js';
import { loginWithEmail } from '../auth/auth.js';


export async function SetupLoginPage() {
    // Handle logo link click
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await FillTheBody('home');
        });
    }

    // Handle Kakao login button click
    const kakaoLoginBtn = document.getElementById('kakao-login-btn');
    if (kakaoLoginBtn) {
        kakaoLoginBtn.addEventListener('click', function () {
            console.log('Attempting Kakao login');
            Kakao.Auth.authorize({
                redirectUri: 'https://allsuri.netlify.app/oauth/callback',
            });
        });
    }

    // Handle back button click
    const backButton = document.getElementById('back-btn');
    if (backButton) {
        backButton.addEventListener('click', async () => await FillTheBody('home'));
    }

    const emailLoginForm = document.getElementById('email-login-form');
    emailLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const user = await loginWithEmail(email, password);
            if (user) {
                // Handle successful login (e.g., store user info, redirect)
                await FillTheBody('home');
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    });

    // const signupLink = document.getElementById('signup-link');
    // signupLink.addEventListener('click', (e) => {
    //     e.preventDefault();
    //     // Show signup form or navigate to signup page
    //     FillTheBody('sign-up');
    // });
}