// 原理说明：封装 ESP8266WiFi 接口以启动热点模式并对外提供运行状态。
#include "wifi_manager.h"

#include <ESP8266WiFi.h>

namespace wifi_manager {
namespace {

bool apRunning = false;
} // namespace

void startAccessPoint(const char *ssid, const char *password) {
  WiFi.mode(WIFI_AP);
  WiFi.softAPdisconnect(true);
  apRunning = false;

  if (password != nullptr && password[0] != '\0') {
    apRunning = WiFi.softAP(ssid, password);
  } else {
    // No password provided, use open AP
    apRunning = WiFi.softAP(ssid);
  }
}

bool isConnected() { return apRunning; }

IPAddress localIP() { return WiFi.softAPIP(); }

} // namespace wifi_manager
