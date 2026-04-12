/**
 * Version Check Module
 * Dynamically compares current app version natively with remote config to enforce mandatory updates.
 * If the app version cannot be determined (older builds without @capacitor/app), assume outdated.
 */

(function() {
    // If completely lacking Capacitor in a standard web browser, ignore.
    // But if they are in an Android WebView, keep checking.
    const isWebView = navigator.userAgent.includes('wv') || (navigator.userAgent.includes('Android') && navigator.userAgent.includes('Version/'));
    if (!window.Capacitor && !isWebView) return;

    // Helper: compares strict semantic versions (e.g. 1.5.0 vs 1.6.0)
    // Returns true if current is older than required.
    function isVersionOutdated(current, required) {
        if (!current || !required) return false;
        
        const currParts = current.split('.').map(Number);
        const reqParts = required.split('.').map(Number);
        
        for (let i = 0; i < Math.max(currParts.length, reqParts.length); i++) {
            const currVal = currParts[i] || 0;
            const reqVal = reqParts[i] || 0;
            
            if (currVal < reqVal) return true;
            if (currVal > reqVal) return false;
        }
        
        return false; // They are exactly equal.
    }

    function showUpdateOverlay() {
        if (!document.body) {
            setTimeout(showUpdateOverlay, 100);
            return;
        }
        if (document.getElementById('force-update-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'force-update-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: #ffffff; z-index: 999999999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box;';

        overlay.innerHTML = `
            <div style="background: rgba(230, 57, 70, 0.1); padding: 24px; border-radius: 50%; margin-bottom: 24px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#e63946" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                </svg>
            </div>
            <h2 style="color:#1e293b; margin-top:0; margin-bottom: 12px; font-size: 1.75rem; font-weight: 700;">Update Required</h2>
            <p style="color:#64748b; margin: 0 0 32px; font-size: 1.05rem; max-width: 320px; line-height: 1.6;">
                A new version of the app is available. Please update to continue using the app.
            </p>
            <a href="https://play.google.com/store/apps/details?id=com.vignanportal.app&hl=en" 
               style="background:#4f46e5; color:#ffffff; text-decoration:none; padding:16px 24px; border-radius:12px; font-weight:600; font-size: 1.1rem; width:100%; max-width:280px; display:block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); transition: transform 0.2s ease;">
                Update Now
            </a>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        // Override hardware back button defensively
        if (window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            window.Capacitor.Plugins.App.addListener('backButton', () => {
                // Do nothing to prevent escaping the modal
            });
        }
    }

    async function enactVersionCheck() {
        try {
            // Fetch remote config first — if server is unreachable, skip (don't break offline use)
            let configData;
            try {
                const configRes = await fetch('/api/app-config');
                configData = await configRes.json();
            } catch (fetchErr) {
                console.warn('Version check: server unreachable, skipping.', fetchErr);
                return;
            }

            if (!configData.success || !configData.data || !configData.data.minimum_required_version) {
                return;
            }

            const requiredVer = configData.data.minimum_required_version;

            // Try to get app version from @capacitor/app plugin
            let currentVer = null;
            try {
                if (window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                    const appInfo = await window.Capacitor.Plugins.App.getInfo();
                    currentVer = appInfo.version;
                }
            } catch (pluginErr) {
                console.warn('Version check: @capacitor/app plugin failed.', pluginErr);
            }

            // ⚠️ KEY LOGIC: If we are running natively but CANNOT determine the version,
            // the app is an OLD build that doesn't have @capacitor/app.
            // Additionally, if it's a WebView but isNative is false, the old native 
            // bridge is broken (missing allowNavigation). We must force update!
            const isOldWebView = isWebView && (!window.Capacitor || !window.Capacitor.isNative);
            
            if (currentVer === null || isOldWebView) {
                console.warn('Version check: Old native app detected → treating as outdated.');
                showUpdateOverlay();
                return;
            }

            // Normal comparison: current vs required
            if (isVersionOutdated(currentVer, requiredVer)) {
                console.warn('Version check: ' + currentVer + ' < ' + requiredVer + ' → update required.');
                showUpdateOverlay();
            }
        } catch (error) {
            console.error('Failed to perform version check', error);
        }
    }

    // Attempt init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enactVersionCheck);
    } else {
        enactVersionCheck();
    }
})();
