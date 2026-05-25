#pragma once

// Copy this file to secrets.h before compiling.

#define WIFI_SSID "your-wifi-or-phone-hotspot"
#define WIFI_PASSWORD "your-wifi-password"

#define BACKEND_BASE_URL "https://g2vision.0ruka.dev"
#define DEVICE_ID "xiao-g2-001"
#define CAMERA_TOKEN "replace-with-long-random-token"

// MVP: true is easier for Cloudflare Tunnel or changing certificates.
// Production: set false and paste a valid root CA into BACKEND_ROOT_CA.
static const bool USE_INSECURE_TLS = true;
static const char BACKEND_ROOT_CA[] = R"EOF(
-----BEGIN CERTIFICATE-----
replace-with-root-ca-if-use-insecure-tls-is-false
-----END CERTIFICATE-----
)EOF";
