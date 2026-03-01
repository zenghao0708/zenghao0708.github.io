'use strict';

const feishu = require('./feishu');
const wechat = require('./wechat');
const xhs = require('./xhs');
const x = require('./x');

const registry = {
  feishu,
  wechat,
  xhs,
  x
};

function getAdapter(platform) {
  return registry[platform];
}

module.exports = {
  getAdapter
};
