(function() {
    function checkAppVersion() {
        if (window.Capacitor && window.Capacitor.isNative) {
            try {
                const platform = window.Capacitor.getPlatform();
                if (platform === 'android') {
                    // Securely check for plugins object
                    const plugins = window.Capacitor.Plugins;
                    
                    // The old app lacks UnityAdsPlugin (only added in v1.5)
                    const hasNewVersion = plugins && typeof plugins.UnityAds !== 'undefined';
                    
                    if (!hasNewVersion) {
                        showForceUpdateScreen();
                    }
                }
            } catch (err) {
                // Failsafe in case old Capacitor throws errors
                showForceUpdateScreen();
            }
        }
    }

    function showForceUpdateScreen() {
        // Prevent duplicate overlays
        if (document.getElementById('force-update-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'force-update-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: #ffffff; z-index: 999999999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box;';

        overlay.innerHTML = `
            <div style="background: rgba(230, 57, 70, 0.1); padding: 24px; border-radius: 50%; margin-bottom: 24px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#e63946" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                </svg>
            </div>
            <h2 style="color:#1e293b; margin-top:0; margin-bottom: 12px; font-size: 1.75rem; font-weight: 700;">Update Required</h2>
            <p style="color:#64748b; margin: 0 0 32px; font-size: 1.05rem; max-width: 320px; line-height: 1.6;">
                A new version of the Vignan Portal is available. You must update your app in the Play Store to continue.
            </p>
            <a href="https://play.google.com/store/apps/details?id=com.vignanportal.app&hl=en" 
               style="background:#4f46e5; color:#ffffff; text-decoration:none; padding:16px 24px; border-radius:12px; font-weight:600; font-size: 1.1rem; width:100%; max-width:280px; display:block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); transition: transform 0.2s ease;">
                Update App Now
            </a>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }

    // Attempt immediately and queue as well
    setTimeout(checkAppVersion, 250);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAppVersion);
    }
})();
