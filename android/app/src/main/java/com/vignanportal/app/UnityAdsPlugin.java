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
import com.unity3d.services.banners.BannerErrorInfo;
import com.unity3d.services.banners.BannerView;
import com.unity3d.services.banners.UnityBannerSize;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;

@CapacitorPlugin(name = "UnityAds")
public class UnityAdsPlugin extends Plugin {
    private BannerView bottomBanner;

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

    @PluginMethod
    public void showBanner(PluginCall call) {
        String placementId = call.getString("placementId");
        if (placementId == null) {
            call.reject("Placement ID is required");
            return;
        }

        getActivity().runOnUiThread(() -> {
            if (bottomBanner != null) {
                ViewGroup parent = (ViewGroup) bottomBanner.getParent();
                if (parent != null) {
                    parent.removeView(bottomBanner);
                }
                bottomBanner.destroy();
                bottomBanner = null;
            }

            bottomBanner = new BannerView(getActivity(), placementId, new UnityBannerSize(320, 50));
            bottomBanner.setListener(new BannerView.IListener() {
                @Override
                public void onBannerLoaded(BannerView bannerView) {
                    notifyListeners("bannerLoaded", new JSObject());
                }
                @Override
                public void onBannerClick(BannerView bannerView) {
                    notifyListeners("bannerClicked", new JSObject());
                }
                @Override
                public void onBannerFailedToLoad(BannerView bannerView, BannerErrorInfo errorInfo) {
                    System.out.println("UNITY ADS: [BANNER FAIL] " + errorInfo.errorMessage);
                }
                @Override
                public void onBannerLeftApplication(BannerView bannerView) {}
            });
            bottomBanner.load();

            FrameLayout.LayoutParams layoutParams = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );
            layoutParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;

            ViewGroup parent = (ViewGroup) bridge.getWebView().getParent();
            parent.addView(bottomBanner, layoutParams);

            call.resolve();
        });
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (bottomBanner != null) {
                ViewGroup parent = (ViewGroup) bottomBanner.getParent();
                if (parent != null) {
                    parent.removeView(bottomBanner);
                }
                bottomBanner.destroy();
                bottomBanner = null;
            }
            call.resolve();
        });
    }
}
