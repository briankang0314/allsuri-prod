// myApplicationsPage.js

import { FillTheBody } from '../main.js';
import { MakeAuthenticatedRequest } from '../api/api.js';
import { ShowErrorMessage, ShowSuccessMessage, GetTimeAgo, GetStatusClass, GetStatusText } from '../utils/helpers.js';
import { postsPerPage, UpdatePagination } from './homePage.js';
import { ShowOverlay, HideOverlay } from '../utils/loadingSpinner.js';

let myApplicationsCurrentFilters = {
    status: ''
};

let myApplicationsCurrentSort = 'created_at';

let currentPage = 1;

let applicationDetailsModalInstance = null;

export async function SetupMyApplicationsPage() {
    console.log('Setting up My Applications page');

    SetupMyApplicationsEventListeners();
    SetupMyApplicationsFilterAndSort();

    await FetchAndDisplayMyApplications(1);

    console.log('My Applications page setup complete');
}

function SetupMyApplicationsEventListeners() {
    // Home button
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', async () => await FillTheBody('home'));
    }

    // Chat button
    const chatBtn = document.getElementById('chat-btn');
    if (chatBtn) {
        chatBtn.addEventListener('click', async () => await FillTheBody('chat'));
    }

    // Post Order button
    const postOrderBtn = document.getElementById('post-order-btn');
    if (postOrderBtn) {
        postOrderBtn.addEventListener('click', async () => {
            try {
                await FillTheBody('post-order');
            } catch (error) {
                console.error('Error loading post order page:', error);
                ShowErrorMessage('오더 등록 중에 오류가 발생했습니다. 다시 시도해주세요.');
            }
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

    // Pagination
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', async (e) => {
            if (e.target.tagName === 'A' && e.target.getAttribute('data-page')) {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                await FetchAndDisplayMyApplications(page);
            }
        });
    }

    // Setup pull-to-refresh for my-applications page
    SetupMyApplicationsPullToRefresh();
}

function SetupMyApplicationsPullToRefresh() {
    let isRefreshing = false;
    let startY = 0;
    const refreshThreshold = 40;

    const contentContainer = document.getElementById('my-applications-page-content');

    contentContainer.addEventListener('touchstart', (e) => {
        if (contentContainer.scrollTop === 0) {
            startY = e.touches[0].pageY;
        }
    });

    contentContainer.addEventListener('touchmove', (e) => {
        if (!isRefreshing && startY > 0) {
            const currentY = e.touches[0].pageY;
            const pullDistance = currentY - startY;

            if (pullDistance > refreshThreshold && contentContainer.scrollTop === 0) {
                isRefreshing = true;
                TriggerRefresh();
            }
        }
    });

    contentContainer.addEventListener('touchend', () => {
        startY = 0;
        isRefreshing = false;
    });
}

async function TriggerRefresh() {
    console.log('Pull-to-refresh: Starting refresh on My Applications');
    try {
        await FetchAndDisplayMyApplications(1);
        ShowSuccessMessage('내 지원서 목록이 새로고침되었습니다.', 3000);
        console.log('Pull-to-refresh: Refresh completed successfully');
    } catch (error) {
        console.error('Error refreshing my applications:', error);
        ShowErrorMessage('내 지원서 목록 새로고침 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

async function FetchAndDisplayMyApplications(page = 1) {
    try {
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/GetMyApplications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                page,
                limit: postsPerPage,
                filters: myApplicationsCurrentFilters || {},
                sort: myApplicationsCurrentSort || 'created_at'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch my applications');
        }

        const result = await response.json();
        console.log('Fetched my applications:', result.applications);
        if (result.success && Array.isArray(result.applications)) {
            DisplayMyApplications(result.applications);
            UpdatePagination(page, result.totalPages || 1);
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error fetching my applications:', error);
        ShowErrorMessage('내 지원서를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

function DisplayMyApplications(applications) {
    const container = document.getElementById('my-applications-container');
    if (!container) {
        console.error('My applications container not found');
        return;
    }

    container.innerHTML = ''; // Clear existing content
    const template = document.getElementById('application-card-template');
    if (!template) {
        console.error('Application card template not found');
        return;
    }

    applications.forEach(application => {
        const applicationCard = template.content.cloneNode(true);

        const PopulateApplicationCard = (element, selector, content) => {
            const el = element.querySelector(selector);
            if (el) {
                el.textContent = content;
            } else {
                console.warn(`Element with selector "${selector}" not found in application card`);
            }
        };

        try {
            PopulateApplicationCard(applicationCard, '.card-title', application.order_title || 'No Title');
            PopulateApplicationCard(applicationCard, '.application-status', GetStatusText(application.status));
            PopulateApplicationCard(applicationCard, '.application-meta', `지원일: ${GetTimeAgo(application.created_at)}`);
            PopulateApplicationCard(applicationCard, '.estimated-completion', `예상 완료 시간: ${application.estimated_completion}`);

            const statusBadge = applicationCard.querySelector('.application-status');
            if (statusBadge) {
                statusBadge.classList.add(GetStatusClass(application.status));
            }

            const viewBtn = applicationCard.querySelector('.view-application');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => ShowMyApplicationDetails(application));
            }

            const withdrawBtn = applicationCard.querySelector('.withdraw-application');
            if (withdrawBtn) {
                if (application.status === 'pending') {
                    withdrawBtn.style.display = 'inline-block';
                    withdrawBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        WithdrawApplication(application.application_id);
                    });
                } else {
                    withdrawBtn.style.display = 'none';
                }
            }

            container.appendChild(applicationCard);
        } catch (error) {
            console.error('Error populating application card:', error);
        }
    });
}

function SetupMyApplicationsFilterAndSort() {
    const statusFilter = document.getElementById('status-filter');
    const sortOption = document.getElementById('sort-option');

    statusFilter.addEventListener('change', async (e) => {
        myApplicationsCurrentFilters.status = e.target.value;
        await FetchAndDisplayMyApplications(1);
    });

    sortOption.addEventListener('change', async (e) => {
        myApplicationsCurrentSort = e.target.value;
        await FetchAndDisplayMyApplications(1);
    });
}

async function WithdrawApplication(applicationId) {
    if (!confirm('정말로 이 지원을 철회하시겠습니까?')) {
        return;
    }

    ShowOverlay();

    try {
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/WithdrawApplication', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ application_id: applicationId })
        });

        if (!response.ok) {
            throw new Error('Failed to withdraw application');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to withdraw application');
        }

        ShowSuccessMessage('지원이 성공적으로 철회되었습니다.', 3000);

        // Hide the application details modal
        if (applicationDetailsModalInstance) {
            applicationDetailsModalInstance.hide();
            applicationDetailsModalInstance = null;
        }

        await FetchAndDisplayMyApplications(currentPage);
    } catch (error) {
        console.error('Error withdrawing application:', error);
        ShowErrorMessage('지원 철회 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        HideOverlay();
    }
}

function ShowMyApplicationDetails(application) {
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
            <h5 class="mb-3"><i class="bi bi-briefcase me-2"></i>${application.order_title}</h5>
            <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="me-3"><strong>상태:</strong> <span class="badge ${GetStatusClass(application.status)}">${GetStatusText(application.status)}</span></span>
                <span><strong>예상 완료 시간:</strong> ${application.estimated_completion}</span>
            </div>
            <p class="text-muted">지원일: ${GetTimeAgo(application.created_at)}</p>
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

    applicationDetailsModalInstance = new bootstrap.Modal(document.getElementById('applicationDetailsModal'));
    applicationDetailsModalInstance.show();

    // Add withdraw button if the application is still pending
    const withdrawBtn = document.getElementById('withdrawApplicationBtn');
    if (withdrawBtn) {
        if (application.status === 'pending') {
            withdrawBtn.style.display = 'inline-block';
            withdrawBtn.onclick = () => WithdrawApplication(application.application_id);
        } else {
            withdrawBtn.style.display = 'none';
        }
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