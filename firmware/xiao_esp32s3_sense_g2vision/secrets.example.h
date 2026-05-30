#pragma once

// Copy this file to secrets.h before compiling:
//
//   cp secrets.example.h secrets.h
//
// secrets.h is intentionally ignored by Git because it contains private Wi-Fi
// credentials and the backend camera token. Keep secrets.example.h in the repo
// as the safe template, and keep your real secrets.h only on the machine used
// for flashing.

// Wi-Fi network used by the XIAO ESP32S3 Sense.
// Get this from the router settings, the phone hotspot screen, or the local
// network you will use during testing. Use a 2.4 GHz network when possible.
#define WIFI_SSID "your-2.4ghz-wifi-or-phone-hotspot-name"

// Password for WIFI_SSID.
// Get this from the same router/hotspot/network source as the SSID.
#define WIFI_PASSWORD "your-wifi-password"

// Public HTTPS origin of the G2Vision backend.
// For the hosted MVP backend, use:
//   https://g2vision.0ruka.dev
// For local testing on the same network, use your computer's reachable URL,
// for example:
//   http://192.168.1.23:8787
// Do not use localhost here unless the backend is running on the XIAO itself.
#define BACKEND_BASE_URL "https://g2vision.0ruka.dev"

// Camera device ID expected by the backend.
// Get this from backend/.env as CAMERA_DEVICE_ID. The current MVP default is
// xiao-g2-001, and it must match the backend value exactly.
#define DEVICE_ID "xiao-g2-001"

// Bearer token used by the XIAO camera endpoints.
// Get this from backend/.env as CAMERA_TOKEN, or from the deployed backend
// operator if you are not running the backend yourself. It must match the
// backend value exactly. Do not commit the real token.
#define CAMERA_TOKEN "replace-with-backend-camera-token"

// TLS mode.
// For first MVP flashing and Cloudflare Tunnel testing, true is acceptable and
// avoids certificate setup issues.
// Before field testing or production use, set this to false and paste the root
// CA certificate for BACKEND_BASE_URL into BACKEND_ROOT_CA.
static const bool USE_INSECURE_TLS = true;

// Root CA certificate for BACKEND_BASE_URL.
// Only used when USE_INSECURE_TLS is false.
// Get it from your HTTPS endpoint certificate chain. On macOS you can inspect
// the site certificate in the browser, or use openssl from Terminal, then paste
// the trusted root CA PEM here.
static const char BACKEND_ROOT_CA[] = R"EOF(
-----BEGIN CERTIFICATE-----
replace-with-root-ca-if-use-insecure-tls-is-false
-----END CERTIFICATE-----
)EOF";
