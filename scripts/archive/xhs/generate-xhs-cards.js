#!/usr/bin/env node
'use strict';

/**
 * 小红书多图卡片生成工具
 * 将长文章转换为 3-9 张小红书风格的卡片图片
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

// 小红书推荐尺寸：3:4 竖版
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1440;

// 配色方案
const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#00d9ff',
  text: '#1a1a1a',
  textLight: '#666666',
  background: '#ffffff',
  cardBg: '#f8f9fa'
};

/**
 * 生成封面卡片（第1张）
 */
async function generateCoverCard(outputPath) {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // 渐变背景
  const gradient = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  gradient.addColorStop(0, COLORS.primary);
  gradient.addColorStop(1, COLORS.secondary);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 标题
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Mac AI 编码神器', CARD_WIDTH / 2, 300);

  // 副标题
  ctx.font = '50px sans-serif';
  ctx.fillText('12 个命令行工具推荐', CARD_WIDTH / 2, 400);

  // 底部装饰
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText('效率提升 50%+', CARD_WIDTH / 2, CARD_HEIGHT - 200);

  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ 生成封面卡片: ${outputPath}`);
}

/**
 * 生成工具介绍卡片（第2-5张）
 */
async function generateToolCard(tool, index, outputPath) {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 顶部渐变条
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, 0);
  gradient.addColorStop(0, COLORS.primary);
  gradient.addColorStop(1, COLORS.secondary);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, 150);

  // 序号
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${index}`, 80, 100);

  // 工具名称
  ctx.font = 'bold 70px sans-serif';
  ctx.fillText(tool.name, 200, 100);

  // 工具描述
  ctx.fillStyle = COLORS.text;
  ctx.font = '45px sans-serif';
  ctx.textAlign = 'left';

  const lines = wrapText(ctx, tool.description, CARD_WIDTH - 160);
  let y = 300;
  lines.forEach(line => {
    ctx.fillText(line, 80, y);
    y += 70;
  });

  // 特性列表
  ctx.fillStyle = COLORS.textLight;
  ctx.font = '40px sans-serif';
  y += 50;

  tool.features.forEach(feature => {
    ctx.fillText(`✓ ${feature}`, 100, y);
    y += 60;
  });

  // 底部安装命令
  ctx.fillStyle = COLORS.cardBg;
  ctx.fillRect(0, CARD_HEIGHT - 250, CARD_WIDTH, 250);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 35px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('安装命令', CARD_WIDTH / 2, CARD_HEIGHT - 180);

  ctx.font = '40px monospace';
  ctx.fillStyle = COLORS.primary;
  ctx.fillText(tool.install, CARD_WIDTH / 2, CARD_HEIGHT - 100);

  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ 生成工具卡片 ${index}: ${outputPath}`);
}

/**
 * 生成对比卡片（第6张）
 */
async function generateComparisonCard(outputPath) {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 标题
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('传统工具 vs 现代工具', CARD_WIDTH / 2, 150);

  // 对比列表
  const comparisons = [
    { old: 'ls', new: 'eza', desc: '彩色文件列表' },
    { old: 'cat', new: 'bat', desc: '语法高亮查看' },
    { old: 'find', new: 'fd', desc: '更快的搜索' },
    { old: 'grep', new: 'rg', desc: '更快的内容搜索' }
  ];

  let y = 300;
  comparisons.forEach(comp => {
    // 旧工具
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '45px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(comp.old, CARD_WIDTH / 2 - 100, y);

    // 箭头
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('→', CARD_WIDTH / 2, y);

    // 新工具
    ctx.fillStyle = COLORS.primary;
    ctx.font = 'bold 45px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(comp.new, CARD_WIDTH / 2 + 100, y);

    // 描述
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '35px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(comp.desc, CARD_WIDTH / 2, y + 50);

    y += 200;
  });

  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ 生成对比卡片: ${outputPath}`);
}

/**
 * 生成使用场景卡片（第7张）
 */
async function generateScenarioCard(outputPath) {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 标题
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AI 编码实战场景', CARD_WIDTH / 2, 150);

  // 场景描述
  const scenarios = [
    {
      title: '场景 1：AI 修改 10 个文件',
      steps: [
        'Ctrl+T 快速打开文件',
        'Lazygit 可视化查看变更',
        'Tmux 分屏运行测试'
      ]
    },
    {
      title: '场景 2：调试复杂问题',
      steps: [
        'Atuin 找回复杂命令',
        'Yazi 快速定位文件',
        'Starship 显示上下文'
      ]
    }
  ];

  let y = 300;
  scenarios.forEach(scenario => {
    // 场景标题
    ctx.fillStyle = COLORS.primary;
    ctx.font = 'bold 45px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(scenario.title, 80, y);
    y += 80;

    // 步骤
    ctx.fillStyle = COLORS.text;
    ctx.font = '40px sans-serif';
    scenario.steps.forEach(step => {
      ctx.fillText(`• ${step}`, 120, y);
      y += 70;
    });

    y += 100;
  });

  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ 生成场景卡片: ${outputPath}`);
}

/**
 * 生成总结卡片（第8张）
 */
async function generateSummaryCard(outputPath) {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // 渐变背景
  const gradient = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  gradient.addColorStop(0, COLORS.primary);
  gradient.addColorStop(1, COLORS.secondary);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 标题
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 70px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('一键安装全套工具', CARD_WIDTH / 2, 300);

  // 安装命令
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(100, 450, CARD_WIDTH - 200, 400);

  ctx.fillStyle = COLORS.text;
  ctx.font = '40px monospace';
  ctx.textAlign = 'left';

  const commands = [
    'brew install fzf',
    'brew install ghostty',
    'brew install yazi',
    'brew install tmux',
    'brew install atuin',
    'brew install lazygit',
    'brew install starship',
    'brew install eza'
  ];

  let y = 530;
  commands.forEach(cmd => {
    ctx.fillText(cmd, 150, y);
    y += 70;
  });

  // 底部提示
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('效率提升 50%+', CARD_WIDTH / 2, CARD_HEIGHT - 150);

  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ 生成总结卡片: ${outputPath}`);
}

/**
 * 生成互动卡片（第9张）
 */
async function generateCTACard(outputPath) {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 大emoji
  ctx.font = '200px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💬', CARD_WIDTH / 2, 400);

  // 互动文字
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText('你在用什么工具？', CARD_WIDTH / 2, 600);

  ctx.font = '50px sans-serif';
  ctx.fillStyle = COLORS.textLight;
  ctx.fillText('评论区分享你的神器～', CARD_WIDTH / 2, 700);

  // 底部提示
  ctx.font = 'bold 55px sans-serif';
  ctx.fillStyle = COLORS.primary;
  ctx.fillText('❤️ 点赞收藏不迷路', CARD_WIDTH / 2, CARD_HEIGHT - 200);

  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ 生成互动卡片: ${outputPath}`);
}

/**
 * 文本换行
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split('');
  const lines = [];
  let currentLine = '';

  words.forEach(char => {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * 主函数
 */
async function main() {
  const outputDir = path.join(__dirname, '..', 'output', 'xhs', 'cards');

  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎨 开始生成小红书卡片图片...\n');

  // 1. 封面卡片（使用用户提供的图片）
  const userCover = '/Users/zenghao/Downloads/xhs-mac-ai-tools.jpg';
  if (fs.existsSync(userCover)) {
    const coverOutput = path.join(outputDir, '01-cover.jpg');
    fs.copyFileSync(userCover, coverOutput);
    console.log(`✅ 使用用户封面: ${coverOutput}`);
  }

  // 2-5. 核心工具卡片
  const coreTools = [
    {
      name: 'fzf',
      description: '模糊搜索神器，秒速定位文件和命令',
      features: [
        'Ctrl+T 快速打开文件',
        'Ctrl+R 智能历史搜索',
        'Alt+C 目录跳转'
      ],
      install: 'brew install fzf'
    },
    {
      name: 'Ghostty',
      description: '现代终端模拟器，性能强悍',
      features: [
        '比 iTerm2 快 3-5 倍',
        'GPU 加速渲染',
        '原生 macOS 体验'
      ],
      install: 'brew install ghostty'
    },
    {
      name: 'Yazi',
      description: '终端文件管理器，可视化操作',
      features: [
        '预览图片/PDF/视频',
        '批量重命名',
        'Vim 风格操作'
      ],
      install: 'brew install yazi'
    },
    {
      name: 'Lazygit',
      description: 'Git 可视化操作，告别复杂命令',
      features: [
        '交互式暂存',
        '可视化 diff',
        '冲突解决'
      ],
      install: 'brew install lazygit'
    }
  ];

  for (let i = 0; i < coreTools.length; i++) {
    const outputPath = path.join(outputDir, `0${i + 2}-tool-${coreTools[i].name}.png`);
    await generateToolCard(coreTools[i], i + 1, outputPath);
  }

  // 6. 对比卡片
  const comparisonPath = path.join(outputDir, '06-comparison.png');
  await generateComparisonCard(comparisonPath);

  // 7. 场景卡片
  const scenarioPath = path.join(outputDir, '07-scenario.png');
  await generateScenarioCard(scenarioPath);

  // 8. 总结卡片
  const summaryPath = path.join(outputDir, '08-summary.png');
  await generateSummaryCard(summaryPath);

  // 9. 互动卡片
  const ctaPath = path.join(outputDir, '09-cta.png');
  await generateCTACard(ctaPath);

  console.log('\n✅ 所有卡片生成完成！');
  console.log(`📂 输出目录: ${outputDir}`);
  console.log('\n📱 小红书发布建议：');
  console.log('1. 上传 9 张图片（按顺序）');
  console.log('2. 标题：💻 Mac AI 编码神器｜12 个命令行工具');
  console.log('3. 正文：简短介绍 + 话题标签');
  console.log('4. 话题：#Mac工具 #AI编程 #开发效率 #命令行 #程序员');
}

// 导出函数
module.exports = {
  generateCoverCard,
  generateToolCard,
  generateComparisonCard,
  generateScenarioCard,
  generateSummaryCard,
  generateCTACard
};

// CLI 入口
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  });
}
