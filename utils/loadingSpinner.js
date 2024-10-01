export async function ShowLoadingSpinner() {
	// Check if the spinner is already displayed
	if (document.getElementById('loading-spinner')) return;
  
	// Fetch the loading spinner HTML
	const spinnerHtml = await fetch('/components/loadingSpinner.html').then(response => response.text());
  
	// Create a temporary div to hold the HTML
	const tempDiv = document.createElement('div');
	tempDiv.innerHTML = spinnerHtml;
  
	// Append the spinner to the body
	document.body.appendChild(tempDiv.firstElementChild);
}
  
export function HideLoadingSpinner() {
	const spinner = document.getElementById('loading-spinner');
	if (spinner) {
		spinner.remove();
	}
}