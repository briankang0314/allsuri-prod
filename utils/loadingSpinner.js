export async function ShowLoadingSpinner() {
	console.log('ShowLoadingSpinner function called');

	// Check if the spinner is already displayed
	if (document.getElementById('loading-spinner')) {
		console.log('Loading spinner already exists, returning');
		return;
	}
  
	console.log('Fetching loading spinner HTML');
	// Fetch the loading spinner HTML
	const spinnerHtml = await fetch('/components/loadingSpinner.html').then(response => response.text());
  
	console.log('Creating temporary div');
	// Create a temporary div to hold the HTML
	const tempDiv = document.createElement('div');
	tempDiv.innerHTML = spinnerHtml;
  
	console.log('Appending spinner to body');
	// Append the spinner to the body
	while (tempDiv.firstChild) {
		document.body.appendChild(tempDiv.firstChild);
	}

	console.log('Loading spinner added successfully');
}
  
export function HideLoadingSpinner() {
	console.log('HideLoadingSpinner function called');
	const spinner = document.getElementById('loading-spinner');
	console.log('Spinner element:', spinner);
	if (spinner) {
		console.log('Removing spinner');
		spinner.remove();
		console.log('Spinner removed successfully');
	} else {
		console.log('No spinner found to remove');
	}
}