// 智能植物护理系统 - 状态管理器
import { MESSAGE_TYPES, SENSOR_TAGS, ACTUATOR_TAGS, ACTUATOR_STATES, ProtocolParser } from './protocol-parser.js';

/**
 * 状态管理器类
 * 负责管理设备状态、命令队列和事件通知
 */
export class StateManager {
  constructor() {
    // 传感器数据
    this.sensorData = {
      temperature: null,      // 温度 (°C)
      humidity: null,         // 湿度 (%)
      soilMoisture: null,     // 土壤湿度 (原始值 0-4095)
      lightIntensity: null,   // 光照强度 (Lux)
      timestamp: null         // 数据时间戳
    };
    
    // 执行器状态
    this.actuatorStatus = {
      fan: ACTUATOR_STATES.OFF,      // 风扇状态
      pump: ACTUATOR_STATES.OFF,      // 水泵状态
      light: ACTUATOR_STATES.OFF,     // 补光灯状态
      buzzer: ACTUATOR_STATES.OFF     // 蜂鸣器状态
    };
    
    // 命令队列
    this.commandQueue = [];
    
    // 最新命令确认
    this.latestAck = null;
    
    // 系统状态
    this.systemStatus = {
      uptimeSeconds: 0,              // 运行时间 (秒)
      wifi: {
        connected: false,            // Wi-Fi连接状态
        ip: null                     // IP地址
      },
      stm32ReportedIp: null          // STM32上报的IP地址
    };
    
    // 报警阈值
    this.thresholds = {
      temp: null,      // 温度阈值 (°C)
      humi: null,      // 湿度阈值 (%)
      soil: null,      // 土壤湿度阈值
      lux: null        // 光照强度阈值 (Lux)
    };
    
    // 报警状态
    this.alarm = {
      count: 0,          // 报警次数
      reason: null,      // 报警原因
      ageMs: null,       // 报警时间 (毫秒)
      cooldownMs: 0,     // 冷却时间 (毫秒)
      pulseMs: 0         // 蜂鸣器脉冲时长 (毫秒)
    };
    
    // 事件监听器映射
    this.listeners = new Map();
    
    // 消息日志
    this.messageLog = [];
    this.maxLogSize = 120;
  }

  /**
   * 注册事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        callback(data);
      });
    }
  }

  /**
   * 更新传感器数据
   * @param {Object} data - 传感器数据对象
   */
  updateSensorData(data) {
    const timestamp = Date.now();
    
    // 更新温度数据
    if (data[SENSOR_TAGS.TEMPERATURE] !== undefined) {
      this.sensorData.temperature = data[SENSOR_TAGS.TEMPERATURE] / 100; // 转换为摄氏度
    }
    
    // 更新湿度数据
    if (data[SENSOR_TAGS.HUMIDITY] !== undefined) {
      this.sensorData.humidity = data[SENSOR_TAGS.HUMIDITY] / 100; // 转换为百分比
    }
    
    // 更新土壤湿度数据
    if (data[SENSOR_TAGS.SOIL_MOISTURE] !== undefined) {
      this.sensorData.soilMoisture = data[SENSOR_TAGS.SOIL_MOISTURE]; // 原始值
    }
    
    // 更新光照强度数据
    if (data[SENSOR_TAGS.LIGHT_INTENSITY] !== undefined) {
      this.sensorData.lightIntensity = data[SENSOR_TAGS.LIGHT_INTENSITY]; // Lux
    }
    
    this.sensorData.timestamp = timestamp;
    
    // 检查报警条件
    this.checkAlarms();
    
    // 触发传感器数据更新事件
    this.emit('sensorDataUpdated', this.sensorData);
  }

  /**
   * 更新执行器状态
   * @param {Object} data - 执行器状态数据对象
   */
  updateActuatorStatus(data) {
    let updated = false;
    
    // 更新风扇状态
    if (data[ACTUATOR_TAGS.FAN] !== undefined) {
      this.actuatorStatus.fan = data[ACTUATOR_TAGS.FAN];
      updated = true;
    }
    
    // 更新水泵状态
    if (data[ACTUATOR_TAGS.PUMP] !== undefined) {
      this.actuatorStatus.pump = data[ACTUATOR_TAGS.PUMP];
      updated = true;
    }
    
    // 更新补光灯状态
    if (data[ACTUATOR_TAGS.LIGHT] !== undefined) {
      this.actuatorStatus.light = data[ACTUATOR_TAGS.LIGHT];
      updated = true;
    }
    
    // 更新蜂鸣器状态
    if (data[ACTUATOR_TAGS.BUZZER] !== undefined) {
      this.actuatorStatus.buzzer = data[ACTUATOR_TAGS.BUZZER];
      updated = true;
    }
    
    if (updated) {
      // 触发执行器状态更新事件
      this.emit('actuatorStatusUpdated', this.actuatorStatus);
    }
  }

  /**
   * 更新命令确认
   * @param {Object} data - 命令确认数据对象
   */
  updateCommandAck(data) {
    this.latestAck = {
      target: ProtocolParser.mapTagToTarget(Object.keys(data)[0]),
      result: data[Object.keys(data)[0]] === ACTUATOR_STATES.ON ? 'ok' : 'error',
      timestamp: Date.now(),
      ageMs: 0
    };
    
    // 触发命令确认更新事件
    this.emit('commandAckUpdated', this.latestAck);
  }

  /**
   * 更新系统状态
   * @param {Object} status - 系统状态数据对象
   */
  updateSystemStatus(status) {
    if (status.uptimeSeconds !== undefined) {
      this.systemStatus.uptimeSeconds = status.uptimeSeconds;
    }
    
    if (status.wifi) {
      this.systemStatus.wifi = { ...this.systemStatus.wifi, ...status.wifi };
    }
    
    if (status.stm32ReportedIp !== undefined) {
      this.systemStatus.stm32ReportedIp = status.stm32ReportedIp;
    }
    
    // 触发系统状态更新事件
    this.emit('systemStatusUpdated', this.systemStatus);
  }

  /**
   * 更新阈值设置
   * @param {Object} thresholds - 阈值设置对象
   */
  updateThresholds(thresholds) {
    this.thresholds = { ...this.thresholds, ...thresholds };
    
    // 检查报警条件
    this.checkAlarms();
    
    // 触发阈值更新事件
    this.emit('thresholdsUpdated', this.thresholds);
  }

  /**
   * 检查报警条件
   */
  checkAlarms() {
    const { temperature, humidity, soilMoisture, lightIntensity } = this.sensorData;
    const { temp, humi, soil, lux } = this.thresholds;
    
    const reasons = [];
    
    // 检查温度阈值
    if (temp !== null && temperature !== null && temperature > temp) {
      reasons.push(`温度超过上限 (${temperature.toFixed(1)}°C > ${temp}°C)`);
    }
    
    // 检查湿度阈值
    if (humi !== null && humidity !== null && humidity > humi) {
      reasons.push(`湿度超过上限 (${humidity.toFixed(1)}% > ${humi}%)`);
    }
    
    // 检查土壤湿度阈值
    if (soil !== null && soilMoisture !== null && soilMoisture > soil) {
      reasons.push(`土壤湿度超过上限 (${soilMoisture} > ${soil})`);
    }
    
    // 检查光照强度阈值
    if (lux !== null && lightIntensity !== null && lightIntensity > lux) {
      reasons.push(`光照超过上限 (${lightIntensity}lx > ${lux}lx)`);
    }
    
    // 如果有报警原因，更新报警状态
    if (reasons.length > 0) {
      this.alarm.count++;
      this.alarm.reason = reasons.join('; ');
      this.alarm.ageMs = 0;
      this.alarm.cooldownMs = 5000;
      this.alarm.pulseMs = 1000;
      
      // 触发报警更新事件
      this.emit('alarmUpdated', this.alarm);
    }
  }

  /**
   * 添加消息到日志
   * @param {string} message - 消息内容
   */
  addLogMessage(message) {
    this.messageLog.push(message);
    
    // 限制日志大小
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog.splice(0, this.messageLog.length - this.maxLogSize);
    }
    
    // 触发日志更新事件
    this.emit('logUpdated', this.messageLog);
  }

  /**
   * 获取系统状态
   * @returns {Object} 系统状态对象
   */
  getState() {
    return {
      sensorData: this.sensorData,
      actuatorStatus: this.actuatorStatus,
      latestAck: this.latestAck,
      systemStatus: this.systemStatus,
      thresholds: this.thresholds,
      alarm: this.alarm,
      messageLog: this.messageLog
    };
  }
}