// 工序计时：纯前端倒计时（暂停 / 重置 / 完成）
const storage = require('../../utils/storage');
const util = require('../../utils/util');

Page({
  data: {
    name: '未命名工序',
    minutes: 25,
    total: 1500,
    left: 1500,
    timeText: '25:00',
    elapsedText: '00:00',
    percent: 0,
    status: 'ready',
    statusText: '准备就绪'
  },

  onLoad(options) {
    this.projectId = options.projectId || '';
    this.stepId = options.stepId || '';
    this.endAt = null;
    this.timer = null;

    let minutes = parseInt(options.minutes, 10);
    if (!minutes || minutes <= 0) minutes = 25;
    minutes = Math.min(minutes, 600);

    let name = '未命名工序';
    if (options.name) {
      try {
        name = decodeURIComponent(options.name);
      } catch (e) {
        name = options.name;
      }
    }

    const total = minutes * 60;
    this.setData({
      name: name,
      minutes: minutes,
      total: total,
      left: total,
      timeText: this.fmt(total),
      elapsedText: '00:00',
      percent: 0,
      status: 'ready',
      statusText: '准备就绪'
    });

    // 计时期间保持屏幕常亮
    wx.setKeepScreenOn({ keepScreenOn: true });
  },

  onShow() {
    // 从后台返回时按时间戳续算，避免倒计时漂移
    if (this.data.status === 'running') {
      if (!this.endAt) {
        this.endAt = Date.now() + this.data.left * 1000;
      }
      this.runTick();
    }
  },

  onHide() {
    this.clearTick();
  },

  onUnload() {
    this.clearTick();
    wx.setKeepScreenOn({ keepScreenOn: false });
  },

  /** 秒 -> mm:ss */
  fmt(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    return util.pad2(m) + ':' + util.pad2(s % 60);
  },

  clearTick() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  runTick() {
    this.clearTick();
    this.timer = setInterval(() => {
      this.tick();
    }, 500);
    this.tick();
  },

  /** 每一帧计算剩余时间 */
  tick() {
    if (!this.endAt) return;
    const left = Math.max(0, Math.round((this.endAt - Date.now()) / 1000));
    if (left <= 0) {
      this.finish(true);
      return;
    }
    const total = this.data.total;
    const elapsed = total - left;
    this.setData({
      left: left,
      timeText: this.fmt(left),
      elapsedText: this.fmt(elapsed),
      percent: Math.min(100, Math.round((elapsed / total) * 100))
    });
  },

  /** 开始 / 暂停 / 继续 */
  toggleStart() {
    const status = this.data.status;
    if (status === 'running') {
      this.pause();
      return;
    }
    if (status === 'finished') {
      this.reset();
    }
    this.start();
  },

  start() {
    const left = this.data.left > 0 ? this.data.left : this.data.total;
    this.endAt = Date.now() + left * 1000;
    this.setData({
      status: 'running',
      statusText: '计时中'
    });
    this.runTick();
  },

  pause() {
    if (!this.endAt) return;
    const left = Math.max(0, Math.round((this.endAt - Date.now()) / 1000));
    this.clearTick();
    this.endAt = null;
    const total = this.data.total;
    this.setData({
      left: left,
      timeText: this.fmt(left),
      percent: Math.min(100, Math.round(((total - left) / total) * 100)),
      status: 'paused',
      statusText: '已暂停'
    });
  },

  /** 重置倒计时 */
  reset() {
    this.clearTick();
    this.endAt = null;
    const total = this.data.total;
    this.setData({
      left: total,
      timeText: this.fmt(total),
      elapsedText: '00:00',
      percent: 0,
      status: 'ready',
      statusText: '准备就绪'
    });
  },

  /** 手动完成 */
  complete() {
    this.finish(false);
  },

  /**
   * 结束计时
   * @param {boolean} auto true 表示自然到点
   */
  finish(auto) {
    const elapsed = this.data.total - this.data.left;
    this.clearTick();
    this.endAt = null;
    this.setData({
      left: 0,
      timeText: '00:00',
      elapsedText: this.fmt(elapsed),
      percent: 100,
      status: 'finished',
      statusText: auto ? '时间到' : '已完成'
    });

    wx.vibrateLong();
    this.askMarkDone(auto);
  },

  /** 询问是否标记工序完成，写入本地 Storage */
  askMarkDone(auto) {
    if (!this.projectId || !this.stepId) return;
    const that = this;
    setTimeout(() => {
      wx.showModal({
        title: auto ? '时间到' : '计时结束',
        content: '是否将「' + that.data.name + '」标记为已完成？',
        confirmText: '标记完成',
        cancelText: '暂不',
        confirmColor: '#E27B48',
        success(res) {
          if (res.confirm) {
            storage.toggleStep(that.projectId, that.stepId, true);
            util.toast('已标记完成');
          }
        }
      });
    }, 360);
  },

  backProject() {
    wx.navigateBack({
      fail() {
        wx.switchTab({ url: '/pages/index/index' });
      }
    });
  }
});
