// app.js —— 模序 · 工业模型手工制作辅助小程序
// 说明：无后端、无网络请求，全部数据落在本机 Storage 与本地文件系统
const storage = require('./utils/storage');
const tpl = require('./utils/template');

App({
  globalData: {
    version: '1.0.0',
    appName: '模序'
  },

  onLaunch() {
    // 首次启动写入示例项目，便于直接体验；可在「项目详情 - 更多」中删除
    this.seedDemoData();
  },

  /**
   * 首次启动示例数据
   * 仅在从未初始化过且项目为空时写入，不会覆盖用户已有数据
   */
  seedDemoData() {
    const SEED_FLAG = 'mx_seeded';
    if (wx.getStorageSync(SEED_FLAG)) return;

    if (storage.getProjects().length > 0) {
      wx.setStorageSync(SEED_FLAG, true);
      return;
    }

    const templateA = tpl.getTemplate('clay');
    const templateB = tpl.getTemplate('resin');

    // 示例项目一：油泥手板，已完成前两道工序
    const p1 = storage.createProject({
      name: '示例 · 油泥手板灯罩',
      type: '油泥模型',
      remark: '1:1 灯罩手板，周五前完成粗磨。示例数据，可直接删除。',
      steps: templateA.steps
    });
    if (p1 && p1.steps[0]) storage.toggleStep(p1.id, p1.steps[0].id, true);
    if (p1 && p1.steps[1]) storage.toggleStep(p1.id, p1.steps[1].id, true);

    // 示例项目二：树脂后处理，已完成前三道工序
    const p2 = storage.createProject({
      name: '示例 · 树脂件后处理',
      type: '3D打印后处理',
      remark: '光敏树脂外壳，已完成清洗与固化。示例数据，可直接删除。',
      steps: templateB.steps
    });
    if (p2) {
      [0, 1, 2].forEach((i) => {
        if (p2.steps[i]) storage.toggleStep(p2.id, p2.steps[i].id, true);
      });
    }

    wx.setStorageSync(SEED_FLAG, true);
  }
});
