# Bike finder landing page repair — 2026-10-27

## Changes
- Retain the page URL, Formspree endpoint and Google Ads / GA4 / Clarity configuration.
- Cancel native navigation synchronously, validate, disable the button, send FormData with JSON acceptance, and require HTTP success plus JSON `ok: true` before emitting the existing Ads conversion.
- Explicit sending/success/unconfirmed-failure messages, accessible live status, 20-second timeout, retained fields on failure and manual retry.
- Prevent concurrent submits and further submits after acceptance in the same page instance. Analytics exceptions cannot change a successful inquiry into failure.
- No automatic retry. A lost response can occur after server acceptance; users are told this. This is not server-side idempotency, cross-tab or reload deduplication.
- No email/message/company data is sent in the conversion event.
- No-JavaScript submission still goes directly to Formspree, without a client conversion event.

## Product claims
Title, metadata, headings, image alternative text and FAQ now describe a Bluetooth finder tag. Removed absolute global precision, instant movement alerts, lifetime fee guarantees, unsupported dual-network certainty, and CE/FCC/RoHS/ISO assertions. Existing numerical specs are marked preliminary, not verified.

Official background sources (general network behavior, NOT proof of this model):
- https://support.apple.com/en-us/104978
- https://www.apple.com/legal/privacy/data/en/find-my/
- https://support.google.com/accounts/answer/3265955
- https://security.googleblog.com/2024/04/find-my-device-network-security-privacy-protections.html

BLE tags broadcast short-range signals; participating nearby devices can relay location through the supported network. This does not establish a GNSS receiver or cellular uplink in the tag, guarantee global coverage, continuous updates, precise coordinates, recovery, or instant theft detection. Separation alerts and unknown-tracker safety alerts are not evidence of owner movement alarms.

## Evidence still required
1. Exact SKU, hardware revision, firmware, manual and signed datasheet; confirm whether any GPS/GNSS receiver, cellular modem or UWB hardware exists.
2. Apple Find My / Google Find Hub model-specific approval or compatibility evidence, pairing demo, phone/OS/region requirements, switching/reset behavior and whether simultaneous dual-network use exists.
3. Notification demonstration: movement sensor, trigger, recipient, foreground/background requirements, delay and offline behavior. Separate movement, separation and unknown-tracker alerts.
4. Model-matching CE declaration and applicable reports, FCC identifier/authorization as applicable, RoHS evidence; factory ISO certificate with scope and validity if claimed.
5. IP65 test report and use restrictions; battery chemistry/type (including CR2032 claim), replaceability and measured lifetime conditions; Bluetooth version, temperature validation and dimension drawing.
6. Commercial confirmation of existing manufacturing-history, MOQ, sample/lead-time, warranty, OEM and fee statements. These commercial terms were not independently audited.
7. Review embedded wording/logos in the externally hosted product and hero images. Those raster assets were retained and their embedded claims have not been independently verified.

## Regression and reproduction
Run from repository root with Node.js 18+:
```sh
node --test gps-tracker.test.cjs
```
Eight passing tests: deferred successful acceptance; double submission while pending and after success; HTTP failure; network failure; application failure; invalid JSON; invalid fields; analytics unavailable; configuration/status wiring (some scenarios grouped in one test). Fetch and analytics are stubbed in an isolated VM. No real inquiry or tracking request is sent. The original implementation failed the conversion-before-success regression.

Additional browser script:
```sh
npm install --no-save playwright
npx playwright install chromium
node gps-tracker.browser.cjs
```
All URLs are intercepted: local page fulfilled from disk, Formspree mocked, all other requests aborted. Includes success, HTTP/network failure, timeout, throwing analytics and repeated submit events. **Not executed successfully in the repair environment:** Chromium executable is absent. This is a supplied follow-up verification, not a claimed browser pass.

## Limits / operational checks
- No production Formspree submission, inbox delivery, spam filtering, account quota or CAPTCHA configuration was tested.
- Ads conversion emission is after confirmed acceptance, not proof of inbox delivery or qualified lead quality. Browser blocking/consent may prevent Google receiving the event.
- Current ad spending and account-side conversion settings were not inspected. Check for GA4 form_submit imports or additional rules that could independently count attempts or duplicate conversions; verify the intended Ads lead conversion uses the desired counting settings.
- Repository update does not itself verify the live deployment. Check the deployed source, cache and page rendering afterward without sending a live inquiry.
