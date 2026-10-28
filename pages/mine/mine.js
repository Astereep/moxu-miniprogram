// 我的：本地数据统计、说明与清空
const storage = require('../../utils/storage');
const util = require('../../utils/util');
const tpl = require('../../utils/template');

Page({
  data: {
    version: '1.0.0',
    projectCount: 0,
    stepCount: 0,
    doneCount: 0,
    donePercent: 0,
    storageSize: '0 KB',
    builtin: {
      templates: tpl.TEMPLATES.length - 1,
      materials: tpl.MATERIALS.length,
      defects: tpl.DEFECTS.length
    },
    localNotes: [
      '项目、工序、备注全部保存在本机 Storage，不上传服务器，也不发起网络请求。',
      '封面与现场照片保存在本机小程序沙盒，删除项目或照片时会同步清理对应文件。',
      '卸载小程序或清理微信存储会导致数据丢失，重要工序建议生成长图备份。',
      '无需登录、无需授权手机号，打开即用，换设备不会同步数据。'
    ]
  },

  onShow() {
    this.refreshStats();
  },

  /** 统计项目 / 工序 / 本地占用 */
  refreshStats() {
    const projects = storage.getProjects();
    let stepCount = 0;
    let doneCount = 0;
    projects.forEach((p) => {
      const prog = storage.calcProgress(p);
      stepCount += prog.total;
      doneCount += prog.done;
    });

    let sizeText = '0 KB';
    try {
      const info = wx.getStorageInfoSync();
      const kb = info.currentSize || 0;
      sizeText = kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
    } catch (e) {
      sizeText = '未知';
    }

    this.setData({
      projectCount: projects.length,
      stepCount: stepCount,
      doneCount: doneCount,
      donePercent: stepCount ? Math.round((doneCount / stepCount) * 100) : 0,
      storageSize: sizeText
    });
  },

  /** 清空全部本地数据（含图片文件） */
  clearAll() {
    if (!this.data.projectCount) {
      util.toast('当前没有本地数据');
      return;
    }
    wx.showModal({
      title: '清空全部数据',
      content: '将删除全部项目、工序、备注与本地照片，且无法恢复。建议先生成工序清单长图备份。',
      confirmText: '确认清空',
      confirmColor: '#B9503A',
      success: (res) => {
        if (!res.confirm) return;
        const projects = storage.getProjects();
        projects.forEach((p) => {
          util.removeLocalFiles(storage.collectProjectFiles(p));
        });
        wx.removeStorageSync(storage.KEY);
        util.toast('本地数据已清空');
        this.refreshStats();
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '模序 · 工业模型工序管理',
      path: '/pages/index/index'
    };
  }
});
