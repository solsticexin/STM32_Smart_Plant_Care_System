// 智能植物护理系统 - 工具函数

/**
 * 格式化时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时长字符串
 */
export function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds} 秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes} 分 ${remainingSeconds} 秒`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return `${hours} 小时 ${remainingMinutes} 分`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} 天 ${remainingHours} 小时`;
}

/**
 * 格式化数据年龄
 * @param {number} ageMs - 毫秒数
 * @returns {string} 格式化后的年龄字符串
 */
export function formatAge(ageMs) {
  if (typeof ageMs !== 'number' || Number.isNaN(ageMs)) {
    return '--';
  }
  if (ageMs < 1000) {
    return `${ageMs} ms`;
  }
  const seconds = Math.floor(ageMs / 1000);
  return `${seconds} 秒前`;
}

/**
 * 格式化开关状态
 * @param {number} value - 状态值 (0x00 或 0x01)
 * @returns {string} 格式化后的状态字符串
 */
export function formatSwitchState(value) {
  if (value === 0x01) {
    return '开启';
  }
  if (value === 0x00) {
    return '关闭';
  }
  return '--';
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
export function showError(message) {
  const errorElement = document.getElementById('global-error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.hidden = false;
    setTimeout(() => {
      errorElement.hidden = true;
    }, 5000);
  }
}

/**
 * DOM元素引用管理器
 */
export class ElementManager {
  constructor() {
    this.elements = {
      // 网络状态
      wifiStatus: document.getElementById('wifi-status'),
      espIp: document.getElementById('ip-address'),
      stm32Ip: document.getElementById('stm32-ip'),
      uptime: document.getElementById('uptime'),
      
      // 传感器数据
      sensorHint: document.getElementById('sensor-hint'),
      tempValue: document.getElementById('temp-value'),
      humiValue: document.getElementById('humi-value'),
      soilValue: document.getElementById('soil-value'),
      luxValue: document.getElementById('lux-value'),
      
      // 执行器状态
      waterValue: document.getElementById('water-value'),
      lightValue: document.getElementById('light-value'),
      fanValue: document.getElementById('fan-value'),
      buzzerValue: document.getElementById('buzzer-value'),
      dataAge: document.getElementById('data-age'),
      
      // 命令和确认
      ackCard: document.getElementById('ack-card'),
      commandForm: document.getElementById('command-form'),
      commandTarget: document.getElementById('command-target'),
      commandAction: document.getElementById('command-action'),
      commandTime: document.getElementById('command-time'),
      timeWrapper: document.getElementById('time-wrapper'),
      commandHint: document.getElementById('command-hint'),
      
      // 全局错误
      globalError: document.getElementById('global-error'),
      
      // 阈值设置
      thresholdForm: document.getElementById('threshold-form'),
      thresholdTemp: document.getElementById('threshold-temp'),
      thresholdHumi: document.getElementById('threshold-humi'),
      thresholdSoil: document.getElementById('threshold-soil'),
      thresholdLux: document.getElementById('threshold-lux'),
      thresholdHint: document.getElementById('threshold-hint'),
      alarmStatus: document.getElementById('alarm-status'),
      
      // 消息日志
      messageLog: document.getElementById('message-log')
    };
  }
  
  /**
   * 获取DOM元素
   * @param {string} key - 元素键名
   * @returns {HTMLElement|null} DOM元素或null
   */
  get(key) {
    return this.elements[key] || null;
  }
}