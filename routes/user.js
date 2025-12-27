const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const authMiddleware = require('./authMiddleware');

const router = express.Router();

// ==========================================
// 【新增：背景图保存与读取】 仅增加，不影响原有逻辑
// ==========================================

// 获取背景 (给首页用)
router.get('/config/background', (req, res) => {
  db.get("SELECT value FROM settings WHERE key = 'backgroundImage'", (err, row) => {
    if (err) return res.status(500).json({ message: '数据库查询失败' });
    res.json({ backgroundImage: row ? row.value : '' });
  });
});

// 保存背景 (给后台用)
router.post('/config/background', authMiddleware, (req, res) => {
  const { backgroundImage } = req.body;
  if (!backgroundImage) return res.status(400).json({ message: 'URL不能为空' });

  // 这里的逻辑会自动判断是否有 settings 表，没有就建表，有就存数据
  const sql = "INSERT OR REPLACE INTO settings (key, value) VALUES ('backgroundImage', ?)";
  db.run(sql, [backgroundImage], function(err) {
    if (err) {
      db.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)", () => {
        db.run(sql, [backgroundImage], (err2) => {
          if (err2) return res.status(500).json({ message: '保存失败' });
          res.json({ message: '背景更新成功' });
        });
      });
    } else {
      res.json({ message: '背景更新成功' });
    }
  });
});

// ==========================================
// 【原有代码】以下内容完全保留你原本的业务逻辑
// ==========================================

// 获取当前用户信息
router.get('/profile', authMiddleware, (req, res) => {
  db.get('SELECT id, username FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ message: '服务器错误' });
    }
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({ data: user });
  });
});

// 获取当前用户详细信息（包括登录信息）
router.get('/me', authMiddleware, (req, res) => {
  db.get('SELECT id, username, last_login_time, last_login_ip FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ message: '服务器错误' });
    }
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({
      last_login_time: user.last_login_time,
      last_login_ip: user.last_login_ip
    });
  });
});

// 修改密码
router.put('/password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: '请提供旧密码和新密码' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ message: '新密码长度至少6位' });
  }
  
  // 验证旧密码
  db.get('SELECT password FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ message: '服务器错误' });
    }
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const isValidPassword = bcrypt.compareSync(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: '旧密码错误' });
    }
    
    // 更新密码
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [newPasswordHash, req.user.id], (err) => {
      if (err) {
        return res.status(500).json({ message: '密码更新失败' });
      }
      res.json({ message: '密码修改成功' });
    });
  });
});

// 获取所有用户（管理员功能）
router.get('/', authMiddleware, (req, res) => {
  const { page, pageSize } = req.query;
  if (!page && !pageSize) {
    db.all('SELECT id, username FROM users', (err, users) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      res.json({ data: users });
    });
  } else {
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * size;
    db.get('SELECT COUNT(*) as total FROM users', [], (err, countRow) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      db.all('SELECT id, username FROM users LIMIT ? OFFSET ?', [size, offset], (err, users) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }
        res.json({
          total: countRow.total,
          page: pageNum,
          pageSize: size,
          data: users
        });
      });
    });
  }
});

module.exports = router;
