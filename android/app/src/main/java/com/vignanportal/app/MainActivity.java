package com.vignanportal.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.BridgeActivity;
import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsLoadOptions;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {
    // Focused list using your new Waterfall placement
    private final String[] targetIDs = {"Android_Waterfall", "Interstitial_Android", "Android_Test_Ad"};
    private int currentIdx = 0;

    private static final String CONFIG_URL = "https://student-portal-r2tp.vercel.app/api/app-config";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UnityAdsPlugin.class);
        super.onCreate(savedInstanceState);

        // ── Force Update Check ──
        checkForForceUpdate();

        // ── Unity Ads Init ──
        final String unityGameID = "6086635";

        UnityAds.initialize(getApplicationContext(), unityGameID, false, new IUnityAdsInitializationListener() {
            @Override
            public void onInitializationComplete() {
                System.out.println("UNITY ADS: [INIT] Success. Starting Request for: " + targetIDs[currentIdx]);
                startAdProcess();
            }

            @Override
            public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
                System.out.println("UNITY ADS: [FATAL] Init Failed: " + message);
            }
        });
    }

    // ═══════════════════════════════════════════════════════
    //  Force Update Version Check
    // ═══════════════════════════════════════════════════════

    private void checkForForceUpdate() {
        new Thread(() -> {
            try {
                // 1. Get current app version
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                String currentVersion = pInfo.versionName; // e.g. "1.5"

                // 2. Fetch minimum required version from server
                URL url = new URL(CONFIG_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                int responseCode = conn.getResponseCode();
                if (responseCode != 200) {
                    System.out.println("FORCE_UPDATE: Server returned " + responseCode + ", skipping check.");
                    return;
                }

                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();
                conn.disconnect();

                JSONObject json = new JSONObject(sb.toString());
                if (!json.optBoolean("success", false)) return;

                JSONObject data = json.optJSONObject("data");
                if (data == null) return;

                String requiredVersion = data.optString("minimum_required_version", "");
                if (requiredVersion.isEmpty()) return;

                System.out.println("FORCE_UPDATE: current=" + currentVersion + " required=" + requiredVersion);

                // 3. Compare versions
                if (isVersionOutdated(currentVersion, requiredVersion)) {
                    System.out.println("FORCE_UPDATE: ⚠️ App is outdated! Launching ForceUpdateActivity.");
                    new Handler(Looper.getMainLooper()).post(() -> {
                        Intent intent = new Intent(MainActivity.this, ForceUpdateActivity.class);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                        startActivity(intent);
                        finish();
                    });
                } else {
                    System.out.println("FORCE_UPDATE: ✅ App is up-to-date.");
                }

            } catch (Exception e) {
                // If the check fails (e.g. no network), allow the app to continue
                System.out.println("FORCE_UPDATE: Check failed (offline?): " + e.getMessage());
            }
        }).start();
    }

    /**
     * Compares two semantic version strings (e.g. "1.5" vs "1.6.0").
     * Returns true if currentVersion is strictly older than requiredVersion.
     */
    private boolean isVersionOutdated(String current, String required) {
        if (current == null || required == null) return false;

        String[] currParts = current.split("\\.");
        String[] reqParts = required.split("\\.");

        int maxLen = Math.max(currParts.length, reqParts.length);
        for (int i = 0; i < maxLen; i++) {
            int currVal = i < currParts.length ? Integer.parseInt(currParts[i]) : 0;
            int reqVal = i < reqParts.length ? Integer.parseInt(reqParts[i]) : 0;

            if (currVal < reqVal) return true;
            if (currVal > reqVal) return false;
        }
        return false; // Exactly equal
    }

    // ═══════════════════════════════════════════════════════
    //  Unity Ads Waterfall
    // ═══════════════════════════════════════════════════════

    private void startAdProcess() {
        if (currentIdx >= targetIDs.length) {
            System.out.println("UNITY ADS: [FAIL] All IDs exhausted. Retrying Waterfall in 15s...");
            currentIdx = 0;
            new Handler().postDelayed(() -> startAdProcess(), 15000);
            return;
        }

        String activeID = targetIDs[currentIdx];
        System.out.println("UNITY ADS: [REQUEST] Testing ID: " + activeID);

        UnityAds.load(activeID, new UnityAdsLoadOptions(), new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String placementId) {
                System.out.println("UNITY ADS: [SUCCESS] Test Ad Loaded! Showing now...");
                UnityAds.show(MainActivity.this, placementId, new IUnityAdsShowListener() {
                    @Override
                    public void onUnityAdsShowStart(String placementId) {
                        System.out.println("UNITY ADS: [SHOW] Ad Started: " + placementId);
                    }

                    @Override
                    public void onUnityAdsShowClick(String placementId) {
                        System.out.println("UNITY ADS: [SHOW] Ad Clicked!");
                    }

                    @Override
                    public void onUnityAdsShowComplete(String placementId, UnityAds.UnityAdsShowCompletionState state) {
                        System.out.println("UNITY ADS: [SHOW] Ad Finished with state: " + state);
                        if (state == UnityAds.UnityAdsShowCompletionState.COMPLETED) {
                            System.out.println("UNITY ADS: [REWARD] User watched full ad.");
                        }
                    }

                    @Override
                    public void onUnityAdsShowFailure(String placementId, UnityAds.UnityAdsShowError error, String message) {
                        System.out.println("UNITY ADS: [SHOW] Failed to show ad: " + message);
                    }
                });
            }

            @Override
            public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
                System.out.println("UNITY ADS: [REJECTED] ID: " + placementId + " | Reason: " + message);
                currentIdx++;
                startAdProcess();
            }
        });
    }
}
