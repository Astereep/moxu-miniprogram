// 项目详情：进度统计、工序打卡、模板导入、进入计时
const storage = require('../../utils/storage');
const util = require('../../utils/util');
const tpl = require('../../utils/template');

Page({
  data: {
    project: null,
    percent: 0,
    doneCount: 0,
    stepCount: 0,
    totalMinutesText: '未设置'
  },

  onLoad(options) {
    this.projectId = options.id || '';
    if (options.isNew) {
      util.toast('项目已创建');
    }
  },

  onShow() {
    // 每次显示都从 Storage 重新读取，保证编辑后的数据同步
    this.loadProject();
  },

  /** 读取项目并计算展示字段 */
  loadProject() {
    const project = storage.getProject(this.projectId);
    if (!project) {
      this.setData({ project: null });
      return;
    }
    const prog = storage.calcProgress(project);
    const steps = project.steps.map((s, i) => ({
      id: s.id,
      name: s.name,
      desc: s.desc || '',
      minutes: s.minutes || 0,
      done: !!s.done,
      doneAt: s.doneAt || '',
      photos: s.photos || [],
      note: s.note || '',
      no: util.pad2(i + 1),
      minutesText: util.minutesText(s.minutes),
      photoCount: (s.photos || []).length,
      doneText: s.doneAt ? util.formatDateTime(s.doneAt) : ''
    }));

    this.setData({
      project: {
        id: project.id,
        name: project.name,
        type: project.type,
        remark: project.remark || '',
        cover: project.cover || '',
        steps: steps
      },
      percent: prog.percent,
      doneCount: prog.done,
      stepCount: prog.total,
      totalMinutesText: prog.totalMinutes ? util.minutesText(prog.totalMinutes) : '未设置'
    });
  },

  /** 勾选 / 取消工序完成 */
  toggleStep(e) {
    const id = e.currentTarget.dataset.id;
    const step = (this.data.project.steps || []).filter((s) => s.id === id)[0];
    if (!step) return;
    storage.toggleStep(this.projectId, id, !step.done);
    if (!step.done) {
      wx.vibrateShort({ type: 'light' });
      util.toast('已记录完成');
    }
    this.loadProject();
  },

  /** 点击工序进入编辑 */
  editStep(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/edit-step/edit-step?projectId=' + this.projectId + '&stepId=' + id
    });
  },

  addStep() {
    wx.navigateTo({
      url: '/pages/edit-step/edit-step?projectId=' + this.projectId
    });
  },

  /** 进入计时页，带入建议时长 */
  goTimer(e) {
    const id = e.currentTarget.dataset.id;
    const step = (this.data.project.steps || []).filter((s) => s.id === id)[0];
    if (!step) return;
    const minutes = step.minutes || 25;
    wx.navigateTo({
      url:
        '/pages/timer/timer?projectId=' + this.projectId +
        '&stepId=' + id +
        '&minutes=' + minutes +
        '&name=' + encodeURIComponent(step.name)
    });
  },

  /** 工序长按菜单 */
  stepLongPress(e) {
    const id = e.currentTarget.dataset.id;
    const step = (this.data.project.steps || []).filter((s) => s.id === id)[0];
    if (!step) return;
    const items = ['编辑工序', '工序计时', step.done ? '取消完成' : '标记完成', '删除工序'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.navigateTo({
            url: '/pages/edit-step/edit-step?projectId=' + this.projectId + '&stepId=' + id
          });
        } else if (res.tapIndex === 1) {
          wx.navigateTo({
            url:
              '/pages/timer/timer?projectId=' + this.projectId +
              '&stepId=' + id +
              '&minutes=' + (step.minutes || 25) +
              '&name=' + encodeURIComponent(step.name)
          });
        } else if (res.tapIndex === 2) {
          storage.toggleStep(this.projectId, id, !step.done);
          this.loadProject();
        } else if (res.tapIndex === 3) {
          this.removeStep(id, step.name);
        }
      }
    });
  },

  /** 删除工序 */
  removeStep(id, name) {
    wx.showModal({
      title: '删除工序',
      content: '确认删除「' + name + '」？现场照片也会一并清理。',
      confirmText: '删除',
      confirmColor: '#B9503A',
      success: (res) => {
        if (!res.confirm) return;
        const photos = storage.deleteStep(this.projectId, id);
        util.removeLocalFiles(photos);
        util.toast('工序已删除');
        this.loadProject();
      }
    });
  },

  /** 导入标准模板（追加到当前项目） */
  importTemplate() {
    const available = tpl.TEMPLATES.filter((t) => t.key !== 'none');
    wx.showActionSheet({
      itemList: available.map((t) => t.name + '（' + t.steps.length + ' 道）'),
      success: (res) => {
        const target = available[res.tapIndex];
        if (!target) return;
        wx.showModal({
          title: '导入工序模板',
          content: '将向当前项目追加「' + target.name + '」的 ' + target.steps.length + ' 道工序。',
          confirmText: '导入',
          success: (r) => {
            if (!r.confirm) return;
            storage.appendSteps(this.projectId, target.steps);
            util.toast('模板已导入');
            this.loadProject();
          }
        });
      }
    });
  },

  /** 项目更多操作 */
  onMore() {
    wx.showActionSheet({
      itemList: ['导入工序模板', '分享与导出', '删除项目'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.importTemplate();
        } else if (res.tapIndex === 1) {
          this.goShare();
        } else if (res.tapIndex === 2) {
          this.removeProject();
        }
      }
    });
  },

  /** 删除项目 */
  removeProject() {
    const project = storage.getProject(this.projectId);
    if (!project) return;
    wx.showModal({
      title: '删除项目',
      content: '将删除项目、全部工序与本地照片，无法恢复。',
      confirmText: '删除',
      confirmColor: '#B9503A',
      success: (res) => {
        if (!res.confirm) return;
        util.removeLocalFiles(storage.collectProjectFiles(project));
        storage.deleteProject(this.projectId);
        util.toast('项目已删除');
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 400);
      }
    });
  },

  goShare() {
    wx.navigateTo({
      url: '/pages/share-export/share-export?id=' + this.projectId
    });
  },

  backHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onShareAppMessage() {
    const p = this.data.project;
    return {
      title: p ? '【模序】' + p.name + ' · 工序清单' : '模序 · 工序管理',
      path: '/pages/index/index'
    };
  }
});
