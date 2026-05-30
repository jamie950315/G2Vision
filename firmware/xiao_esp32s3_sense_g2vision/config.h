#pragma once

#include "esp_camera.h"

// External momentary button wiring:
//   One side -> D1 / GPIO2
//   Other side -> GND
// Firmware uses INPUT_PULLUP, so pressed == LOW.
#ifndef EXTERNAL_BUTTON_PIN
#define EXTERNAL_BUTTON_PIN D1
#endif

#define BUTTON_ACTIVE_LOW 1
#define BUTTON_DEBOUNCE_MS 45
#define BUTTON_CAPTURE_COOLDOWN_MS 2500

#define POLL_INTERVAL_MS 5000
#define POLL_HEARTBEAT_MS 10000
#define WIFI_RECONNECT_INTERVAL_MS 5000
#define WIFI_CONNECT_TIMEOUT_MS 20000
#define HTTP_TIMEOUT_MS 20000

// SVGA is a practical default for cloud vision: readable enough with small upload size.
#define DEFAULT_FRAME_SIZE FRAMESIZE_SVGA
#define DEFAULT_JPEG_QUALITY 12

// Adjust these if the enclosure flips the camera orientation.
#define CAMERA_VFLIP 0
#define CAMERA_HMIRROR 0

#define STATUS_LED_PIN 21
#define STATUS_LED_ACTIVE_LOW 1
