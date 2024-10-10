export async function ShowLoadingSpinner() {
	// Check if the spinner is already displayed
	if (document.getElementById('loading-spinner')) {
		return;
	}

	try {
		// Fetch the loading spinner HTML
		const response = await fetch('/components/loadingSpinner.html');

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const spinnerHtml = await response.text();

		// Create a temporary div to hold the HTML
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = spinnerHtml;

		// Append all child nodes to the body
		while (tempDiv.firstChild) {
			document.body.appendChild(tempDiv.firstChild);
		}
	} catch (error) {
		console.error('Error fetching/loading spinner HTML:', error);
	}
}

export function HideLoadingSpinner() {
	const spinner = document.getElementById('loading-spinner');
	if (spinner) {
		spinner.remove();
	}
}

export function ShowOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'app-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9998;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    overlay.appendChild(spinner);

    document.body.appendChild(overlay);
}

export function HideOverlay() {
    const overlay = document.getElementById('app-overlay');
    if (overlay) {
        overlay.remove();
    }
}