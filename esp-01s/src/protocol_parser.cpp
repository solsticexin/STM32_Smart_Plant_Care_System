// 协议解析器实现
#include "protocol_parser.h"

using namespace std;

// 帧起始标志
constexpr uint8_t SOF = 0xAA;

// 计算CRC校验值
uint8_t ProtocolParser::calculateCRC(const uint8_t *data, size_t length) {
  uint8_t crc = 0;
  for (size_t i = 0; i < length; i++) {
    crc ^= data[i];
  }
  return crc;
}

// 解析原始数据，返回完整的帧
ProtocolFrame *ProtocolParser::parseFrame(const uint8_t *data, size_t length,
                                          size_t &consumed) {
  consumed = 0;

  // 寻找帧起始标志
  size_t startIndex = 0;
  while (startIndex < length && data[startIndex] != SOF) {
    startIndex++;
  }

  if (startIndex == length) {
    consumed = length;
    return nullptr; // 未找到帧起始标志
  }

  // 检查帧头长度
  if (startIndex + 4 > length) {
    consumed = startIndex;
    return nullptr; // 帧长度不足
  }

  // 解析帧头
  uint8_t len = data[startIndex + 1];
  MessageType type = static_cast<MessageType>(data[startIndex + 2]);

  // 检查完整帧长度
  size_t totalFrameLength =
      startIndex + 1 + 1 + 1 + len + 1; // SOF + LEN + TYPE + PAYLOAD + CRC
  if (totalFrameLength > length) {
    consumed = startIndex;
    return nullptr; // 帧不完整
  }

  // 提取帧数据
  const uint8_t *frameData = &data[startIndex];
  size_t frameLength = totalFrameLength - startIndex;

  // 计算CRC校验
  uint8_t calculatedCRC = calculateCRC(frameData, frameLength - 1);
  uint8_t receivedCRC = frameData[frameLength - 1];

  if (calculatedCRC != receivedCRC) {
    consumed = startIndex + 1;
    return nullptr; // CRC校验失败
  }

  // 解析TLV载荷
  vector<TLV> payload;
  size_t payloadStart = startIndex + 3; // SOF + LEN + TYPE
  size_t payloadEnd = payloadStart + len;
  size_t offset = payloadStart;

  while (offset < payloadEnd) {
    if (offset + 2 > payloadEnd) {
      break; // TLV格式错误
    }

    uint8_t tag = data[offset];
    uint8_t tlvLen = data[offset + 1];

    if (offset + 2 + tlvLen > payloadEnd) {
      break; // TLV值长度错误
    }

    vector<uint8_t> value(data + offset + 2, data + offset + 2 + tlvLen);
    payload.push_back({tag, tlvLen, value});

    offset += 2 + tlvLen;
  }

  // 构建帧对象
  ProtocolFrame *frame = new ProtocolFrame();
  frame->sof = SOF;
  frame->len = len;
  frame->type = type;
  frame->payload = payload;
  frame->crc = receivedCRC;

  consumed = totalFrameLength;
  return frame;
}

// 构建帧
vector<uint8_t> ProtocolParser::buildFrame(MessageType type,
                                           const vector<TLV> &payload) {
  vector<uint8_t> frame;

  // 构建TLV payload
  vector<uint8_t> tlvData;
  for (const auto &tlv : payload) {
    tlvData.push_back(tlv.tag);
    tlvData.push_back(tlv.len);
    tlvData.insert(tlvData.end(), tlv.value.begin(), tlv.value.end());
  }

  // 构建帧头
  frame.push_back(SOF);
  frame.push_back(static_cast<uint8_t>(tlvData.size()));
  frame.push_back(static_cast<uint8_t>(type));

  // 添加payload
  frame.insert(frame.end(), tlvData.begin(), tlvData.end());

  // 计算并添加CRC
  uint8_t crc = calculateCRC(frame.data(), frame.size());
  frame.push_back(crc);

  return frame;
}

// 构建TLV
TLV ProtocolParser::buildTLV(uint8_t tag, const vector<uint8_t> &value) {
  return {tag, static_cast<uint8_t>(value.size()), value};
}

// 构建简单TLV（1字节值）
TLV ProtocolParser::buildTLV(uint8_t tag, uint8_t value) {
  vector<uint8_t> val = {value};
  return {tag, 1, val};
}

// 构建简单TLV（2字节值，大端序）
TLV ProtocolParser::buildTLV(uint8_t tag, uint16_t value) {
  vector<uint8_t> val = {static_cast<uint8_t>((value >> 8) & 0xFF),
                         static_cast<uint8_t>(value & 0xFF)};
  return {tag, 2, val};
}
