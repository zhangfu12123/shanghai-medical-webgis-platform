'use strict';

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const jwt = require('jsonwebtoken');

const { app } = require('../server');
const { closeDatabase, getPool, sql } = require('../db/db');

let httpServer;
let baseUrl;
let adminUserId;
let noticeId;
let adminToken;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  return { response, body: await response.json() };
}

before(async () => {
  const pool = await getPool();
  const username = `test_admin_${Date.now()}`;
  const result = await pool.request()
    .input('username', sql.NVarChar(50), username)
    .query(`
      INSERT INTO sys_user (username, password, real_name, role)
      OUTPUT INSERTED.id
      VALUES (@username, N'test-only', N'接口测试管理员', N'admin');
    `);

  adminUserId = result.recordset[0].id;
  adminToken = jwt.sign(
    { userId: adminUserId, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  await new Promise((resolve) => {
    httpServer = app.listen(0, '127.0.0.1', resolve);
  });
  const address = httpServer.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }

  const pool = await getPool();
  if (noticeId) {
    await pool.request()
      .input('id', sql.Int, noticeId)
      .query('DELETE FROM system_notice WHERE id = @id;');
  }
  if (adminUserId) {
    await pool.request()
      .input('id', sql.Int, adminUserId)
      .query('DELETE FROM sys_user WHERE id = @id;');
  }
  await closeDatabase();
});

test('后端主服务与公告接口集成测试', async (t) => {
  await t.test('健康检查返回统一格式', async () => {
    const { response, body } = await request('/api/health');
    assert.equal(response.status, 200);
    assert.equal(body.code, 200);
    assert.equal(body.data.status, 'ok');
    assert.ok(body.timestamp);
  });

  await t.test('空GeoJSON文件返回明确的503错误', async () => {
    for (const path of ['/api/geo/boundary', '/api/geo/roads']) {
      const { response, body } = await request(path);
      assert.equal(response.status, 503);
      assert.equal(body.code, 503);
      assert.match(body.message, /GeoJSON数据文件为空/);
    }
  });

  await t.test('未登录用户不能新增公告', async () => {
    const { response, body } = await request('/api/notices', {
      method: 'POST',
      body: JSON.stringify({ title: '测试公告' })
    });
    assert.equal(response.status, 401);
    assert.equal(body.code, 401);
  });

  await t.test('普通用户不能新增公告', async () => {
    const userToken = jwt.sign(
      { userId: adminUserId, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );
    const { response, body } = await request('/api/notices', {
      method: 'POST',
      headers: { authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ title: '测试公告' })
    });
    assert.equal(response.status, 403);
    assert.equal(body.code, 403);
  });

  await t.test('管理员可以新增公告', async () => {
    const { response, body } = await request('/api/notices', {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: '自动化测试公告',
        content: '该记录会在测试结束后自动删除。',
        isShow: 1
      })
    });
    assert.equal(response.status, 201);
    assert.equal(body.code, 201);
    assert.equal(body.data.title, '自动化测试公告');
    noticeId = body.data.id;
  });

  await t.test('公开列表支持分页和关键词查询', async () => {
    const { response, body } = await request('/api/notices?page=1&pageSize=5&keyword=自动化');
    assert.equal(response.status, 200);
    assert.equal(body.data.pagination.page, 1);
    assert.ok(body.data.items.some((notice) => notice.id === noticeId));
  });

  await t.test('管理员可以修改并隐藏公告', async () => {
    const { response, body } = await request(`/api/notices/${noticeId}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: '已修改测试公告', isShow: 0 })
    });
    assert.equal(response.status, 200);
    assert.equal(body.data.title, '已修改测试公告');
    assert.equal(body.data.isShow, 0);
  });

  await t.test('普通访问者看不到隐藏公告，管理员仍可查看', async () => {
    const publicResult = await request(`/api/notices/${noticeId}`);
    assert.equal(publicResult.response.status, 404);

    const adminResult = await request(`/api/notices/${noticeId}`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(adminResult.response.status, 200);
    assert.equal(adminResult.body.data.id, noticeId);
  });

  await t.test('管理员可以物理删除公告', async () => {
    const { response, body } = await request(`/api/notices/${noticeId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(response.status, 200);
    assert.equal(body.data.id, noticeId);
    noticeId = null;
  });
});
