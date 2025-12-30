// 智能植物护理系统 - 通信管理器
import { MESSAGE_TYPES, ACTUATOR_STATES, ProtocolParser } from './protocol-parser.js';
import { SENSOR_TAGS, ACTUATOR_TAGS } from './protocol-parser.js';

/**
 * 通信管理器类
 * 负责处理数据的接收和发送
 */
export class CommunicationManager {
  /**
   * 构造函数
   * @param {StateManager} stateManager - 状态管理器实例
   */
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.socket = null;
    this.buffer = new Uint8Array(0);
    this.isConnected = false;
    
    // 模拟数据相关
    this.simulationInterval = null;
    this.simulationEnabled = true;
  }

  /**
   * 初始化通信
   */
  init() {
    // 实际项目中应连接到WebSocket或串口
    // 这里使用模拟数据进行测试
    this.startSimulation();
    this.isConnected = true;
    
    // 模拟系统状态更新
    this.stateManager.updateSystemStatus({
      wifi: {
        connected: true,
        ip: '192.168.1.100'
      }
    });
    
    console.log('通信管理器已初始化');
  }

  /**
   * 开始模拟数据
   */
  startSimulation() {
    if (!this.simulationEnabled) return;
    
    // 停止已有模拟
    this.stopSimulation();
    
    // 模拟传感器数据上报
    this.simulationInterval = setInterval(() => {
      this.simulateSensorData();
      this.simulateActuatorStatus();
    }, 2000);
    
    console.log('模拟数据已开始');
  }

  /**
   * 停止模拟数据
   */
  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
      console.log('模拟数据已停止');
    }
  }

  /**
   * 模拟传感器数据
   */
  simulateSensorData() {
    // 生成随机传感器数据
    const temp = Math.round((20 + Math.random() * 10) * 100); // 20-30°C
    const humi = Math.round((40 + Math.random() * 30) * 100); // 40-70%
    const soil = Math.round(Math.random() * 4095); // 0-4095
    const light = Math.round(Math.random() * 10000); // 0-10000lx
    
    // 构建TLV数据
    const tlvData = {
      [SENSOR_TAGS.TEMPERATURE]: temp,
      [SENSOR_TAGS.HUMIDITY]: humi,
      [SENSOR_TAGS.SOIL_MOISTURE]: soil,
      [SENSOR_TAGS.LIGHT_INTENSITY]: light
    };
    
    // 构建帧
    const frame = ProtocolParser.buildFrame(MESSAGE_TYPES.SENSOR_REPORT, tlvData);
    
    // 处理模拟数据
    this.receiveData(frame);
  }

  /**
   * 模拟执行器状态
   */
  simulateActuatorStatus() {
    // 随机模拟执行器状态变化（10%概率）
    if (Math.random() < 0.1) {
      const tags = [ACTUATOR_TAGS.FAN, ACTUATOR_TAGS.PUMP, ACTUATOR_TAGS.LIGHT, ACTUATOR_TAGS.BUZZER];
      const tag = tags[Math.floor(Math.random() * tags.length)];
      const state = Math.random() > 0.5 ? ACTUATOR_STATES.ON : ACTUATOR_STATES.OFF;
      
      // 构建TLV数据
      const tlvData = {
        [tag]: state
      };
      
      // 构建帧
      const frame = ProtocolParser.buildFrame(MESSAGE_TYPES.ACTUATOR_STATUS, tlvData);
      
      // 处理模拟数据
      this.receiveData(frame);
    }
  }

  /**
   * 接收数据
   * @param {Array|Uint8Array} data - 接收到的数据
   */
  receiveData(data) {
    // 将新数据添加到缓冲区
    const newBuffer = new Uint8Array(this.buffer.length + data.length);
    newBuffer.set(this.buffer);
    newBuffer.set(data, this.buffer.length);
    this.buffer = newBuffer;
    
    // 尝试解析帧
    let frame;
    while ((frame = ProtocolParser.parseFrame(this.buffer)) !== null) {
      this.processFrame(frame);
      // 移除已解析的帧数据
      this.buffer = this.buffer.slice(frame.raw.length);
    }
  }

  /**
   * 处理解析后的帧
   * @param {Object} frame - 解析后的帧对象
   */
  processFrame(frame) {
    switch (frame.type) {
      case MESSAGE_TYPES.SENSOR_REPORT:
        // 更新传感器数据
        this.stateManager.updateSensorData(frame.payload);
        break;
      
      case MESSAGE_TYPES.ACTUATOR_STATUS:
        // 更新执行器状态
        this.stateManager.updateActuatorStatus(frame.payload);
        break;
      
      case MESSAGE_TYPES.COMMAND_ACK:
        // 更新命令确认
        this.stateManager.updateCommandAck(frame.payload);
        break;
      
      case MESSAGE_TYPES.HEARTBEAT:
        // 处理心跳包
        // 这里可以更新系统运行时间等
        break;
      
      default:
        console.warn('未知消息类型:', frame.type);
    }
  }

  /**
   * 发送命令
   * @param {string} target - 控制对象
   * @param {string} action - 动作类型（on/off/pulse）
   * @param {number|null} time - 脉冲时长（毫秒），仅在action为pulse时有效
   * @returns {boolean} 是否发送成功
   */
  sendCommand(target, action, time = null) {
    const tag = ProtocolParser.mapTargetToTag(target);
    if (!tag) {
      console.error('无效的控制对象:', target);
      return false;
    }
    
    const tlvData = {};
    
    if (action === 'on') {
      tlvData[tag] = ACTUATOR_STATES.ON;
    } else if (action === 'off') {
      tlvData[tag] = ACTUATOR_STATES.OFF;
    } else if (action === 'pulse' && time) {
      tlvData[tag] = time; // 脉冲时长，毫秒
    } else {
      console.error('无效的动作类型:', action);
      return false;
    }
    
    // 构建命令帧
    const frame = ProtocolParser.buildFrame(MESSAGE_TYPES.COMMAND, tlvData);
    
    // 实际项目中应发送到WebSocket或串口
    // 这里模拟发送并立即返回确认
    console.log('发送命令:', frame);
    
    // 模拟命令确认
    setTimeout(() => {
      const ackFrame = ProtocolParser.buildFrame(MESSAGE_TYPES.COMMAND_ACK, tlvData);
      this.receiveData(ackFrame);
    }, 100);
    
    return true;
  }

  /**
   * 关闭通信
   */
  close() {
    this.stopSimulation();
    this.isConnected = false;
    
    // 更新系统状态
    this.stateManager.updateSystemStatus({
      wifi: {
        connected: false
      }
    });
    
    console.log('通信管理器已关闭');
  }

  /**
   * 获取连接状态
   * @returns {boolean} 连接状态
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}