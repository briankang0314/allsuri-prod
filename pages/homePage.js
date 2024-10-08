// homePage.js

import { FillTheBody } from '../main.js';
import { MakeAuthenticatedRequest } from '../api/api.js';
import { InitializeApplicationForm } from './applyForOrderPage.js';
import { ShowErrorMessage, ShowSuccessMessage, GetTimeAgo } from '../utils/helpers.js';
import { cities, regions } from '../utils/constants.js';



let currentFilters = {
    region: '',
    city: '',
    status: ''
};

let currentSort = 'created_at';

let currentPage = 1;
export const postsPerPage = 10;

export let currentOrderId = null;



export async function SetupHomePage() {
    console.log('Setting up home page');

    SetupHomePageEventListeners();
    SetupFilterAndSort();

    await FetchAndDisplayOrderPosts(1);

    console.log('Home page setup complete');
}

function SetupHomePageEventListeners() {
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
        postOrderBtn.addEventListener('click', async () => {
            
            try {
                await FillTheBody('post-order');
            } catch (error) {
                console.error('Error loading post order page:', error);
                ShowErrorMessage('오더 등록 중에 오류가 발생했습니다. 다시 시도해주세요.');
            } finally {
                
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

    // // Refresh button
    // const refreshBtn = document.getElementById('refresh-btn');
    // if (refreshBtn) {
    //     refreshBtn.addEventListener('click', RefreshOrderPosts);
    // }

    // Pagination
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', async (e) => {
            if (e.target.tagName === 'A' && e.target.getAttribute('data-page')) {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                await FetchAndDisplayOrderPosts(page);
            }
        });
    }

    SetupPullToRefresh();
}

async function FetchAndDisplayOrderPosts(page = 1) {
    try {
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/GetOrders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                page,
                limit: postsPerPage,
                action: 'get_orders',
                filters: currentFilters,
                sort: currentSort || 'created_at'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch order posts');
        }
        const result = await response.json();
        const orderPosts = result.orders;
        const totalPages = result.totalPages || 1;

        DisplayOrderPosts(orderPosts);
        UpdatePagination(page, totalPages);
    } catch (error) {
        console.error('Error fetching order posts:', error);
        ShowErrorMessage('오더를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

function DisplayOrderPosts(orderPosts) {
    const container = document.getElementById('order-posts-container');
    if (!container) {
        console.error('Order posts container not found');
        return;
    }

    container.innerHTML = ''; // Clear existing content
    const template = document.getElementById('order-card-template');
    if (!template) {
        console.error('Order card template not found');
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user'));

    orderPosts.forEach(order => {
        const orderCard = template.content.cloneNode(true);

        const PopulateOrderCard = (element, selector, content) => {
            const el = element.querySelector(selector);
            if (el) {
                el.textContent = content;
            } else {
                console.warn(`Element with selector "${selector}" not found in order card`);
            }
        };

        try {
            PopulateOrderCard(orderCard, '.card-title', order.title || 'No Title');
            PopulateOrderCard(orderCard, '.card-subtitle', order.location || 'No Location');
            PopulateOrderCard(orderCard, '.order-meta', `지원자 ${order.applicants_count || 0}명 • ${GetTimeAgo(order.created_at)}`);
            
            const statusElement = orderCard.querySelector('.order-status');
            if (statusElement) {
                statusElement.textContent = order.status === 'open' ? '지원가능' : '마감';
                statusElement.classList.add(order.status === 'open' ? 'bg-success' : 'bg-danger');
            }

            const feeElement = orderCard.querySelector('.order-fee');
            if (feeElement) {
                if (order.fee === -1) {
                    feeElement.textContent = '수수료 조정 가능';
                } else {
                    feeElement.textContent = `수수료 ${Number(order.fee || 0).toLocaleString()}%`;
                }
            }

            const cardElement = orderCard.querySelector('.order-card');
            if (cardElement) {
                cardElement.addEventListener('click', () => ShowOrderDetails(order, currentUser));
            }

            // Show "내가 올린 오더" badge if the order is posted by the current user
            const myOrderBadge = orderCard.querySelector('.my-order-badge');
            if (myOrderBadge && order.user_id === currentUser.user_id) {
                myOrderBadge.style.display = 'inline-block';
            }

            container.appendChild(orderCard);
        } catch (error) {
            console.error('Error populating order card:', error);
        }
    });
}

function ShowOrderDetails(order, currentUser) {
    currentOrderId = order.order_id;
    const modalTitle = document.getElementById('orderDetailsModalLabel');
    const modalBody = document.getElementById('orderDetailsModalBody');
    const applyForOrderBtn = document.getElementById('applyForOrderBtn');

    modalTitle.textContent = order.title || 'Order Details';

    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="fw-bold mb-3">오더 정보</h6>
                <p><strong>위치:</strong> ${order.location || 'No Location'}</p>
                <p><strong>상태:</strong> <span class="badge ${order.status === 'open' ? 'bg-success' : 'bg-danger'}">${order.status === 'open' ? '지원가능' : '마감'}</span></p>
                <p><strong>수수료:</strong> ${order.fee === -1 ? '수수료 조정 가능' : `${Number(order.fee || 0).toLocaleString()}%`}</p>
                <p><strong>지원자:</strong> ${order.applicants_count || 0}명</p>
                <p><strong>등록일:</strong> ${GetTimeAgo(order.created_at)}</p>
            </div>
        </div>
        <hr>
        <h6 class="fw-bold mb-3">오더 내용</h6>
        <p>${order.description || '상세 설명 없음'}</p>
    `;

    if (order.user_id === currentUser.user_id) {
        applyForOrderBtn.style.display = 'none';
    } else {
        applyForOrderBtn.style.display = 'block';
        applyForOrderBtn.disabled = order.status !== 'open';
        applyForOrderBtn.onclick = async () => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'));
            modal.hide();
            InitializeApplicationForm(order.order_id);
            await FillTheBody('apply-for-order');
        };
    }

    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    modal.show();
}

function SetupFilterAndSort() {
    const regionFilter = document.getElementById('region-filter');
    const cityFilter = document.getElementById('city-filter');
    const statusFilter = document.getElementById('status-filter');
    const sortOption = document.getElementById('sort-option');

    PopulateRegionFilter(regionFilter);

    regionFilter.addEventListener('change', async (e) => {
        currentFilters.region = e.target.value;
        currentFilters.city = '';
        PopulateCityFilter(cityFilter, e.target.value);
        await FetchAndDisplayOrderPosts(1);
    });

    cityFilter.addEventListener('change', async (e) => {
        currentFilters.city = e.target.value;
        await FetchAndDisplayOrderPosts(1);
    });

    statusFilter.addEventListener('change', async (e) => {
        currentFilters.status = e.target.value;
        await FetchAndDisplayOrderPosts(1);
    });

    sortOption.addEventListener('change', async (e) => {
        currentSort = e.target.value;
        await FetchAndDisplayOrderPosts(1);
    });
}

function SetupPullToRefresh() {
    let isRefreshing = false;
    let startY = 0;
    const refreshThreshold = 40; // Reduced threshold for a more generous trigger

    const contentContainer = document.getElementById('home-page-content');

    contentContainer.addEventListener('touchstart', (e) => {
        if (window.scrollY <= 10) {
            startY = e.touches[0].pageY;
        }
    });

    contentContainer.addEventListener('touchmove', (e) => {
        if (!isRefreshing && startY > 0) {
            const currentY = e.touches[0].pageY;
            const pullDistance = currentY - startY;

            if (pullDistance > refreshThreshold && window.scrollY <= 10) {
                isRefreshing = true;
                TriggerRefresh();
            }
        }
    });

    contentContainer.addEventListener('touchend', () => {
        // Reset state variables on touch end
        startY = 0;
        isRefreshing = false;
    });
}

async function TriggerRefresh() {
    console.log('Pull-to-refresh: Starting refresh');
    try {
        await FetchAndDisplayOrderPosts(1);
        ShowSuccessMessage('오더 목록이 새로고침되었습니다.', 3000);
        console.log('Pull-to-refresh: Refresh completed successfully');
    } catch (error) {
        console.error('Error refreshing order posts:', error);
        ShowErrorMessage('오더 목록 새로고침 중 오류가 발생했습니다. 다시 시도해주세요.');
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

export function UpdatePagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';

    // Previous button
    paginationContainer.appendChild(CreatePaginationItem('이전', currentPage > 1, currentPage - 1));

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        paginationContainer.appendChild(CreatePaginationItem(i.toString(), true, i, i === currentPage));
    }

    // Next button
    paginationContainer.appendChild(CreatePaginationItem('다음', currentPage < totalPages, currentPage + 1));
}

function CreatePaginationItem(text, isEnabled, pageNumber, isActive = false) {
    const li = document.createElement('li');
    li.className = `page-item ${isActive ? 'active' : ''} ${!isEnabled ? 'disabled' : ''}`;

    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.textContent = text;
    a.setAttribute('data-page', pageNumber);

    li.appendChild(a);
    return li;
}

export function PopulateRegionFilter(selectElement) {
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region.name;
        option.textContent = region.name;
        selectElement.appendChild(option);
    });
}

export function PopulateCityFilter(selectElement, selectedRegion) {
    selectElement.innerHTML = '<option value="">도시 선택</option>';
    const regionId = regions.find(r => r.name === selectedRegion)?.id;
    if (regionId && cities[regionId]) {
        cities[regionId].forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            selectElement.appendChild(option);
        });
    }
}