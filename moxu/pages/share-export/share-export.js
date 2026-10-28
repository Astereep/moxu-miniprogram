// 分享导出：微信卡片、canvas 工序长图、复制文本
const storage = require('../../utils/storage');
const util = require('../../utils/util');

/** 画布布局常量（单位：px，逻辑像素） */
function layout(stepCount) {
  const W = 660;
  const M = 24;
  const PAD = 30;
  const HEADER_H = 176;
  const BODY_TOP = HEADER_H + 24;
  const BODY_PAD_TOP = 26;
  const META_H = 58;
  const ROW_H = stepCount ? 68 : 100;
  const rows = stepCount || 1;
  const FOOTER_H = 46;
  const TAIL = 22;
  const bodyH = BODY_PAD_TOP + META_H + rows * ROW_H + FOOTER_H + TAIL;
  const H = BODY_TOP + bodyH + 24;
  return {
    W: W,
    M: M,
    PAD: PAD,
    HEADER_H: HEADER_H,
    BODY_TOP: BODY_TOP,
    BODY_PAD_TOP: BODY_PAD_TOP,
    META_H: META_H,
    ROW_H: ROW_H,
    rows: rows,
    bodyH: bodyH,
    H: H
  };
}

/** 圆角矩形路径 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 文本超长截断 */
function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

Page({
  data: {
    project: null,
    projectNames: [],
    projectIndex: 0,
    text: '',
    previewPath: '',
    generating: false,
    canvasW: 660,
    canvasH: 800
  },

  onLoad(options) {
    this.projectId = options.id || '';
    this.rawProjects = [];
    this.loadProjects();
  },

  /** 读取全部项目并选中目标项目 */
  loadProjects() {
    const raw = storage.getProjects();
    this.rawProjects = raw;

    if (!raw.length) {
      this.setData({ project: null, projectNames: [] });
      return;
    }

    let index = 0;
    if (this.projectId) {
      const found = raw.findIndex((p) => p.id === this.projectId);
      if (found > -1) index = found;
    }

    this.setData({
      projectNames: raw.map((p) => p.name),
      projectIndex: index
    });
    this.selectProject(index);
  },

  /** 选中项目并生成预览与文本 */
  selectProject(index) {
    const raw = this.rawProjects[index];
    if (!raw) return;
    this.projectId = raw.id;
    const prog = storage.calcProgress(raw);
    const steps = raw.steps.map((s, i) => ({
      id: s.id,
      no: util.pad2(i + 1),
      name: s.name,
      done: !!s.done,
      minutesText: util.minutesText(s.minutes)
    }));

    this.setData({
      projectIndex: index,
      project: {
        id: raw.id,
        name: raw.name,
        type: raw.type,
        dateText: util.formatDate(raw.createdAt),
        done: prog.done,
        total: prog.total,
        percent: prog.percent,
        steps: steps
      },
      text: util.buildStepText(raw),
      previewPath: ''
    });
  },

  onPickProject(e) {
    const index = Number(e.detail.value);
    this.selectProject(index);
  },

  /** 复制纯文本清单 */
  copyText() {
    if (!this.data.text) {
      util.toast('暂无可复制的工序');
      return;
    }
    wx.setClipboardData({
      data: this.data.text,
      success() {
        util.toast('工序清单已复制');
      }
    });
  },

  /** 生成工序清单长图 */
  generateImage() {
    if (this.data.generating) return;
    const project = this.data.project;
    if (!project) return;

    const L = layout(project.steps.length);
    wx.showLoading({ title: '生成中', mask: true });

    // 先更新画布尺寸，等渲染完成后再绘制
    this.setData({ generating: true, canvasW: L.W, canvasH: L.H }, () => {
      setTimeout(() => {
        this.drawCanvas(L, project);
      }, 60);
    });
  },

  /** 查询离屏 canvas 节点并绘制 */
  drawCanvas(L, project) {
    const query = wx.createSelectorQuery();
    query
      .select('#exportCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const item = res && res[0];
        if (!item || !item.node) {
          this.failGenerate('画布初始化失败');
          return;
        }
        const canvas = item.node;
        let dpr = 2;
        try {
          dpr = wx.getSystemInfoSync().pixelRatio || 2;
        } catch (e) {
          dpr = 2;
        }
        canvas.width = L.W * dpr;
        canvas.height = L.H * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        this.paint(ctx, L, project);

        setTimeout(() => {
          wx.canvasToTempFilePath(
            {
              canvas: canvas,
              x: 0,
              y: 0,
              width: L.W,
              height: L.H,
              destWidth: L.W * dpr,
              destHeight: L.H * dpr,
              fileType: 'png',
              success: (r) => {
                wx.hideLoading();
                this.setData({ previewPath: r.tempFilePath, generating: false });
                util.toast('长图已生成');
              },
              fail: () => {
                this.failGenerate('图片生成失败');
              }
            },
            this
          );
        }, 100);
      });
  },

  /** 绘制清单卡片 */
  paint(ctx, L, project) {
    const W = L.W;
    const H = L.H;
    const M = L.M;
    const PAD = L.PAD;
    const HEADER_H = L.HEADER_H;
    const panelX = M;
    const panelY = L.BODY_TOP;
    const panelW = W - M * 2;
    const panelH = L.bodyH;
    const contentX = panelX + PAD;
    const contentRight = panelX + panelW - PAD;
    const steps = project.steps;

    // 背景
    ctx.fillStyle = '#F4F2EF';
    ctx.fillRect(0, 0, W, H);

    // 深灰头部
    ctx.fillStyle = '#2C3036';
    ctx.fillRect(0, 0, W, HEADER_H);
    ctx.fillStyle = '#E27B48';
    ctx.fillRect(0, HEADER_H - 4, W, 4);

    // 品牌标记
    ctx.fillStyle = '#E27B48';
    ctx.fillRect(M, 34, 30, 5);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '600 14px sans-serif';
    ctx.fillText('模序 / MODEL SEQUENCE', M + 42, 37);

    // 项目名
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 32px sans-serif';
    ctx.fillText(fitText(ctx, project.name, W - M * 2 - 110), M, 86);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '15px sans-serif';
    ctx.fillText(project.type + ' · ' + steps.length + ' 道工序', M, 128);

    // 右侧进度
    ctx.textAlign = 'right';
    ctx.fillStyle = '#E27B48';
    ctx.font = '700 30px sans-serif';
    ctx.fillText(project.percent + '%', W - M, 82);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '600 11px sans-serif';
    ctx.fillText('PROGRESS', W - M, 104);

    // 白色清单面板
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E3DFD9';
    ctx.lineWidth = 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, 8);
    ctx.fill();
    ctx.stroke();

    // 面板标题
    ctx.fillStyle = '#E27B48';
    ctx.fillRect(contentX, panelY + 29, 4, 14);
    ctx.fillStyle = '#2C3036';
    ctx.font = '600 16px sans-serif';
    ctx.fillText('工序清单 / STEP LIST', contentX + 12, panelY + 36);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#A6ABB1';
    ctx.font = '13px sans-serif';
    ctx.fillText(project.dateText, contentRight, panelY + 36);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#F1EEEA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(contentX, panelY + 54);
    ctx.lineTo(contentRight, panelY + 54);
    ctx.stroke();

    // 工序行
    const listTop = panelY + L.BODY_PAD_TOP + L.META_H;
    const ROW_H = L.ROW_H;

    if (!steps.length) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8A8F96';
      ctx.font = '15px sans-serif';
      ctx.fillText('暂无工序', W / 2, listTop + 40);
      ctx.textAlign = 'left';
    } else {
      steps.forEach((s, i) => {
        const centerY = listTop + i * ROW_H + ROW_H / 2;

        // 序号
        ctx.fillStyle = s.done ? '#C7C3BB' : '#E27B48';
        ctx.font = '600 14px sans-serif';
        ctx.fillText(s.no, contentX, centerY);

        // 工序名
        ctx.fillStyle = s.done ? '#8A8F96' : '#2C3036';
        ctx.font = '500 20px sans-serif';
        const maxNameW = contentRight - (contentX + 46) - 120;
        ctx.fillText(fitText(ctx, s.name, maxNameW), contentX + 46, centerY);

        // 时长
        ctx.textAlign = 'right';
        ctx.fillStyle = '#A6ABB1';
        ctx.font = '13px sans-serif';
        ctx.fillText(s.minutesText, contentRight - 34, centerY);
        ctx.textAlign = 'left';

        // 完成状态方块
        const box = 18;
        const bx = contentRight - box;
        const by = centerY - box / 2;
        if (s.done) {
          ctx.fillStyle = '#E27B48';
          ctx.fillRect(bx, by, box, box);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx + 4, by + 9);
          ctx.lineTo(bx + 7, by + 13);
          ctx.lineTo(bx + 14, by + 5);
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#D2CDC4';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bx, by, box, box);
        }

        // 分隔线
        if (i < steps.length - 1) {
          ctx.strokeStyle = '#F3F0EB';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(contentX, listTop + (i + 1) * ROW_H);
          ctx.lineTo(contentRight, listTop + (i + 1) * ROW_H);
          ctx.stroke();
        }
      });
    }

    // 底部说明
    ctx.textAlign = 'center';
    ctx.fillStyle = '#A6ABB1';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      '由「模序」本地生成 · ' + util.formatDate(Date.now()),
      W / 2,
      panelY + panelH - 26
    );
    ctx.textAlign = 'left';
  },

  failGenerate(msg) {
    wx.hideLoading();
    this.setData({ generating: false });
    util.toast(msg || '生成失败，请重试');
  },

  /** 保存长图到相册 */
  saveImage() {
    const path = this.data.previewPath;
    if (!path) {
      util.toast('请先生成长图');
      return;
    }
    wx.saveImageToPhotosAlbum({
      filePath: path,
      success() {
        util.toast('已保存到相册');
      },
      fail(err) {
        const msg = (err && err.errMsg) || '';
        if (msg.indexOf('auth') > -1 || msg.indexOf('deny') > -1) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许「模序」保存图片到相册。',
            confirmText: '去设置',
            success(res) {
              if (res.confirm) wx.openSetting();
            }
          });
        } else {
          util.toast('保存失败，请重试');
        }
      }
    });
  },

  clearPreview() {
    this.setData({ previewPath: '' });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/create-project/create-project' });
  },

  onShareAppMessage() {
    const p = this.data.project;
    const res = {
      title: p ? '【模序】' + p.name + ' · 工序清单' : '模序 · 工序清单',
      path: '/pages/index/index'
    };
    if (this.data.previewPath) {
      res.imageUrl = this.data.previewPath;
    }
    return res;
  }
});
