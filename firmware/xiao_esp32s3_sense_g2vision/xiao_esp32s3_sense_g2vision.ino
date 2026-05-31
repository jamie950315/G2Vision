#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "esp_camera.h"

#include "secrets.h"
#include "config.h"
#include "camera_pins_xiao_esp32s3_sense.h"

unsigned long lastPollMs = 0;
unsigned long lastPollHeartbeatMs = 0;
unsigned long lastWiFiReconnectMs = 0;
unsigned long lastButtonCaptureMs = 0;

bool lastButtonRawPressed = false;
bool stableButtonPressed = false;
unsigned long lastButtonChangeMs = 0;
bool pendingButtonCapture = false;
bool busy = false;

void setStatusLed(bool on) {
#if defined(STATUS_LED_PIN)
  digitalWrite(STATUS_LED_PIN, STATUS_LED_ACTIVE_LOW ? !on : on);
#endif
}

void configureSecureClient(WiFiClientSecure &client) {
  client.setTimeout(HTTP_TIMEOUT_MS / 1000);
  if (USE_INSECURE_TLS) {
    client.setInsecure();
  } else {
    client.setCACert(BACKEND_ROOT_CA);
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long now = millis();
  if (now - lastWiFiReconnectMs < WIFI_RECONNECT_INTERVAL_MS) return;
  lastWiFiReconnectMs = now;

  Serial.print("Connecting WiFi to ");
  Serial.println(WIFI_SSID);
  WiFi.disconnect(true);
  delay(200);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connect timed out");
  }
}

bool setupCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = DEFAULT_FRAME_SIZE;
  config.jpeg_quality = DEFAULT_JPEG_QUALITY;
  config.fb_count = 1;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;

  if (psramFound()) {
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.fb_location = CAMERA_FB_IN_DRAM;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return false;
  }

  sensor_t *sensor = esp_camera_sensor_get();
  if (sensor) {
    sensor->set_vflip(sensor, CAMERA_VFLIP);
    sensor->set_hmirror(sensor, CAMERA_HMIRROR);
    sensor->set_brightness(sensor, CAMERA_BRIGHTNESS);
    sensor->set_contrast(sensor, CAMERA_CONTRAST);
    sensor->set_saturation(sensor, CAMERA_SATURATION);
  }

  return true;
}

void setupButton() {
  pinMode(EXTERNAL_BUTTON_PIN, INPUT_PULLUP);
  lastButtonRawPressed = false;
  stableButtonPressed = false;
  lastButtonChangeMs = millis();
}

bool readButtonPressedRaw() {
  int value = digitalRead(EXTERNAL_BUTTON_PIN);
#if BUTTON_ACTIVE_LOW
  return value == LOW;
#else
  return value == HIGH;
#endif
}

void serviceButton() {
  bool rawPressed = readButtonPressedRaw();
  unsigned long now = millis();

  if (rawPressed != lastButtonRawPressed) {
    lastButtonChangeMs = now;
    lastButtonRawPressed = rawPressed;
  }

  if (now - lastButtonChangeMs >= BUTTON_DEBOUNCE_MS && rawPressed != stableButtonPressed) {
    stableButtonPressed = rawPressed;
    if (stableButtonPressed && now - lastButtonCaptureMs >= BUTTON_CAPTURE_COOLDOWN_MS) {
      pendingButtonCapture = true;
      lastButtonCaptureMs = now;
      Serial.println("External button pressed: capture queued");
    }
  }
}

String authHeader() {
  return String("Bearer ") + CAMERA_TOKEN;
}

bool httpGetJson(const String &url, String &body, int &code) {
  WiFiClientSecure client;
  configureSecureClient(client);

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.setReuse(false);
  if (!http.begin(client, url)) {
    code = -1;
    body = "HTTP begin failed";
    client.stop();
    return false;
  }
  http.addHeader("Authorization", authHeader());
  code = http.GET();
  body = code > 0 ? http.getString() : String();
  http.end();
  client.stop();
  return code >= 200 && code < 300;
}

String getNextJobId() {
  if (WiFi.status() != WL_CONNECTED) return String();

  String url = String(BACKEND_BASE_URL) + "/cam/next?device_id=" + DEVICE_ID;
  String body;
  int code = 0;
  bool ok = httpGetJson(url, body, code);

  if (code == 204) {
    unsigned long now = millis();
    if (now - lastPollHeartbeatMs >= POLL_HEARTBEAT_MS) {
      lastPollHeartbeatMs = now;
      Serial.printf("Polling backend: no job, RSSI %d dBm\n", WiFi.RSSI());
    }
    return String();
  }

  if (!ok) {
    Serial.printf("/cam/next failed: %d\n", code);
    if (body.length()) Serial.println(body);
    return String();
  }

  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    Serial.print("JSON parse failed: ");
    Serial.println(err.c_str());
    return String();
  }

  const char *requestId = doc["request_id"];
  if (!requestId) return String();

  Serial.print("Received backend job: ");
  Serial.println(requestId);
  return String(requestId);
}

camera_fb_t *captureJpeg() {
  // Drop one stale frame when frame buffering is enabled.
  camera_fb_t *warmup = esp_camera_fb_get();
  if (warmup) esp_camera_fb_return(warmup);
  delay(40);

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return nullptr;
  }

  if (fb->format != PIXFORMAT_JPEG) {
    Serial.println("Captured frame is not JPEG");
    esp_camera_fb_return(fb);
    return nullptr;
  }

  return fb;
}

bool postJpeg(const String &url, camera_fb_t *fb, String &responseBody, int &code) {
  WiFiClientSecure client;
  configureSecureClient(client);

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.setReuse(false);
  if (!http.begin(client, url)) {
    code = -1;
    responseBody = "HTTP begin failed";
    client.stop();
    return false;
  }
  http.addHeader("Authorization", authHeader());
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("Content-Type", "image/jpeg");

  code = http.POST(fb->buf, fb->len);
  responseBody = code > 0 ? http.getString() : String();
  http.end();
  client.stop();

  return code >= 200 && code < 300;
}

bool captureAndUploadToUrl(const String &url) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cannot upload: WiFi disconnected");
    return false;
  }

  setStatusLed(true);
  camera_fb_t *fb = captureJpeg();
  if (!fb) {
    setStatusLed(false);
    return false;
  }

  Serial.printf("Uploading JPEG: %u bytes\n", fb->len);
  String responseBody;
  int code = 0;
  bool ok = postJpeg(url, fb, responseBody, code);
  esp_camera_fb_return(fb);
  setStatusLed(false);

  Serial.printf("Upload status: %d\n", code);
  if (responseBody.length()) Serial.println(responseBody);
  return ok;
}

void handleBackendJob(const String &jobId) {
  String url = String(BACKEND_BASE_URL) + "/cam/upload/" + jobId + "?device_id=" + DEVICE_ID;
  Serial.print("Handling backend job: ");
  Serial.println(jobId);
  captureAndUploadToUrl(url);
}

void handleButtonCapture() {
  String url = String(BACKEND_BASE_URL) + "/cam/button-capture?device_id=" + DEVICE_ID;
  Serial.println("Handling hardware button capture");
  captureAndUploadToUrl(url);
}

void setup() {
  Serial.begin(115200);
  delay(800);

#if defined(STATUS_LED_PIN)
  pinMode(STATUS_LED_PIN, OUTPUT);
  setStatusLed(false);
#endif

  setupButton();
  connectWiFi();

  if (!setupCamera()) {
    Serial.println("Camera setup failed; reset required");
    while (true) {
      setStatusLed(true);
      delay(150);
      setStatusLed(false);
      delay(850);
    }
  }

  Serial.println("G2 external vision camera firmware ready");
}

void loop() {
  serviceButton();
  connectWiFi();

  if (busy) {
    delay(10);
    return;
  }

  if (pendingButtonCapture) {
    pendingButtonCapture = false;
    busy = true;
    handleButtonCapture();
    busy = false;
    return;
  }

  unsigned long now = millis();
  if (now - lastPollMs >= POLL_INTERVAL_MS) {
    lastPollMs = now;
    busy = true;
    String jobId = getNextJobId();
    if (jobId.length() > 0) handleBackendJob(jobId);
    busy = false;
  }

  delay(10);
}
