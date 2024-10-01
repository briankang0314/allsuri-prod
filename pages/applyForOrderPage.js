import { FillTheBody } from '../main.js';
import { MakeAuthenticatedRequest } from '../api/api.js';
import { ShowErrorMessage, ShowSuccessMessage } from '../utils/helpers.js';
import { equipmentGroups } from '../utils/constants.js';
import { ShowIncompleteProfileWarning } from './myProfilePage.js';
import { CheckProfileCompleteness } from './editProfilePage.js';



function cleanupApplicationFormData() {
    localStorage.removeItem('applicationFormData');
}

export function InitializeApplicationForm(orderId) {
    const user = JSON.parse(localStorage.getItem('user'));
    let applicationFormData = {
        order_id: orderId,
        applicant_id: user.user_id,
        applicantName: user.nickname || '',
        location: `${user.region || ''} ${user.city || ''}`.trim() || '',
        availability: [],
        estimated_completion: '',
        introduction: '',
        equipment: [],
        questions: [],
        currentStep: 0
    };
    localStorage.setItem('applicationFormData', JSON.stringify(applicationFormData));
    console.log('Application form data initialized:', applicationFormData);
}

export async function SetupApplyForOrderPage() {
    let applicationFormData = JSON.parse(localStorage.getItem('applicationFormData'));

    if (!applicationFormData || !applicationFormData.order_id) {
        ShowErrorMessage('지원서 데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
        await FillTheBody('home');
        return;
    }

    const form = document.getElementById('applicationForm');
    const steps = document.querySelectorAll('.step');
    const progressBar = document.querySelector('.progress-bar');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const backBtn = document.getElementById('back-btn');
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await FillTheBody('home');
        });
    }

    let currentStep = 0;
    let calendar;

    function showStep(step) {
        steps.forEach((s, index) => {
            s.classList.toggle('active', index === step);
        });
        updateProgressBar();
        updateButtons();
    
        if (step === 1) {
            initializeCalendar();
        } else if (step === 4) {
            GenerateEquipmentCheckboxes();
        } else if (step === steps.length - 1) {
            updatePreview();
        }
    }

    function initializeCalendar() {
        if (!calendar) {
            calendar = flatpickr("#availabilityCalendar", {
                inline: true,
                mode: "multiple",
                dateFormat: "Y-m-d",
                locale: "ko",
                minDate: "today",  // Set minimum date to today
                onChange: function(selectedDates, dateStr, instance) {
                    updateAvailabilityList(selectedDates);
                },
                onReady: function(selectedDates, dateStr, instance) {
                    // Remove the readonly attribute and the flatpickr-input class
                    const calendarElement = instance.input;
                    calendarElement.parentNode.removeChild(calendarElement);
                }
            });
        }
    }

    function updateAvailabilityList(selectedDates) {
        const availabilityList = document.getElementById('availabilityList');
        const existingSelections = Array.from(availabilityList.querySelectorAll('li')).reduce((acc, li) => {
            const date = li.getAttribute('data-date');
            const times = Array.from(li.querySelectorAll('.time-slot.selected')).map(slot => slot.textContent);
            acc[date] = times;
            return acc;
        }, {});
    
        // Sort the selected dates
        selectedDates.sort((a, b) => a - b);
    
        availabilityList.innerHTML = '';
        selectedDates.forEach(date => {
            const dateString = formatDate(date);
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item';
            listItem.setAttribute('data-date', dateString);
            
            const timeOptions = ['오전', '오후', '저녁'];
            const timeSlots = timeOptions.map(time => {
                const isSelected = existingSelections[dateString] && existingSelections[dateString].includes(time);
                return `
                    <span class="time-slot ${isSelected ? 'selected' : ''}" data-time="${time}">${time}</span>
                `;
            }).join('');
    
            listItem.innerHTML = `
                <div>${dateString}</div>
                <div class="time-slots">
                    ${timeSlots}
                </div>
            `;
            availabilityList.appendChild(listItem);
        });
    
        // Add click event listeners to time slots
        availabilityList.querySelectorAll('.time-slot').forEach(slot => {
            slot.addEventListener('click', function() {
                this.classList.toggle('selected');
                saveProgress();
            });
        });
    
        saveProgress();
    }

    function formatDate(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('ko-KR', options);
    }

    function updateProgressBar() {
        const progress = ((currentStep + 1) / steps.length) * 100;
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
    }

    function updateButtons() {
        prevBtn.style.display = currentStep > 0 ? 'block' : 'none';
        nextBtn.style.display = currentStep < steps.length - 1 ? 'block' : 'none';
        submitBtn.style.display = currentStep === steps.length - 1 ? 'block' : 'none';
    }

    function validateStep(step) {
        switch(step) {
            case 1: // Availability
                return ValidateAvailability();
            case 2: // Estimated Completion
                return document.getElementById('estimatedCompletion').value !== '';
            case 3: // Self-Introduction
                return document.getElementById('introduction').value.length > 0;
            default:
                return true;
        }
    }

    function saveProgress() {
        const storedData = JSON.parse(localStorage.getItem('applicationFormData'));
        
        let estimatedCompletion = estimatedCompletionSelect.value;
    
        applicationFormData = {
            ...storedData,
            applicantName: document.getElementById('applicantName').value,
            location: document.getElementById('location').value,
            availability: GetAvailabilityData(),
            estimated_completion: estimatedCompletion,
            introduction: introductionTextarea.value,
            equipment: Array.from(document.querySelectorAll('.equipment-group input[type="checkbox"]:checked')).map(cb => cb.value),
            questions: Array.from(questionTextareas.querySelectorAll('textarea')).map(ta => ({
                category: ta.dataset.category,
                text: ta.value
            })),
            currentStep: currentStep
        };
    
        // Ensure that empty string values are stored as null
        for (let key in applicationFormData) {
            if (applicationFormData[key] === '') {
                applicationFormData[key] = null;
            }
        }
    
        localStorage.setItem('applicationFormData', JSON.stringify(applicationFormData));
        // console.log('Saved application form data:', applicationFormData);
    }

    nextBtn.addEventListener('click', function() {
        if (validateStep(currentStep)) {
            if (currentStep < steps.length - 1) {
                currentStep++;
                showStep(currentStep);
                saveProgress();
            }
        } else {
            ShowErrorMessage('모든 필수 항목을 작성해주세요.');
        }
    });

    prevBtn.addEventListener('click', function() {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });

    window.addEventListener('beforeunload', cleanupApplicationFormData);

    backBtn.addEventListener('click', async () => {
        cleanupApplicationFormData();
        await FillTheBody('home');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (validateAllSteps()) {
            await SubmitApplication();
        } else {
            ShowErrorMessage('모든 필수 항목을 작성해주세요.');
        }
    });

    // New event listeners for improved form elements
    const estimatedCompletionSelect = document.getElementById('estimatedCompletion');
    const introductionTextarea = document.getElementById('introduction');
    const introductionCharCount = document.getElementById('introductionCharCount');
    const questionCategory = document.getElementById('questionCategory');
    const questionTextareas = document.getElementById('questionTextareas');
    const selectedCategories = new Set();

    introductionTextarea.addEventListener('input', function() {
        const currentLength = this.value.length;
        introductionCharCount.textContent = currentLength;
        if (currentLength > 500) {
            this.value = this.value.slice(0, 500);
            introductionCharCount.textContent = 500;
        }
    });

    questionCategory.addEventListener('change', function() {
        const category = this.value;
        if (category && !selectedCategories.has(category)) {
            const textarea = document.createElement('textarea');
            textarea.className = 'form-control mt-2';
            textarea.rows = 3;
            textarea.placeholder = `${this.options[this.selectedIndex].text}에 대한 질문을 입력해주세요.`;
            textarea.dataset.category = category;

            const wrapper = document.createElement('div');
            wrapper.className = 'mb-3 question-wrapper';
            
            const label = document.createElement('label');
            label.textContent = this.options[this.selectedIndex].text;
            label.className = 'form-label';

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '삭제';
            removeBtn.className = 'btn btn-sm btn-outline-danger ms-2';
            removeBtn.type = 'button';
            removeBtn.addEventListener('click', function() {
                wrapper.remove();
                selectedCategories.delete(category);
                questionCategory.querySelector(`option[value="${category}"]`).disabled = false;
                saveProgress();
            });

            wrapper.appendChild(label);
            wrapper.appendChild(removeBtn);
            wrapper.appendChild(textarea);

            questionTextareas.appendChild(wrapper);
            selectedCategories.add(category);
            this.querySelector(`option[value="${category}"]`).disabled = true;
            this.selectedIndex = 0;
            saveProgress();
        }
    });

    function loadProgress() {
        const applicationFormData = JSON.parse(localStorage.getItem('applicationFormData'));
        console.log('Loaded application form data:', applicationFormData);
        if (applicationFormData) {
            // Populate form fields with saved data
            document.getElementById('applicantName').value = applicationFormData.applicantName || '';
            document.getElementById('location').value = applicationFormData.location || '';
    
            // Availability
            if (applicationFormData.availability && applicationFormData.availability.length > 0) {
                initializeCalendar();
                const dates = applicationFormData.availability.map(a => new Date(a.date));
                dates.sort((a, b) => a - b); // Sort the dates
                calendar.setDate(dates);
                updateAvailabilityList(dates);
            }
    
            // Estimated completion
            const estimatedCompletionSelect = document.getElementById('estimatedCompletion');
            estimatedCompletionSelect.value = applicationFormData.estimated_completion || '';
    
            // Introduction
            document.getElementById('introduction').value = applicationFormData.introduction || '';
            document.getElementById('introductionCharCount').textContent = applicationFormData.introduction ? applicationFormData.introduction.length : '0';
    
            // Equipment
            if (applicationFormData.equipment) {
                applicationFormData.equipment.forEach(eq => {
                    const checkbox = document.querySelector(`input[type="checkbox"][value="${eq}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
    
            // Questions
            if (applicationFormData.questions) {
                const questionTextareas = document.getElementById('questionTextareas');
                applicationFormData.questions.forEach(q => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'mb-3 question-wrapper';
                    
                    const label = document.createElement('label');
                    label.textContent = questionCategory.querySelector(`option[value="${q.category}"]`).text;
                    label.className = 'form-label';

                    const removeBtn = document.createElement('button');
                    removeBtn.textContent = '삭제';
                    removeBtn.className = 'btn btn-sm btn-outline-danger ms-2';
                    removeBtn.type = 'button';
                    removeBtn.addEventListener('click', function() {
                        wrapper.remove();
                        selectedCategories.delete(q.category);
                        questionCategory.querySelector(`option[value="${q.category}"]`).disabled = false;
                        saveProgress();
                    });

                    const textarea = document.createElement('textarea');
                    textarea.className = 'form-control mt-2';
                    textarea.rows = 3;
                    textarea.value = q.text;
                    textarea.dataset.category = q.category;

                    wrapper.appendChild(label);
                    wrapper.appendChild(removeBtn);
                    wrapper.appendChild(textarea);

                    questionTextareas.appendChild(wrapper);
                    selectedCategories.add(q.category);
                    questionCategory.querySelector(`option[value="${q.category}"]`).disabled = true;
                });
            }
    
            // Set current step
            currentStep = applicationFormData.currentStep || 0;
            showStep(currentStep);
    
            // Update progress bar
            updateProgressBar();
        }
    }

    function validateAllSteps() {
        for (let i = 0; i < steps.length - 1; i++) {
            if (!validateStep(i)) {
                return false;
            }
        }
        return true;
    }

    function editSection(sectionId) {
        const steps = document.querySelectorAll('.step');
        const targetStep = Array.from(steps).findIndex(step => step.id === sectionId);
        if (targetStep !== -1) {
            currentStep = targetStep;
            showStep(currentStep);
        }
    }

    function updatePreview() {
        const previewContent = document.getElementById('previewContent');
        const applicantName = document.getElementById('applicantName').value;
        const location = document.getElementById('location').value;
        const estimatedCompletion = document.getElementById('estimatedCompletion').value;
        const introduction = document.getElementById('introduction').value;
        const equipmentChecked = Array.from(document.querySelectorAll('.equipment-group input[type="checkbox"]:checked')).map(cb => cb.value);
        const questions = Array.from(document.querySelectorAll('#questionTextareas textarea')).map(ta => ({
            category: ta.dataset.category,
            text: ta.value
        }));
    
        const availabilityHtml = GetAvailabilityData().map(slot => {
            return `<div class="d-flex align-items-center mb-2">
                        <i class="bi bi-clock me-2"></i>
                        <span>${slot.date} ${slot.time}</span>
                    </div>`;
        }).join('');
    
        const equipmentHtml = equipmentChecked.map(eq => `<span class="badge bg-light text-dark me-2 mb-2">${eq}</span>`).join('');

        const questionsHtml = questions.map(q => `
            <div class="mb-3">
                <strong class="d-block mb-1">${q.category}</strong>
                <p class="mb-0 text-muted">${q.text}</p>
            </div>
        `).join('');
    
        previewContent.innerHTML = `
            <div class="mb-4">
                <h5 class="mb-3"><i class="bi bi-person-circle me-2"></i>${applicantName}</h5>
                <div class="d-flex align-items-center mb-2">
                    <span class="me-3"><strong>지역:</strong> ${location}</span>
                </div>
            </div>

            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0"><i class="bi bi-calendar-check me-2"></i>가능한 시간</h6>
                    <button class="btn btn-sm btn-outline-primary edit-section" data-section="step2">수정</button>
                </div>
                ${availabilityHtml}
            </div>
    
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0"><i class="bi bi-clock-history me-2"></i>예상 완료 시간</h6>
                    <button class="btn btn-sm btn-outline-primary edit-section" data-section="step3">수정</button>
                </div>
                <p class="text-muted">${estimatedCompletion}</p>
            </div>

            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0"><i class="bi bi-card-text me-2"></i>소개</h6>
                    <button class="btn btn-sm btn-outline-primary edit-section" data-section="step4">수정</button>
                </div>
                <p class="text-muted">${introduction}</p>
            </div>
    
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0"><i class="bi bi-tools me-2"></i>보유 장비</h6>
                    <button class="btn btn-sm btn-outline-primary edit-section" data-section="step5">수정</button>
                </div>
                <div>${equipmentHtml}</div>
            </div>
    
            ${questions.length > 0 ? `
                <div>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0"><i class="bi bi-chat-left-text me-2"></i>질문</h6>
                        <button class="btn btn-sm btn-outline-primary edit-section" data-section="step5">수정</button>
                    </div>
                    ${questionsHtml}
                </div>
            ` : ''}
        `;
    
        // Add event listeners to all edit buttons
        const editButtons = previewContent.querySelectorAll('.edit-section');
        editButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = this.getAttribute('data-section');
                editSection(sectionId);
            });
        });
    }

    // Initialize the form
    loadProgress();
    showStep(currentStep);

    // Add autosave on input changes
    form.addEventListener('input', saveProgress);
}

function ValidateAvailability() {
    const availabilityList = document.getElementById('availabilityList');
    const availabilitySlots = availabilityList.querySelectorAll('li');
    const errorElement = document.getElementById('availabilityError');

    if (availabilitySlots.length === 0) {
        errorElement.textContent = '최소 하나의 작업 가능 일정을 선택해주세요.';
        errorElement.style.display = 'block';
        return false;
    }

    let isValid = true;
    availabilitySlots.forEach((slot, index) => {
        const selectedTimeSlots = slot.querySelectorAll('.time-slot.selected');

        if (selectedTimeSlots.length === 0) {
            isValid = false;
            errorElement.textContent = `${index + 1}번째 일정의 시간을 최소 하나 선택해주세요.`;
            errorElement.style.display = 'block';
        }
    });

    if (isValid) {
        errorElement.style.display = 'none';
    }

    return isValid;
}

function GetAvailabilityData() {
    const availabilityList = document.getElementById('availabilityList');
    return Array.from(availabilityList.querySelectorAll('li')).flatMap(slot => {
        const date = slot.getAttribute('data-date');
        const times = Array.from(slot.querySelectorAll('.time-slot.selected')).map(timeSlot => timeSlot.textContent);
        return times.map(time => ({ date, time }));
    });
}

function GenerateEquipmentCheckboxes() {
    const equipmentContainer = document.querySelector('.equipment-group');
    equipmentContainer.innerHTML = ''; // Clear existing content

    // Create a row to hold our two columns
    const row = document.createElement('div');
    row.className = 'row g-2';

    // Get current selections from applicationFormData
    const applicationFormData = JSON.parse(localStorage.getItem('applicationFormData'));
    const selectedEquipment = applicationFormData?.equipment || [];

    equipmentGroups.forEach((group, groupIndex) => {
        const col = document.createElement('div');
        col.className = 'col-6';

        const groupDiv = document.createElement('div');
        groupDiv.className = 'card h-100';
        
        const groupHeader = document.createElement('div');
        groupHeader.className = 'card-header clickable';
        groupHeader.id = `heading${groupIndex}`;
        groupHeader.setAttribute('data-bs-toggle', 'collapse');
        groupHeader.setAttribute('data-bs-target', `#collapse${groupIndex}`);
        groupHeader.setAttribute('aria-expanded', 'false');
        groupHeader.setAttribute('aria-controls', `collapse${groupIndex}`);

        const groupTitle = document.createElement('h5');
        groupTitle.className = 'mb-0';
        groupTitle.textContent = group.name;

        groupHeader.appendChild(groupTitle);
        groupDiv.appendChild(groupHeader);

        const collapseDiv = document.createElement('div');
        collapseDiv.id = `collapse${groupIndex}`;
        collapseDiv.className = 'collapse';
        collapseDiv.setAttribute('aria-labelledby', `heading${groupIndex}`);

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        group.options.forEach((option, index) => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check';

            const input = document.createElement('input');
            input.className = 'form-check-input';
            input.type = 'checkbox';
            input.value = option;
            input.id = `equipment-${group.name.replace(/\s+/g, '-')}-${index}`;
            input.setAttribute('aria-label', option);
            
            if (selectedEquipment.includes(option)) {
                input.checked = true;
            }

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = input.id;
            label.textContent = option;

            checkboxDiv.appendChild(input);
            checkboxDiv.appendChild(label);
            cardBody.appendChild(checkboxDiv);
        });

        collapseDiv.appendChild(cardBody);
        groupDiv.appendChild(collapseDiv);
        col.appendChild(groupDiv);
        row.appendChild(col);
    });

    equipmentContainer.appendChild(row);

    // Expand the first group with a selected item
    const collapsibles = equipmentContainer.querySelectorAll('.collapse');
    collapsibles.forEach((collapse, index) => {
        const hasCheckedItems = collapse.querySelector('input:checked');
        if (hasCheckedItems) {
            collapse.classList.add('show');
            const header = collapse.previousElementSibling;
            header.setAttribute('aria-expanded', 'true');
            return false; // Break the loop after expanding the first group with checked items
        }
    });
}


async function SubmitApplication() {
    if (!await CheckProfileCompleteness()) {
        ShowErrorMessage('오더를 지원하려면 프로필을 완성해야 합니다.');
        await FillTheBody('my-profile');
        ShowIncompleteProfileWarning();
        return;
    }

    const applicationFormData = JSON.parse(localStorage.getItem('applicationFormData'));

    if (!applicationFormData || !applicationFormData.order_id) {
        ShowErrorMessage('애플리케이션 데이터가 존재하지 않습니다.');
        await FillTheBody('home');
        return;
    }

    if (!ValidateAvailability()) {
        ShowErrorMessage('최소 하나의 작업 가능 일정을 추가해주세요.');
        return;
    }

    try {
        const response = await MakeAuthenticatedRequest('https://vu7bkzs3p7.execute-api.ap-northeast-2.amazonaws.com/SubmitApplication', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(applicationFormData)
        });

        const result = await response.json();

        if (response.ok) {
            ShowSuccessMessage('지원이 성공적으로 제출되었습니다.', 3000);
            cleanupApplicationFormData();
            await FillTheBody('home');
        } else if (response.status === 400 && result.message === 'You have already applied to this order.') {
            ShowErrorMessage('이미 이 오더에 지원하셨습니다.', 3000);
            await FillTheBody('home');
        } else {
            throw new Error(result.error || result.message || '지원 제출에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error submitting application:', error);
        ShowErrorMessage('지원 제출 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
}