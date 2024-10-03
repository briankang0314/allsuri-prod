export async function ShowLoadingSpinner() {
	console.log('ShowLoadingSpinner function called');
  
	// Check if the spinner is already displayed
	if (document.getElementById('loading-spinner')) {
	  console.log('Loading spinner already exists, returning');
	  return;
	}
  
	console.log('Fetching loading spinner HTML');
	try {
	  // Fetch the loading spinner HTML
	  const response = await fetch('/components/loadingSpinner.html');
	  console.log('Fetch response:', response);
  
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
  
	  const spinnerHtml = await response.text();
	  console.log('Spinner HTML:', spinnerHtml);
  
	  console.log('Creating temporary div');
	  // Create a temporary div to hold the HTML
	  const tempDiv = document.createElement('div');
	  tempDiv.innerHTML = spinnerHtml;
  
	  console.log('TempDiv after setting innerHTML:', tempDiv.innerHTML);
  
	  console.log('Appending spinner to body');
	  // Append all child nodes to the body
	  while (tempDiv.firstChild) {
		document.body.appendChild(tempDiv.firstChild);
	  }
  
	  console.log('Loading spinner added successfully');
	} catch (error) {
	  console.error('Error fetching/loading spinner HTML:', error);
	}
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