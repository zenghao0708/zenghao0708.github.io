#!/usr/bin/env node
'use strict';

/**
 * 小红书内容导出到 iCloud 工具
 * 将图片和发布信息导出到 iCloud 云盘，方便手机访问
 */

const fs = require('fs');
const path = require('path');

// iCloud 云盘路径
const ICLOUD_BASE = path.join(process.env.HOME, 'Library/Mobile Documents/com~apple~CloudDocs');
const XHS_BASE_DIR = path.join(ICLOUD_BASE, 'AI 文档/小红书');

/**
 * 生成时间戳前缀
 */
function getDatePrefix() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 清理标题用于文件夹命名
 */
function sanitizeTitle(title) {
  return title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

/**
 * 导出小红书内容到 iCloud
 */
function exportToICloud(options) {
  const { title, content, tags, images, source } = options;

  // 创建目标目录
  const datePrefix = getDatePrefix();
  const safeTitle = sanitizeTitle(title);
  const targetDir = path.join(XHS_BASE_DIR, `${datePrefix}_${safeTitle}`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  console.log(`📁 创建目录: ${targetDir}`);

  // 复制图片
  if (images && images.length > 0) {
    console.log(`📸 复制 ${images.length} 张图片...`);
    images.forEach((imgPath, index) => {
      if (fs.existsSync(imgPath)) {
        const fileName = path.basename(imgPath);
        const targetPath = path.join(targetDir, fileName);
        fs.copyFileSync(imgPath, targetPath);
        console.log(`  ✅ ${fileName}`);
      } else {
        console.warn(`  ⚠️  图片不存在: ${imgPath}`);
      }
    });
  }

  // 创建发布内容文件
  const contentFile = path.join(targetDir, '发布内容.txt');
  const contentText = generateContentFile({ title, content, tags, images, source });
  fs.writeFileSync(contentFile, contentText, 'utf8');
  console.log(`📝 创建发布内容文件: 发布内容.txt`);

  // 创建 JSON 格式的发布数据（方便程序读取）
  const jsonFile = path.join(targetDir, 'payload.json');
  const jsonData = {
    title,
    content,
    tags,
    images: images ? images.map(img => path.basename(img)) : [],
    source,
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2), 'utf8');
  console.log(`📋 创建 JSON 文件: payload.json`);

  console.log(`\n✅ 导出完成！`);
  console.log(`📂 位置: ${targetDir}`);
  console.log(`\n📱 在 iPhone 上打开「文件」App → iCloud 云盘 → AI 文档 → 小红书 即可访问`);

  return targetDir;
}

/**
 * 生成发布内容文件
 */
function generateContentFile(options) {
  const { title, content, tags, images, source } = options;

  const imageDescriptions = images ? images.map((img, index) => {
    const fileName = path.basename(img);
    const descriptions = {
      '01-cover': '封面图',
      '02-tool-fzf': 'fzf 工具介绍',
      '03-tool-Ghostty': 'Ghostty 工具介绍',
      '04-tool-Yazi': 'Yazi 工具介绍',
      '05-tool-Lazygit': 'Lazygit 工具介绍',
      '06-comparison': '传统 vs 现代工具对比',
      '07-scenario': 'AI 编码实战场景',
      '08-summary': '一键安装总结',
      '09-cta': '互动引导'
    };
    const key = fileName.replace(/\.(jpg|png)$/, '');
    return `${index + 1}. ${fileName} - ${descriptions[key] || '图片'}`;
  }).join('\n') : '';

  return `📌 标题
=====================================
${title}


📝 正文
=====================================
${content}


🏷️ 话题标签
=====================================
${tags.join(' ')}


📸 图片说明
=====================================
共 ${images ? images.length : 0} 张图片，按以下顺序上传：

${imageDescriptions}


📅 创建时间
=====================================
${new Date().toLocaleString('zh-CN')}


📂 来源
=====================================
${source || '未知'}
`;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node xhs-export-to-icloud.js <payload-json-file>');
    console.log('\n或使用 --from-images <images-dir> 从图片目录导出');
    process.exit(1);
  }

  // 检查 iCloud 目录是否存在
  if (!fs.existsSync(ICLOUD_BASE)) {
    console.error('❌ iCloud 云盘目录不存在，请确保已登录 iCloud 并开启云盘功能');
    process.exit(1);
  }

  // 确保 AI 文档/小红书 目录存在
  if (!fs.existsSync(XHS_BASE_DIR)) {
    fs.mkdirSync(XHS_BASE_DIR, { recursive: true });
  }

  // 从 payload.json 导出
  const payloadFile = args[0];
  if (!fs.existsSync(payloadFile)) {
    console.error(`❌ 文件不存在: ${payloadFile}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf8'));

  const targetDir = exportToICloud({
    title: payload.title,
    content: payload.content,
    tags: payload.tags,
    images: payload.images,
    source: payload.source || '技术博客'
  });

  return targetDir;
}

module.exports = {
  exportToICloud,
  getDatePrefix,
  sanitizeTitle
};

// CLI 入口
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  });
}
