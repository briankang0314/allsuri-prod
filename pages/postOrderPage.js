// postOrderPage.js
import { FillTheBody } from '../main.js';
import { MakeAuthenticatedRequest } from '../api/api.js';
import { ShowErrorMessage, ShowSuccessMessage, PopulateRegions, PopulateCities } from '../utils/helpers.js';
import { ShowIncompleteProfileWarning } from './myProfilePage.js';
import { CheckProfileCompleteness } from './editProfilePage.js';
import { regions } from '../utils/constants.js';
import { ShowOverlay, HideOverlay } from '../utils/loadingSpinner.js';

let isSubmitting = false;

export async function SetupPostOrderPage() {
    // Wait for the DOM to be updated
    await new Promise(resolve => setTimeout(resolve, 0));

    // Ensure elements are loaded
    const postOrderForm = document.getElementById('post-order-form');
    if (!postOrderForm) {
        console.error('post-order-form not found in DOM');
        return;
    }

    // Set up event listeners
    postOrderForm.addEventListener('submit', SubmitOrder);

    // Home button
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await FillTheBody('home');
        });
    }

    // Chat button
    const chatBtn = document.getElementById('chat-btn');    
    if (chatBtn) {
        chatBtn.addEventListener('click', async () => await FillTheBody('chat'));
    }

    // Post Order button
    const postOrderBtn = document.getElementById('post-order-btn');
    if (postOrderBtn) {
        postOrderBtn.addEventListener('click', async () => await FillTheBody('post-order'));
    }

    // Menu buttons
    const menuBtn = document.getElementById('menu-btn');
    const menuBtnBottom = document.getElementById('menu-btn-bottom');
    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const offcanvasMenu = new bootstrap.Offcanvas(document.getElementById('offcanvasMenu'));
            offcanvasMenu.show();
        });
    }
    if (menuBtnBottom) {
        menuBtnBottom.addEventListener('click', (e) => {
            e.preventDefault();
            const offcanvasMenu = new bootstrap.Offcanvas(document.getElementById('offcanvasMenu'));
            offcanvasMenu.show();
        });
    }

    // Offcanvas menu items
    const menuItems = document.querySelectorAll('#offcanvasMenu .nav-link');
    menuItems.forEach(item => {
        item.addEventListener('click', HandleMenuItemClick);
    });

    // Populate regions and set up region change listener
    PopulateRegions();
    const regionSelect = document.getElementById('region');
    if (regionSelect) {
        regionSelect.addEventListener('change', (e) => { PopulateCities(e.target.value); });
    }

    // Set up fee type and input handling
    const feeType = document.getElementById('fee-type');
    const feeInputContainer = document.getElementById('fee-input-container');
    const feeInput = document.getElementById('fee');

    if (feeType) {
        feeType.addEventListener('change', function () {
            if (this.value === 'fixed') {
                feeInputContainer.style.display = 'block';
                feeInput.required = true;
            } else {
                feeInputContainer.style.display = 'none';
                feeInput.required = false;
                feeInput.value = '';
                feeInput.classList.remove('is-invalid');
            }
        });
    }

    if (feeInput) {
        feeInput.addEventListener('input', function () {
            const value = this.value;
            if (value === '' || isNaN(value) || value < 0 || value > 100 || !Number.isInteger(Number(value))) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    }
}

function HandleMenuItemClick(e) {
    e.preventDefault();
    const href = e.target.getAttribute('href');

    // Close the offcanvas menu
    const offcanvasMenu = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasMenu'));
    if (offcanvasMenu) {
        offcanvasMenu.hide();
    }

    // Handle the click action
    try {
        switch (href) {
            case '#my-profile':
                FillTheBody('my-profile');
                break;
            case '#my-orders':
                FillTheBody('my-orders');
                break;
            case '#my-applications':
                FillTheBody('my-applications');
                break;
        }
    } catch (error) {
        console.error('Error handling menu item click:', error);
        ShowErrorMessage('오류가 발생했습니다. 다시 시도해주세요.');
    }
}

async function SubmitOrder(event) {
    event.preventDefault();

    if (isSubmitting) {
        console.log('Submission already in progress');
        return;
    }

    // Show overlay to make screen unclickable
    ShowOverlay();

    if (!await CheckProfileCompleteness()) {
        ShowErrorMessage('오더를 등록하려면 프로필을 완성해야 합니다.');
        await FillTheBody('my-profile');
        ShowIncompleteProfileWarning();
        HideOverlay();
        return;
    }

    console.log('SubmitOrder function called');

    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    isSubmitting = true;

    const title = document.getElementById('title').value;
    const category = document.getElementById('category').value;
    const regionId = document.getElementById('region').value;
    const city = document.getElementById('city').value;
    const description = document.getElementById('description').value;
    const feeType = document.getElementById('fee-type').value;
    const feeInput = document.getElementById('fee');

    // Validate fee input if fixed fee is selected
    if (feeType === 'fixed') {
        const feeValue = feeInput.value;
        if (feeValue === '' || isNaN(feeValue) || feeValue < 0 || feeValue > 100 || !Number.isInteger(Number(feeValue))) {
            feeInput.classList.add('is-invalid');
            ShowErrorMessage('유효한 고정 수수료를 입력해주세요. (0-100 사이의 정수)');
            submitButton.disabled = false;
            isSubmitting = false;
            return;
        }
    }

    // Set fee to -1 if 'adjustable', otherwise use the input value
    const fee = feeType === 'adjustable' ? -1 : Number(feeInput.value);

    const clientOrderId = Date.now().toString() + Math.random().toString(36).slice(2, 7);

    const orderData = {
        clientOrderId,
        title,
        category,
        region: regions.find(r => r.id == regionId)?.name || '',
        city: regionId == 9 ? '세종시' : city,  // 세종시는 별도로 처리
        fee: Number(fee),
        description
    };

    console.log('Order data:', orderData);

    try {
        console.log('Attempting to make authenticated request');
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/SubmitOrder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        console.log('Response received:', response);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Order submitted successfully:', result);

        ShowSuccessMessage('오더가 성공적으로 제출되었습니다!');
        // 일정 시간 후 홈으로 이동
        setTimeout(() => {
            HideOverlay();
            FillTheBody('home')
        }, 2000);
    } catch (error) {
        console.error('Error submitting order:', error);
        let errorMessage = '예상치 못한 오류가 발생했습니다. 다시 시도해주세요.';
        if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage = '인증되지 않았습니다. 다시 로그인해주세요.';
        } else if (error.message.includes('400')) {
            errorMessage = '오더를 제출하는 중 오류가 발생했습니다. 모든 필드를 채워주세요.';
        }
        ShowErrorMessage(errorMessage);
        HideOverlay();
    } finally {
        submitButton.disabled = false;
        isSubmitting = false;
    }
}