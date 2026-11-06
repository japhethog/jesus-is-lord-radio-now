# Jesus is Lord Radio – Advanced Mobile App (PWA)

**Live stream from Nakuru, Kenya (105.3 / 105.9 FM)**  
*Preparing the Way for the Return of the Messiah*

## Features
- Highly reliable multi-stream player with automatic fallback
- Background / lock-screen controls (Media Session API)
- Sleep timer (15–90 min)
- Wake-up alarm with notification
- Real-time audio visualizer
- Daily Bible verse focused on the coming of the Messiah
- Installable Progressive Web App (works offline for the UI)
- Beautiful dark spiritual UI
- Share button + official links
- Extremely light data usage

## How to install on your phone

### Android (Chrome / Edge / Samsung Internet)
1. Open `index.html` in the browser (or host the whole folder online).
2. Tap the ⋮ menu → **Install app** or **Add to Home screen**.
3. Confirm. The app now appears on your home screen and launches full-screen.

### iPhone / iPad (Safari)
1. Open the page in Safari.
2. Tap the Share button → **Add to Home Screen**.
3. Name it “JIL Radio” and add.

## Hosting (recommended for best experience)
Upload the entire `jil-radio-app` folder to any free static host:
- Netlify Drop
- GitHub Pages
- Cloudflare Pages
- Vercel

HTTPS is required for full PWA + notification features.

## Official resources
- Website: https://www.jesusislordradio.info/
- X / Twitter: https://x.com/JIL_Radio
- Official Google Play app: https://play.google.com/store/apps/details?id=com.jesusislordradio.liveapp

## Monetization (Google AdSense)

The app includes Google AdSense placeholders ready for activation.

**To activate ads:**

1. Create / log into a Google AdSense account → https://www.google.com/adsense/
2. Add your site: `https://japhethog.github.io/jesus-is-lord-radio-now/`
3. Wait for Google approval (usually a few days).
4. Create two **Display ad units** (Responsive format).
5. In `index.html` replace **all** occurrences of:
   - `ca-pub-XXXXXXXXXXXXXXXX` → your real Publisher ID
   - `data-ad-slot="1234567890"` and `data-ad-slot="0987654321"` → your real Ad Slot IDs

Ads are placed non-intrusively (after the player + near the bottom) so they do not interrupt the listening experience.

Stream source: radio.co (primary) + public fallbacks.

Built for reliability and spiritual focus. May the Lord bless the listeners.
