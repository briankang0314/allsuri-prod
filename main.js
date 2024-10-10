import { SetupLandingPage } from './pages/landingPage.js';
import { SetupNotificationsPage } from './pages/notificationsPage.js';
import { SetupLoginPage } from './pages/loginPage.js';
import { SetupHomePage } from './pages/homePage.js';
import { SetupMyProfilePage } from './pages/myProfilePage.js';
import { SetupEditProfilePage } from './pages/editProfilePage.js';
import { SetupMyOrdersPage } from './pages/myOrdersPage.js';
import { SetupMyApplicationsPage } from './pages/myApplicationsPage.js';
import { SetupOrderApplicationsPage } from './pages/orderApplicationsPage.js';
import { SetupPostOrderPage } from './pages/postOrderPage.js';
import { SetupApplyForOrderPage } from './pages/applyForOrderPage.js';
import { SetupChatPage } from './pages/chatPage.js';
import { SetupSignupPage } from './pages/signupPage.js';
import { ShowErrorMessage } from './utils/helpers.js';
import { ShowOverlay, HideOverlay } from './utils/loadingSpinner.js';



export async function FillTheBody(contentName, params = {}) {
    try {
        ShowOverlay();

        // Fetch and render the page content
        const response = await fetch(`/contents/${contentName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${contentName}: ${response.statusText}`);
        }
        const content = await response.text();

        const sanitizedContent = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        const contentContainer = document.getElementById('main-content');
        if (!contentContainer) {
            throw new Error('Main content container not found in the DOM');
        }
        contentContainer.innerHTML = sanitizedContent;

        await new Promise(resolve => setTimeout(resolve));

        // Delegate page-specific setup
        switch (contentName) {
            case 'landing':
                await SetupLandingPage();
                break;
            case 'notification':
                await SetupNotificationsPage();
                break;
            case 'login':
                await SetupLoginPage();
                break;
            case 'home':
                await SetupHomePage();
                break;
            case 'my-profile':
                await SetupMyProfilePage();
                break;
            case 'edit-profile':
                await SetupEditProfilePage();
                break;
            case 'post-order':
                await SetupPostOrderPage();
                break;
            case 'apply-for-order':
                await SetupApplyForOrderPage();
                break;
            case 'my-orders':
                await SetupMyOrdersPage();
                break;
            case 'order-applications':
                await SetupOrderApplicationsPage(params);
                break;
            case 'my-applications':
                await SetupMyApplicationsPage();
                break;
            case 'chat':
                await SetupChatPage();
                break;
            case 'sign-up':
                await SetupSignupPage();
                break;
            default:
                console.error(`Unknown content name: ${contentName}`);
        }

        HideOverlay();
    } catch (error) {
        console.error(`Error loading ${contentName}:`, error);
        HideOverlay();
        ShowErrorMessage(`${contentName} 페이지 로딩 중 오류가 발생했습니다. 다시 시도해주세요.`);
    }
}