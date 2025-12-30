// 协议解析器模块
// 负责解析和构建符合通信协议的数据帧
#pragma once

#include <Arduino.h>
#include <vector>

using namespace std;

// 消息类型定义
enum class MessageType {
  SENSOR_REPORT = 0x01,   // 传感器数据上报
  ACTUATOR_STATUS = 0x02, // 执行器状态反馈
  COMMAND = 0x10,         // 控制命令
  COMMAND_ACK = 0x11,     // 命令确认
  HEARTBEAT = 0x20        // 心跳
};

// 传感器标签定义
enum class SensorTag {
  SOIL_MOISTURE = 0x01,  // 土壤湿度
  TEMPERATURE = 0x02,    // 温度
  HUMIDITY = 0x03,       // 湿度
  LIGHT_INTENSITY = 0x04 // 光照强度
};

// 执行器标签定义
enum class ActuatorTag {
  FAN = 0x10,   // 风扇
  PUMP = 0x11,  // 水泵
  LIGHT = 0x12, // 补光灯
  BUZZER = 0x13 // 蜂鸣器
};

// 执行器状态定义
enum class ActuatorState {
  OFF = 0x00, // 关闭
  ON = 0x01   // 开启
};

// TLV数据结构
struct TLV {
  uint8_t tag;           // 标签
  uint8_t len;           // 长度
  vector<uint8_t> value; // 值
};

// 帧数据结构
struct ProtocolFrame {
  uint8_t sof;         // 帧起始标志
  uint8_t len;         // 帧体长度
  MessageType type;    // 消息类型
  vector<TLV> payload; // 载荷
  uint8_t crc;         // 校验码
};

// 协议解析器类
class ProtocolParser {
public:
  // 计算CRC校验值
  static uint8_t calculateCRC(const uint8_t *data, size_t length);

  // 解析原始数据，返回完整的帧
  static ProtocolFrame *parseFrame(const uint8_t *data, size_t length,
                                   size_t &consumed);

  // 构建帧
  static vector<uint8_t> buildFrame(MessageType type,
                                    const vector<TLV> &payload);

  // 构建TLV
  static TLV buildTLV(uint8_t tag, const vector<uint8_t> &value);

  // 构建简单TLV（1字节值）
  static TLV buildTLV(uint8_t tag, uint8_t value);

  // 构建简单TLV（2字节值，大端序）
  static TLV buildTLV(uint8_t tag, uint16_t value);
};
