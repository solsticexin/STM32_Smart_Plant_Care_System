// 智能植物护理系统 - 主应用文件
// 整合所有模块，初始化应用

import { StateManager } from './state-manager.js';
import { CommunicationManager } from './communication-manager.js';
import { UIUpdater } from './ui-updater.js';

/**
 * 智能植物护理系统主应用类
 */
class SmartPlantCareApp {
  constructor() {
    this.stateManager = null;
    this.commManager = null;
    this.uiUpdater = null;
    this.isInitialized = false;
  }

  /**
   * 初始化应用
   */
  init() {
    try {
      console.log('正在初始化智能植物护理系统...');
      
      // 初始化状态管理器
      this.stateManager = new StateManager();
      console.log('状态管理器已初始化');
      
      // 初始化通信管理器
      this.commManager = new CommunicationManager(this.stateManager);
      this.commManager.init();
      console.log('通信管理器已初始化');
      
      // 初始化UI更新器
      this.uiUpdater = new UIUpdater(this.stateManager, this.commManager);
      console.log('UI更新器已初始化');
      
      this.isInitialized = true;
      console.log('智能植物护理系统初始化完成');
    } catch (error) {
      console.error('初始化失败:', error);
      throw error;
    }
  }

  /**
   * 启动应用
   */
  start() {
    if (!this.isInitialized) {
      this.init();
    }
    
    console.log('智能植物护理系统已启动');
  }

  /**
   * 停止应用
   */
  stop() {
    if (this.commManager) {
      this.commManager.close();
    }
    
    this.isInitialized = false;
    console.log('智能植物护理系统已停止');
  }

  /**
   * 获取状态管理器
   * @returns {StateManager} 状态管理器实例
   */
  getStateManager() {
    return this.stateManager;
  }

  /**
   * 获取通信管理器
   * @returns {CommunicationManager} 通信管理器实例
   */
  getCommunicationManager() {
    return this.commManager;
  }

  /**
   * 获取UI更新器
   * @returns {UIUpdater} UI更新器实例
   */
  getUIUpdater() {
    return this.uiUpdater;
  }
}

// 创建应用实例
const app = new SmartPlantCareApp();

// 页面加载完成后启动应用
document.addEventListener('DOMContentLoaded', () => {
  app.start();
});

// 导出应用实例，便于调试和扩展
export { app, SmartPlantCareApp };