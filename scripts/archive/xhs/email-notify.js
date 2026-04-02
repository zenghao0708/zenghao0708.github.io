#!/usr/bin/env node
'use strict';

/**
 * 邮箱通知工具
 * 使用系统 mail 命令发送邮件通知
 */

const { execSync } = require('child_process');

/**
 * 发送邮件通知
 */
function sendEmail({ to, subject, body }) {
  try {
    // 使用系统 mail 命令发送邮件
    const escapedBody = body.replace(/'/g, "'\\''");
    const cmd = `echo '${escapedBody}' | mail -s "${subject}" "${to}"`;
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✅ 邮件已发送到: ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ 邮件发送失败: ${error.message}`);
    return false;
  }
}

/**
 * 发送小红书导出成功通知
 */
function notifyXhsExport(options) {
  const { to, title, folderPath, imageCount } = options;

  const subject = `📱 小红书内容已准备好：${title}`;

  const body = `
小红书内容已导出到 iCloud 云盘！

📌 标题：${title}

📸 图片数量：${imageCount} 张

📂 文件位置：
iCloud 云盘 → AI 文档 → 小红书 → ${folderPath.split('/').pop()}

📱 发布步骤：
1. 打开 iPhone「文件」App
2. 浏览 → iCloud 云盘 → AI 文档 → 小红书
3. 找到对应文件夹，查看「发布内容.txt」
4. 保存图片到相册，复制标题和正文
5. 打开小红书 App 发布

---
由 Claude Code 自动生成
`;

  return sendEmail({ to, subject, body });
}

module.exports = {
  sendEmail,
  notifyXhsExport
};
