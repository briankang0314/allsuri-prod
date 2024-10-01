import { FillTheBody } from '../main.js';
import { MakeAuthenticatedRequest } from '../api/api.js';
import { ShowErrorMessage, ShowSuccessMessage, PopulateRegions, PopulateCities } from '../utils/helpers.js';
import { ShowIncompleteProfileWarning } from './myProfilePage.js';
import { CheckProfileCompleteness } from './editProfilePage.js';


let isSubmitting = false;



export async function SetupPostOrderPage() {
    // Set up event listeners
    document.getElementById('post-order-form').addEventListener('submit', SubmitOrder);
    document.getElementById('cancel-post-order').addEventListener('click', () => FillTheBody('home'));
    document.getElementById('baack-btn').addEventListener('click', () => FillTheBody('home'));

    // Populate regions and set up region change listener
    PopulateRegions();
    document.getElementById('region').addEventListener('change', (e) => { PopulateCities(e.target.value); });

    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            FillTheBody('home');
        });
    }

    // Set up fee type and input handling
    const feeType = document.getElementById('fee-type');
    const feeInputContainer = document.getElementById('fee-input-container');
    const feeInput = document.getElementById('fee');

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

    feeInput.addEventListener('input', function () {
        const value = this.value;
        if (value === '' || isNaN(value) || value < 0 || value > 100 || !Number.isInteger(Number(value))) {
            this.classList.add('is-invalid');
        } else {
            this.classList.remove('is-invalid');
        }
    });
}

async function SubmitOrder(event) {
    event.preventDefault();
    
    if (isSubmitting) {
        console.log('Submission already in progress');
        return;
    }
    
    if (!await CheckProfileCompleteness()) {
        ShowErrorMessage('오더를 등록하려면 프로필을 완성해야 합니다.');
        await FillTheBody('my-profile');
        ShowIncompleteProfileWarning();
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
        region: regions.find(r => r.id == regionId).name,
        city: regionId == 9 ? '세종시' : city,  // Use '세종시' for Sejong
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
        const result = await response.json();
        console.log('Order submitted successfully:', result);
        
        ShowSuccessMessage('오더가 성공적으로 제출되었습니다!');
        // Redirect to home page after a short delay
        setTimeout(() => FillTheBody('home'), 2000);
    } catch (error) {
        console.error('Error submitting order:', error);
        let errorMessage = '예상치 못한 오류가 발생했습니다. 다시 시도해주세요.';
        if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage = '인증되지 않았습니다. 다시 로그인해주세요.';
            // Optionally, redirect to login page or refresh the token
            // RefreshToken(); // You would need to implement this function
        } else if (error.message.includes('400')) {
            errorMessage = '오더를 제출하는 중 오류가 발생했습니다. 모든 필드를 채워주세요.';
        }
        ShowErrorMessage(errorMessage);
    } finally {
        submitButton.disabled = false;
        isSubmitting = false;
    }
}