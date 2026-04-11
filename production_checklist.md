# Unity Ads: Production Go-Live Checklist

Follow these steps in your **Unity Dashboard** to ensure real ads are served to your users on the Play Store.

## 1. Dashboard: Disable Test Mode Override
Even though the code says `testMode = false`, the dashboard can override it.
1.  Go to **Monetize** -> **Testing**.
2.  Locate your Android project.
3.  Ensure **Test Mode** is set to **OFF** (the toggle should be gray, not blue).
4.  If it was ON, click **Save** at the bottom.

## 2. Dashboard: Link to Google Play Store
Once your app is published (even as Internal Testing), you should link it.
1.  Go to **Monetization** -> **Project Settings**.
2.  Scroll down to **Google Play Store**.
3.  Click **Add Store ID** or **Add App**.
4.  Search for your app or paste the Play Store URL.
5.  **Why**: Advertisers pay much more for "Verified" apps.

## 3. Web: Hosting app-ads.txt
1.  Generate your `app-ads.txt` string in **Monetize** -> **Ad Units** -> **app-ads.txt**.
2.  Paste it into the [app-ads.txt](file:///Users/vaibhavpatel/Desktop/student-portal/public/app-ads.txt) file in this project.
3.  Deploy your website (e.g., to Vercel or your own hosting).
4.  Verify you can see it at `vignanportal.com/app-ads.txt`.

## 4. Play Console: Data Safety
When submitting to Google, disclose that Unity Ads collects:
- **Advertising ID** (Device ID section)
- **Approximate Location** (Location section)
- **App Diagnostics** (Performance section)

## 5. Verification on Real Device
> [!WARNING]
> Real ads **DO NOT SHOW** on emulators. You must test on a real phone using a **Release APK** or **Play Store download**.

1.  Build your Release APK: **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
2.  Install on a real phone.
3.  Wait 15-30 minutes for Unity's servers to "wake up" the live status.
