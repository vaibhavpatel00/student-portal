import Foundation
import Capacitor
import UnityAds

@objc(UnityAdsPlugin)
public class UnityAdsPlugin: CAPPlugin, UnityAdsInitializationDelegate, UnityAdsLoadDelegate, UnityAdsShowDelegate {
    
    private var isInitialized = false
    private let unityGameID = "6086635" // Double-check this is your iOS Game ID
    
    private var adLoadCall: CAPPluginCall?
    private var adShowCall: CAPPluginCall?
    
    public override func load() {
        print("UNITY ADS: [INIT] Starting initialization...")
        UnityAds.initialize(unityGameID, testMode: false, initializationDelegate: self)
    }
    
    // MARK: - UnityAdsInitializationDelegate
    public func initializationComplete() {
        print("UNITY ADS: [INIT] Success.")
        isInitialized = true
    }
    
    public func initializationFailed(_ error: UnityAdsInitializationError, withMessage message: String) {
        print("UNITY ADS: [FATAL] Init Failed: \(message)")
    }
    
    @objc func loadAd(_ call: CAPPluginCall) {
        guard let placementId = call.getString("placementId") else {
            call.reject("Placement ID is required")
            return
        }
        
        // Safely route Android placement ID calls to iOS equivalent automatically
        let safePlacementId = placementId == "Interstitial_Android" ? "Interstitial_iOS" : placementId
        
        self.adLoadCall = call
        
        DispatchQueue.main.async {
            UnityAds.load(safePlacementId, loadDelegate: self)
        }
    }
    
    @objc func showAd(_ call: CAPPluginCall) {
        guard let placementId = call.getString("placementId") else {
            call.reject("Placement ID is required")
            return
        }
        
        let safePlacementId = placementId == "Interstitial_Android" ? "Interstitial_iOS" : placementId
        
        self.adShowCall = call
        
        DispatchQueue.main.async {
            if let viewController = self.bridge?.viewController {
                UnityAds.show(viewController, placementId: safePlacementId, showDelegate: self)
            } else {
                call.reject("Could not find view controller")
            }
        }
    }
    
    // MARK: - UnityAdsLoadDelegate
    
    public func unityAdsAdLoaded(_ placementId: String) {
        print("UNITY ADS: [SUCCESS] Ad Loaded: \(placementId)")
        let ret = ["placementId": placementId]
        
        if let call = self.adLoadCall {
            call.resolve(ret)
            self.adLoadCall = nil
        }
        
        notifyListeners("adLoaded", data: ret)
    }
    
    public func unityAdsAdFailed(toLoad placementId: String, withError error: UnityAdsLoadError, withMessage message: String) {
        print("UNITY ADS: [REJECTED] ID: \(placementId) | Reason: \(message)")
        if let call = self.adLoadCall {
            call.reject("Failed to load ad: \(message)")
            self.adLoadCall = nil
        }
    }
    
    // MARK: - UnityAdsShowDelegate
    
    public func unityAdsShowComplete(_ placementId: String, withFinish state: UnityAdsShowCompletionState) {
        print("UNITY ADS: [SHOW] Ad Finished with state: \(state.rawValue)")
        let stateStr: String
        switch state {
        case .showCompletionStateSkipped: stateStr = "SKIPPED"
        case .showCompletionStateCompleted: stateStr = "COMPLETED"
        @unknown default: stateStr = "UNKNOWN"
        }
        
        let ret: [String: Any] = ["placementId": placementId, "state": stateStr]
        
        if let call = self.adShowCall {
            call.resolve(ret)
            self.adShowCall = nil
        }
        
        notifyListeners("adCompleted", data: ret)
    }
    
    public func unityAdsShowFailed(_ placementId: String, withError error: UnityAdsShowError, withMessage message: String) {
        print("UNITY ADS: [SHOW] Failed to show ad: \(message)")
        if let call = self.adShowCall {
            call.reject("Failed to show ad: \(message)")
            self.adShowCall = nil
        }
    }
    
    public func unityAdsShowStart(_ placementId: String) {
        print("UNITY ADS: [SHOW] Ad Started: \(placementId)")
        let ret = ["placementId": placementId]
        notifyListeners("adStarted", data: ret)
    }
    
    public func unityAdsShowClick(_ placementId: String) {
        print("UNITY ADS: [SHOW] Ad Clicked!")
        let ret = ["placementId": placementId]
        notifyListeners("adClicked", data: ret)
    }
}
