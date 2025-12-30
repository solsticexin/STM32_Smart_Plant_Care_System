// 智能植物护理系统 - UI更新器
import { ElementManager, formatDuration, formatAge, formatSwitchState, showError } from './utils.js';

/**
 * UI更新器类
 * 负责处理页面数据的更新和事件绑定
 */
export class UIUpdater {
  /**
   * 构造函数
   * @param {StateManager} stateManager - 状态管理器实例
   * @param {CommunicationManager} commManager - 通信管理器实例
   */
  constructor(stateManager, commManager) {
    this.stateManager = stateManager;
    this.commManager = commManager;
    this.elementManager = new ElementManager();
    
    // 绑定事件监听器
    this.bindEventListeners();
    
    // 初始化UI
    this.initUI();
  }

  /**
   * 绑定事件监听器
   */
  bindEventListeners() {
    // 命令表单提交事件
    const commandForm = this.elementManager.get('commandForm');
    if (commandForm) {
      commandForm.addEventListener('submit', (event) => this.handleCommandSubmit(event));
    }
    
    // 命令动作变化事件
    const commandAction = this.elementManager.get('commandAction');
    if (commandAction) {
      commandAction.addEventListener('change', () => this.handleActionChange());
    }
    
    // 阈值表单提交事件
    const thresholdForm = this.elementManager.get('thresholdForm');
    if (thresholdForm) {
      thresholdForm.addEventListener('submit', (event) => this.handleThresholdSubmit(event));
    }
    
    // 状态管理器事件
    this.stateManager.on('sensorDataUpdated', () => this.updateSensorView());
    this.stateManager.on('actuatorStatusUpdated', () => this.updateSensorView());
    this.stateManager.on('commandAckUpdated', (latestAck) => this.updateAckView(latestAck));
    this.stateManager.on('systemStatusUpdated', (status) => this.updateStatusView(status));
  }

  /**
   * 初始化UI
   */
  initUI() {
    this.handleActionChange();
    this.updateStatusView(this.stateManager.getState().systemStatus);
    this.updateSensorView();
    this.updateAckView(null);
  }

  /**
   * 更新传感器数据显示
   */
  updateSensorView() {
    const { sensorData, actuatorStatus } = this.stateManager.getState();
    const ageMs = sensorData.timestamp ? Date.now() - sensorData.timestamp : null;
    
    // 更新传感器提示
    const sensorHint = this.elementManager.get('sensorHint');
    if (sensorHint) {
      sensorHint.hidden = true;
    }
    
    // 更新温度显示
    const tempValue = this.elementManager.get('tempValue');
    if (tempValue) {
      tempValue.textContent = sensorData.temperature !== null ? `${sensorData.temperature.toFixed(1)} ℃` : '--';
    }
    
    // 更新湿度显示
    const humiValue = this.elementManager.get('humiValue');
    if (humiValue) {
      humiValue.textContent = sensorData.humidity !== null ? `${sensorData.humidity.toFixed(1)} %` : '--';
    }
    
    // 更新土壤湿度显示
    const soilValue = this.elementManager.get('soilValue');
    if (soilValue) {
      soilValue.textContent = sensorData.soilMoisture !== null ? `${sensorData.soilMoisture}` : '--';
    }
    
    // 更新光照强度显示
    const luxValue = this.elementManager.get('luxValue');
    if (luxValue) {
      luxValue.textContent = sensorData.lightIntensity !== null ? `${sensorData.lightIntensity} lx` : '--';
    }
    
    // 更新执行器状态显示
    const waterValue = this.elementManager.get('waterValue');
    if (waterValue) {
      waterValue.textContent = formatSwitchState(actuatorStatus.pump);
    }
    
    const lightValue = this.elementManager.get('lightValue');
    if (lightValue) {
      lightValue.textContent = formatSwitchState(actuatorStatus.light);
    }
    
    const fanValue = this.elementManager.get('fanValue');
    if (fanValue) {
      fanValue.textContent = formatSwitchState(actuatorStatus.fan);
    }
    
    const buzzerValue = this.elementManager.get('buzzerValue');
    if (buzzerValue) {
      buzzerValue.textContent = formatSwitchState(actuatorStatus.buzzer);
    }
    
    // 更新数据年龄显示
    const dataAge = this.elementManager.get('dataAge');
    if (dataAge) {
      dataAge.textContent = formatAge(ageMs);
    }
  }

  /**
   * 更新命令确认显示
   * @param {Object|null} latestAck - 最新命令确认数据
   */
  updateAckView(latestAck) {
    const ackCard = this.elementManager.get('ackCard');
    if (!ackCard) return;
    
    if (!latestAck) {
      ackCard.classList.remove('ok');
      ackCard.textContent = '尚未收到回执。';
      return;
    }
    
    const ageMs = Date.now() - latestAck.timestamp;
    ackCard.classList.toggle('ok', latestAck.result === 'ok');
    ackCard.innerHTML = `
      <strong>目标：</strong>${latestAck.target}<br>
      <strong>结果：</strong>${latestAck.result === 'ok' ? '成功' : '失败'}<br>
      <strong>延迟：</strong>${formatAge(ageMs)}
    `;
  }

  /**
   * 更新系统状态显示
   * @param {Object} status - 系统状态数据
   */
  updateStatusView(status) {
    // 更新Wi-Fi状态
    const wifiStatus = this.elementManager.get('wifiStatus');
    if (wifiStatus) {
      wifiStatus.textContent = status.wifi.connected ? '已连接' : '未连接';
    }
    
    // 更新ESP IP
    const espIp = this.elementManager.get('espIp');
    if (espIp) {
      espIp.textContent = status.wifi.ip || '未知';
    }
    
    // 更新STM32报告的IP
    const stm32Ip = this.elementManager.get('stm32Ip');
    if (stm32Ip) {
      stm32Ip.textContent = status.stm32ReportedIp || '未上报';
    }
    
    // 更新运行时间
    const uptime = this.elementManager.get('uptime');
    if (uptime) {
      uptime.textContent = formatDuration(status.uptimeSeconds);
    }
  }

  /**
   * 处理命令表单提交
   * @param {Event} event - 表单提交事件
   */
  handleCommandSubmit(event) {
    event.preventDefault();
    
    const commandTarget = this.elementManager.get('commandTarget');
    const commandAction = this.elementManager.get('commandAction');
    const commandTime = this.elementManager.get('commandTime');
    const commandHint = this.elementManager.get('commandHint');
    
    if (!commandTarget || !commandAction) {
      showError('命令表单元素缺失');
      return;
    }
    
    const target = commandTarget.value;
    const action = commandAction.value;
    let time = null;
    
    if (action === 'pulse' && commandTime) {
      time = Number(commandTime.value);
      if (Number.isNaN(time) || time <= 0) {
        showError('脉冲时长必须为正数');
        return;
      }
    }
    
    try {
      const success = this.commManager.sendCommand(target, action, time);
      if (success) {
        if (commandHint) {
          commandHint.textContent = `命令已发送：${target} ${action}${time ? ` (${time}ms)` : ''}`;
        }
      } else {
        showError('命令发送失败');
      }
    } catch (error) {
      showError(`命令发送失败：${error.message}`);
    }
  }

  /**
   * 处理命令动作变化
   */
  handleActionChange() {
    const commandAction = this.elementManager.get('commandAction');
    const timeWrapper = this.elementManager.get('timeWrapper');
    
    if (!commandAction || !timeWrapper) return;
    
    const isPulse = commandAction.value === 'pulse';
    timeWrapper.hidden = !isPulse;
  }

  /**
   * 处理阈值表单提交
   * @param {Event} event - 表单提交事件
   */
  handleThresholdSubmit(event) {
    event.preventDefault();
    
    const thresholdTemp = this.elementManager.get('thresholdTemp');
    const thresholdHumi = this.elementManager.get('thresholdHumi');
    const thresholdSoil = this.elementManager.get('thresholdSoil');
    const thresholdLux = this.elementManager.get('thresholdLux');
    const thresholdHint = this.elementManager.get('thresholdHint');
    
    // 读取输入值
    const readInput = (input, label) => {
      if (!input) return null;
      
      const raw = input.value.trim();
      if (raw === '') {
        return null;
      }
      
      const numeric = Number(raw);
      if (Number.isNaN(numeric)) {
        throw new Error(`${label} 请输入数字`);
      }
      
      return numeric;
    };
    
    try {
      const thresholds = {
        temp: readInput(thresholdTemp, '温度阈值'),
        humi: readInput(thresholdHumi, '湿度阈值'),
        soil: readInput(thresholdSoil, '土壤阈值'),
        lux: readInput(thresholdLux, '光照阈值'),
      };
      
      this.stateManager.updateThresholds(thresholds);
      
      if (thresholdHint) {
        thresholdHint.textContent = '阈值已更新。';
        setTimeout(() => {
          thresholdHint.textContent = '留空表示禁用，超限时将触发蜂鸣报警。';
        }, 4000);
      }
    } catch (error) {
      showError(`阈值更新失败：${error.message}`);
    }
  }
}