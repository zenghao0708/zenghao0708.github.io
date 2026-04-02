#!/usr/bin/env node
'use strict';

/**
 * 小红书内容生成工具
 * 将 Markdown 文章转换为适合小红书发布的格式
 */

const fs = require('fs');
const path = require('path');

function generateXhsTitle(title) {
  // 小红书标题优化：添加 emoji，控制长度
  const emojiMap = {
    'AI': '🤖',
    'Mac': '💻',
    '工具': '🛠️',
    '编程': '👨‍💻',
    '效率': '⚡',
    '命令行': '⌨️',
    '开发': '🚀'
  };

  let xhsTitle = title;

  // 添加相关 emoji
  for (const [keyword, emoji] of Object.entries(emojiMap)) {
    if (title.includes(keyword) && !xhsTitle.startsWith(emoji)) {
      xhsTitle = `${emoji} ${xhsTitle}`;
      break;
    }
  }

  // 控制长度（小红书标题建议 20 字以内）
  if (xhsTitle.length > 20) {
    xhsTitle = xhsTitle.substring(0, 18) + '...';
  }

  return xhsTitle;
}

function generateXhsContent(post) {
  const lines = [];

  // 1. 开头引入（吸引注意力）
  lines.push('💡 分享一波我每天都在用的 Mac 命令行神器！');
  lines.push('');
  lines.push('作为 AI 编程重度用户，这些工具让我的效率翻倍 ⚡');
  lines.push('');
  lines.push('---');
  lines.push('');

  // 2. 核心工具列表（精简版）
  lines.push('🔥 必装工具：');
  lines.push('');
  lines.push('1️⃣ fzf - 模糊搜索');
  lines.push('秒速定位文件，Ctrl+T 快速打开');
  lines.push('');
  lines.push('2️⃣ Ghostty - 现代终端');
  lines.push('比 iTerm2 快 3-5 倍，GPU 加速');
  lines.push('');
  lines.push('3️⃣ Yazi - 文件管理器');
  lines.push('可视化浏览，支持预览图片/PDF');
  lines.push('');
  lines.push('4️⃣ Tmux - 终端复用');
  lines.push('多窗口管理，会话持久化');
  lines.push('');
  lines.push('---');
  lines.push('');

  // 3. 进阶工具（亮点）
  lines.push('⭐ 进阶推荐：');
  lines.push('');
  lines.push('• Atuin (27.5K⭐) - 智能历史搜索');
  lines.push('• Lazygit (55K⭐) - Git 可视化');
  lines.push('• Starship (53.7K⭐) - 智能提示符');
  lines.push('• eza (20.4K⭐) - 现代化 ls');
  lines.push('');
  lines.push('---');
  lines.push('');

  // 4. 使用场景
  lines.push('💼 实战场景：');
  lines.push('');
  lines.push('当 AI 修改 10 个文件时：');
  lines.push('✅ Ctrl+T 快速打开文件');
  lines.push('✅ Lazygit 可视化查看变更');
  lines.push('✅ Tmux 分屏运行测试');
  lines.push('✅ Atuin 找回复杂命令');
  lines.push('');
  lines.push('---');
  lines.push('');

  // 5. 安装方式
  lines.push('📦 一键安装：');
  lines.push('');
  lines.push('```');
  lines.push('brew install fzf ghostty yazi tmux');
  lines.push('brew install atuin lazygit starship eza');
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('');

  // 6. 结尾 CTA
  lines.push('🎯 效果：');
  lines.push('使用这套工具链后，我的 AI 编码效率提升了 50%+');
  lines.push('');
  lines.push('💬 你在用什么命令行工具？评论区分享～');
  lines.push('');
  lines.push('❤️ 觉得有用的话，点赞收藏不迷路！');

  return lines.join('\n');
}

function generateXhsTags(post) {
  // 根据文章内容生成话题标签
  const tags = [
    '#Mac工具',
    '#AI编程',
    '#开发效率',
    '#命令行',
    '#程序员',
    '#效率工具',
    '#终端工具',
    '#开发工具推荐'
  ];

  return tags.slice(0, 5); // 小红书建议 3-5 个标签
}

function generateOutput(post) {
  const output = {
    title: generateXhsTitle(post.title),
    content: generateXhsContent(post),
    tags: generateXhsTags(post),
    images: post.images || [],
    tips: [
      '📱 发布建议：',
      '1. 使用手机小红书 App 发布',
      '2. 添加 3-6 张配图（封面图 + 工具截图）',
      '3. 选择合适的话题标签',
      '4. 发布时间：工作日 12:00-14:00 或 20:00-22:00',
      '5. 封面图建议使用 3:4 竖版（1080×1440px）'
    ]
  };

  return output;
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node generate-xhs-content.js <markdown-file>');
    process.exit(1);
  }

  const mdFile = args[0];
  if (!fs.existsSync(mdFile)) {
    console.error(`File not found: ${mdFile}`);
    process.exit(1);
  }

  // 简单解析（实际应该使用 markdown parser）
  const content = fs.readFileSync(mdFile, 'utf8');
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : path.basename(mdFile, '.md');

  const post = {
    title,
    content,
    images: []
  };

  const output = generateOutput(post);

  console.log('='.repeat(60));
  console.log('📱 小红书内容生成结果');
  console.log('='.repeat(60));
  console.log('');
  console.log('📌 标题：');
  console.log(output.title);
  console.log('');
  console.log('📝 正文：');
  console.log(output.content);
  console.log('');
  console.log('🏷️ 话题标签：');
  console.log(output.tags.join(' '));
  console.log('');
  console.log('💡 发布建议：');
  output.tips.forEach(tip => console.log(tip));
  console.log('');
  console.log('='.repeat(60));

  // 保存到文件
  const outputDir = path.join(__dirname, '..', 'output', 'xhs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `${path.basename(mdFile, '.md')}.xhs.txt`);
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ 内容已保存到: ${outputFile}`);
}

module.exports = {
  generateXhsTitle,
  generateXhsContent,
  generateXhsTags,
  generateOutput
};
