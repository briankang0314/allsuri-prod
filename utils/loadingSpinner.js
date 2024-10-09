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