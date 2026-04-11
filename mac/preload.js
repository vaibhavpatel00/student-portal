const { contextBridge, ipcRenderer } = require('electron');

// ============================================================
// Preload Script — Bridges Electron IPC with the web context
// Mimics the Capacitor.Plugins.UnityAds interface so the
// existing dashboard.js code works without modification.
// ============================================================

contextBridge.exposeInMainWorld('Capacitor', {
  isNative: true,
  platform: 'mac',
  Plugins: {
    // Unity Ads bridge — matches the Android Capacitor plugin API
    UnityAds: {
      loadAd: async (options) => {
        console.log('[macOS] UnityAds.loadAd called with:', options);
        // On macOS we don't need a separate load step — the ad window handles it
        return { placementId: options.placementId || 'Desktop_Interstitial' };
      },

      showAd: async (options) => {
        console.log('[macOS] UnityAds.showAd called with:', options);

        return new Promise((resolve, reject) => {
          // Request the main process to open the ad window
          ipcRenderer.invoke('show-unity-ad').then(() => {
            // Listen for ad completion from the main process
            const handler = (event, data) => {
              ipcRenderer.removeListener('ad-completed', handler);
              resolve({ state: data.state || 'COMPLETED', placementId: options.placementId });
            };
            ipcRenderer.on('ad-completed', handler);

            // Timeout after 60 seconds
            setTimeout(() => {
              ipcRenderer.removeListener('ad-completed', handler);
              resolve({ state: 'SKIPPED', placementId: options.placementId });
            }, 60000);
          }).catch((err) => {
            reject(new Error('Failed to show ad: ' + err.message));
          });
        });
      },

      addListener: (eventName, callback) => {
        console.log('[macOS] UnityAds.addListener:', eventName);
        ipcRenderer.on(`unity-ads-${eventName}`, (event, data) => {
          callback(data);
        });
      },
    },

    // AdMob stub — prevents errors from the existing AdMob code in index.html
    AdMob: {
      initialize: async () => {
        console.log('[macOS] AdMob.initialize — using desktop ad fallback');
        return {};
      },
      showBanner: async (options) => {
        console.log('[macOS] AdMob.showBanner — banners not shown on desktop');
        return {};
      },
    },
  },
});

// Expose app info
contextBridge.exposeInMainWorld('ElectronAPI', {
  platform: 'mac',
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  closeAd: () => ipcRenderer.invoke('close-ad-window'),
});

// Inject macOS-specific CSS tweaks after the page loads
window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    /* macOS-specific overrides */
    
    /* Add padding for the hidden titlebar area (traffic lights) */
    body {
      padding-top: 28px !important;
    }
    
    /* Hide the mobile TEST AD button */
    #showAdButton {
      display: none !important;
    }
    
    /* Wider container for desktop */
    .container {
      max-width: 720px !important;
    }
    
    .auth-card {
      max-width: 480px !important;
    }
    
    /* Better scrollbar for macOS */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.25);
    }
    
    /* Desktop hover effects for navigation */
    div[style*="display:flex"][style*="gap:6px"] a {
      transition: all 0.2s ease !important;
    }
    div[style*="display:flex"][style*="gap:6px"] a:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    
    /* Larger period cards for desktop */
    .period-card {
      padding: 16px 20px !important;
    }
    
    /* Results page wider container */
    .app.results-page {
      max-width: 720px !important;
      margin: 0 auto !important;
      padding: 20px !important;
    }
  `;
  document.head.appendChild(style);

  // Add a subtle "Desktop" badge to show this is the macOS version
  setTimeout(() => {
    const header = document.querySelector('.dash-header, .dashboard-header');
    if (header) {
      const badge = document.createElement('span');
      badge.textContent = 'Desktop';
      badge.style.cssText = `
        font-size: 0.6rem;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-left: 8px;
        vertical-align: middle;
      `;
      const nameEl = header.querySelector('.student-name');
      if (nameEl) nameEl.appendChild(badge);
    }
  }, 2000);
});
