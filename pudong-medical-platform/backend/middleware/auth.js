'use strict';

const jwt = require('jsonwebtoken');
const { HttpError } = require('../utils/response');

function extractBearerToken(req) {
  const header = req.get('authorization');
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new HttpError(401, 'Authorization请求头格式应为Bearer Token');
  }
  return token;
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new HttpError(500, '服务器未配置JWT_SECRET');
  }

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new HttpError(401, '登录凭证已过期');
    }
    throw new HttpError(401, '登录凭证无效');
  }
}

function optionalAuthenticate(req, res, next) {
  try {
    const token = extractBearerToken(req);
    req.user = token ? verifyToken(token) : null;
    next();
  } catch (error) {
    next(error);
  }
}

function authenticateToken(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) throw new HttpError(401, '请先登录');
    req.user = verifyToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  authenticateToken(req, res, (error) => {
    if (error) return next(error);
    if (req.user.role !== 'admin') {
      return next(new HttpError(403, '仅管理员可执行此操作'));
    }
    return next();
  });
}

module.exports = {
  authenticateToken,
  optionalAuthenticate,
  requireAdmin
};
