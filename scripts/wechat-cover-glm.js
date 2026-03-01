#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const out = {
    title: '',
    summary: '',
    slug: '',
    outputDir: process.env.WECHAT_COVER_OUTPUT_DIR || 'publish/output/wechat/cover',
    prompt: process.env.WECHAT_COVER_PROMPT || '',
    engine: (process.env.WECHAT_COVER_ENGINE || 'gemini-cli').trim().toLowerCase(),
    variants: Number(process.env.WECHAT_COVER_VARIANTS || '1'),
    scorer: (process.env.WECHAT_COVER_SCORER || 'codex-cli').trim().toLowerCase(),
    scoreModel: process.env.WECHAT_COVER_SCORE_MODEL || '',
    scoreTimeoutMs: Number(process.env.WECHAT_COVER_SCORE_TIMEOUT_MS || '120000'),
    geminiTimeoutMs: Number(process.env.WECHAT_COVER_GEMINI_TIMEOUT_MS || '600000'),
    geminiFallbackGlm: !/^(0|false|no|off)$/i.test(process.env.WECHAT_COVER_GEMINI_FALLBACK_GLM || 'true'),
    geminiBin: process.env.WECHAT_COVER_GEMINI_BIN || 'gemini',
    geminiIncludeDirs: process.env.WECHAT_COVER_GEMINI_INCLUDE_DIRS || '/Users/zenghao/.baoyu-skills',
    codexBin: process.env.WECHAT_COVER_CODEX_BIN || 'codex',
    codexCd: process.env.WECHAT_COVER_CODEX_CD || path.resolve('.'),
    model: process.env.WECHAT_COVER_MODEL || 'glm-image',
    size: process.env.WECHAT_COVER_SIZE || '1888x800',
    quality: process.env.WECHAT_COVER_QUALITY || 'hd',
    baseUrl: process.env.WECHAT_GLM_BASE_URL || 'https://api.z.ai/api/paas/v4/images/generations',
    crop900x383: !/^(0|false|no|off)$/i.test(process.env.WECHAT_COVER_CROP_900383 || 'true'),
    removeWatermark: !/^(0|false|no|off)$/i.test(process.env.WECHAT_COVER_REMOVE_WATERMARK || 'true'),
    watermarkTrimRightRatio: Number(process.env.WECHAT_COVER_WATERMARK_TRIM_RIGHT_RATIO || '0.08'),
    watermarkTrimBottomRatio: Number(process.env.WECHAT_COVER_WATERMARK_TRIM_BOTTOM_RATIO || '0.10'),
    watermarkTrimRightPx: Number(process.env.WECHAT_COVER_WATERMARK_TRIM_RIGHT_PX || '0'),
    watermarkTrimBottomPx: Number(process.env.WECHAT_COVER_WATERMARK_TRIM_BOTTOM_PX || '0'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--title' && argv[i + 1]) out.title = argv[++i];
    else if (arg === '--summary' && argv[i + 1]) out.summary = argv[++i];
    else if (arg === '--slug' && argv[i + 1]) out.slug = argv[++i];
    else if (arg === '--output-dir' && argv[i + 1]) out.outputDir = argv[++i];
    else if (arg === '--prompt' && argv[i + 1]) out.prompt = argv[++i];
    else if (arg === '--engine' && argv[i + 1]) out.engine = String(argv[++i]).toLowerCase();
    else if (arg === '--variants' && argv[i + 1]) out.variants = Number(argv[++i]);
    else if (arg === '--scorer' && argv[i + 1]) out.scorer = String(argv[++i]).toLowerCase();
    else if (arg === '--score-model' && argv[i + 1]) out.scoreModel = argv[++i];
    else if (arg === '--score-timeout-ms' && argv[i + 1]) out.scoreTimeoutMs = Number(argv[++i]);
    else if (arg === '--gemini-timeout-ms' && argv[i + 1]) out.geminiTimeoutMs = Number(argv[++i]);
    else if (arg === '--no-gemini-fallback-glm') out.geminiFallbackGlm = false;
    else if (arg === '--gemini-bin' && argv[i + 1]) out.geminiBin = argv[++i];
    else if (arg === '--gemini-include-dirs' && argv[i + 1]) out.geminiIncludeDirs = argv[++i];
    else if (arg === '--codex-bin' && argv[i + 1]) out.codexBin = argv[++i];
    else if (arg === '--codex-cd' && argv[i + 1]) out.codexCd = argv[++i];
    else if (arg === '--model' && argv[i + 1]) out.model = argv[++i];
    else if (arg === '--size' && argv[i + 1]) out.size = argv[++i];
    else if (arg === '--quality' && argv[i + 1]) out.quality = argv[++i];
    else if (arg === '--base-url' && argv[i + 1]) out.baseUrl = argv[++i];
    else if (arg === '--no-crop-900x383') out.crop900x383 = false;
    else if (arg === '--no-remove-watermark') out.removeWatermark = false;
    else if (arg === '--watermark-trim-right-ratio' && argv[i + 1]) out.watermarkTrimRightRatio = Number(argv[++i]);
    else if (arg === '--watermark-trim-bottom-ratio' && argv[i + 1]) out.watermarkTrimBottomRatio = Number(argv[++i]);
    else if (arg === '--watermark-trim-right-px' && argv[i + 1]) out.watermarkTrimRightPx = Number(argv[++i]);
    else if (arg === '--watermark-trim-bottom-px' && argv[i + 1]) out.watermarkTrimBottomPx = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') printUsage(0);
  }

  if (!Number.isFinite(out.variants) || out.variants < 1) out.variants = 1;
  if (out.variants > 12) out.variants = 12;
  if (!Number.isFinite(out.scoreTimeoutMs) || out.scoreTimeoutMs < 10000) out.scoreTimeoutMs = 120000;
  if (!Number.isFinite(out.geminiTimeoutMs) || out.geminiTimeoutMs < 60000) out.geminiTimeoutMs = 600000;

  return out;
}

function printUsage(exitCode) {
  console.log(`Generate WeChat cover image with multi-engine and auto scoring

Usage:
  node scripts/wechat-cover-glm.js [options]

Options:
  --title <text>         Article title
  --summary <text>       Article summary
  --slug <text>          Slug for output file name
  --output-dir <dir>     Output dir (default: publish/output/wechat/cover)
  --prompt <text>        Override prompt
  --engine <name>        glm|gemini-cli (default: gemini-cli)
  --variants <n>         Generate candidate count, pick best by score (default: 1)
  --scorer <name>        auto|codex-cli|heuristic|none (default: codex-cli)
  --score-model <name>   Optional model for codex scorer
  --score-timeout-ms <n> Timeout for each codex scoring call (default: 120000)
  --gemini-timeout-ms <n> Timeout for each gemini generation call (default: 600000)
  --no-gemini-fallback-glm Disable fallback to GLM when gemini fails
  --gemini-bin <path>    Gemini CLI binary (default: gemini)
  --gemini-include-dirs <csv> Extra include directories for gemini CLI
  --codex-bin <path>     Codex CLI binary (default: codex)
  --codex-cd <dir>       Working dir for codex exec (default: current dir)
  --model <name>         GLM model (default: glm-image)
  --size <WxH>           e.g. 1888x800
  --quality <q>          hd|standard
  --base-url <url>       GLM API endpoint
  --no-remove-watermark  Disable watermark removal post-process
  --watermark-trim-right-ratio <num>   Trim ratio from right side (default: 0.08)
  --watermark-trim-bottom-ratio <num>  Trim ratio from bottom side (default: 0.10)
  --watermark-trim-right-px <num>      Absolute trim px from right (override ratio)
  --watermark-trim-bottom-px <num>     Absolute trim px from bottom (override ratio)
  --no-crop-900x383      Keep raw model output only
  --help                 Show help
`);
  process.exit(exitCode);
}

function sanitizeToken(input) {
  return String(input || '').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'wechat';
}

function commandExists(name) {
  const res = spawnSync('sh', ['-lc', `command -v ${name}`], { stdio: 'ignore' });
  return res.status === 0;
}

function runCommand(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    env: process.env,
    ...options
  });
  if (res.error) throw res.error;
  if (typeof res.status === 'number' && res.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}\n${String(res.stderr || '').trim()}`);
  }
  return res;
}

function getImageSizeBySips(imagePath) {
  if (process.platform !== 'darwin' || !commandExists('sips')) return null;
  const res = runCommand('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', imagePath]);
  const widthMatch = String(res.stdout || '').match(/pixelWidth:\s*(\d+)/);
  const heightMatch = String(res.stdout || '').match(/pixelHeight:\s*(\d+)/);
  if (!widthMatch || !heightMatch) return null;
  return { width: Number(widthMatch[1]), height: Number(heightMatch[1]) };
}

function loadApiKey() {
  if (process.env.WECHAT_GLM_API_KEY) return process.env.WECHAT_GLM_API_KEY;
  if (process.env.ZHIPU_API_KEY) return process.env.ZHIPU_API_KEY;
  if (process.env.GLM_API_KEY) return process.env.GLM_API_KEY;

  const configPath = path.join(os.homedir(), '.config', 'glm-claude', 'config.json');
  if (!fs.existsSync(configPath)) return '';
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return cfg.apiKey || '';
  } catch {
    return '';
  }
}

function buildPrompt(opts) {
  if (opts.prompt && opts.prompt.trim()) return opts.prompt.trim();
  const title = (opts.title || '').trim();
  const summary = (opts.summary || '').trim();
  return [
    '为微信公众号技术文章生成封面图。',
    `文章标题：${title || 'OpenClaw 架构设计'}`,
    summary ? `文章摘要：${summary}` : '',
    '风格：工程化、科技感、模块化系统图隐喻，青绿色与深灰色。',
    '元素：控制平面 / Gateway / 多通道连接 / 插件与记忆模块 / 可观测性。',
    '要求：构图简洁，适合中文技术博客，不要任何可读文字，不要 logo，不要水印。'
  ].filter(Boolean).join('\n');
}

async function requestImageByGlm(opts, apiKey, prompt) {
  const body = {
    model: opts.model,
    prompt,
    size: opts.size,
    quality: opts.quality
  };

  const resp = await fetch(opts.baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const json = await resp.json();
  if (!resp.ok || json.error) {
    const message = json?.error?.message || `${resp.status} ${resp.statusText}`;
    throw new Error(`GLM image generation failed: ${message}`);
  }
  const url = json?.data?.[0]?.url;
  if (!url) {
    throw new Error(`GLM image generation returned empty url: ${JSON.stringify(json)}`);
  }
  return { url, raw: json };
}

async function downloadFile(url, filePath) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(filePath, buf);
}

function maybeCropToWechatCover(rawPath, outputDir, baseName, enabled) {
  if (!enabled) return rawPath;
  if (process.platform !== 'darwin') return rawPath;
  if (!commandExists('sips')) return rawPath;

  const scaledPath = path.join(outputDir, `${baseName}-scaled.png`);
  const finalPath = path.join(outputDir, `${baseName}-900x383.png`);

  runCommand('sips', ['-Z', '1200', rawPath, '--out', scaledPath]);
  runCommand('sips', ['--cropToHeightWidth', '383', '900', scaledPath, '--out', finalPath]);

  return finalPath;
}

function maybeRemoveWatermarkByCropping(rawPath, outputDir, baseName, opts) {
  if (!opts.removeWatermark) return { path: rawPath, changed: false, trimRight: 0, trimBottom: 0 };
  if (process.platform !== 'darwin') return { path: rawPath, changed: false, trimRight: 0, trimBottom: 0 };
  if (!commandExists('sips')) return { path: rawPath, changed: false, trimRight: 0, trimBottom: 0 };

  const size = getImageSizeBySips(rawPath);
  if (!size) return { path: rawPath, changed: false, trimRight: 0, trimBottom: 0 };

  const trimRight = opts.watermarkTrimRightPx > 0
    ? Math.floor(opts.watermarkTrimRightPx)
    : Math.max(16, Math.floor(size.width * opts.watermarkTrimRightRatio));
  const trimBottom = opts.watermarkTrimBottomPx > 0
    ? Math.floor(opts.watermarkTrimBottomPx)
    : Math.max(12, Math.floor(size.height * opts.watermarkTrimBottomRatio));

  const croppedWidth = size.width - trimRight;
  const croppedHeight = size.height - trimBottom;
  if (croppedWidth < 900 || croppedHeight < 383) {
    return { path: rawPath, changed: false, trimRight: 0, trimBottom: 0 };
  }

  const dewmPath = path.join(outputDir, `${baseName}-dewm.png`);
  runCommand('sips', ['--cropToHeightWidth', String(croppedHeight), String(croppedWidth), '--cropOffset', '0', '0', rawPath, '--out', dewmPath]);
  return {
    path: dewmPath,
    changed: true,
    trimRight,
    trimBottom
  };
}

function parseImagePathFromText(text) {
  if (!text) return '';
  const lines = String(text).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const re = /(\/[^\s"'`]+?\.(?:png|jpg|jpeg|webp))/i;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const m = lines[i].match(re);
    if (m) return m[1];
  }
  const all = String(text).match(re);
  return all ? all[1] : '';
}

function extractJsonObject(text) {
  const value = String(text || '').trim();
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    // Continue.
  }

  const fence = value.match(/```json\s*([\s\S]*?)```/i) || value.match(/```\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // Continue.
    }
  }

  const first = value.indexOf('{');
  const last = value.lastIndexOf('}');
  if (first >= 0 && last > first) {
    const sliced = value.slice(first, last + 1);
    try {
      return JSON.parse(sliced);
    } catch {
      return null;
    }
  }

  return null;
}

function clampNum(input, min, max, fallback) {
  const n = Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeCodexScore(scoreObj) {
  const score = clampNum(scoreObj?.score, 0, 100, 50);
  const watermarkRisk = clampNum(scoreObj?.watermark_risk ?? scoreObj?.watermark, 0, 100, 0);
  const textRisk = clampNum(scoreObj?.text_risk ?? scoreObj?.text, 0, 100, 0);
  const composition = clampNum(scoreObj?.composition, 0, 100, 70);
  const detail = clampNum(scoreObj?.detail, 0, 100, 70);
  return {
    score,
    watermarkRisk,
    textRisk,
    composition,
    detail,
    reason: String(scoreObj?.reason || '').trim(),
    raw: scoreObj
  };
}

function scoreByHeuristic(imagePath) {
  const dim = getImageSizeBySips(imagePath);
  const st = fs.statSync(imagePath);
  if (!dim) {
    return {
      scorer: 'heuristic',
      finalScore: 50,
      watermarkRisk: 30,
      textRisk: 20,
      composition: 60,
      detail: 60,
      reason: 'No image dimension metadata available.'
    };
  }

  const ratio = dim.width / dim.height;
  const ratioDelta = Math.abs(ratio - 2.35);
  const ratioScore = Math.max(0, 100 - Math.round(ratioDelta * 100));
  const pixelScore = Math.min(100, Math.round((dim.width * dim.height) / (900 * 383) * 40));
  const sizeKb = st.size / 1024;
  const sizeScore = sizeKb < 40 ? 50 : sizeKb > 1500 ? 65 : 85;
  const composition = Math.round((ratioScore * 0.7) + (pixelScore * 0.3));
  const detail = Math.round((pixelScore * 0.6) + (sizeScore * 0.4));
  const finalScore = Math.round(composition * 0.55 + detail * 0.45);
  return {
    scorer: 'heuristic',
    finalScore,
    watermarkRisk: 20,
    textRisk: 15,
    composition,
    detail,
    reason: `ratio=${ratio.toFixed(3)}, sizeKB=${sizeKb.toFixed(0)}`
  };
}

function shouldUseCodexScorer(opts) {
  if (opts.scorer === 'none' || opts.scorer === 'heuristic') return false;
  if (opts.scorer === 'codex-cli') return true;
  return commandExists(opts.codexBin);
}

function scoreByCodexCli(imagePath, opts) {
  const tmpOut = path.join(os.tmpdir(), `codex-cover-score-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`);
  const prompt = [
    'You are scoring one candidate cover image for a Chinese technical WeChat article.',
    'Return strict minified JSON only with keys:',
    '{"score":0-100,"watermark_risk":0-100,"text_risk":0-100,"composition":0-100,"detail":0-100,"reason":"<=24 words"}',
    'Scoring rules:',
    '- Higher score is better.',
    '- Any visible watermark/text artifacts should sharply increase risk and reduce score.',
    '- composition judges visual hierarchy, balance, readability after mobile crop.',
    '- detail judges clarity and polish.',
    'No markdown, no explanations outside JSON.'
  ].join('\n');

  const args = ['exec', '--skip-git-repo-check', '-C', path.resolve(opts.codexCd), '-i', path.resolve(imagePath), '-o', tmpOut];
  if (opts.scoreModel) args.push('--model', opts.scoreModel);
  args.push(prompt);

  const res = runCommand(opts.codexBin, args, { timeout: opts.scoreTimeoutMs });
  const outText = fs.existsSync(tmpOut) ? fs.readFileSync(tmpOut, 'utf8') : String(res.stdout || '');
  if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  const parsed = extractJsonObject(outText);
  if (!parsed) {
    throw new Error(`Invalid codex score output: ${String(outText).slice(0, 240)}`);
  }
  return normalizeCodexScore(parsed);
}

function scoreImage(imagePath, opts) {
  if (opts.scorer === 'none') {
    return {
      scorer: 'none',
      finalScore: 0,
      watermarkRisk: 0,
      textRisk: 0,
      composition: 0,
      detail: 0,
      reason: 'Scorer disabled.'
    };
  }

  if (shouldUseCodexScorer(opts)) {
    try {
      const codex = scoreByCodexCli(imagePath, opts);
      return {
        scorer: 'codex-cli',
        finalScore: codex.score,
        watermarkRisk: codex.watermarkRisk,
        textRisk: codex.textRisk,
        composition: codex.composition,
        detail: codex.detail,
        reason: codex.reason,
        raw: codex.raw
      };
    } catch (err) {
      const fallback = scoreByHeuristic(imagePath);
      return {
        ...fallback,
        reason: `${fallback.reason}; codex-fallback=${err.message}`
      };
    }
  }

  return scoreByHeuristic(imagePath);
}

function buildGeminiPrompt({ prompt, size, outputPath, variantIndex, variants }) {
  return [
    'Generate exactly one cover image for a Chinese technical WeChat article and save locally.',
    `Target size: ${size}.`,
    `Variant: ${variantIndex + 1}/${variants}. Keep composition distinct from other variants.`,
    'Hard constraints: no visible text, no logo, no watermark, no UI elements.',
    'Style: clean, modern, engineering, high contrast, readable on mobile.',
    '',
    'Design brief:',
    prompt,
    '',
    `Save image to this exact absolute path: ${outputPath}`,
    'Return only the absolute output file path.'
  ].join('\n');
}

function getGeminiIncludeDirs(opts) {
  return String(opts.geminiIncludeDirs || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => fs.existsSync(x));
}

function generateOneByGeminiCli(opts, prompt, rawPath, variantIndex) {
  if (!commandExists(opts.geminiBin)) {
    throw new Error(`Gemini CLI not found: ${opts.geminiBin}`);
  }

  const instruction = buildGeminiPrompt({
    prompt,
    size: opts.size,
    outputPath: rawPath,
    variantIndex,
    variants: opts.variants
  });

  const args = ['-y', '--output-format', 'text'];
  for (const dir of getGeminiIncludeDirs(opts)) {
    args.push('--include-directories', dir);
  }
  args.push('-p', instruction);

  const res = runCommand(opts.geminiBin, args, { timeout: opts.geminiTimeoutMs });
  if (fs.existsSync(rawPath)) {
    return { rawPath, source: 'gemini-cli' };
  }

  const parsedPath = parseImagePathFromText(`${res.stdout || ''}\n${res.stderr || ''}`);
  if (parsedPath && fs.existsSync(parsedPath)) {
    fs.copyFileSync(parsedPath, rawPath);
    return { rawPath, source: 'gemini-cli', copiedFrom: parsedPath };
  }

  throw new Error(`Gemini CLI did not create expected image file: ${rawPath}`);
}

async function generateOneByGlm(opts, prompt, rawPath, apiKey) {
  const { url } = await requestImageByGlm(opts, apiKey, prompt);
  await downloadFile(url, rawPath);
  return { rawPath, source: 'glm', imageUrl: url };
}

function postProcessCover(rawPath, outputDir, baseName, opts) {
  const dewm = maybeRemoveWatermarkByCropping(rawPath, outputDir, baseName, opts);
  const coverPath = maybeCropToWechatCover(dewm.path, outputDir, baseName, opts.crop900x383);
  return {
    coverPath,
    dewatermarkPath: dewm.path,
    watermarkRemoved: dewm.changed,
    watermarkTrimRight: dewm.trimRight,
    watermarkTrimBottom: dewm.trimBottom
  };
}

async function generateCandidates(opts, prompt, outputDir, baseName) {
  const candidates = [];
  const needsGlm = opts.engine === 'glm' || (opts.engine === 'gemini-cli' && opts.geminiFallbackGlm);
  const apiKey = needsGlm ? loadApiKey() : '';
  if (needsGlm && !apiKey) {
    throw new Error('GLM API key not found. Set WECHAT_GLM_API_KEY (or configure ~/.config/glm-claude/config.json).');
  }
  if (!['glm', 'gemini-cli'].includes(opts.engine)) {
    throw new Error(`Unsupported --engine: ${opts.engine}. Expected glm|gemini-cli.`);
  }

  for (let i = 0; i < opts.variants; i += 1) {
    const v = i + 1;
    const suffix = opts.variants > 1 ? `-v${v}` : '';
    const rawPath = path.join(outputDir, `${baseName}${suffix}-raw.png`);
    const variantPrompt = opts.variants > 1 ? `${prompt}\n\n变体要求：第 ${v}/${opts.variants} 张，构图和主视觉与其他变体明显不同。` : prompt;

    let generated;
    if (opts.engine === 'gemini-cli') {
      try {
        generated = generateOneByGeminiCli(opts, variantPrompt, rawPath, i);
      } catch (err) {
        if (!opts.geminiFallbackGlm) throw err;
        const fb = await generateOneByGlm(opts, variantPrompt, rawPath, apiKey);
        generated = {
          ...fb,
          source: 'glm-fallback',
          fallbackReason: err.message
        };
      }
    } else {
      generated = await generateOneByGlm(opts, variantPrompt, rawPath, apiKey);
    }

    const post = postProcessCover(rawPath, outputDir, `${baseName}${suffix}`, opts);
    const score = scoreImage(post.coverPath, opts);

    candidates.push({
      index: i,
      rawPath,
      coverPath: post.coverPath,
      dewatermarkPath: post.dewatermarkPath,
      watermarkRemoved: post.watermarkRemoved,
      watermarkTrimRight: post.watermarkTrimRight,
      watermarkTrimBottom: post.watermarkTrimBottom,
      imageUrl: generated.imageUrl || '',
      source: generated.source,
      copiedFrom: generated.copiedFrom || '',
      fallbackReason: generated.fallbackReason || '',
      score
    });
  }
  return candidates;
}

function pickBestCandidate(candidates) {
  if (!candidates || candidates.length === 0) {
    throw new Error('No cover candidates generated.');
  }
  const sorted = [...candidates].sort((a, b) => {
    if (b.score.finalScore !== a.score.finalScore) return b.score.finalScore - a.score.finalScore;
    return a.index - b.index;
  });
  return sorted[0];
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const prompt = buildPrompt(opts);
  const outputDir = path.resolve(opts.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  const slug = sanitizeToken(opts.slug || opts.title || 'wechat-cover');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `${slug}-${ts}`;

  const candidates = await generateCandidates(opts, prompt, outputDir, baseName);
  const winner = pickBestCandidate(candidates);

  const result = {
    coverPath: winner.coverPath,
    rawPath: winner.rawPath,
    dewatermarkPath: winner.dewatermarkPath,
    watermarkRemoved: winner.watermarkRemoved,
    watermarkTrimRight: winner.watermarkTrimRight,
    watermarkTrimBottom: winner.watermarkTrimBottom,
    imageUrl: winner.imageUrl,
    engine: opts.engine,
    variants: opts.variants,
    scorer: opts.scorer,
    selectedIndex: winner.index,
    selectedScore: winner.score,
    candidates: candidates.map((x) => ({
      index: x.index,
      rawPath: x.rawPath,
      coverPath: x.coverPath,
      source: x.source,
      imageUrl: x.imageUrl || undefined,
      fallbackReason: x.fallbackReason || undefined,
      score: x.score
    })),
    model: opts.model,
    size: opts.size,
    quality: opts.quality,
    prompt
  };
  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error(`wechat-cover-glm failed: ${err.message}`);
  process.exit(1);
});
