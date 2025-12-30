// 串口通信模块
// 负责处理与STM32的串口通信，实现协议帧的收发
#pragma once

#include <Arduino.h>
#include <functional>
#include <vector>
#include "protocol_parser.h"

namespace serial_bridge {

// 消息处理回调类型
typedef std::function<void(ProtocolFrame*)> FrameHandler;

// 初始化串口通信
void begin(HardwareSerial& serial_port, unsigned long baud_rate);

// 主循环处理
void loop();

// 设置帧处理回调
void setFrameHandler(FrameHandler handler);

// 发送协议帧
bool sendFrame(const ProtocolFrame& frame);

// 直接发送原始数据
bool sendRaw(const uint8_t* data, size_t length);

// 发送控制命令
bool sendCommand(ActuatorTag tag, ActuatorState state);

// 发送脉冲控制命令
bool sendPulseCommand(ActuatorTag tag, uint16_t duration_ms);

}  // namespace serial_bridge
