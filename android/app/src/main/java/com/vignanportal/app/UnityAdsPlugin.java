package com.vignanportal.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsShowOptions;

@CapacitorPlugin(name = "UnityAds")
public class UnityAdsPlugin extends Plugin {

    @PluginMethod
    public void loadAd(PluginCall call) {
        String placementId = call.getString("placementId");
        if (placementId == null) {
            call.reject("Placement ID is required");
            return;
        }

        UnityAds.load(placementId, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String placementId) {
                JSObject ret = new JSObject();
                ret.put("placementId", placementId);
                call.resolve(ret);
                notifyListeners("adLoaded", ret);
            }

            @Override
            public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
                call.reject("Failed to load ad: " + message);
            }
        });
    }

    @PluginMethod
    public void showAd(PluginCall call) {
        String placementId = call.getString("placementId");
        if (placementId == null) {
            call.reject("Placement ID is required");
            return;
        }

        UnityAds.show(getActivity(), placementId, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
            @Override
            public void onUnityAdsShowFailure(String placementId, UnityAds.UnityAdsShowError error, String message) {
                call.reject("Failed to show ad: " + message);
            }

            @Override
            public void onUnityAdsShowStart(String placementId) {
                JSObject ret = new JSObject();
                ret.put("placementId", placementId);
                notifyListeners("adStarted", ret);
            }

            @Override
            public void onUnityAdsShowClick(String placementId) {
                JSObject ret = new JSObject();
                ret.put("placementId", placementId);
                notifyListeners("adClicked", ret);
            }

            @Override
            public void onUnityAdsShowComplete(String placementId, UnityAds.UnityAdsShowCompletionState state) {
                JSObject ret = new JSObject();
                ret.put("placementId", placementId);
                ret.put("state", state.toString());
                call.resolve(ret);
                notifyListeners("adCompleted", ret);
            }
        });
    }
}
