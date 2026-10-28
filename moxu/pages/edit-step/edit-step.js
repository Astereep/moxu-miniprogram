// 工序编辑：保存名称/说明/时长/现场照片/备注
const storage = require('../../utils/storage');
const util = require('../../utils/util');

Page({
  data: {
    projectName: '',
    isEdit: false,
    name: '',
    desc: '',
    minutes: '',
    photos: [],
    note: '',
    saving: false
  },

  onLoad(options) {
    this.projectId = options.projectId || '';
    this.stepId = options.stepId || '';
    this.addedPhotos = [];
    this.removedPhotos = [];
    this.saved = false;

    const project = storage.getProject(this.projectId);
    if (!project) {
      util.toast('项目不存在');
      setTimeout(() => wx.navigateBack(), 600);
      return;
    }

    if (this.stepId) {
      const step = project.steps.filter((s) => s.id === this.stepId)[0];
      if (!step) {
        util.toast('工序不存在');
        setTimeout(() => wx.navigateBack(), 600);
        return;
      }
      this.setData({
        projectName: project.name,
        isEdit: true,
        name: step.name,
        desc: step.desc || '',
        minutes: step.minutes ? String(step.minutes) : '',
        photos: step.photos || [],
        note: step.note || ''
      });
    } else {
      this.setData({
        projectName: project.name,
        minutes: '30'
      });
    }
  },

  onName(e) {
    this.setData({ name: e.detail.value });
  },

  onDesc(e) {
    this.setData({ desc: e.detail.value });
  },

  onMinutes(e) {
    this.setData({ minutes: e.detail.value });
  },

  onNote(e) {
    this.setData({ note: e.detail.value });
  },

  /** 选择并保存现场照片（本地） */
  choosePhotos() {
    const remain = 6 - this.data.photos.length;
    if (remain <= 0) {
      util.toast('最多上传 6 张照片');
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tasks = (res.tempFiles || []).map((f) => util.saveLocalImage(f.tempFilePath));
        Promise.all(tasks).then((saved) => {
          const list = saved.filter((p) => !!p);
          this.addedPhotos = this.addedPhotos.concat(list);
          this.setData({ photos: this.data.photos.concat(list) });
        });
      }
    });
  },

  /** 预览照片 */
  previewPhoto(e) {
    const index = Number(e.currentTarget.dataset.index);
    wx.previewImage({
      current: this.data.photos[index],
      urls: this.data.photos
    });
  },

  /** 删除照片（保存时才真正清理文件，避免取消后引用失效） */
  removePhoto(e) {
    const index = Number(e.currentTarget.dataset.index);
    const photos = this.data.photos.slice();
    const removed = photos.splice(index, 1)[0];
    if (removed) this.removedPhotos.push(removed);
    this.setData({ photos: photos });
  },

  /** 保存工序 */
  save() {
    if (this.data.saving) return;
    const name = (this.data.name || '').trim();
    if (!name) {
      util.toast('请填写工序名称');
      return;
    }

    this.setData({ saving: true });
    const parsed = parseInt(this.data.minutes, 10);
    let minutes = parsed > 0 ? parsed : 30;
    minutes = Math.min(minutes, 600);

    const payload = {
      name: name,
      desc: (this.data.desc || '').trim(),
      minutes: minutes,
      photos: this.data.photos,
      note: (this.data.note || '').trim()
    };

    if (this.data.isEdit) {
      storage.updateStep(this.projectId, this.stepId, payload);
    } else {
      storage.addStep(this.projectId, payload);
    }

    // 保存成功后再清理被移除的照片文件
    util.removeLocalFiles(this.removedPhotos);
    this.saved = true;
    util.toast('已保存');
    setTimeout(() => wx.navigateBack(), 300);
  },

  /** 删除当前工序 */
  removeStep() {
    wx.showModal({
      title: '删除工序',
      content: '确认删除「' + this.data.name + '」？现场照片也会一并清理。',
      confirmText: '删除',
      confirmColor: '#B9503A',
      success: (res) => {
        if (!res.confirm) return;
        const photos = storage.deleteStep(this.projectId, this.stepId);
        util.removeLocalFiles(photos);
        util.removeLocalFiles(this.addedPhotos);
        this.saved = true;
        util.toast('工序已删除');
        setTimeout(() => wx.navigateBack(), 300);
      }
    });
  },

  goBack() {
    wx.navigateBack();
  },

  /** 未保存离开时清理本次新加的照片文件 */
  onUnload() {
    if (!this.saved && this.addedPhotos && this.addedPhotos.length) {
      util.removeLocalFiles(this.addedPhotos);
    }
  }
});
