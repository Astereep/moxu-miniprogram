// 新建项目：表单、封面本地保存、模板导入
const tpl = require('../../utils/template');
const storage = require('../../utils/storage');
const util = require('../../utils/util');

Page({
  data: {
    types: tpl.PROJECT_TYPES,
    templates: tpl.TEMPLATES,
    typeIndex: 0,
    tplIndex: 0,
    name: '',
    remark: '',
    cover: '',
    saving: false
  },

  onName(e) {
    this.setData({ name: e.detail.value });
  },

  onRemark(e) {
    this.setData({ remark: e.detail.value });
  },

  onType(e) {
    this.setData({ typeIndex: Number(e.currentTarget.dataset.index) });
  },

  onTpl(e) {
    this.setData({ tplIndex: Number(e.currentTarget.dataset.index) });
  },

  /** 选择封面：临时路径转本地永久路径 */
  chooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (!tempPath) return;
        util.saveLocalImage(tempPath).then((path) => {
          const old = this.data.cover;
          if (old && old !== path) util.removeLocalFiles([old]);
          this.setData({ cover: path });
        });
      }
    });
  },

  /** 移除封面并清理文件 */
  removeCover() {
    const old = this.data.cover;
    this.setData({ cover: '' });
    util.removeLocalFiles([old]);
  },

  /** 创建项目 */
  submit() {
    const name = (this.data.name || '').trim();
    if (!name) {
      util.toast('请先填写项目名称');
      return;
    }
    if (this.data.saving) return;

    this.setData({ saving: true });
    wx.showLoading({ title: '创建中', mask: true });

    const type = this.data.types[this.data.typeIndex];
    const template = this.data.templates[this.data.tplIndex];
    const project = storage.createProject({
      name: name,
      type: type.name,
      remark: (this.data.remark || '').trim(),
      cover: this.data.cover,
      steps: template.steps
    });

    // 标记已保存，避免 onUnload 清理封面
    this.saved = true;
    wx.hideLoading();

    if (!project) {
      this.setData({ saving: false });
      util.toast('创建失败，请重试');
      return;
    }

    wx.redirectTo({
      url: '/pages/project-detail/project-detail?id=' + project.id + '&isNew=1'
    });
  },

  /** 未保存就离开时，清理已选封面文件 */
  onUnload() {
    if (!this.saved && this.data.cover) {
      util.removeLocalFiles([this.data.cover]);
    }
  }
});
