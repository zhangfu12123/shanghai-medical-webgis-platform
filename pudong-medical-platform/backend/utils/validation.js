'use strict';

const { HttpError } = require('./response');

function parsePositiveInteger(value, fieldName, defaultValue, maxValue = Number.MAX_SAFE_INTEGER) {
  if (value === undefined || value === null || value === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new HttpError(400, `${fieldName}不能为空`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maxValue) {
    throw new HttpError(400, `${fieldName}必须是1到${maxValue}之间的整数`);
  }
  return parsed;
}

function parseBit(value, fieldName, defaultValue) {
  if (value === undefined || value === null || value === '') {
    if (defaultValue !== undefined) return defaultValue;
    return null;
  }

  if (value === true || value === 1 || value === '1' || value === 'true') return 1;
  if (value === false || value === 0 || value === '0' || value === 'false') return 0;
  throw new HttpError(400, `${fieldName}只能是0或1`);
}

function parseText(value, fieldName, options = {}) {
  const { required = false, maxLength = 1000, allowEmpty = false } = options;

  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${fieldName}不能为空`);
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, `${fieldName}必须是字符串`);
  }

  const text = value.trim();
  if (!allowEmpty && text.length === 0) {
    if (required) throw new HttpError(400, `${fieldName}不能为空`);
    return null;
  }
  if (text.length > maxLength) {
    throw new HttpError(400, `${fieldName}不能超过${maxLength}个字符`);
  }
  return text;
}

module.exports = {
  parseBit,
  parsePositiveInteger,
  parseText
};
