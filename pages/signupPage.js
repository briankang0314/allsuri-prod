import { signUpWithEmail } from '../auth/auth.js';
import { FillTheBody } from '../main.js';

export async function SetupSignupPage() {
	const signupForm = document.getElementById('signup-form');
	signupForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const email = document.getElementById('signup-email').value;
		const password = document.getElementById('signup-password').value;
		try {
			await signUpWithEmail(email, password);
			// Redirect to login page or show success message
			await FillTheBody('login');
        } catch (error) {
            console.error('Signup error:', error);
        }
    });
}