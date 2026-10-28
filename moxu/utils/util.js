// utils/util.js —— 通用工具方法（纯本地，无网络请求）
const fs = wx.getFileSystemManager();

/** 补零 */
function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

/** 生成唯一 id，如 p_lx8k2a_3f9d1 */
function genId(prefix) {
  const p = prefix || 'id';
  return p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

/** 日期：2026.10.28 */
function formatDate(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
}

/** 日期时间：2026.10.28 14:03 */
function formatDateTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return formatDate(ts) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/** 时长文案：45 分钟 / 2 小时 30 分 / 未设置 */
function minutesText(min) {
  const m = parseInt(min, 10);
  if (!m || m <= 0) return '未设置时长';
  if (m < 60) return m + ' 分钟';
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? h + ' 小时 ' + rest + ' 分' : h + ' 小时';
}

/**
 * 把 chooseMedia 的临时路径转成本地永久路径
 * FileSystemManager.saveFile 只写入本机沙盒，不涉及网络
 */
function saveLocalImage(tempPath) {
  return new Promise((resolve) => {
    if (!tempPath) {
      resolve('');
      return;
    }
    // 已是本地已保存文件则直接返回
    if (tempPath.indexOf('usr') > -1 && tempPath.indexOf('tmp') === -1) {
      resolve(tempPath);
      return;
    }
    fs.saveFile({
      tempFilePath: tempPath,
      success(res) {
        resolve(res.savedFilePath || tempPath);
      },
      fail() {
        // 保存失败时退回临时路径，保证页面仍能显示
        resolve(tempPath);
      }
    });
  });
}

/** 删除本地已保存文件（忽略失败） */
function removeLocalFiles(paths) {
  (paths || []).forEach((p) => {
    if (!p || p.indexOf('usr') === -1) return;
    fs.removeSavedFile({
      filePath: p,
      fail() {}
    });
  });
}

/** 生成纯文本工序清单，用于复制与分享 */
function buildStepText(project) {
  if (!project) return '';
  const steps = project.steps || [];
  const done = steps.filter((s) => s.done).length;
  const totalMinutes = steps.reduce((sum, s) => sum + (parseInt(s.minutes, 10) || 0), 0);
  const lines = [];
  lines.push('【模序】' + project.name);
  lines.push(
    '类型：' + project.type + '　|　进度：' + done + '/' + steps.length +
    '　|　建议总时长：' + (totalMinutes ? minutesText(totalMinutes) : '未设置')
  );
  lines.push('创建日期：' + formatDate(project.createdAt));
  lines.push('—— 工序清单 ——');
  if (!steps.length) {
    lines.push('（暂无工序）');
  } else {
    steps.forEach((s, i) => {
      const no = pad2(i + 1);
      lines.push(no + ' ' + s.name + '　' + minutesText(s.minutes) + (s.done ? '　[已完成]' : ''));
      if (s.desc) lines.push('    ' + s.desc);
    });
  }
  if (project.remark) lines.push('备注：' + project.remark);
  lines.push('—— 由「模序」本地生成，数据仅保存在本机');
  return lines.join('\n');
}

/** 轻提示 */
function toast(title, icon) {
  wx.showToast({ title: title, icon: icon || 'none', duration: 1800 });
}

module.exports = {
  pad2,
  genId,
  formatDate,
  formatDateTime,
  minutesText,
  saveLocalImage,
  removeLocalFiles,
  buildStepText,
  toast
};
