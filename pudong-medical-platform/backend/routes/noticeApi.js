'use strict';

const express = require('express');
const { getPool, sql } = require('../db/db');
const { optionalAuthenticate, requireAdmin } = require('../middleware/auth');
const { asyncHandler, HttpError, sendSuccess } = require('../utils/response');
const { parseBit, parsePositiveInteger, parseText } = require('../utils/validation');

const router = express.Router();

function mapNotice(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    publishUser: row.publish_user,
    publisherName: row.publisher_name || null,
    isShow: row.is_show,
    createTime: row.create_time
  };
}

router.get('/', optionalAuthenticate, asyncHandler(async (req, res) => {
  const page = parsePositiveInteger(req.query.page, 'page', 1);
  const pageSize = parsePositiveInteger(req.query.pageSize, 'pageSize', 10, 100);
  const keyword = parseText(req.query.keyword, 'keyword', { maxLength: 100 });
  const isAdmin = req.user?.role === 'admin';
  const isShow = isAdmin ? parseBit(req.query.isShow, 'isShow') : 1;
  const offset = (page - 1) * pageSize;
  const pool = await getPool();

  const request = pool.request()
    .input('keyword', sql.NVarChar(100), keyword || null)
    .input('isShow', sql.TinyInt, isShow)
    .input('offset', sql.Int, offset)
    .input('pageSize', sql.Int, pageSize);

  const result = await request.query(`
    SELECT COUNT(1) AS total
    FROM system_notice
    WHERE (@keyword IS NULL OR title LIKE '%' + @keyword + '%')
      AND (@isShow IS NULL OR is_show = @isShow);

    SELECT n.id, n.title, n.content, n.publish_user, n.is_show, n.create_time,
           u.username AS publisher_name
    FROM system_notice AS n
    LEFT JOIN sys_user AS u ON u.id = n.publish_user
    WHERE (@keyword IS NULL OR n.title LIKE '%' + @keyword + '%')
      AND (@isShow IS NULL OR n.is_show = @isShow)
    ORDER BY n.create_time DESC, n.id DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
  `);

  const total = result.recordsets[0][0].total;
  const items = result.recordsets[1].map(mapNotice);
  return sendSuccess(res, {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
}));

router.get('/:id', optionalAuthenticate, asyncHandler(async (req, res) => {
  const id = parsePositiveInteger(req.params.id, '公告ID');
  const isAdmin = req.user?.role === 'admin';
  const pool = await getPool();

  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('isAdmin', sql.Bit, isAdmin)
    .query(`
      SELECT n.id, n.title, n.content, n.publish_user, n.is_show, n.create_time,
             u.username AS publisher_name
      FROM system_notice AS n
      LEFT JOIN sys_user AS u ON u.id = n.publish_user
      WHERE n.id = @id AND (@isAdmin = 1 OR n.is_show = 1);
    `);

  if (result.recordset.length === 0) {
    throw new HttpError(404, '公告不存在或已隐藏');
  }
  return sendSuccess(res, mapNotice(result.recordset[0]));
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const title = parseText(req.body.title, 'title', { required: true, maxLength: 200 });
  const content = parseText(req.body.content, 'content', { maxLength: 2000, allowEmpty: true });
  const isShow = parseBit(req.body.isShow, 'isShow', 1);
  const publishUser = parsePositiveInteger(req.user.userId, 'token.userId');
  const pool = await getPool();

  const result = await pool.request()
    .input('title', sql.NVarChar(200), title)
    .input('content', sql.NVarChar(2000), content ?? null)
    .input('publishUser', sql.Int, publishUser)
    .input('isShow', sql.TinyInt, isShow)
    .query(`
      INSERT INTO system_notice (title, content, publish_user, is_show)
      OUTPUT INSERTED.id, INSERTED.title, INSERTED.content, INSERTED.publish_user,
             INSERTED.is_show, INSERTED.create_time
      VALUES (@title, @content, @publishUser, @isShow);
    `);

  return sendSuccess(res, mapNotice(result.recordset[0]), '公告创建成功', 201);
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parsePositiveInteger(req.params.id, '公告ID');
  const updates = [];
  const requestValues = { id };

  if (Object.prototype.hasOwnProperty.call(req.body, 'title')) {
    requestValues.title = parseText(req.body.title, 'title', { required: true, maxLength: 200 });
    updates.push('title = @title');
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'content')) {
    requestValues.content = parseText(req.body.content, 'content', { maxLength: 2000, allowEmpty: true });
    updates.push('content = @content');
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'isShow')) {
    requestValues.isShow = parseBit(req.body.isShow, 'isShow');
    updates.push('is_show = @isShow');
  }
  if (updates.length === 0) {
    throw new HttpError(400, '至少提供title、content或isShow中的一个字段');
  }

  const pool = await getPool();
  const request = pool.request().input('id', sql.Int, id);
  if ('title' in requestValues) request.input('title', sql.NVarChar(200), requestValues.title);
  if ('content' in requestValues) request.input('content', sql.NVarChar(2000), requestValues.content ?? null);
  if ('isShow' in requestValues) request.input('isShow', sql.TinyInt, requestValues.isShow);

  const result = await request.query(`
    UPDATE system_notice
    SET ${updates.join(', ')}
    OUTPUT INSERTED.id, INSERTED.title, INSERTED.content, INSERTED.publish_user,
           INSERTED.is_show, INSERTED.create_time
    WHERE id = @id;
  `);

  if (result.recordset.length === 0) throw new HttpError(404, '公告不存在');
  return sendSuccess(res, mapNotice(result.recordset[0]), '公告修改成功');
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parsePositiveInteger(req.params.id, '公告ID');
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('DELETE FROM system_notice OUTPUT DELETED.id WHERE id = @id;');

  if (result.recordset.length === 0) throw new HttpError(404, '公告不存在');
  return sendSuccess(res, { id }, '公告删除成功');
}));

module.exports = router;
