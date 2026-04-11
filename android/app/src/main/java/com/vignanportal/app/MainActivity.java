package com.vignanportal.app;

import android.os.Bundle;
import android.os.Handler;
import com.getcapacitor.BridgeActivity;
import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsLoadOptions;

public class MainActivity extends BridgeActivity {
    // Focused list using your new Waterfall placement
    private final String[] targetIDs = {"Android_Waterfall", "Interstitial_Android", "Android_Test_Ad"};
    private int currentIdx = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UnityAdsPlugin.class);
        super.onCreate(savedInstanceState);

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
