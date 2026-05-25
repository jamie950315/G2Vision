# Hardware notes

## Primary module

Use Seeed Studio XIAO ESP32S3 Sense for the MVP.

Reasons:

- It is compact: 21 x 17.8 x 15 mm with the Sense expansion board, according to Seeed's XIAO ESP32-S3 getting started page.
- It includes ESP32-S3R8, Wi-Fi, BLE, 8 MB PSRAM, 8 MB Flash, camera sensor, digital microphone, and microSD support.
- Current Seeed documentation notes that later XIAO ESP32S3 Sense units use OV3660; the camera examples still apply, and OV5640 is also listed as compatible.
- Seeed's camera usage page states the XIAO ESP32S3 Sense camera occupies GPIO10, GPIO11, GPIO12, GPIO13, GPIO14, GPIO15, GPIO16, GPIO17, GPIO18, GPIO38, GPIO39, GPIO40, GPIO47, GPIO48.
- Seeed's camera tutorial says PSRAM must be enabled in Arduino IDE for the camera to work properly.

## External button

Recommended MVP button pin: D1 / GPIO2.

Wiring:

```text
D1 / GPIO2 ---- momentary button ---- GND
```

Firmware config:

```cpp
#define EXTERNAL_BUTTON_PIN D1
pinMode(EXTERNAL_BUTTON_PIN, INPUT_PULLUP);
```

Rationale:

- GPIO2 is exposed as D1 on XIAO ESP32S3 / Sense.
- It is outside the camera pin group.
- It does not conflict with microSD pins D8-D10 or microphone pins D11-D12.
- It avoids GPIO0, a boot strapping pin.

## Enclosure direction

Mount the XIAO Sense on the right temple of the G2 frame. Put the camera near the front third of the temple, angled forward and slightly downward. Place the LiPo cell farther back on the temple to balance weight.

## Battery guidance

For first wearable testing, use 150-300 mAh LiPo. Seeed's docs list battery webcam average around 3.8 V / about 155 mA and image capture peak around 3.8 V / about 366 mA for XIAO ESP32S3 Sense. This makes 150 mAh enough for short demos and 300 mAh better for repeated field testing.

## Pins to avoid

- GPIO0: boot mode / strapping.
- GPIO10, 11, 12, 13, 14, 15, 16, 17, 18, 38, 39, 40, 47, 48: camera.
- GPIO7, 8, 9 / D8-D10: microSD SPI if microSD is needed.
- GPIO41, 42 / D12-D11: microphone if microphone is needed.
