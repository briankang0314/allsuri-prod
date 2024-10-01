import { FillTheBody } from '../main.js';
import { MakeAuthenticatedRequest } from '../api/api.js';
import { ShowErrorMessage } from '../utils/helpers.js';



export async function SetupMyProfilePage() {
    try {
        console.log("Starting SetupMyProfilePage");

        // Fetch the user profile
        const profile = await FetchUserProfile();
        if (!profile) {
            throw new Error('Failed to fetch user profile');
        }

        // Set up event listeners
        SetupMyProfileEventListeners();

        // Update the profile UI with fetched data
        UpdateProfileUI(profile);

        console.log("SetupMyProfilePage completed successfully");
    } catch (error) {
        console.error("Error in SetupMyProfilePage:", error);
        ShowErrorMessage('프로필 페이지 로딩 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

export async function FetchUserProfile() {
    try {
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/GetProfile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'get_profile' })
        });
        return await response.json();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

function SetupMyProfileEventListeners() {
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await FillTheBody('home');
        });
    }

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', async () => await FillTheBody('home'));
    }

    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', async () => await FillTheBody('edit-profile'));
    }

    InitializeAnimations();
}

function CalculateProfileCompletion(profile) {
    const requiredFields = ['nickname', 'email', 'phone', 'region', 'city', 'profile_image_url'];
    const completedFields = requiredFields.filter(field => profile[field]).length;
    return Math.round((completedFields / requiredFields.length) * 100);
}

function UpdateProfileUI(profile) {
    // profile image
    document.getElementById('profile-image').src = profile.profile_image_url ?? '/contents/_icon.png';

    // user info
    document.getElementById('user-nickname').textContent = profile.nickname ?? '정보 없음';
    document.getElementById('user-email').textContent = profile.email ?? '정보 없음';

    // Format dates
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('ko-KR');
    document.getElementById('created-at').textContent = profile.created_at ? formatDate(profile.created_at) : '알 수 없음';

    // New fields
    document.getElementById('account-type').textContent = profile.account_type ?? '일반 사용자';
    document.getElementById('user-phone').textContent = profile.phone ?? '정보 없음';
    document.getElementById('user-location').textContent = `${profile.region || ''} ${profile.city || ''}`.trim() || '정보 없음';

    // Profile completion
    const completionPercentage = CalculateProfileCompletion(profile);
    UpdateProfileCompletionBar(completionPercentage);

    // Rating and orders
    document.getElementById('user-rating').textContent = profile.average_rating ? `${profile.average_rating.toFixed(1)}/5.0` : '아직 평가 없음';
    document.getElementById('completed-orders').textContent = profile.completed_orders ?? '0';

    // Account statistics
    const statItems = [
        { id: 'total-orders', value: profile.total_orders ?? '0' },
        { id: 'completed-orders-count', value: profile.completed_orders ?? '0' },
        { id: 'cancellation-rate', value: profile.cancellation_rate?.toFixed(1) ?? '0.0' }
    ];

    statItems.forEach((item, index) => {
        const element = document.getElementById(item.id);
        if (element) {
            setTimeout(() => {
                element.textContent = item.value;
                element.style.opacity = 1;
            }, 100 * index);
        }
    });

    // Preferred categories
    UpdatePreferredCategories(profile.preferred_categories);
}

function UpdateProfileCompletionBar(percentage) {
    const completionBar = document.getElementById('profile-completion');
    const progressBarContainer = document.getElementById('profile-completion-section');

    if (percentage === 100) {
        progressBarContainer.style.display = 'none';
    } else {
        progressBarContainer.style.display = 'block';
        completionBar.style.width = `${percentage}%`;
        completionBar.setAttribute('aria-valuenow', percentage);
        completionBar.textContent = `${percentage}%`;
    }
}

function UpdatePreferredCategories(categories) {
    const categoriesContainer = document.getElementById('preferred-categories');
    categoriesContainer.innerHTML = '';
    (categories ?? []).forEach(category => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-secondary me-2 mb-2';
        badge.textContent = category;
        categoriesContainer.appendChild(badge);
    });
}

export function ShowIncompleteProfileWarning() {
    const warningElement = document.getElementById('incomplete-profile-warning');
    if (warningElement) {
        warningElement.style.display = 'block';
    }

    const completeProfileBtn = document.getElementById('complete-profile-btn');
    if (completeProfileBtn) {
        completeProfileBtn.addEventListener('click', async () => await FillTheBody('edit-profile'));
    }
}

function InitializeAnimations() {
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach((item, index) => {
        item.style.opacity = 0;
        setTimeout(() => {
            item.style.opacity = 1;
        }, 100 * index);
    });
}