import { FillTheBody } from '../main.js';
import { MakeAuthenticatedRequest } from '../api/api.js';
import { FetchUserProfile } from './myProfilePage.js';
import { ShowErrorMessage, ShowSuccessMessage, PopulateRegions, PopulateCities } from '../utils/helpers.js';
import { categories, regions } from '../utils/constants.js';



export async function SetupEditProfilePage() {
    
    try {
        console.log("Starting SetupEditProfilePage");

        const logoLink = document.getElementById('logo-link');
        if (logoLink) {
            logoLink.addEventListener('click', (e) => {
                e.preventDefault();
                FillTheBody('home');
            });
        }

        const backBtn = document.getElementById('back-btn');
        console.log("Back button found:", !!backBtn);
        if (backBtn) {
            backBtn.addEventListener('click', () => FillTheBody('my-profile'));
        }

        const saveProfileChangesBtn = document.getElementById('btn-save-profile');
        console.log("Save button found:", !!saveProfileChangesBtn);
        if (saveProfileChangesBtn) {
            saveProfileChangesBtn.addEventListener('click', SaveProfileChanges);
        }

        const phoneInput = document.getElementById('editPhone');
        console.log("Phone input found:", !!phoneInput);
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
    regionSelect.value = regions.find(r => r.name === profile.region)?.id ?? '';
    regionSelect.addEventListener('change', (e) => { PopulateCities(e.target.value); });

    PopulateCities(regionSelect.value);
    document.getElementById('city').value = profile.city ?? '';

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
    const updatedProfile = {
        nickname: document.getElementById('editNickname').value,
        phone: document.getElementById('editPhone').value,
        region: regions.find(r => r.id == document.getElementById('region').value)?.name,
        city: document.getElementById('region').value == 9 ? '세종시' : document.getElementById('city').value,
        preferred_categories: Array.from(document.querySelectorAll('#categoryCheckboxes input:checked')).map(input => input.value)
    };
    
    console.log('Updated profile:', updatedProfile);

    try {
        console.log('Updating profile...');
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
        console.log('Profile update result:', result);

        if (result.success) {
            ShowSuccessMessage('프로필이 성공적으로 업데이트되었습니다.', 3000);

            let user = JSON.parse(localStorage.getItem('user'));
            user = { ...user, ...updatedProfile };
            localStorage.setItem('user', JSON.stringify(user));

            if (await CheckProfileCompleteness()) {
                console.log('Profile is complete');
                await FillTheBody('my-profile');
            } else {
                console.log('Profile is incomplete');
                await FillTheBody('my-profile');
            }
        } else {
            throw new Error(result.message || '프로필 업데이트에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        ShowErrorMessage('프로필 업데이트에 실패했습니다. 다시 시도해 주세요.');
    }
}

export async function CheckProfileCompleteness() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return false;

    const requiredFields = ['phone', 'region', 'city', 'preferred_categories'];
    return requiredFields.every(field => user[field] && user[field].length > 0);
}