// orderApplicationsPage.js

import { FillTheBody } from '../main.js';
import { MakeAuthenticatedRequest } from '../api/api.js';
import { ShowErrorMessage, ShowSuccessMessage, GetTimeAgo, GetStatusClass, GetStatusText } from '../utils/helpers.js';
import { ShowOverlay, HideOverlay } from '../utils/loadingSpinner.js';

export let currentOrderId = null;

export async function SetupOrderApplicationsPage(params) {
    console.log('Setting up Order Applications Page with params:', params);

    if (!params || !params.order) {
        console.error('Invalid params for SetupOrderApplicationsPage');
        ShowErrorMessage('Invalid order information');
        await FillTheBody('my-orders');
        return;
    }

    const order = params.order;
    currentOrderId = order.order_id;
    console.log('Current order ID set:', currentOrderId);

    SetupEventListeners();
    DisplayOrderInfo(order);
    await FetchAndDisplayApplications(currentOrderId);

    console.log('Order Applications Page setup complete');
}

function SetupEventListeners() {
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

    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await FillTheBody('my-orders');
        });
    }

    // Menu button
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
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

    // Logo link
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await FillTheBody('home');
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

function DisplayOrderInfo(order) {
    const orderInfoSection = document.getElementById('order-info');
    if (orderInfoSection) {
        orderInfoSection.innerHTML = `
            <div class="card order-info-card">
                <div class="card-body">
                    <h5 class="card-title">${order.title || 'No Title'}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${order.location || 'No Location'}</h6>
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <p><strong>상태:</strong> <span class="badge ${order.status === 'open' ? 'bg-success' : 'bg-danger'}">${order.status === 'open' ? '지원가능' : '마감'}</span></p>
                            <p><strong>수수료:</strong> ${order.fee === -1 ? '수수료 조정 가능' : `${Number(order.fee || 0).toLocaleString()}%`}</p>
                            <p><strong>지원자:</strong> ${order.applicants_count || 0}명</p>
                            <p><strong>등록일:</strong> ${GetTimeAgo(order.created_at)}</p>
                        </div>
                    </div>
                    <hr>
                    <h6 class="fw-bold mb-3">오더 내용</h6>
                    <p>${order.description || '상세 설명 없음'}</p>
                </div>
            </div>
        `;
    } else {
        console.error('Order info section not found');
    }
}

async function FetchAndDisplayApplications(orderId) {
    console.log('Fetching applications for order ID:', orderId);
    if (!orderId) {
        console.error('Invalid order ID');
        ShowErrorMessage('유효하지 않은 주문 ID입니다.');
        return;
    }

    try {
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/GetOrderApplications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_id: orderId })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch order applications: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success || !result.applications || !Array.isArray(result.applications)) {
            throw new Error('Invalid response format: applications array not found or request unsuccessful');
        }

        const orderStatus = await FetchOrderStatus(orderId);

        DisplayApplicationList(result.applications, orderStatus);
    } catch (error) {
        console.error('Error fetching order applications:', error);
        ShowErrorMessage('지원서를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

async function FetchOrderStatus(orderId) {
    try {
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/GetOrderStatus', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_id: orderId })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch order status');
        }

        const result = await response.json();
        return result.status;
    } catch (error) {
        console.error('Error fetching order status:', error);
        return 'unknown';
    }
}

function DisplayApplicationList(applications, orderStatus) {
    const container = document.getElementById('applications-list');
    container.innerHTML = '';

    const isOrderClosed = orderStatus === 'closed';

    if (applications.length === 0) {
        container.innerHTML = '<p class="text-center">아직 지원서가 없습니다.</p>';
        return;
    }

    applications.forEach(application => {
        const template = document.getElementById('application-item-template');
        if (!template) {
            console.error('Application item template not found');
            return;
        }

        const applicationElement = template.content.cloneNode(true);

        const applicationItem = applicationElement.querySelector('.application-item');
        applicationItem.setAttribute('data-application-id', application.application_id);

        applicationElement.querySelector('.applicant-name').textContent = application.applicant_name || '이름 없음';
        const statusBadge = applicationElement.querySelector('.application-status');
        statusBadge.textContent = GetStatusText(application.status);
        statusBadge.className = `badge ${GetStatusClass(application.status)}`;

        applicationElement.querySelector('.estimated-completion').textContent = application.estimated_completion;
        applicationElement.querySelector('.application-date').textContent = GetTimeAgo(application.created_at);

        applicationItem.addEventListener('click', () => ShowApplicationDetails(application, isOrderClosed));

        container.appendChild(applicationElement);
    });
}

function ShowApplicationDetails(application, isOrderClosed) {
    const modalBody = document.getElementById('applicationDetailsModalBody');
    if (!modalBody) {
        console.error('Application details modal body not found');
        ShowErrorMessage('지원서 세부 정보를 표시할 컨테이너를 찾을 수 없습니다.');
        return;
    }

    const availabilityHtml = application.availability.map(slot => {
        return `<div class="d-flex align-items-center mb-2">
                    <i class="bi bi-clock me-2"></i>
                    <span>${slot.date} ${slot.time}</span>
                </div>`;
    }).join('');

    const equipmentHtml = application.equipment.map(eq => `<span class="badge bg-light text-dark me-2 mb-2">${eq}</span>`).join('');

    const questionsHtml = application.questions.map(q => `
        <div class="mb-3">
            <strong class="d-block mb-1">${q.category}</strong>
            <p class="mb-0 text-muted">${q.text}</p>
        </div>
    `).join('');

    modalBody.innerHTML = `
        <div class="mb-4">
            <h5 class="mb-3"><i class="bi bi-person-circle me-2"></i>${application.applicant_name}</h5>
            <div class="d-flex align-items-center mb-2">
                <span class="me-3"><strong>상태:</strong> <span class="badge ${GetStatusClass(application.status)}">${GetStatusText(application.status)}</span></span>
                <span><strong>예상 완료 시간:</strong> ${application.estimated_completion}</span>
            </div>
        </div>

        <div class="mb-4">
            <h6 class="mb-3"><i class="bi bi-card-text me-2"></i>소개</h6>
            <p class="text-muted">${application.introduction}</p>
        </div>

        <div class="mb-4">
            <h6 class="mb-3"><i class="bi bi-tools me-2"></i>보유 장비</h6>
            <div>${equipmentHtml}</div>
        </div>

        <div class="mb-4">
            <h6 class="mb-3"><i class="bi bi-calendar-check me-2"></i>가능한 시간</h6>
            ${availabilityHtml}
        </div>

        <div>
            <h6 class="mb-3"><i class="bi bi-chat-left-text me-2"></i>질문</h6>
            ${questionsHtml}
        </div>
    `;

    const applicationDetailsModal = new bootstrap.Modal(document.getElementById('applicationDetailsModal'));
    applicationDetailsModal.show();

    const acceptBtn = document.getElementById('acceptApplicationBtn');
    const rejectBtn = document.getElementById('rejectApplicationBtn');

    if (acceptBtn) {
        acceptBtn.onclick = () => AcceptApplication(application.application_id);
        acceptBtn.disabled = isOrderClosed || application.status !== 'pending';
    }

    if (rejectBtn) {
        rejectBtn.onclick = () => RejectApplication(application.application_id);
        rejectBtn.disabled = isOrderClosed || application.status !== 'pending';
    }

    // Update button visibility based on application status
    const buttonContainer = document.querySelector('#applicationDetailsModal .modal-footer');
    if (buttonContainer) {
        buttonContainer.style.display = (isOrderClosed || application.status !== 'pending') ? 'none' : 'flex';
    }
}

async function AcceptApplication(applicationId) {
    console.log(`Accepting application ID: ${applicationId} for order ID: ${currentOrderId}`);

    if (!confirm('이 지원서를 수락하시겠습니까? 다른 모든 지원서는 자동으로 거절됩니다.')) {
        console.log('User cancelled application acceptance');
        return;
    }

    ShowOverlay();

    try {
        const acceptResponse = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/AcceptApplication', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                order_id: currentOrderId,
                application_id: applicationId
            })
        });

        if (!acceptResponse.ok) {
            throw new Error(`Failed to accept application. Status: ${acceptResponse.status}`);
        }

        const acceptResult = await acceptResponse.json();

        if (!acceptResult.success) {
            throw new Error(acceptResult.error || 'Failed to accept application');
        }

        // Notify the applicant
        await NotifyApplicant(applicationId, 'acceptance');

        ShowSuccessMessage('지원서가 성공적으로 수락되었습니다.', 3000);

        // Update UI
        UpdateApplicationStatus(applicationId, 'accepted');
        DisableApplicationActions();

        // Refresh the applications list
        await FetchAndDisplayApplications(currentOrderId);
    } catch (error) {
        console.error('Error accepting application:', error);
        HideOverlay();
        ShowErrorMessage('지원서 수락 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

async function RejectApplication(applicationId) {
    if (!confirm('이 지원서를 거절하시겠습니까?')) {
        return;
    }

    ShowOverlay();

    try {
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/RejectApplication', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                order_id: currentOrderId,
                application_id: applicationId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to reject application');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to reject application');
        }

        // Notify the applicant
        await NotifyApplicant(applicationId, 'rejection');

        ShowSuccessMessage('지원서가 성공적으로 거절되었습니다.', 3000);

        // Update UI
        UpdateApplicationStatus(applicationId, 'rejected');

        // Refresh the applications list
        await FetchAndDisplayApplications(currentOrderId);
    } catch (error) {
        console.error('Error rejecting application:', error);
        ShowErrorMessage('지원서 거절 중 오류가 발생했습니다. 다시 시도해주세요.');
        HideOverlay();
    }
}

async function NotifyApplicant(applicationId, action) {
    const endpoint = action === 'acceptance' ? 'NotifyApplicantOfAcceptance' : 'NotifyApplicantOfRejection';

    try {
        const notifyResponse = await MakeAuthenticatedRequest(`https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                application_id: applicationId
            })
        });

        if (!notifyResponse.ok) {
            throw new Error(`Failed to send notification. Status: ${notifyResponse.status}`);
        }

        const notifyResult = await notifyResponse.json();

        if (!notifyResult.success) {
            throw new Error(notifyResult.error || 'Failed to send notification');
        }

        console.log('Notification sent successfully to the applicant');
    } catch (error) {
        console.error('Error notifying applicant:', error);
        // Decide whether to inform the user about notification failure
    }
}

function DisableApplicationActions() {
    const modal = document.getElementById('applicationDetailsModal');
    if (modal) {
        const acceptBtn = modal.querySelector('#acceptApplicationBtn');
        const rejectBtn = modal.querySelector('#rejectApplicationBtn');
        if (acceptBtn) acceptBtn.disabled = true;
        if (rejectBtn) rejectBtn.disabled = true;
    }
}

function UpdateApplicationStatus(applicationId, status) {
    const applicationElement = document.querySelector(`[data-application-id="${applicationId}"]`);
    if (applicationElement) {
        const statusBadge = applicationElement.querySelector('.application-status');
        if (statusBadge) {
            statusBadge.textContent = GetStatusText(status);
            statusBadge.className = `badge ${GetStatusClass(status)}`;
        }
    }

    // Close the modal after updating the status
    const modal = bootstrap.Modal.getInstance(document.getElementById('applicationDetailsModal'));
    if (modal) {
        modal.hide();
    }

    HideOverlay();
}