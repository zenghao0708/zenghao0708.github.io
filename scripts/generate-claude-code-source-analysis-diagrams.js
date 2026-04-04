#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 760;
const OUT_DIR = path.resolve('blog_new/source/images/claude-code-source-analysis');
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
    dy = -1.1
  } = opts;
  return [
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`,
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${Math.max(1, strokeWidth * 0.72)}" stroke-linecap="round" stroke-linejoin="round" opacity="${secondOpacity}" transform="translate(${dx} ${dy})"/>`
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
  return handPath(`M ${x1} ${y1} L ${x} ${y} L ${x2} ${y2}`, {
    stroke,
    strokeWidth,
    secondOpacity: 0.35,
    dx: 0.8,
    dy: -0.5
  });
}

function arrowPath(d, headX, headY, angleDeg, opts = {}) {
  return `${handPath(d, opts)}\n${arrowHead(headX, headY, angleDeg, opts)}`;
}

function paperFrame(title, subtitle) {
  return `
<rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}"/>
<path d="M 24 24 L 1178 18 L 1172 742 L 28 736 Z" fill="none" stroke="${COLORS.shadow}" stroke-width="1.4" opacity="0.8"/>
${textBlock(58, 72, [title], { size: 34, weight: 700, color: COLORS.ink })}
${textBlock(60, 106, [subtitle], { size: 18, weight: 500, color: COLORS.muted, lineHeight: 22 })}
`;
}

function writeSvg(name, body) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, name), `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${body}</svg>\n`, 'utf8');
}

function runtimeBlueprint() {
  const body = `
${paperFrame('Claude Code 的运行时蓝图', '它真正强的不是单点功能，而是把会话生命周期、工具、上下文和权限都收进同一套 runtime')}
${sketchRect(70, 158, 1060, 520, { seed: 11, radius: 22, fill: COLORS.panel, stroke: COLORS.ink, strokeWidth: 2.4 })}

${sketchRect(108, 198, 984, 82, { seed: 12, radius: 16, fill: COLORS.blueFill, stroke: COLORS.blueStroke })}
${textBlock(138, 232, ['交互层'], { size: 24, weight: 700 })}
${textBlock(138, 258, ['main.tsx / REPL / SDK / slash commands / Ink UI'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(108, 308, 984, 98, { seed: 13, radius: 16, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(138, 345, ['运行时入口'], { size: 24, weight: 700 })}
${textBlock(138, 372, ['QueryEngine.ts 负责 session lifecycle，把 UI、SDK、headless 统一接到同一条执行路径'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(108, 436, 984, 98, { seed: 14, radius: 16, fill: COLORS.orangeFill, stroke: COLORS.orangeStroke })}
${textBlock(138, 473, ['主代理循环'], { size: 24, weight: 700 })}
${textBlock(138, 500, ['query.ts 负责 system prompt 组装、流式输出、tool use、恢复逻辑和消息回写'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(108, 564, 984, 82, { seed: 15, radius: 16, fill: COLORS.purpleFill, stroke: COLORS.purpleStroke })}
${textBlock(138, 598, ['支撑系统'], { size: 24, weight: 700 })}
${textBlock(138, 624, ['tools / compact / permissions / agent / plugins / MCP / remote'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${arrowPath('M 600 280 L 600 308', 600, 308, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 600 406 L 600 436', 600, 436, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 600 534 L 600 564', 600, 564, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}
`;
  writeSvg('cc-analysis-runtime-blueprint.svg', body);
}

function keyModules() {
  const body = `
${paperFrame('Claude Code 源码该怎么读', '别一上来硬啃 query.ts；先按运行时入口、主循环、工具执行、治理链路这条主线往下读')}

${sketchRect(88, 176, 248, 100, { seed: 17, radius: 18, fill: COLORS.blueFill, stroke: COLORS.blueStroke })}
${textBlock(118, 214, ['1. main.tsx'], { size: 24, weight: 700 })}
${textBlock(118, 241, ['启动装配 / 预热 / 能力注册'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(398, 176, 314, 100, { seed: 18, radius: 18, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(428, 214, ['2. QueryEngine.ts'], { size: 24, weight: 700 })}
${textBlock(428, 241, ['session lifecycle / 模式切换 / 入口收口'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(778, 176, 322, 100, { seed: 19, radius: 18, fill: COLORS.orangeFill, stroke: COLORS.orangeStroke })}
${textBlock(808, 214, ['3. query.ts'], { size: 24, weight: 700 })}
${textBlock(808, 241, ['主代理循环 / 输出流 / tool use / 恢复'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(156, 408, 360, 116, { seed: 20, radius: 18, fill: COLORS.purpleFill, stroke: COLORS.purpleStroke })}
${textBlock(186, 450, ['4. StreamingToolExecutor'], { size: 24, weight: 700 })}
${textBlock(186, 477, ['并发批次 / sibling abort / interrupt /'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(186, 495, ['fallback 期间的执行状态收口'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(662, 408, 362, 116, { seed: 46, radius: 18, fill: COLORS.roseFill, stroke: COLORS.roseStroke })}
${textBlock(692, 450, ['5. compact + permissions'], { size: 24, weight: 700 })}
${textBlock(692, 477, ['上下文预算 / 熔断 / allow deny ask /'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(692, 495, ['为什么长会话和权限链不会越跑越乱'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(262, 596, 678, 86, { seed: 47, radius: 18, fill: COLORS.panel, stroke: COLORS.ink, strokeWidth: 2.2 })}
${textBlock(294, 632, ['阅读建议：先搞清“运行时怎么装起来”，再去看“每一轮请求怎么跑”，最后再进异常与治理细节。'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${arrowPath('M 336 226 L 398 226', 398, 226, 0, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 712 226 L 778 226', 778, 226, 0, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 908 276 C 908 330 840 350 768 408', 768, 408, 135, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 908 276 C 908 328 620 354 510 408', 510, 408, 135, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 336 524 L 420 596', 420, 596, 48, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 842 524 L 760 596', 760, 596, 132, { stroke: COLORS.ink, strokeWidth: 2.4 })}
`;
  writeSvg('cc-analysis-key-modules.svg', body);
}

function requestPath() {
  const body = `
${paperFrame('一次请求如何穿过 Claude Code', '用户感知到的“顺手”，本质上来自输入、调度、权限、上下文和工具执行的协同')}
${sketchRect(90, 174, 250, 92, { seed: 21, radius: 18, fill: COLORS.blueFill, stroke: COLORS.blueStroke })}
${textBlock(120, 214, ['用户输入'], { size: 24, weight: 700 })}
${textBlock(120, 241, ['prompt / slash command / SDK'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(430, 174, 310, 92, { seed: 22, radius: 18, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(460, 214, ['QueryEngine 预处理'], { size: 24, weight: 700 })}
${textBlock(460, 241, ['归一化消息、装配 system prompt、准备 session 状态'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(840, 174, 270, 92, { seed: 23, radius: 18, fill: COLORS.orangeFill, stroke: COLORS.orangeStroke })}
${textBlock(870, 214, ['query.ts'], { size: 24, weight: 700 })}
${textBlock(870, 241, ['进入主代理循环'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(840, 344, 270, 92, { seed: 24, radius: 18, fill: COLORS.purpleFill, stroke: COLORS.purpleStroke })}
${textBlock(870, 384, ['工具调度'], { size: 24, weight: 700 })}
${textBlock(870, 411, ['tool scheduler / executor'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(430, 344, 310, 92, { seed: 25, radius: 18, fill: COLORS.orangeFill, stroke: COLORS.orangeStroke })}
${textBlock(460, 384, ['治理层'], { size: 24, weight: 700 })}
${textBlock(460, 411, ['permissions / compact / fallback / interrupt'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(90, 344, 250, 92, { seed: 26, radius: 18, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(120, 384, ['结果回写'], { size: 24, weight: 700 })}
${textBlock(120, 411, ['tool_result / UI 更新 / 新消息'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(278, 532, 644, 104, { seed: 27, radius: 20, fill: COLORS.blueFill, stroke: COLORS.blueStroke })}
${textBlock(310, 572, ['为什么它会更稳？'], { size: 24, weight: 700 })}
${textBlock(310, 600, ['因为 Claude Code 不是“模型自己想办法”，而是 runtime 一直在替模型兜底。'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${arrowPath('M 340 220 L 430 220', 430, 220, 0, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 740 220 L 840 220', 840, 220, 0, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 975 266 L 975 344', 975, 344, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 840 390 L 740 390', 740, 390, 180, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 430 390 L 340 390', 340, 390, 180, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 215 344 L 215 266', 215, 266, -90, { stroke: COLORS.ink, strokeWidth: 2.4 })}
${arrowPath('M 585 436 L 585 532', 585, 532, 90, { stroke: COLORS.ink, strokeWidth: 2.4 })}
`;
  writeSvg('cc-analysis-request-path.svg', body);
}

function failureGuards() {
  const body = `
${paperFrame('Claude Code 如何避免长任务失控', '很多 Agent 到第十轮就开始失忆、乱调工具；Claude Code 靠的是上下文治理和异常收敛，而不是运气')}

${sketchRect(452, 292, 296, 140, { seed: 31, radius: 20, fill: COLORS.blueFill, stroke: COLORS.blueStroke, strokeWidth: 2.8 })}
${textBlock(492, 345, ['长会话 Runtime'], { size: 26, weight: 700 })}
${textBlock(492, 376, ['token budget / tool loop / 用户打断'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(492, 401, ['真正难的是：不要越跑越乱。'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(120, 150, 270, 112, { seed: 32, radius: 18, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(150, 192, ['上下文阈值'], { size: 24, weight: 700 })}
${textBlock(150, 220, ['warning / blocking / compact'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(820, 150, 270, 112, { seed: 33, radius: 18, fill: COLORS.orangeFill, stroke: COLORS.orangeStroke })}
${textBlock(850, 192, ['失败熔断'], { size: 24, weight: 700 })}
${textBlock(850, 220, ['连续 compact 失败后停止重试'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(120, 500, 270, 112, { seed: 34, radius: 18, fill: COLORS.purpleFill, stroke: COLORS.purpleStroke })}
${textBlock(150, 542, ['回退与打断'], { size: 24, weight: 700 })}
${textBlock(150, 570, ['fallback model / interrupt behavior'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(820, 500, 270, 112, { seed: 35, radius: 18, fill: COLORS.roseFill, stroke: COLORS.roseStroke })}
${textBlock(850, 542, ['兄弟任务取消'], { size: 24, weight: 700 })}
${textBlock(850, 570, ['错误传播时停止并行兄弟工具'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${handPath('M 390 250 C 455 280 455 282 452 330', { stroke: COLORS.ink, strokeWidth: 2.4 })}
${handPath('M 820 250 C 755 280 755 282 748 330', { stroke: COLORS.ink, strokeWidth: 2.4 })}
${handPath('M 390 555 C 455 522 455 520 452 392', { stroke: COLORS.ink, strokeWidth: 2.4 })}
${handPath('M 820 555 C 755 522 755 520 748 392', { stroke: COLORS.ink, strokeWidth: 2.4 })}

${textBlock(86, 690, ['结论：Claude Code 的稳定，不是因为它“永远不出错”，而是因为它把错误当成运行时要处理的一等公民。'], { size: 13, weight: 500, color: COLORS.muted, lineHeight: 17 })}
`;
  writeSvg('cc-analysis-failure-guards.svg', body);
}

function buildPlaybook() {
  const body = `
${paperFrame('做自己的 Agent，先抄哪四块作业？', '如果今天要做一个更稳的 Coding Agent，最值得优先补的不是功能数量，而是这四个基础设施')}

${sketchRect(104, 176, 310, 120, { seed: 41, radius: 18, fill: COLORS.blueFill, stroke: COLORS.blueStroke })}
${textBlock(134, 219, ['1. 运行时和 UI 分离'], { size: 24, weight: 700 })}
${textBlock(134, 242, ['先抽 session lifecycle，', '再谈 REPL、SDK、headless。'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(786, 176, 310, 120, { seed: 42, radius: 18, fill: COLORS.greenFill, stroke: COLORS.greenStroke })}
${textBlock(816, 219, ['2. 给工具补语义'], { size: 24, weight: 700 })}
${textBlock(816, 242, ['除了 schema，还要声明并发安全、', '副作用和执行策略。'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(104, 412, 310, 120, { seed: 43, radius: 18, fill: COLORS.orangeFill, stroke: COLORS.orangeStroke })}
${textBlock(134, 455, ['3. 把上下文当资源治理'], { size: 24, weight: 700 })}
${textBlock(134, 478, ['先设预算和阈值，', '再定义 compact 和熔断。'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(786, 412, 310, 120, { seed: 44, radius: 18, fill: COLORS.purpleFill, stroke: COLORS.purpleStroke })}
${textBlock(816, 455, ['4. 权限走统一判定链'], { size: 24, weight: 700 })}
${textBlock(816, 478, ['不要到处 confirm；', '让权限判定进入 runtime。'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${sketchRect(388, 282, 424, 148, { seed: 45, radius: 22, fill: COLORS.panel, stroke: COLORS.ink, strokeWidth: 2.4 })}
${textBlock(446, 340, ['为什么 Claude Code 会更像“完整系统”？'], { size: 28, weight: 700 })}
${textBlock(446, 372, ['因为它先把这些基础设施做好了，模型能力才有地方稳定落地。'], { size: 15, weight: 500, color: COLORS.muted, lineHeight: 18 })}
${textBlock(446, 398, ['这也是它最值得抄的工程价值。'], { size: 14, weight: 500, color: COLORS.muted, lineHeight: 18 })}

${handPath('M 414 236 L 446 298', { stroke: COLORS.ink, strokeWidth: 2.4 })}
${handPath('M 786 236 L 742 298', { stroke: COLORS.ink, strokeWidth: 2.4 })}
${handPath('M 414 472 L 446 414', { stroke: COLORS.ink, strokeWidth: 2.4 })}
${handPath('M 786 472 L 742 414', { stroke: COLORS.ink, strokeWidth: 2.4 })}
`;
  writeSvg('cc-analysis-build-playbook.svg', body);
}

function main() {
  runtimeBlueprint();
  keyModules();
  requestPath();
  failureGuards();
  buildPlaybook();
  console.log(`Generated diagrams in ${OUT_DIR}`);
}

main();
