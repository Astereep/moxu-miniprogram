// 缺陷修复手册：标签筛选 + 关键词搜索
const tpl = require('../../utils/template');

Page({
  data: {
    total: tpl.DEFECTS.length,
    tags: [],
    activeTag: '全部',
    keyword: '',
    list: tpl.DEFECTS
  },

  onLoad() {
    const tags = ['全部'];
    tpl.DEFECTS.forEach((d) => {
      d.tags.forEach((t) => {
        if (tags.indexOf(t) === -1) tags.push(t);
      });
    });
    this.setData({ tags: tags });
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value });
    this.applyFilter();
  },

  clearKeyword() {
    this.setData({ keyword: '' });
    this.applyFilter();
  },

  onTag(e) {
    this.setData({ activeTag: e.currentTarget.dataset.tag });
    this.applyFilter();
  },

  /** 关键词覆盖：名称、标签、成因、步骤、耗材、避坑 */
  applyFilter() {
    const tag = this.data.activeTag;
    const kw = (this.data.keyword || '').trim().toLowerCase();
    const list = tpl.DEFECTS.filter((d) => {
      if (tag !== '全部' && d.tags.indexOf(tag) === -1) return false;
      if (!kw) return true;
      const text = [
        d.name,
        d.tags.join(' '),
        d.causeBrief,
        d.cause,
        d.steps.join(' '),
        d.consumables.join(' '),
        d.tips.join(' ')
      ].join(' ').toLowerCase();
      return text.indexOf(kw) > -1;
    });
    this.setData({ list: list });
  },

  openDetail(e) {
    wx.navigateTo({
      url: '/pages/repair-detail/repair-detail?id=' + e.currentTarget.dataset.id
    });
  }
});
