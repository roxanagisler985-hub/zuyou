/**
 * 宿友 - 通用工具函数
 */

// 显示Toast
function showToast(msg, duration = 2000) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

// 格式化价格
function formatPrice(price) {
  return price.toLocaleString();
}

// 生成唯一ID
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 获取当前页面名
function getPageName() {
  const p = window.location.pathname.split('/').pop() || 'index.html';
  return p.replace('.html', '');
}

// 切换Tab高亮
function initTabs() {
  const page = getPageName();
  document.querySelectorAll('.tab-item').forEach(el => {
    const href = el.getAttribute('data-page');
    el.classList.toggle('active', href === page || (page === 'detail' && href === 'index'));
  });
}

// 返回上一页
function goBack() {
  window.history.back();
}

// 跳转
function goTo(page) {
  window.location.href = page;
}
