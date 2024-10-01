import { FillTheBody } from '../main.js';
import { MakeAuthenticatedRequest } from '../api/api.js';
import { ShowErrorMessage, ShowSuccessMessage, GetTimeAgo } from '../utils/helpers.js';
import { currentOrderId, postsPerPage, UpdatePagination, PopulateRegionFilter, PopulateCityFilter } from './homePage.js';



let myOrdersCurrentFilters = {
    region: '',
    city: '',
    status: ''
};

let myOrdersCurrentSort = 'created_at';



export async function FetchAndDisplayMyOrderPosts(page = 1) {
    try {
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/GetOrders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                page,
                limit: postsPerPage,
                action: 'get_my_orders',
                filters: myOrdersCurrentFilters,
                sort: myOrdersCurrentSort
            })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch my orders');
        }

        const result = await response.json();
        console.log('Fetched my orders:', result.orders);
        if (result.success && Array.isArray(result.orders)) {
            DisplayMyOrderPosts(result.orders);
            UpdatePagination(page, result.totalPages || 1);
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error fetching my orders:', error);
        ShowErrorMessage('내 오더를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

export async function SetupMyOrdersPage() {
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

    const newOrderBtn = document.getElementById('new-order-btn');
    if (newOrderBtn) {
        newOrderBtn.addEventListener('click', async () => await FillTheBody('post-order'));
    }

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', RefreshMyOrderPosts);
    }

    SetupMyOrdersFilterAndSort();
    await FetchAndDisplayMyOrderPosts(1);

    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', async (e) => {
            if (e.target.tagName === 'A' && e.target.getAttribute('data-page')) {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                await FetchAndDisplayMyOrderPosts(page);
            }
        });
    }
}

function DisplayMyOrderPosts(myOrders) {
    const container = document.getElementById('my-orders-container');
    if (!container) {
        console.error('My orders container not found');
        return;
    }

    container.innerHTML = ''; // Clear existing content
    const template = document.getElementById('order-card-template');
    if (!template) {
        console.error('Order card template not found');
        return;
    }

    myOrders.forEach(order => {
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
            PopulateOrderCard(orderCard, '.order-meta', `지원자 ${order.applicants_count || 0}명 • 등록일: ${GetTimeAgo(order.created_at)}`);
            PopulateOrderCard(orderCard, '.order-fee', `${order.fee === -1 ? '수수료 조정 가능' : `${Number(order.fee || 0).toLocaleString()}%`}`);

            const statusBadge = orderCard.querySelector('.order-status');
            if (statusBadge) {
                statusBadge.textContent = order.status === 'open' ? '지원가능' : '마감';
                statusBadge.classList.add(order.status === 'open' ? 'bg-success' : 'bg-danger');
            }

            const cardElement = orderCard.querySelector('.order-card');
            if (cardElement) {
                cardElement.addEventListener('click', (e) => {
                    // Prevent click event when clicking on buttons
                    if (!e.target.closest('.btn-edit-order') && !e.target.closest('.btn-delete-order')) {
                        ShowMyOrderDetails(order);
                    }
                });
            }

            const editOrderBtn = orderCard.querySelector('.btn-edit-order');
            if (editOrderBtn) {
                editOrderBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click event
                    EditOrder(order.order_id);
                });
            }

            const deleteOrderBtn = orderCard.querySelector('.btn-delete-order');
            if (deleteOrderBtn) {
                deleteOrderBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click event
                    DeleteOrder(order.order_id);
                });
            }

            // Add a data attribute to the order card for easy removal after deletion
            if (cardElement) {
                cardElement.setAttribute('data-order-id', order.order_id);
            }


            container.appendChild(orderCard);
        } catch (error) {
            console.error('Error populating order card:', error);
        }
    });
}

async function RefreshMyOrderPosts() {
    
    try {
        await FetchAndDisplayMyOrderPosts(1); // Fetch the first page of my posts
        ShowSuccessMessage('내 오더 목록이 새로고침되었습니다.', 3000);
    } catch (error) {
        console.error('Error refreshing my order posts:', error);
        ShowErrorMessage('내 오더 목록 새로고침 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

function SetupMyOrdersFilterAndSort() {
    const regionFilter = document.getElementById('region-filter');
    const cityFilter = document.getElementById('city-filter');
    const statusFilter = document.getElementById('status-filter');
    const sortOption = document.getElementById('sort-option');

    PopulateRegionFilter(regionFilter);

    regionFilter.addEventListener('change', async (e) => {
        myOrdersCurrentFilters.region = e.target.value;
        myOrdersCurrentFilters.city = '';
        PopulateCityFilter(cityFilter, e.target.value);
        await FetchAndDisplayMyOrderPosts(1);
    });

    cityFilter.addEventListener('change', async (e) => {
        myOrdersCurrentFilters.city = e.target.value;
        await FetchAndDisplayMyOrderPosts(1);
    });

    statusFilter.addEventListener('change', async (e) => {
        myOrdersCurrentFilters.status = e.target.value;
        await FetchAndDisplayMyOrderPosts(1);
    });

    sortOption.addEventListener('change', async (e) => {
        myOrdersCurrentSort = e.target.value;
        await FetchAndDisplayMyOrderPosts(1);
    });
}

function ShowMyOrderDetails(order) {
    console.log('ShowMyOrderDetails called with order:', order);
    currentOrderId = order.order_id;
    const modalTitle = document.getElementById('orderDetailsModalLabel');
    const modalBody = document.getElementById('orderDetailsModalBody');

    if (!modalTitle || !modalBody) {
        console.error('Modal elements not found');
        return;
    }

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

    const editBtn = document.getElementById('btn-edit-order');
    if (editBtn) {
        editBtn.onclick = () => EditOrder(order.order_id);
    }

    const viewApplicationsBtn = document.getElementById('btn-view-applications');
    if (viewApplicationsBtn) {
        console.log('Setting up viewApplicationsBtn click handler');
        viewApplicationsBtn.onclick = async () => {
            console.log('viewApplicationsBtn clicked');
            // Close the current modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'));
            if (modal) {
                console.log('Closing orderDetailsModal');
                modal.hide();
            } else {
                console.error('orderDetailsModal instance not found');
            }
            // Navigate to the new applications page
            console.log('Attempting to navigate to order-applications page');
            await FillTheBody('order-applications', { order: order });
        };
    } else {
        console.error('viewApplicationsBtn not found');
    }

    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    modal.show();
    console.log('orderDetailsModal shown');
}

function EditOrder(orderId) {
    // Placeholder function for editing an order
    console.log(`Editing order with ID: ${orderId}`);
    alert('오더 수정 기능은 아직 구현되지 않았습니다.');
}

async function DeleteOrder(orderId) {
    if (!confirm('정말로 이 오더를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/DeleteOrder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_id: orderId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete order');
        }

        // Remove the deleted order from the UI
        const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderElement) {
            orderElement.remove();
        }

        ShowSuccessMessage('오더가 정상적으로 삭제됐습니다.', 3000);
    } catch (error) {
        console.error('Error deleting order:', error);
        ShowErrorMessage(error.message || '오더 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        
    }
}