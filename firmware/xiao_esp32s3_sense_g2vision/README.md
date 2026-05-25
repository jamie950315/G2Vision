# XIAO ESP32S3 Sense firmware

This firmware supports two capture paths:

1. Even Hub path: the app creates a backend job; the XIAO polls `/cam/next`, captures a JPEG, and uploads to `/cam/upload/:id`.
2. Hardware button path: a physical momentary button connected to D1 / GPIO2 and GND triggers immediate JPEG capture and upload to `/cam/button-capture`.

## Hardware wiring

- XIAO ESP32S3 Sense with camera expansion board installed.
- External momentary button:
  - Button side A -> D1 / GPIO2
  - Button side B -> GND
- Firmware uses `INPUT_PULLUP`, so no external resistor is required for the MVP.
- Avoid GPIO0 for the button because it is a boot strapping pin.
- Avoid camera pins GPIO10, GPIO11, GPIO12, GPIO13, GPIO14, GPIO15, GPIO16, GPIO17, GPIO18, GPIO38, GPIO39, GPIO40, GPIO47, GPIO48.
- Avoid D8-D10 if the microSD slot is needed.
- Avoid D11-D12 if the digital microphone is needed.

## Arduino IDE setup

- Board: Seeed Studio XIAO ESP32S3
- PSRAM: enabled / OPI PSRAM
- USB CDC On Boot: enabled for serial logs
- Libraries: ArduinoJson, esp32 camera support from ESP32 Arduino package

## Configure secrets

Copy `secrets.example.h` to `secrets.h` and set WiFi, backend URL, device ID, and token.

## Production TLS

The MVP uses `USE_INSECURE_TLS = true` for fast testing. For production, set it to false and paste a root CA into `BACKEND_ROOT_CA`.
