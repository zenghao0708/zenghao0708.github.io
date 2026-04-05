#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 720;
const BG = '#f7f3ea';
const INK = '#2b2620';
const MUTED = '#5f5952';
const BLUE = '#dfeafe';
const BLUE_STROKE = '#4678d4';
const GREEN = '#e7f5ea';
const GREEN_STROKE = '#3e9b60';
const ORANGE = '#fff1e1';
const ORANGE_STROKE = '#d48836';
const PURPLE = '#efe7ff';
const PURPLE_STROKE = '#8663d6';
const ROSE = '#fdeaf0';
const ROSE_STROKE = '#c95e7b';
const FONT = "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif";
const TITLE_FONT = "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif";

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rect(x, y, w, h, fill, stroke, radius = 18) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>`;
}

function text(x, y, lines, opts = {}) {
  const size = opts.size || 18;
  const weight = opts.weight || 500;
  const color = opts.color || INK;
  const lineHeight = opts.lineHeight || size * 1.45;
  const family = opts.family || (size >= 26 ? TITLE_FONT : FONT);
  const parts = [`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="${family}">`];
  lines.forEach((line, index) => {
    parts.push(`<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`);
  });
  parts.push('</text>');
  return parts.join('');
}

function line(x1, y1, x2, y2, color = INK) {
  return `<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>`;
}

function arrow(x1, y1, x2, y2, color = INK) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = 12;
  const leftX = x2 - Math.cos(angle - Math.PI / 7) * len;
  const leftY = y2 - Math.sin(angle - Math.PI / 7) * len;
  const rightX = x2 - Math.cos(angle + Math.PI / 7) * len;
  const rightY = y2 - Math.sin(angle + Math.PI / 7) * len;
  return [
    line(x1, y1, x2, y2, color),
    line(leftX, leftY, x2, y2, color),
    line(rightX, rightY, x2, y2, color)
  ].join('\n');
}

function frame(titleText, subtitle) {
  return [
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>`,
    `<rect x="20" y="20" width="${WIDTH - 40}" height="${HEIGHT - 40}" fill="none" stroke="#ddd2c2" stroke-width="1.5"/>`,
    text(58, 70, [titleText], { size: 34, weight: 700 }),
    text(60, 106, [subtitle], { size: 18, weight: 500, color: MUTED, lineHeight: 22 })
  ].join('\n');
}

function writeSvg(dir, name, body) {
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${body}</svg>\n`, 'utf8');
}

function openclawControlPlane(dir) {
  const body = `
${frame('OpenClaw 的控制平面长什么样', '它不是一个聊天壳子，而是一个 Gateway 把消息面、控制面、节点与工具统一收口')}
${rect(70, 170, 260, 120, BLUE, BLUE_STROKE)}
${text(100, 214, ['消息渠道'], { size: 26, weight: 700 })}
${text(100, 248, ['WhatsApp / Telegram / Slack /', 'Discord / Signal / WebChat'], { size: 16, weight: 500, color: MUTED, lineHeight: 20 })}

${rect(410, 160, 380, 180, GREEN, GREEN_STROKE)}
${text(452, 214, ['Gateway'], { size: 30, weight: 700 })}
${text(452, 248, ['控制平面单一真源：', 'sessions / presence / config / tools / hooks'], { size: 17, weight: 500, color: MUTED, lineHeight: 22 })}
${text(452, 304, ['WS + HTTP 同端口复用'], { size: 18, weight: 700, color: INK })}

${rect(870, 170, 250, 110, ORANGE, ORANGE_STROKE)}
${text(902, 212, ['Control UI / 节点'], { size: 24, weight: 700 })}
${text(902, 246, ['Web 控制台 / iOS / Android / macOS'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(180, 440, 250, 110, PURPLE, PURPLE_STROKE)}
${text(210, 482, ['Skills / 插件'], { size: 24, weight: 700 })}
${text(210, 516, ['bundled / managed / workspace'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(500, 440, 240, 110, ROSE, ROSE_STROKE)}
${text(532, 482, ['Memory'], { size: 24, weight: 700 })}
${text(532, 516, ['真源文件 + 可重建索引'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(810, 440, 250, 110, BLUE, BLUE_STROKE)}
${text(842, 482, ['运维面'], { size: 24, weight: 700 })}
${text(842, 516, ['config reload / logs / pairing'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${arrow(330, 230, 410, 230)}
${arrow(790, 230, 870, 230)}
${arrow(530, 340, 310, 440)}
${arrow(600, 340, 620, 440)}
${arrow(690, 340, 930, 440)}
`;
  writeSvg(dir, 'openclaw-control-plane.svg', body);
}

function openclawHomeLayout(dir) {
  const body = `
${frame('~/.openclaw 里哪些是“真源”', '排障和备份时，优先级最高的是配置、会话转录、工作区记忆和设备配对信息')}
${rect(90, 170, 320, 140, BLUE, BLUE_STROKE)}
${text(120, 214, ['配置层'], { size: 26, weight: 700 })}
${text(120, 248, ['openclaw.json / config.json', '迁移与兼容先看这里'], { size: 16, weight: 500, color: MUTED, lineHeight: 20 })}

${rect(450, 170, 320, 140, GREEN, GREEN_STROKE)}
${text(480, 214, ['会话与工作区'], { size: 26, weight: 700 })}
${text(480, 248, ['agents/main/sessions', 'workspace/memory / AGENTS.md'], { size: 16, weight: 500, color: MUTED, lineHeight: 20 })}

${rect(810, 170, 300, 140, ORANGE, ORANGE_STROKE)}
${text(842, 214, ['配对与定时任务'], { size: 26, weight: 700 })}
${text(842, 248, ['devices / cron', '远程 UI、节点与自动任务都看这里'], { size: 15, weight: 500, color: MUTED, lineHeight: 20 })}

${rect(240, 430, 300, 120, PURPLE, PURPLE_STROKE)}
${text(272, 472, ['可重建层'], { size: 24, weight: 700 })}
${text(272, 506, ['memory/main.sqlite', '索引坏了可以重建'], { size: 16, weight: 500, color: MUTED, lineHeight: 20 })}

${rect(660, 430, 300, 120, ROSE, ROSE_STROKE)}
${text(692, 472, ['排障顺序'], { size: 24, weight: 700 })}
${text(692, 506, ['先看配置 -> 再看日志 ->', '再还原 sessions / memory'], { size: 16, weight: 500, color: MUTED, lineHeight: 20 })}

${arrow(250, 310, 360, 430)}
${arrow(610, 310, 760, 430)}
${arrow(930, 310, 850, 430)}
`;
  writeSvg(dir, 'openclaw-home-layout.svg', body);
}

function macCliStack(dir) {
  const body = `
${frame('AI 编码工作流的命令行分层', '这套组合不是“换一堆新工具”，而是把文件、历史、目录、会话和运行时的职责拆清楚')}
${rect(100, 170, 1000, 86, BLUE, BLUE_STROKE)}
${text(138, 208, ['终端入口：Ghostty / zsh'], { size: 26, weight: 700 })}
${text(138, 236, ['交互界面和 shell 启动链路，决定体感的第一层'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(100, 292, 220, 110, GREEN, GREEN_STROKE)}
${text(130, 334, ['fzf'], { size: 26, weight: 700 })}
${text(130, 368, ['模糊搜索 / 历史命令 / 目录过滤'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(360, 292, 220, 110, ORANGE, ORANGE_STROKE)}
${text(390, 334, ['Yazi'], { size: 26, weight: 700 })}
${text(390, 368, ['文件浏览 / 批量操作 / 预览'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(620, 292, 220, 110, PURPLE, PURPLE_STROKE)}
${text(650, 334, ['Tmux'], { size: 26, weight: 700 })}
${text(650, 368, ['会话复用 / 后台任务 / 面板编排'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(880, 292, 220, 110, ROSE, ROSE_STROKE)}
${text(910, 334, ['mise'], { size: 26, weight: 700 })}
${text(910, 368, ['Node / Ruby 等运行时所有权'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(200, 480, 800, 120, BLUE, BLUE_STROKE)}
${text(236, 522, ['真正的收益不是“命令更多”，而是：AI 给出下一步以后，你能更快定位文件、切会话、查历史、跑命令。'], { size: 18, weight: 600, color: INK, lineHeight: 22 })}

${arrow(210, 256, 210, 292)}
${arrow(470, 256, 470, 292)}
${arrow(730, 256, 730, 292)}
${arrow(990, 256, 990, 292)}
`;
  writeSvg(dir, 'mac-cli-stack.svg', body);
}

function macCliWorkflow(dir) {
  const body = `
${frame('一次 AI 编码任务如何在终端里流动', '目标不是把所有能力塞进一个工具，而是让搜索、编辑、运行、观察形成顺滑链路')}
${rect(90, 190, 220, 100, BLUE, BLUE_STROKE)}
${text(120, 230, ['AI 给出目标'], { size: 24, weight: 700 })}
${text(120, 262, ['文件名 / 命令 / 修改建议'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(360, 190, 220, 100, GREEN, GREEN_STROKE)}
${text(390, 230, ['fzf / Yazi 定位'], { size: 24, weight: 700 })}
${text(390, 262, ['先找到文件，再决定怎么改'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(630, 190, 220, 100, ORANGE, ORANGE_STROKE)}
${text(660, 230, ['编辑与运行'], { size: 24, weight: 700 })}
${text(660, 262, ['Ghostty / 编辑器 / shell 命令'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(900, 190, 220, 100, PURPLE, PURPLE_STROKE)}
${text(930, 230, ['Tmux 观察'], { size: 24, weight: 700 })}
${text(930, 262, ['日志 / 测试 / server 持续运行'], { size: 15, weight: 500, color: MUTED, lineHeight: 19 })}

${rect(280, 430, 640, 120, ROSE, ROSE_STROKE)}
${text(318, 472, ['真正高效的不是单个工具，而是“定位 -> 编辑 -> 运行 -> 观察”这条链路足够短。'], { size: 19, weight: 600, color: INK, lineHeight: 23 })}

${arrow(310, 240, 360, 240)}
${arrow(580, 240, 630, 240)}
${arrow(850, 240, 900, 240)}
${arrow(720, 290, 720, 430)}
`;
  writeSvg(dir, 'mac-cli-workflow.svg', body);
}

function macCliMatrix(dir) {
  const body = `
${frame('AI 编码场景下，工具到底各管什么', '不要把所有问题都交给一个终端插件；更稳的方式是按问题类型选工具')}
${rect(90, 180, 220, 90, BLUE, BLUE_STROKE)}
${text(120, 220, ['文件定位'], { size: 24, weight: 700 })}
${text(120, 250, ['fzf / Yazi'], { size: 16, weight: 500, color: MUTED, lineHeight: 20 })}

${rect(350, 180, 220, 90, GREEN, GREEN_STROKE)}
${text(380, 220, ['会话管理'], { size: 24, weight: 700 })}
${text(380, 250, ['Tmux'], { size: 16, weight: 500, color: MUTED, lineHeight: 20 })}

${rect(610, 180, 220, 90, ORANGE, ORANGE_STROKE)}
${text(640, 220, ['运行时所有权'], { size: 24, weight: 700 })}
${text(640, 250, ['mise'], { size: 16, weight: 500, color: MUTED, lineHeight: 20 })}

${rect(870, 180, 220, 90, PURPLE, PURPLE_STROKE)}
${text(900, 220, ['终端体验'], { size: 24, weight: 700 })}
${text(900, 250, ['Ghostty / zsh'], { size: 16, weight: 500, color: MUTED, lineHeight: 20 })}

${rect(120, 360, 960, 210, ROSE, ROSE_STROKE)}
${text(156, 408, ['一个很实际的判断标准'], { size: 28, weight: 700 })}
${text(156, 446, ['如果某个工具同时在管 prompt、插件、历史、目录跳转、Node、Ruby、会话和文件浏览，', '那它大概率已经不是“顺手”，而是在替你隐藏复杂度。'], { size: 18, weight: 500, color: MUTED, lineHeight: 24 })}
${text(156, 516, ['更稳的做法是：一类问题对应一层工具，出了问题就知道去哪个模块查。'], { size: 18, weight: 600, color: INK, lineHeight: 24 })}
`;
  writeSvg(dir, 'mac-cli-matrix.svg', body);
}

function main() {
  const openclawDir = path.resolve('blog_new/source/images/openclaw-architecture');
  const macDir = path.resolve('blog_new/source/images/mac-ai-coding-tools');
  openclawControlPlane(openclawDir);
  openclawHomeLayout(openclawDir);
  macCliStack(macDir);
  macCliWorkflow(macDir);
  macCliMatrix(macDir);
  console.log(`Generated support diagrams in:\n- ${openclawDir}\n- ${macDir}`);
}

main();
