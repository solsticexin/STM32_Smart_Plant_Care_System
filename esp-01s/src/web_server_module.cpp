// Web服务器模块实现
// 负责提供静态文件服务和WebSocket通信，实现前端与STM32的实时数据交互
#include "web_server_module.h"

#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#include <FS.h>
#include <LittleFS.h>
#include <WebSocketsServer.h>

#include "protocol_parser.h"
#include "serial_bridge.h"
#include "wifi_manager.h"

namespace web_server_module {
namespace {

ESP8266WebServer *server = nullptr;
WebSocketsServer *webSocket = nullptr;
bool littleFsMounted = false;

// 设备状态结构体
struct DeviceState {
  float temperature = 0.0f;
  float humidity = 0.0f;
  uint16_t soilMoisture = 0;
  uint16_t lightIntensity = 0;
  bool fanState = false;
  bool pumpState = false;
  bool lightState = false;
  bool buzzerState = false;
  unsigned long lastUpdate = 0;
};

DeviceState currentState;

// 构建JSON字符串用于WebSocket发送
String buildSensorDataJson() {
  StaticJsonDocument<256> doc;
  doc["type"] = "sensorData";
  doc["timestamp"] = millis();
  doc["temperature"] = currentState.temperature;
  doc["humidity"] = currentState.humidity;
  doc["soilMoisture"] = currentState.soilMoisture;
  doc["lightIntensity"] = currentState.lightIntensity;

  String json;
  serializeJson(doc, json);
  return json;
}

String buildActuatorStateJson() {
  StaticJsonDocument<256> doc;
  doc["type"] = "actuatorState";
  doc["timestamp"] = millis();
  doc["fan"] = currentState.fanState;
  doc["pump"] = currentState.pumpState;
  doc["light"] = currentState.lightState;
  doc["buzzer"] = currentState.buzzerState;

  String json;
  serializeJson(doc, json);
  return json;
}

// WebSocket事件处理
void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t *payload,
                      size_t length) {
  switch (type) {
  case WStype_DISCONNECTED:
    // 客户端断开连接
    break;
  case WStype_CONNECTED: {
    // 客户端连接，发送当前状态
    String sensorJson = buildSensorDataJson();
    String actuatorJson = buildActuatorStateJson();
    webSocket->sendTXT(num, sensorJson);
    webSocket->sendTXT(num, actuatorJson);
  } break;
  case WStype_TEXT: {
    // 处理来自客户端的控制命令
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, payload, length);
    if (error) {
      return;
    }

    String commandType = doc["type"];
    if (commandType == "control") {
      String target = doc["target"];
      String action = doc["action"];

      ActuatorTag tag;
      if (target == "fan")
        tag = ActuatorTag::FAN;
      else if (target == "pump")
        tag = ActuatorTag::PUMP;
      else if (target == "light")
        tag = ActuatorTag::LIGHT;
      else if (target == "buzzer")
        tag = ActuatorTag::BUZZER;
      else
        return;

      if (action == "on" || action == "off") {
        // 开关控制命令
        ActuatorState state =
            (action == "on") ? ActuatorState::ON : ActuatorState::OFF;
        serial_bridge::sendCommand(tag, state);
      } else if (action == "pulse") {
        // 脉冲控制命令
        int duration = doc["duration"];
        if (duration > 0 && duration <= 10000) {
          serial_bridge::sendPulseCommand(tag, duration);
        }
      }
    }
  } break;
  default:
    break;
  }
}

// 广播消息给所有WebSocket客户端
void broadcastMessage(String message) {
  if (webSocket != nullptr) {
    webSocket->broadcastTXT(message);
  }
}

// 处理传感器数据帧
void handleSensorReportFrame(ProtocolFrame *frame) {
  for (const auto &tlv : frame->payload) {
    switch (static_cast<SensorTag>(tlv.tag)) {
    case SensorTag::TEMPERATURE:
      if (tlv.len == 2) {
        uint16_t rawValue = (tlv.value[0] << 8) | tlv.value[1];
        currentState.temperature = rawValue / 100.0f;
      }
      break;
    case SensorTag::HUMIDITY:
      if (tlv.len == 2) {
        uint16_t rawValue = (tlv.value[0] << 8) | tlv.value[1];
        currentState.humidity = rawValue / 100.0f;
      }
      break;
    case SensorTag::SOIL_MOISTURE:
      if (tlv.len == 2) {
        currentState.soilMoisture = (tlv.value[0] << 8) | tlv.value[1];
      }
      break;
    case SensorTag::LIGHT_INTENSITY:
      if (tlv.len == 2) {
        currentState.lightIntensity = (tlv.value[0] << 8) | tlv.value[1];
      }
      break;
    default:
      break;
    }
  }

  currentState.lastUpdate = millis();
  // 广播传感器数据更新
  broadcastMessage(buildSensorDataJson());
}

// 处理执行器状态帧
void handleActuatorStatusFrame(ProtocolFrame *frame) {
  for (const auto &tlv : frame->payload) {
    if (tlv.len != 1)
      continue;

    bool state = (tlv.value[0] == 0x01);

    switch (static_cast<ActuatorTag>(tlv.tag)) {
    case ActuatorTag::FAN:
      currentState.fanState = state;
      break;
    case ActuatorTag::PUMP:
      currentState.pumpState = state;
      break;
    case ActuatorTag::LIGHT:
      currentState.lightState = state;
      break;
    case ActuatorTag::BUZZER:
      currentState.buzzerState = state;
      break;
    default:
      break;
    }
  }

  // 广播执行器状态更新
  broadcastMessage(buildActuatorStateJson());
}

// 处理命令确认帧
void handleCommandAckFrame(ProtocolFrame *frame) {
  // 命令确认帧，不需要特殊处理
  // 前端会通过执行器状态更新来获知命令执行结果
}

// 静态文件处理函数
void handleStaticFile(const String &path, const String &contentType) {
  if (!littleFsMounted) {
    server->send(500, "text/plain", "File system not mounted");
    return;
  }

  File file = LittleFS.open(path, "r");
  if (!file) {
    server->send(404, "text/plain", "File not found");
    return;
  }

  server->streamFile(file, contentType);
  file.close();
}

// 根路径处理
void handleRoot() { handleStaticFile("/smart-plant-care.html", "text/html"); }

// CSS文件处理
void handleStyles() { handleStaticFile("/styles.css", "text/css"); }

// JavaScript文件处理
void handleScript(const String &scriptName) {
  String path = "/" + scriptName + ".js";
  handleStaticFile(path, "application/javascript");
}

// 404处理
void handleNotFound() { server->send(404, "text/plain", "Not found"); }

} // namespace

void start(uint16_t port) {
  // 初始化文件系统
  if (littleFsMounted) {
    LittleFS.end();
    littleFsMounted = false;
  }
  littleFsMounted = LittleFS.begin();
  if (!littleFsMounted) {
    // Serial.println("LittleFS mount failed");
  }

  // 初始化Web服务器
  if (server != nullptr) {
    server->stop();
    delete server;
    server = nullptr;
  }
  server = new ESP8266WebServer(port);

  // 初始化WebSocket服务器
  if (webSocket != nullptr) {
    delete webSocket;
    webSocket = nullptr;
  }
  webSocket = new WebSocketsServer(81);
  webSocket->begin();
  webSocket->onEvent(onWebSocketEvent);

  // 注册路由
  server->on("/", handleRoot);
  server->on("/styles.css", handleStyles);
  server->on("/app.js", []() { handleScript("app"); });
  server->on("/protocol-parser.js", []() { handleScript("protocol-parser"); });
  server->on("/state-manager.js", []() { handleScript("state-manager"); });
  server->on("/communication-manager.js",
             []() { handleScript("communication-manager"); });
  server->on("/ui-updater.js", []() { handleScript("ui-updater"); });
  server->on("/utils.js", []() { handleScript("utils"); });
  server->onNotFound(handleNotFound);

  // 启动Web服务器
  server->begin();

  // 设置串口帧处理回调
  serial_bridge::setFrameHandler([](ProtocolFrame *frame) {
    if (frame == nullptr)
      return;

    switch (frame->type) {
    case MessageType::SENSOR_REPORT:
      handleSensorReportFrame(frame);
      break;
    case MessageType::ACTUATOR_STATUS:
      handleActuatorStatusFrame(frame);
      break;
    case MessageType::COMMAND_ACK:
      handleCommandAckFrame(frame);
      break;
    default:
      break;
    }
  });
}

void loop() {
  // 处理Web服务器请求
  if (server != nullptr) {
    server->handleClient();
  }

  // 处理WebSocket事件
  if (webSocket != nullptr) {
    webSocket->loop();
  }
}

bool isRunning() { return server != nullptr; }

// 处理串口消息的函数（被serial_bridge调用）
void handleSerialLine(const String &line) {
  // 这个函数在新的实现中不再使用，因为我们直接通过setFrameHandler处理帧
  // 保留这个函数是为了保持接口兼容性
}

} // namespace web_server_module