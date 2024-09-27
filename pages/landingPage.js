export async function SetupLandingPage() {
    const isIOS = /iP(ad|od|hone)/i.test(navigator.userAgent) && !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/);
    const elementToShow = isIOS ? 'iphone_install' : 'android_install';
    
    
	const installElement = document.getElementById(elementToShow);
    if (installElement) { installElement.style.display = 'block'; }
}