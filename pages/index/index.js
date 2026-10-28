// 首页：项目列表、搜索、快捷入口
const storage = require('../../utils/storage');
const util = require('../../utils/util');

Page({
  data: {
    keyword: '',
    totalCount: 0,
    projects: [],
    leftList: [],
    rightList: []
  },

  onShow() {
    // 从详情/编辑页返回时重新读取本地数据
    this.loadProjects();
  },

  /** 读取并加工项目数据 */
  loadProjects() {
    const raw = storage.getProjects();
    const list = raw.map((p) => {
      const prog = storage.calcProgress(p);
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        remark: p.remark || '',
        cover: p.cover || '',
        percent: prog.percent,
        doneCount: prog.done,
        stepCount: prog.total,
        finished: prog.total > 0 && prog.done === prog.total,
        dateText: util.formatDate(p.updatedAt),
        minutesText: prog.totalMinutes ? util.minutesText(prog.totalMinutes) : '未设时长'
      };
    });
    this.allProjects = list;
    this.setData({ totalCount: list.length });
    this.applyFilter();
  },

  /** 按关键词过滤并拆成两列 */
  applyFilter() {
    const kw = (this.data.keyword || '').trim().toLowerCase();
    let list = this.allProjects || [];
    if (kw) {
      list = list.filter((p) => {
        const text = (p.name + ' ' + p.type + ' ' + p.remark).toLowerCase();
        return text.indexOf(kw) > -1;
      });
    }
    const leftList = [];
    const rightList = [];
    list.forEach((p, i) => {
      if (i % 2 === 0) leftList.push(p);
      else rightList.push(p);
    });
    this.setData({ projects: list, leftList: leftList, rightList: rightList });
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value });
    this.applyFilter();
  },

  clearKeyword() {
    this.setData({ keyword: '' });
    this.applyFilter();
  },

  /** 打开项目详情 */
  openProject(e) {
    this.openProjectById(e.currentTarget.dataset.id);
  },

  openProjectById(id) {
    if (!id) return;
    wx.navigateTo({ url: '/pages/project-detail/project-detail?id=' + id });
  },

  /** 长按项目卡片：查看 / 分享导出 / 删除 */
  onLongPress(e) {
    const id = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['打开项目', '分享与导出', '删除项目'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.openProjectById(id);
        } else if (res.tapIndex === 1) {
          wx.navigateTo({ url: '/pages/share-export/share-export?id=' + id });
        } else if (res.tapIndex === 2) {
          this.removeProject(id);
        }
      }
    });
  },

  /** 删除项目并清理本地图片 */
  removeProject(id) {
    const project = storage.getProject(id);
    if (!project) return;
    wx.showModal({
      title: '删除项目',
      content: '将同时删除该项目全部工序与本地照片，且无法恢复。',
      confirmText: '删除',
      confirmColor: '#B9503A',
      success: (res) => {
        if (!res.confirm) return;
        util.removeLocalFiles(storage.collectProjectFiles(project));
        storage.deleteProject(id);
        util.toast('项目已删除');
        this.loadProjects();
      }
    });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/create-project/create-project' });
  },

  goMaterial() {
    wx.switchTab({ url: '/pages/material-lib/material-lib' });
  },

  goRepair() {
    wx.switchTab({ url: '/pages/repair-manual/repair-manual' });
  },

  /** 分享小程序卡片 */
  onShareAppMessage() {
    return {
      title: '模序 · 工业模型工序管理',
      path: '/pages/index/index'
    };
  }
});
