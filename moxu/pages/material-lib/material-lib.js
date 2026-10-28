// 材料库：本地静态数据检索与展开
const tpl = require('../../utils/template');

Page({
  data: {
    total: tpl.MATERIALS.length,
    cats: [],
    activeCat: '全部',
    keyword: '',
    expandedId: '',
    materials: tpl.MATERIALS
  },

  onLoad() {
    // 从材料数据中提取分类
    const cats = ['全部'];
    tpl.MATERIALS.forEach((m) => {
      if (cats.indexOf(m.cat) === -1) cats.push(m.cat);
    });
    this.setData({ cats: cats });
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value, expandedId: '' });
    this.applyFilter();
  },

  clearKeyword() {
    this.setData({ keyword: '', expandedId: '' });
    this.applyFilter();
  },

  onCat(e) {
    this.setData({ activeCat: e.currentTarget.dataset.cat, expandedId: '' });
    this.applyFilter();
  },

  /** 按分类 + 关键词过滤 */
  applyFilter() {
    const cat = this.data.activeCat;
    const kw = (this.data.keyword || '').trim().toLowerCase();
    const list = tpl.MATERIALS.filter((m) => {
      if (cat !== '全部' && m.cat !== cat) return false;
      if (!kw) return true;
      const text = [
        m.name,
        m.en,
        m.cat,
        m.tags.join(' '),
        m.pros,
        m.cons,
        m.bond,
        m.sandpaper
      ].join(' ').toLowerCase();
      return text.indexOf(kw) > -1;
    });
    this.setData({ materials: list });
  },

  /** 展开 / 收起材料详情 */
  toggleCard(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedId: this.data.expandedId === id ? '' : id
    });
  }
});
