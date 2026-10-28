// 缺陷详情：静态数据展示
const tpl = require('../../utils/template');

Page({
  data: {
    defect: null
  },

  onLoad(options) {
    const defect = tpl.getDefect(options.id || '');
    this.setData({ defect: defect });
    if (defect) {
      wx.setNavigationBarTitle({ title: defect.name + ' · 修复' });
    }
  },

  goManual() {
    wx.navigateBack({
      fail() {
        wx.switchTab({ url: '/pages/repair-manual/repair-manual' });
      }
    });
  },

  goMaterial() {
    wx.switchTab({ url: '/pages/material-lib/material-lib' });
  },

  onShareAppMessage() {
    const d = this.data.defect;
    return {
      title: d ? '【模序】' + d.name + ' · 修复手册' : '模序 · 缺陷修复手册',
      path: '/pages/repair-manual/repair-manual'
    };
  }
});
