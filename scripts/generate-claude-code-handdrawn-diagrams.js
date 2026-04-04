#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 760;
const OUT_DIR = path.resolve('blog_new/source/images/claude-code-source-deep-dive');
const HAND_FAMILY = "'Comic Sans MS', 'Marker Felt', 'Kaiti SC', 'STKaiti', 'LXGW WenKai', 'PingFang SC', sans-serif";
const BODY_FAMILY = "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

const COLORS = {
  bg: '#f8f3ea',
  panel: '#fffdf8',
  ink: '#2b2620',
  muted: '#5a544c',
  blueFill: '#e7f0ff',
  blueStroke: '#4678d4',
  greenFill: '#ebf8ee',
  greenStroke: '#3e9b60',
  orangeFill: '#fff1e2',
  orangeStroke: '#d07d38',
  purpleFill: '#f1ebff',
  purpleStroke: '#8761d6',
  roseFill: '#ffecef',
  roseStroke: '#ce5d7b',
  chipFill: '#fffdfa',
  chipStroke: '#93877a',
  shadow: '#d9d1c4'
};

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function jitter(rng, amt) {
  return (rng() - 0.5) * 2 * amt;
}

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function roundedRectPath(x, y, w, h, r, rng, amount = 2.8) {
  const left = x + jitter(rng, amount);
  const top = y + jitter(rng, amount);
  const right = x + w + jitter(rng, amount);
  const bottom = y + h + jitter(rng, amount);
  const rr = Math.max(8, r + jitter(rng, amount * 0.8));

  return [
    `M ${left + rr} ${top}`,
    `L ${right - rr} ${top + jitter(rng, amount)}`,
    `Q ${right} ${top} ${right} ${top + rr}`,
    `L ${right + jitter(rng, amount)} ${bottom - rr}`,
    `Q ${right} ${bottom} ${right - rr} ${bottom}`,
    `L ${left + rr} ${bottom + jitter(rng, amount)}`,
    `Q ${left} ${bottom} ${left} ${bottom - rr}`,
    `L ${left + jitter(rng, amount)} ${top + rr}`,
    `Q ${left} ${top} ${left + rr} ${top}`,
    'Z'
  ].join(' ');
}

function sketchRect(x, y, w, h, opts = {}) {
  const {
    seed = 1,
    radius = 16,
    fill = COLORS.panel,
    stroke = COLORS.ink,
    strokeWidth = 2.2,
    fillOpacity = 0.98
  } = opts;
  const rng1 = mulberry32(seed);
  const rng2 = mulberry32(seed + 97);
  const d1 = roundedRectPath(x, y, w, h, radius, rng1, 3.6);
  const d2 = roundedRectPath(x, y, w, h, radius, rng2, 2.4);
  return [
    `<path d="${d1}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="none"/>`,
    `<path d="${d1}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${d2}" fill="none" stroke="${stroke}" stroke-width="${Math.max(1, strokeWidth * 0.72)}" opacity="0.42" stroke-linecap="round" stroke-linejoin="round"/>`
  ].join('\n');
}

function textBlock(x, y, lines, opts = {}) {
  const {
    size = 18,
    weight = 500,
    color = COLORS.ink,
    lineHeight = size * 1.5,
    family = size >= 22 || weight >= 700 ? HAND_FAMILY : BODY_FAMILY
  } = opts;
  const out = [`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="${family}">`];
  lines.forEach((line, index) => {
    const dy = index === 0 ? 0 : lineHeight;
    out.push(`<tspan x="${x}" dy="${dy}">${esc(line)}</tspan>`);
  });
  out.push('</text>');
  return out.join('');
}

function handPath(d, opts = {}) {
  const {
    stroke = COLORS.ink,
    strokeWidth = 2.4,
    opacity = 1,
    secondOpacity = 0.45,
    dx = 1.9,
    dy = -1.1,
    dasharray = ''
  } = opts;
  const dash = dasharray ? ` stroke-dasharray="${dasharray}"` : '';
  return [
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"${dash}/>`,
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${Math.max(1, strokeWidth * 0.72)}" stroke-linecap="round" stroke-linejoin="round" opacity="${secondOpacity}" transform="translate(${dx} ${dy})"${dash}/>`
  ].join('\n');
}

function arrowHead(x, y, angleDeg, opts = {}) {
  const { stroke = COLORS.ink, length = 13, spread = 28, strokeWidth = 2.4 } = opts;
  const angle = (angleDeg * Math.PI) / 180;
  const left = angle + (Math.PI * spread) / 180;
  const right = angle - (Math.PI * spread) / 180;
  const x1 = x - Math.cos(left) * length;
  const y1 = y - Math.sin(left) * length;
  const x2 = x - Math.cos(right) * length;
  const y2 = y - Math.sin(right) * length;
  return [
    handPath(`M ${x1} ${y1} L ${x} ${y} L ${x2} ${y2}`, {
      stroke,
      strokeWidth,
      secondOpacity: 0.35,
      dx: 0.8,
      dy: -0.5
    })
  ].join('\n');
}

function arrowPath(d, headX, headY, angleDeg, opts = {}) {
  return `${handPath(d, opts)}\n${arrowHead(headX, headY, angleDeg, opts)}`;
}

function paperFrame(title, subtitle) {
  const titleBlock = textBlock(58, 72, [title], { size: 34, weight: 700, color: COLORS.ink });
  const subBlock = textBlock(60, 106, [subtitle], { size: 18, weight: 500, color: COLORS.muted, lineHeight: 22 });
  return `
<rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}"/>
<path d="M 24 24 L 1178 18 L 1172 742 L 28 736 Z" fill="none" stroke="${COLORS.shadow}" stroke-width="1.4" opacity="0.8"/>
${titleBlock}
${subBlock}
`;
}

function chip(x, y, w, h, label, seed) {
  return `
${sketchRect(x, y, w, h, { seed, radius: 10, fill: COLORS.chipFill, stroke: COLORS.chipStroke, strokeWidth: 1.6 })}
${textBlock(x + 16, y + 23, [label], { size: 14, weight: 600, color: COLORS.muted, lineHeight: 18 })}
`;
}

function writeSvg(fileName, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
${body}
</svg>
`;
  fs.writeFileSync(path.join(OUT_DIR, fileName), svg, 'utf8');
}

function architectureOverview() {
  const body = `
${paperFrame(
  'Claude Code 源码结构总览',
  'Claude Code 更像分层装配的工程系统，而不是“终端里塞了个模型”'
)}
${sketchRect(58, 144, 1082, 564, { seed: 11, radius: 22, fill: COLORS.panel, stroke: COLORS.ink, strokeWidth: 2.5 })}

${sketchRect(108, 188, 984, 88, { seed: 21, radius: 16, fill: COLORS.blueFill, stroke: COLORS.blueStroke })}
${textBlock(136, 225, ['1. 交互入口层'], { size: 24, weight: 700 })}
${textBlock(136, 254, ['main.tsx / REPL / SDK / slash commands / Ink UI'], { size: 16, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(108, 304, 984, 108, { seed: 41, radius: 16, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(136, 342, ['2. Agent Runtime 层'], { size: 24, weight: 700 })}
${textBlock(136, 368, ['QueryEngine + query.ts 主循环：system prompt 组装、', '消息归一化、流式输出、tool use、错误恢复'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(136, 397, ['这是 Claude Code 的中枢。UI 和 headless 模式，最终都要落到这一层。'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(108, 439, 984, 118, { seed: 51, radius: 16, fill: COLORS.orangeFill, stroke: COLORS.orangeStroke })}
${textBlock(136, 477, ['3. 能力执行层'], { size: 24, weight: 700 })}
${textBlock(136, 499, ['Bash / Read / Edit / Write / Web / Agent / MCP / Worktree / Plan / Task'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(136, 526, ['重点不在工具数量，而在并发安全、权限检查、sandbox 与执行秩序。'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(108, 584, 984, 88, { seed: 71, radius: 16, fill: COLORS.purpleFill, stroke: COLORS.purpleStroke })}
${textBlock(136, 620, ['4. 系统服务层'], { size: 24, weight: 700 })}
${textBlock(136, 649, ['compact / permissions / MCP / plugins / skills / remote / team memory'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${arrowPath('M 603 278 L 603 304', 603, 304, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 603 412 L 603 439', 603, 439, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 603 557 L 603 584', 603, 584, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}

${textBlock(84, 701, ['读图方式：从上往下看，越往上越接近用户体验，越往下越接近 Claude Code 真正“更好用”的工程底座。'], { size: 13, weight: 500, color: COLORS.muted, lineHeight: 17 })}
`;
  writeSvg('cc-architecture-overview.svg', body);
}

function queryLoop() {
  const body = `
${paperFrame('Claude Code 主查询循环', '真正决定体验的不是“单次问答”，而是一个持续管理上下文、工具和恢复逻辑的 agent loop')}

${sketchRect(88, 164, 264, 98, { seed: 101, radius: 18, fill: COLORS.blueFill, stroke: COLORS.blueStroke })}
${textBlock(120, 205, ['用户输入'], { size: 24, weight: 700 })}
${textBlock(120, 235, ['prompt / slash command / SDK 消息'], { size: 16, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(468, 164, 264, 98, { seed: 102, radius: 18, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(500, 205, ['预处理'], { size: 24, weight: 700 })}
${textBlock(500, 233, ['命令解析、消息归一化、', 'system prompt 拼装'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(848, 164, 264, 98, { seed: 103, radius: 18, fill: COLORS.orangeFill, stroke: COLORS.orangeStroke })}
${textBlock(880, 205, ['query.ts'], { size: 24, weight: 700 })}
${textBlock(880, 233, ['进入主代理循环，准备', '流式请求与状态机'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(848, 334, 264, 98, { seed: 104, radius: 18, fill: COLORS.purpleFill, stroke: COLORS.purpleStroke })}
${textBlock(880, 375, ['模型输出流'], { size: 24, weight: 700 })}
${textBlock(880, 401, ['assistant delta / tool_use /', 'error / thinking'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(468, 334, 264, 98, { seed: 105, radius: 18, fill: COLORS.orangeFill, stroke: COLORS.orangeStroke })}
${textBlock(500, 375, ['工具执行'], { size: 24, weight: 700 })}
${textBlock(500, 401, ['StreamingToolExecutor /', 'runTools / permission'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(88, 334, 264, 98, { seed: 106, radius: 18, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(120, 375, ['结果回写'], { size: 24, weight: 700 })}
${textBlock(120, 401, ['tool_result / 新消息 /', '上下文更新 / UI 流式显示'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(278, 518, 644, 124, { seed: 107, radius: 20, fill: COLORS.blueFill, stroke: COLORS.blueStroke })}
${textBlock(310, 561, ['后台守护逻辑'], { size: 24, weight: 700 })}
${textBlock(310, 592, ['autoCompact / token budget / fallback / stop hooks'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 19 })}
${textBlock(310, 616, ['这些守护逻辑决定长会话是否稳定。'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${arrowPath('M 350 214 L 468 214', 468, 214, 0, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 732 214 L 848 214', 848, 214, 0, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 980 262 L 980 334', 980, 334, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 848 383 L 732 383', 732, 383, 180, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 468 383 L 350 383', 350, 383, 180, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 220 334 L 220 262', 220, 262, -90, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 600 432 L 600 518', 600, 518, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}

${textBlock(88, 690, ['关键理解：Claude Code 的一个回合不是一次 API 调用，而是“模型输出 - 工具执行 - 状态更新 - 再继续”的循环系统。'], { size: 13, weight: 500, color: COLORS.muted, lineHeight: 17 })}
`;
  writeSvg('cc-query-loop.svg', body);
}

function toolOrchestration() {
  const body = `
${paperFrame('Claude Code 的工具编排逻辑', '核心不是“会不会调工具”，而是“哪些工具能并发、哪些必须串行、出了错怎么收场”')}
${sketchRect(68, 154, 1064, 554, { seed: 201, radius: 22, fill: COLORS.panel, stroke: COLORS.chipStroke, strokeWidth: 2.2 })}

${sketchRect(108, 204, 224, 94, { seed: 202, radius: 18, fill: COLORS.blueFill, stroke: COLORS.blueStroke })}
${textBlock(136, 245, ['模型产出 tool_use'], { size: 24, weight: 700 })}
${textBlock(136, 274, ['Read / Grep / Bash / Edit / Agent ...'], { size: 16, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(428, 204, 324, 94, { seed: 203, radius: 18, fill: COLORS.blueFill, stroke: COLORS.blueStroke })}
${textBlock(456, 245, ['partitionToolCalls'], { size: 24, weight: 700 })}
${textBlock(456, 274, ['先判断 isConcurrencySafe，再分批执行'], { size: 16, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(848, 184, 224, 124, { seed: 204, radius: 18, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(878, 225, ['并发安全批次'], { size: 24, weight: 700 })}
${textBlock(878, 253, ['Read / Search / 某些查询类工具'], { size: 16, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(878, 279, ['可并行，提高吞吐'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(848, 354, 224, 124, { seed: 205, radius: 18, fill: COLORS.orangeFill, stroke: COLORS.orangeStroke })}
${textBlock(878, 396, ['非并发安全批次'], { size: 24, weight: 700 })}
${textBlock(878, 424, ['Edit / Write / 有副作用的 Bash'], { size: 16, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(878, 450, ['串行，避免状态冲突'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(378, 378, 374, 126, { seed: 206, radius: 18, fill: COLORS.purpleFill, stroke: COLORS.purpleStroke })}
${textBlock(406, 421, ['StreamingToolExecutor'], { size: 24, weight: 700 })}
${textBlock(406, 449, ['queued / executing / completed / yielded'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(406, 474, ['负责进度、interrupt 与失败收尾。'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(138, 558, 904, 98, { seed: 207, radius: 18, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(168, 599, ['最终收益'], { size: 24, weight: 700 })}
${textBlock(168, 623, ['用户看到的是“能干活”；源码里真正做的是工具语义识别、', '执行秩序控制和失败后的一致性收尾。'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${arrowPath('M 332 251 L 428 251', 428, 251, 0, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 752 251 L 848 251', 848, 251, 0, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 590 298 L 590 378', 590, 378, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 752 416 L 848 416', 848, 416, 0, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 564 504 L 564 558', 564, 558, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}

${textBlock(80, 695, ['这也是 Claude Code 和很多“工具堆砌型 Agent”最大的差别：后者只有能力列表，前者有运行时秩序。'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}
`;
  writeSvg('cc-tool-orchestration.svg', body);
}

function contextPermissionAgent() {
  const body = `
${paperFrame('Claude Code 为什么更稳：三套系统同时工作', '上下文治理、权限治理、多代理隔离，是它能长期工作的三根主轴')}

${sketchRect(418, 283, 364, 154, { seed: 301, radius: 22, fill: COLORS.blueFill, stroke: COLORS.blueStroke, strokeWidth: 2.8 })}
${textBlock(464, 340, ['Claude Code Runtime'], { size: 26, weight: 700 })}
${textBlock(464, 372, ['用户感知到的是“顺手”'], { size: 18, weight: 500, color: COLORS.muted, lineHeight: 20 })}
${textBlock(464, 397, ['真正支撑这种顺手感的，是三套治理系统一起工作。'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(128, 143, 286, 134, { seed: 302, radius: 18, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(160, 191, ['上下文治理'], { size: 24, weight: 700 })}
${textBlock(160, 221, ['autoCompact / token budget / fallback'], { size: 16, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(160, 247, ['解决“越聊越乱、越聊越笨”'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(788, 143, 286, 134, { seed: 303, radius: 18, fill: COLORS.orangeFill, stroke: COLORS.orangeStroke })}
${textBlock(820, 191, ['权限治理'], { size: 24, weight: 700 })}
${textBlock(820, 221, ['rules / sandbox / classifier / hooks'], { size: 16, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(820, 247, ['解决“太危险”或“太烦人”'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(459, 498, 282, 134, { seed: 304, radius: 18, fill: COLORS.purpleFill, stroke: COLORS.purpleStroke })}
${textBlock(489, 546, ['多代理与隔离'], { size: 24, weight: 700 })}
${textBlock(489, 576, ['AgentTool / worktree / remote CCR'], { size: 16, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(489, 602, ['解决“并行干活但不互相踩”'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${textBlock(830, 520, ['扩展能力会沿着这三套治理长出来：'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(830, 546, ['plugins / skills / MCP / remote'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${handPath('M 412 262 C 470 286 470 288 420 330', { stroke: COLORS.ink, strokeWidth: 2.4 })}
${handPath('M 788 262 C 730 286 730 288 780 330', { stroke: COLORS.ink, strokeWidth: 2.4 })}
${handPath('M 600 498 L 600 438', { stroke: COLORS.ink, strokeWidth: 2.4 })}

${textBlock(88, 694, ['简单理解：Claude Code 的体验好，不是因为某一层特别强，而是它把“能运行、能控制、能扩展、能持续”一起解决了。'], { size: 13, weight: 500, color: COLORS.muted, lineHeight: 17 })}
`;
  writeSvg('cc-context-permission-agent.svg', body);
}

function main() {
  architectureOverview();
  queryLoop();
  toolOrchestration();
  contextPermissionAgent();
  console.log(`Generated hand-drawn Claude Code diagrams in ${OUT_DIR}`);
}

main();
