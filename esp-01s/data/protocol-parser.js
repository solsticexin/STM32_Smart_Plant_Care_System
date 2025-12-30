// 智能植物护理系统 - 协议解析器
// 基于二进制UART协议，采用SOF(0xAA) + LEN + TYPE + Payload(TLV) + CRC结构

// 消息类型定义
export const MESSAGE_TYPES = {
  SENSOR_REPORT: 0x01,
  ACTUATOR_STATUS: 0x02,
  COMMAND: 0x10,
  COMMAND_ACK: 0x11,
  HEARTBEAT: 0x20
};

// 传感器标签定义
export const SENSOR_TAGS = {
  SOIL_MOISTURE: 0x01,
  TEMPERATURE: 0x02,
  HUMIDITY: 0x03,
  LIGHT_INTENSITY: 0x04
};

// 执行器标签定义
export const ACTUATOR_TAGS = {
  FAN: 0x10,
  PUMP: 0x11,
  LIGHT: 0x12,
  BUZZER: 0x13
};

// 执行器状态定义
export const ACTUATOR_STATES = {
  OFF: 0x00,
  ON: 0x01
};

/**
 * 协议解析器类
 * 负责解析和构建符合通信协议的二进制帧
 */
export class ProtocolParser {
  /**
   * 计算异或校验值
   * @param {Array|Uint8Array} data - 待计算的数据
   * @returns {number} 异或校验值
   */
  static calculateCRC(data) {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
    }
    return crc & 0xFF;
  }

  /**
   * 解析TLV格式数据
   * @param {Array|Uint8Array} data - TLV数据
   * @returns {Object} 解析后的TLV数据对象
   */
  static parseTLV(data) {
    const result = {};
    let offset = 0;
    
    while (offset < data.length) {
      const tag = data[offset];
      const len = data[offset + 1];
      const valueBytes = data.slice(offset + 2, offset + 2 + len);
      
      let value;
      if (len === 1) {
        value = valueBytes[0];
      } else if (len === 2) {
        value = (valueBytes[0] << 8) | valueBytes[1];
      } else {
        // 暂不支持更长的数据
        value = valueBytes;
      }
      
      result[tag] = value;
      offset += 2 + len;
    }
    
    return result;
  }

  /**
   * 构建TLV格式数据
   * @param {Object} tlvData - TLV数据对象
   * @returns {Array} 构建后的TLV数据数组
   */
  static buildTLV(tlvData) {
    const result = [];
    
    for (const [tag, value] of Object.entries(tlvData)) {
      const tagNum = parseInt(tag);
      
      if (typeof value === 'number') {
        if (value <= 0xFF) {
          // 1字节数据
          result.push(tagNum, 0x01, value);
        } else if (value <= 0xFFFF) {
          // 2字节数据，大端序
          result.push(tagNum, 0x02, (value >> 8) & 0xFF, value & 0xFF);
        }
      }
    }
    
    return result;
  }

  /**
   * 解析完整的二进制帧
   * @param {Array|Uint8Array} rawData - 原始二进制数据
   * @returns {Object|null} 解析后的帧对象，解析失败返回null
   */
  static parseFrame(rawData) {
    const data = new Uint8Array(rawData);
    let frameStart = -1;
    
    // 寻找帧起始标志SOF(0xAA)
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0xAA) {
        frameStart = i;
        break;
      }
    }
    
    if (frameStart === -1) {
      return null; // 未找到帧起始
    }
    
    // 检查帧长度是否足够
    if (data.length < frameStart + 4) {
      return null; // 帧长度不足
    }
    
    const len = data[frameStart + 1];
    const totalFrameLength = 1 + 1 + 1 + len + 1; // SOF + LEN + TYPE + Payload + CRC
    
    if (data.length < frameStart + totalFrameLength) {
      return null; // 数据不完整
    }
    
    // 提取完整帧
    const frame = data.slice(frameStart, frameStart + totalFrameLength);
    
    // 计算CRC校验
    const crcData = frame.slice(0, totalFrameLength - 1);
    const calculatedCRC = ProtocolParser.calculateCRC(crcData);
    const receivedCRC = frame[totalFrameLength - 1];
    
    if (calculatedCRC !== receivedCRC) {
      return null; // CRC校验失败
    }
    
    const type = frame[2];
    const payload = frame.slice(3, 3 + len);
    const tlvData = ProtocolParser.parseTLV(payload);
    
    return {
      type,
      payload: tlvData,
      raw: frame
    };
  }

  /**
   * 构建完整的二进制帧
   * @param {number} type - 消息类型
   * @param {Object} tlvData - TLV数据对象
   * @returns {Uint8Array} 构建后的二进制帧
   */
  static buildFrame(type, tlvData) {
    const payload = ProtocolParser.buildTLV(tlvData);
    const len = payload.length;
    
    // 构建帧头
    const frame = [0xAA, len, type, ...payload];
    
    // 计算CRC
    const crc = ProtocolParser.calculateCRC(frame);
    frame.push(crc);
    
    return new Uint8Array(frame);
  }

  /**
   * 映射控制对象到标签
   * @param {string} target - 控制对象名称
   * @returns {number|null} 对应的标签值，映射失败返回null
   */
  static mapTargetToTag(target) {
    const targetMap = {
      'fan': ACTUATOR_TAGS.FAN,
      'water': ACTUATOR_TAGS.PUMP,
      'light': ACTUATOR_TAGS.LIGHT,
      'buzzer': ACTUATOR_TAGS.BUZZER
    };
    return targetMap[target] || null;
  }

  /**
   * 映射标签到控制对象
   * @param {number} tag - 标签值
   * @returns {string} 对应的控制对象名称
   */
  static mapTagToTarget(tag) {
    const tagMap = {
      [ACTUATOR_TAGS.FAN]: 'fan',
      [ACTUATOR_TAGS.PUMP]: 'pump',
      [ACTUATOR_TAGS.LIGHT]: 'light',
      [ACTUATOR_TAGS.BUZZER]: 'buzzer'
    };
    return tagMap[tag] || 'unknown';
  }
}