// utils/storage.js —— 项目与工序的本地持久化（wx.setStorage）
// 数据结构见 README 中的说明；所有读写均在设备本机完成
const util = require('./util');

const KEY = 'mx_projects';

/** 读取项目列表（始终返回数组） */
function getProjects() {
  try {
    const list = wx.getStorageSync(KEY);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

/** 写入项目列表 */
function setProjects(list) {
  try {
    wx.setStorageSync(KEY, list || []);
    return true;
  } catch (e) {
    wx.showToast({ title: '本地存储写入失败', icon: 'none' });
    return false;
  }
}

/** 获取单个项目 */
function getProject(id) {
  const list = getProjects();
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

/** 新增或更新项目 */
function saveProject(project) {
  if (!project || !project.id) return null;
  const list = getProjects();
  project.updatedAt = Date.now();
  const idx = list.findIndex((p) => p.id === project.id);
  if (idx > -1) {
    list[idx] = project;
  } else {
    list.unshift(project);
  }
  setProjects(list);
  return project;
}

/** 创建项目（含工序模板导入） */
function createProject(payload) {
  const now = Date.now();
  const project = {
    id: util.genId('p'),
    name: payload.name || '未命名项目',
    type: payload.type || '油泥模型',
    remark: payload.remark || '',
    cover: payload.cover || '',
    createdAt: now,
    updatedAt: now,
    steps: (payload.steps || []).map((s) => ({
      id: util.genId('s'),
      name: s.name,
      desc: s.desc || '',
      minutes: parseInt(s.minutes, 10) || 0,
      done: false,
      doneAt: '',
      photos: s.photos || [],
      note: s.note || ''
    }))
  };
  saveProject(project);
  return project;
}

/** 删除项目 */
function deleteProject(id) {
  const list = getProjects().filter((p) => p.id !== id);
  setProjects(list);
}

/** 追加一批工序（模板导入） */
function appendSteps(projectId, steps) {
  const project = getProject(projectId);
  if (!project) return null;
  (steps || []).forEach((s) => {
    project.steps.push({
      id: util.genId('s'),
      name: s.name,
      desc: s.desc || '',
      minutes: parseInt(s.minutes, 10) || 0,
      done: false,
      doneAt: '',
      photos: s.photos || [],
      note: s.note || ''
    });
  });
  saveProject(project);
  return project;
}

/** 新增单条工序 */
function addStep(projectId, step) {
  return appendSteps(projectId, [step]);
}

/** 更新工序字段 */
function updateStep(projectId, stepId, patch) {
  const project = getProject(projectId);
  if (!project) return null;
  const step = project.steps.find((s) => s.id === stepId);
  if (!step) return null;
  Object.keys(patch || {}).forEach((k) => {
    step[k] = patch[k];
  });
  saveProject(project);
  return step;
}

/** 删除工序，同时返回被删除的图片路径供页面清理文件 */
function deleteStep(projectId, stepId) {
  const project = getProject(projectId);
  if (!project) return [];
  let photos = [];
  project.steps = project.steps.filter((s) => {
    if (s.id === stepId) {
      photos = s.photos || [];
      return false;
    }
    return true;
  });
  saveProject(project);
  return photos;
}

/** 勾选 / 取消完成 */
function toggleStep(projectId, stepId, done) {
  const project = getProject(projectId);
  if (!project) return null;
  const step = project.steps.find((s) => s.id === stepId);
  if (!step) return null;
  step.done = !!done;
  step.doneAt = done ? Date.now() : '';
  saveProject(project);
  return step;
}

/** 进度统计 */
function calcProgress(project) {
  const steps = (project && project.steps) || [];
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const totalMinutes = steps.reduce((sum, s) => sum + (parseInt(s.minutes, 10) || 0), 0);
  return {
    total: total,
    done: done,
    percent: percent,
    totalMinutes: totalMinutes
  };
}

/** 收集项目涉及的全部本地图片路径（用于删除项目时清理文件） */
function collectProjectFiles(project) {
  const files = [];
  if (!project) return files;
  if (project.cover) files.push(project.cover);
  (project.steps || []).forEach((s) => {
    (s.photos || []).forEach((p) => files.push(p));
  });
  return files;
}

module.exports = {
  KEY,
  getProjects,
  setProjects,
  getProject,
  saveProject,
  createProject,
  deleteProject,
  appendSteps,
  addStep,
  updateStep,
  deleteStep,
  toggleStep,
  calcProgress,
  collectProjectFiles
};
