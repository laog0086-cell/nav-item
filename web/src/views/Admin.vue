// 修改保存背景的函数
async function saveBackground() {
  if (!bgUrl.value) return alert('请输入背景地址');
  
  try {
    // 关键点：这里的路径必须是 /api/users/config/background
    const res = await fetch('/api/users/config/background', { 
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // 这里的 token 逻辑保持你原本 Admin.vue 里的写法
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ backgroundImage: bgUrl.value })
    });

    const data = await res.json();
    
    if (res.ok) {
      alert('背景更新成功！');
    } else {
      alert('保存失败：' + (data.message || '未知错误'));
    }
  } catch (e) {
    alert('请求失败，请检查网络或后端容器状态');
    console.error(e);
  }
}

// 建议同时也修改初始化获取背景的函数
async function fetchCurrentSettings() {
  try {
    const res = await fetch('/api/users/config/background');
    if (res.ok) {
      const data = await res.json();
      bgUrl.value = data.backgroundImage || '';
    }
  } catch (e) {
    console.error('获取背景失败');
  }
}
