# Android WebView Integration – Jesus is Lord Radio

This Progressive Web App (PWA) can be wrapped in an Android WebView so users install it from the Play Store or as an APK while still loading the live web app.

**Live URL:** https://japhethog.github.io/jesus-is-lord-radio-now/

---

## Option A – Quick (recommended for most people)

1. Open the link above in Chrome on Android.
2. Menu → **Install app** / **Add to Home screen**.
3. The app runs full-screen with its own icon. No coding required.

---

## Option B – Native Android WebView (APK / Play Store)

### 1. Create a new Android project (Android Studio)
- Empty Activity
- Language: Kotlin
- Minimum SDK: 24+

### 2. Internet permission (`AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

Also allow cleartext if you keep any http streams (optional, prefer https only):
```xml
android:usesCleartextTraffic="true"
```

### 3. MainActivity.kt (minimal WebView)
```kotlin
package com.yourname.jilradio

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.JavascriptInterface
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()

        // Bridge so the PWA back button can close the activity
        webView.addJavascriptInterface(object {
            @JavascriptInterface
            fun goBack() {
                runOnUiThread {
                    if (webView.canGoBack()) webView.goBack()
                    else finish()
                }
            }
        }, "AndroidBridge")

        webView.loadUrl("https://japhethog.github.io/jesus-is-lord-radio-now/")
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
```

### 4. Important WebView settings for radio
- `mediaPlaybackRequiresUserGesture = false` → allows autoplay of the stream after user taps Play once
- Keep the screen on while listening (optional):
  ```kotlin
  window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  ```
- For background audio on older Android, you may need a foreground Service + MediaSession (more advanced).

### 5. Bridge used by this app
The PWA already calls:
```js
window.AndroidBridge.goBack()
```
when the in-app **Back** button is pressed. The sample above implements that interface.

---

## Option C – Trusted Web Activity (TWA) / Bubblewrap
Google’s recommended way to put a PWA on the Play Store with almost no custom code:
- https://developer.chrome.com/docs/android/trusted-web-activity/
- Tool: `bubblewrap` (npm package)

This gives a near-native install while still serving the same URL.

---

## Checklist for a good radio WebView
- [x] JavaScript + DOM storage enabled  
- [x] Media playback without extra gesture (after first Play)  
- [x] Hardware back button handled  
- [x] Optional JS bridge for in-app Back button  
- [ ] Background playback (needs MediaSession / service for full native feel)  
- [ ] Proper app icon & splash (use the same logo.webp)

---

**App URL to load:**  
`https://japhethog.github.io/jesus-is-lord-radio-now/`

May the Lord bless the listeners.
