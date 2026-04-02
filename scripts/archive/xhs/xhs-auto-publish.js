#!/usr/bin/env node
'use strict';

/**
 * 小红书定时自动发布工具
 * 支持立即发布或定时发布
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 生成小红书发布 payload
 */
function generateXhsPayload(imagesDir) {
  // 获取所有图片
  const images = fs.readdirSync(imagesDir)
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
    .sort()
    .map(f => path.join(imagesDir, f));

  if (images.length === 0) {
    throw new Error('没有找到图片文件');
  }

  // 精简文案
  const content = `💻 Mac AI 编码必备工具分享！

作为 AI 编程重度用户，这些命令行工具让我效率翻倍 ⚡

🔥 核心 4 件套：
1️⃣ fzf - 模糊搜索，秒速定位文件
2️⃣ Ghostty - 比 iTerm2 快 3 倍
3️⃣ Yazi - 可视化文件管理
4️⃣ Tmux - 终端复用神器

⭐ 进阶工具：
Atuin (27.5K⭐) | Lazygit (55K⭐)
Starship (53.7K⭐) | eza (20.4K⭐)

📦 一键安装：
brew install fzf ghostty yazi tmux

🎯 效果：AI 编码效率提升 50%+

💬 你在用什么工具？评论区见～
❤️ 点赞收藏不迷路！`;

  const payload = {
    title: '💻 Mac AI 编码神器｜12 个命令行工具',
    content: content,
    images: images,
    tags: ['#Mac工具', '#AI编程', '#开发效率', '#命令行', '#程序员']
  };

  return payload;
}

/**
 * 保存 payload 到文件
 */
function savePayload(payload, outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`✅ Payload 已保存: ${outputPath}`);
  return outputPath;
}

/**
 * 创建定时发布任务（使用 cron）
 */
function schedulePublish(payloadPath, publishTime) {
  // publishTime 格式: "2026-03-23 12:30"
  const [date, time] = publishTime.split(' ');
  const [year, month, day] = date.split('-');
  const [hour, minute] = time.split(':');

  // 创建 cron 表达式
  const cronExpression = `${minute} ${hour} ${day} ${month} *`;

  // 创建发布脚本
  const scriptPath = path.join(__dirname, 'xhs-publish-scheduled.sh');
  const scriptContent = `#!/bin/bash
# 小红书定时发布脚本
# 发布时间: ${publishTime}

cd "${path.dirname(payloadPath)}"
node "${path.join(__dirname, 'xhs-publish.js')}" "${payloadPath}"
`;

  fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

  console.log('\n⏰ 定时发布任务已创建');
  console.log(`📅 发布时间: ${publishTime}`);
  console.log(`📝 Cron 表达式: ${cronExpression}`);
  console.log(`📜 脚本路径: ${scriptPath}`);
  console.log('\n💡 使用方法：');
  console.log(`1. 手动添加到 crontab:`);
  console.log(`   ${cronExpression} ${scriptPath}`);
  console.log(`2. 或使用 at 命令:`);
  console.log(`   echo "${scriptPath}" | at ${hour}:${minute} ${month}/${day}/${year}`);

  return {
    cronExpression,
    scriptPath,
    publishTime
  };
}

/**
 * 使用 at 命令创建定时任务
 */
function scheduleWithAt(scriptPath, publishTime) {
  try {
    // publishTime 格式: "2026-03-23 12:30"
    const [date, time] = publishTime.split(' ');
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');

    // 使用 at 命令
    const atTime = `${hour}:${minute} ${month}/${day}/${year}`;
    const cmd = `echo "${scriptPath}" | at ${atTime}`;

    console.log(`\n⏰ 正在创建定时任务...`);
    console.log(`命令: ${cmd}`);

    execSync(cmd, { stdio: 'inherit' });

    console.log(`✅ 定时任务创建成功！`);
    console.log(`📅 发布时间: ${publishTime}`);
    console.log(`\n查看定时任务: atq`);
    console.log(`删除定时任务: atrm <job-id>`);

    return true;
  } catch (error) {
    console.error(`❌ 创建定时任务失败: ${error.message}`);
    console.log(`\n💡 请手动创建定时任务:`);
    console.log(`echo "${scriptPath}" | at ${publishTime}`);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  // 解析参数
  let scheduleTime = null;
  let publishNow = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--schedule' || args[i] === '-s') {
      scheduleTime = args[i + 1];
      i++;
    } else if (args[i] === '--now' || args[i] === '-n') {
      publishNow = true;
    }
  }

  // 默认定时到明天中午 12:30
  if (!scheduleTime && !publishNow) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 30, 0, 0);
    scheduleTime = tomorrow.toISOString().slice(0, 16).replace('T', ' ');
  }

  console.log('🎨 小红书自动发布工具\n');

  // 1. 生成 payload
  const imagesDir = path.join(__dirname, '..', 'output', 'xhs', 'images');
  if (!fs.existsSync(imagesDir)) {
    console.error(`❌ 图片目录不存在: ${imagesDir}`);
    console.log('请先运行: node publish/tools/screenshot-xhs-cards.js');
    process.exit(1);
  }

  const payload = generateXhsPayload(imagesDir);
  console.log(`📸 找到 ${payload.images.length} 张图片`);
  console.log(`📝 标题: ${payload.title}`);
  console.log(`📄 正文长度: ${payload.content.length} 字符`);

  // 2. 保存 payload
  const payloadPath = path.join(__dirname, '..', 'output', 'xhs', 'payload.json');
  savePayload(payload, payloadPath);

  // 3. 立即发布或定时发布
  if (publishNow) {
    console.log('\n🚀 立即发布到小红书...');
    console.log('⚠️  注意：需要先安装 puppeteer');
    console.log('npm install puppeteer\n');

    // 检查是否安装了 puppeteer
    try {
      require.resolve('puppeteer');
      const publishScript = path.join(__dirname, 'xhs-publish.js');
      execSync(`node "${publishScript}" "${payloadPath}"`, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ 发布失败，请先安装依赖：npm install puppeteer');
      console.log('\n💡 或者使用手动发布：');
      console.log('1. 打开小红书 App');
      console.log('2. 上传图片（按顺序）');
      console.log('3. 复制标题和正文');
      console.log('4. 添加话题标签');
    }
  } else {
    console.log('\n⏰ 创建定时发布任务...');
    const schedule = schedulePublish(payloadPath, scheduleTime);

    // 尝试使用 at 命令
    scheduleWithAt(schedule.scriptPath, scheduleTime);

    console.log('\n📋 发布内容预览：');
    console.log('─'.repeat(60));
    console.log(`标题: ${payload.title}`);
    console.log(`\n正文:\n${payload.content}`);
    console.log(`\n话题: ${payload.tags.join(' ')}`);
    console.log(`\n图片: ${payload.images.length} 张`);
    console.log('─'.repeat(60));
  }

  console.log('\n✅ 准备完成！');
}

// CLI 入口
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  });
}
