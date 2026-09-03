'use strict';

class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

function responseBody(code, message, data) {
  return {
    code,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

function sendSuccess(res, data = null, message = 'success', status = 200) {
  return res.status(status).json(responseBody(status, message, data));
}

function sendError(res, status, message, details = null) {
  const data = details ? { details } : null;
  return res.status(status).json(responseBody(status, message, data));
}

function asyncHandler(handler) {
  return function wrappedAsyncHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function notFoundHandler(req, res) {
  return sendError(res, 404, `接口不存在：${req.method} ${req.originalUrl}`);
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = status >= 500 && isProduction ? '服务器内部错误' : error.message;
  const details = status >= 500 && isProduction ? null : error.details;

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}]`, error);
  }

  return sendError(res, status, message || '服务器内部错误', details);
}

module.exports = {
  HttpError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  sendError,
  sendSuccess
};
