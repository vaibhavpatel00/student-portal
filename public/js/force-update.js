(function() {
    function checkAppVersion() {
        if (window.Capacitor && window.Capacitor.isNative) {
            const platform = window.Capacitor.getPlatform();
            // We specifically want to force update on Android
            if (platform === 'android') {
                // The newly updated app in the Play Store (v1.5+) has the custom UnityAds plugin.
                // Older apps (v1.4 and below) do not have this.
                // We use this capability check to securely segment outdated clients.
                const hasNewVersion = !!window.Capacitor.Plugins.UnityAds;
                
                if (!hasNewVersion) {
                    showForceUpdateScreen();
                }
            }
        }
    }

    function showForceUpdateScreen() {
        // Prevent duplicate overlays
        if (document.getElementById('force-update-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'force-update-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = '#ffffff';
        overlay.style.zIndex = '999999999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '24px';
        overlay.style.textAlign = 'center';
        overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        overlay.style.boxSizing = 'border-box';

        overlay.innerHTML = `
            <div style="background: rgba(230, 57, 70, 0.1); padding: 24px; border-radius: 50%; margin-bottom: 24px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#e63946" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                </svg>
            </div>
            <h2 style="color:#1e293b; margin-top:0; margin-bottom: 12px; font-size: 1.75rem; font-weight: 700;">Update Required</h2>
            <p style="color:#64748b; margin: 0 0 32px; font-size: 1.05rem; max-width: 320px; line-height: 1.6;">
                A new version of the Vignan Portal is available in the Play Store. Please update to continue using the app with the latest features and bug fixes.
            </p>
            <a href="https://play.google.com/store/apps/details?id=com.vignanportal.app" 
               style="background:#4f46e5; color:#ffffff; text-decoration:none; padding:16px 24px; border-radius:12px; font-weight:600; font-size: 1.1rem; width:100%; max-width:280px; display:block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); transition: transform 0.2s ease;">
                Update Now
            </a>
        `;

        document.body.appendChild(overlay);
        // Disable body scroll
        document.body.style.overflow = 'hidden';
    }

    // Run the check when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAppVersion);
    } else {
        checkAppVersion();
    }
})();
