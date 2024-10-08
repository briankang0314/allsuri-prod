import { FillTheBody } from '../main.js';
import { MakeAuthenticatedRequest } from '../api/api.js';
import { FetchUserProfile } from './myProfilePage.js';
import { ShowErrorMessage, ShowSuccessMessage, PopulateRegions, PopulateCities } from '../utils/helpers.js';
import { categories, regions } from '../utils/constants.js';
import { ShowOverlay, HideOverlay } from '../utils/loadingSpinner.js';

export async function SetupEditProfilePage() {
    try {
        console.log("Starting SetupEditProfilePage");

        const logoLink = document.getElementById('logo-link');
        if (logoLink) {
            logoLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await FillTheBody('home');
            });
        }

        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                const offcanvasMenu = new bootstrap.Offcanvas(document.getElementById('offcanvasMenu'));
                offcanvasMenu.show();
            });
        }

        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', async () => await FillTheBody('home'));
        }

        const postOrderBtn = document.getElementById('post-order-btn');
        if (postOrderBtn) {
            postOrderBtn.addEventListener('click', async () => await FillTheBody('post-order'));
        }

        const chatBtn = document.getElementById('chat-btn');
        if (chatBtn) {
            chatBtn.addEventListener('click', async () => await FillTheBody('chat'));
        }

        const myProfileBtn = document.getElementById('my-profile-btn');
        if (myProfileBtn) {
            myProfileBtn.addEventListener('click', async () => await FillTheBody('my-profile'));
        }

        const saveProfileChangesBtn = document.getElementById('btn-save-profile');
        if (saveProfileChangesBtn) {
            saveProfileChangesBtn.addEventListener('click', SaveProfileChanges);
        }

        const phoneInput = document.getElementById('editPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function (e) {
                let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,4})(\d{0,4})/);
                e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2] + (x[3] ? '-' + x[3] : '');
            });
        }

        console.log("Fetching user profile");
        const profile = await FetchUserProfile();
        console.log("Profile fetched:", !!profile);

        if (profile) {
            console.log("Populating edit profile form");
            PopulateEditProfileForm(profile);
        } else {
            console.log("Profile fetch failed");
            ShowErrorMessage('프로필 정보를 불러오는데 실패했습니다.');
        }
    } catch (error) {
        console.error("Error in SetupEditProfilePage:", error);
        ShowErrorMessage('edit-profile 페이지 로딩 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

function PopulateEditProfileForm(profile) {
    document.getElementById('editNickname').value = profile.nickname ?? '';
    document.getElementById('editPhone').value = profile.phone ?? '';

    PopulateRegions();
    const regionSelect = document.getElementById('region');
    const selectedRegion = regions.find(r => r.name === profile.region);

    regionSelect.value = selectedRegion?.id ?? '';
    regionSelect.addEventListener('change', (e) => { PopulateCities(e.target.value); });

    if (regionSelect.value) {
        PopulateCities(regionSelect.value);
        document.getElementById('city').value = profile.city ?? '';
    } else {
        const citySelect = document.getElementById('city');
        citySelect.innerHTML = '<option value="">도시 선택</option>';
        citySelect.disabled = true;
    }

    const categoryCheckboxes = document.getElementById('categoryCheckboxes');
    categoryCheckboxes.innerHTML = '';
    categories.forEach(category => {
        const div = document.createElement('div');
        div.className = 'form-check mb-2';
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${category}" id="category-${category}" 
                ${profile.preferred_categories?.includes(category) ? 'checked' : ''}>
            <label class="form-check-label" for="category-${category}">${category}</label>
        `;
        categoryCheckboxes.appendChild(div);
    });
}

async function SaveProfileChanges() {
    ShowOverlay();

    const updatedProfile = {
        nickname: document.getElementById('editNickname').value,
        phone: document.getElementById('editPhone').value,
        region: regions.find(r => r.id == document.getElementById('region').value)?.name,
        city: document.getElementById('region').value == 9 ? '세종시' : document.getElementById('city').value,
        preferred_categories: Array.from(document.querySelectorAll('#categoryCheckboxes input:checked')).map(input => input.value)
    };

    try {
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/UpdateProfile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'update_profile',
                profile_data: updatedProfile
            })
        });

        const result = await response.json();

        if (result.success) {
            ShowSuccessMessage('프로필이 성공적으로 업데이트되었습니다.', 3000);

            let user = JSON.parse(localStorage.getItem('user'));
            user = { ...user, ...updatedProfile };
            localStorage.setItem('user', JSON.stringify(user));

            if (await CheckProfileCompleteness()) {
                await FillTheBody('my-profile');
            } else {
                await FillTheBody('my-profile');
            }
        } else {
            throw new Error(result.message || '프로필 업데이트에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        ShowErrorMessage('프로필 업데이트에 실패했습니다. 다시 시도해 주세요.');
    } finally {
        HideOverlay();
    }
}

export async function CheckProfileCompleteness() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return false;

    const requiredFields = ['nickname', 'phone', 'region', 'city', 'preferred_categories'];
    return requiredFields.every(field => user[field] && user[field].length > 0);
}