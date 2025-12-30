// 串口通信模块实现
// 负责处理与STM32的串口通信，实现协议帧的收发
#include "serial_bridge.h"

#include <HardwareSerial.h>

using namespace std;

namespace serial_bridge {
namespace {

HardwareSerial *port = nullptr;
FrameHandler frame_handler = nullptr;
std::vector<uint8_t> rx_buffer;
constexpr size_t MAX_BUFFER_SIZE = 1024;

void processReceivedData() {
  if (rx_buffer.empty()) {
    return;
  }

  size_t consumed = 0;
  while (rx_buffer.size() > 0) {
    ProtocolFrame *frame = ProtocolParser::parseFrame(
        rx_buffer.data(), rx_buffer.size(), consumed);
    if (frame != nullptr) {
      // 处理完整帧
      if (frame_handler != nullptr) {
        frame_handler(frame);
      }
      delete frame;
      // 移除已处理的数据
      rx_buffer.erase(rx_buffer.begin(), rx_buffer.begin() + consumed);
    } else {
      // 没有完整帧或解析失败
      if (consumed > 0) {
        // 移除无效数据
        rx_buffer.erase(rx_buffer.begin(), rx_buffer.begin() + consumed);
      } else {
        // 没有足够数据，等待更多数据
        break;
      }
    }
  }

  // 限制缓冲区大小，防止内存溢出
  if (rx_buffer.size() > MAX_BUFFER_SIZE) {
    rx_buffer.clear();
  }
}

} // namespace

void begin(HardwareSerial &serial_port, unsigned long baud_rate) {
  port = &serial_port;
  port->begin(baud_rate);
  rx_buffer.reserve(256);
}

void loop() {
  if (port == nullptr) {
    return;
  }

  // 读取串口数据
  while (port->available() > 0) {
    uint8_t byte = port->read();
    rx_buffer.push_back(byte);
  }

  // 处理接收到的数据
  processReceivedData();
}

void setFrameHandler(FrameHandler handler) { frame_handler = handler; }

bool sendFrame(const ProtocolFrame &frame) {
  if (port == nullptr) {
    return false;
  }

  // 构建帧数据
  std::vector<TLV> payload(frame.payload.begin(), frame.payload.end());
  std::vector<uint8_t> frame_data =
      ProtocolParser::buildFrame(frame.type, payload);

  // 发送帧数据
  size_t written = port->write(frame_data.data(), frame_data.size());
  if (written != frame_data.size()) {
    return false;
  }
  port->flush();
  return true;
}

bool sendRaw(const uint8_t *data, size_t length) {
  if (port == nullptr) {
    return false;
  }

  size_t written = port->write(data, length);
  if (written != length) {
    return false;
  }
  port->flush();
  return true;
}

bool sendCommand(ActuatorTag tag, ActuatorState state) {
  if (port == nullptr) {
    return false;
  }

  // 构建命令帧
  TLV tlv = ProtocolParser::buildTLV(static_cast<uint8_t>(tag),
                                     static_cast<uint8_t>(state));
  std::vector<TLV> payload = {tlv};
  std::vector<uint8_t> frame_data =
      ProtocolParser::buildFrame(MessageType::COMMAND, payload);

  // 发送命令帧
  size_t written = port->write(frame_data.data(), frame_data.size());
  if (written != frame_data.size()) {
    return false;
  }
  port->flush();
  return true;
}

bool sendPulseCommand(ActuatorTag tag, uint16_t duration_ms) {
  if (port == nullptr) {
    return false;
  }

  // 构建脉冲命令帧
  TLV tlv = ProtocolParser::buildTLV(static_cast<uint8_t>(tag), duration_ms);
  std::vector<TLV> payload = {tlv};
  std::vector<uint8_t> frame_data =
      ProtocolParser::buildFrame(MessageType::COMMAND, payload);

  // 发送命令帧
  size_t written = port->write(frame_data.data(), frame_data.size());
  if (written != frame_data.size()) {
    return false;
  }
  port->flush();
  return true;
}

} // namespace serial_bridge
