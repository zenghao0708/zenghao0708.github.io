import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DEFAULT_SKILL_DIR = '/Users/zenghao/.agents/skills/baoyu-skills/skills/baoyu-post-to-wechat';

interface CliOptions {
  appmsgid: string;
  profile: string;
  coverPath: string;
  skillDir: string;
  auditDir: string;
  auditPrefix: string;
  preferRatio: number;
}

function parseArgs(argv: string[]): CliOptions {
  const out: CliOptions = {
    appmsgid: '',
    profile: process.env.WECHAT_CHROME_PROFILE || path.join(os.homedir(), '.local', 'share', 'wechat-browser-profile'),
    coverPath: '',
    skillDir: process.env.BAOYU_POST_TO_WECHAT_SKILL_DIR || DEFAULT_SKILL_DIR,
    auditDir: process.env.WECHAT_AUDIT_DIR || path.resolve('publish/output/wechat/audit'),
    auditPrefix: process.env.WECHAT_AUDIT_PREFIX || 'wechat-cover',
    preferRatio: Number(process.env.WECHAT_COVER_PREFER_RATIO || '2.35')
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === '--appmsgid' && argv[i + 1]) out.appmsgid = argv[++i]!;
    else if (arg === '--profile' && argv[i + 1]) out.profile = argv[++i]!;
    else if (arg === '--cover-path' && argv[i + 1]) out.coverPath = argv[++i]!;
    else if (arg === '--skill-dir' && argv[i + 1]) out.skillDir = argv[++i]!;
    else if (arg === '--audit-dir' && argv[i + 1]) out.auditDir = argv[++i]!;
    else if (arg === '--audit-prefix' && argv[i + 1]) out.auditPrefix = argv[++i]!;
    else if (arg === '--prefer-ratio' && argv[i + 1]) out.preferRatio = Number(argv[++i]!);
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  bun scripts/wechat-cover-apply.ts --appmsgid <id> --profile <dir> --cover-path <file> [options]
`);
      process.exit(0);
    }
  }

  if (!out.appmsgid) throw new Error('--appmsgid is required');
  if (!out.coverPath) throw new Error('--cover-path is required');
  if (!fs.existsSync(path.resolve(out.coverPath))) throw new Error(`--cover-path not found: ${out.coverPath}`);
  return out;
}

function sanitizeFileToken(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'wechat';
}

function commandExists(name: string): boolean {
  const res = spawnSync('sh', ['-lc', `command -v ${name}`], { stdio: 'ignore' });
  return res.status === 0;
}

function getImageSizeBySips(imagePath: string): { width: number; height: number } | null {
  if (process.platform !== 'darwin' || !commandExists('sips')) return null;
  const res = spawnSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', imagePath], { encoding: 'utf8' });
  if (res.status !== 0 || !res.stdout) return null;
  const widthMatch = res.stdout.match(/pixelWidth:\s*(\d+)/);
  const heightMatch = res.stdout.match(/pixelHeight:\s*(\d+)/);
  if (!widthMatch || !heightMatch) return null;
  return { width: Number(widthMatch[1]), height: Number(heightMatch[1]) };
}

function escapeForRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickDialogButtonByText(evaluateFn: (expr: string) => Promise<unknown>, text: string): Promise<boolean> {
  const clicked = await evaluateFn(`(() => {
    const ws = Array.from(document.querySelectorAll('.weui-desktop-dialog__wrp'))
      .filter((w) => getComputedStyle(w).display !== 'none');
    for (const wrap of ws) {
      const btns = Array.from(wrap.querySelectorAll('button.weui-desktop-btn, .weui-desktop-btn'));
      for (const btn of btns) {
        const t = (btn.textContent || '').replace(/\\s+/g, '').trim();
        if (!t.includes(${JSON.stringify(text)})) continue;
        const cls = String(btn.className || '');
        if (cls.includes('disabled')) continue;
        btn.click();
        return true;
      }
    }
    return false;
  })()`) as boolean;
  return !!clicked;
}

async function pickCoverCandidateIndex(
  evaluateFn: (expr: string) => Promise<unknown>,
  coverPath: string,
  preferRatio: number,
): Promise<{ index: number; total: number; candidates: Array<{ idx: number; url: string; ratio?: number; score?: number }> }> {
  const coverDim = getImageSizeBySips(coverPath);
  const coverRatio = coverDim ? coverDim.width / coverDim.height : preferRatio;

  const rawItems = await evaluateFn(`(() => {
    const items = Array.from(document.querySelectorAll('.appmsg_content_img_item'));
    return items.map((item, idx) => {
      const el = item.querySelector('.appmsg_content_img.cover, img');
      if (!el) return { idx, url: '' };
      let url = '';
      if (el.tagName.toLowerCase() === 'img') {
        url = el.src || '';
      } else {
        const bg = getComputedStyle(el).backgroundImage || '';
        const m = bg.match(/url\\((["']?)(.*?)\\1\\)/);
        url = m ? m[2] : '';
      }
      return { idx, url };
    });
  })()`) as Array<{ idx: number; url: string }>;

  const candidates = rawItems.filter((x) => x.url);
  if (candidates.length === 0) {
    return { index: 0, total: 0, candidates: [] };
  }

  const scored = candidates.map((x) => ({ ...x, ratio: undefined as number | undefined, score: Number.POSITIVE_INFINITY }));

  if (process.platform === 'darwin' && commandExists('sips')) {
    for (const item of scored) {
      try {
        const fileName = `wechat-cover-candidate-${Date.now()}-${item.idx}.jpg`;
        const tmpPath = path.join(os.tmpdir(), fileName);
        const resp = await fetch(item.url);
        if (!resp.ok) continue;
        const buf = Buffer.from(await resp.arrayBuffer());
        fs.writeFileSync(tmpPath, buf);
        const dim = getImageSizeBySips(tmpPath);
        fs.unlinkSync(tmpPath);
        if (!dim) continue;
        item.ratio = dim.width / dim.height;
        item.score = Math.abs(item.ratio - coverRatio);
      } catch {
        // Keep default score.
      }
    }
  }

  scored.sort((a, b) => a.score - b.score);
  const picked = Number.isFinite(scored[0]!.score) ? scored[0]!.idx : candidates[candidates.length - 1]!.idx;

  return {
    index: picked,
    total: rawItems.length,
    candidates: scored
  };
}

async function pickCoverCandidateWithRetry(
  evaluateFn: (expr: string) => Promise<unknown>,
  coverPath: string,
  preferRatio: number,
  maxAttempts = 8
): Promise<{ index: number; total: number; candidates: Array<{ idx: number; url: string; ratio?: number; score?: number }> }> {
  for (let i = 0; i < maxAttempts; i += 1) {
    const pick = await pickCoverCandidateIndex(evaluateFn, coverPath, preferRatio);
    if (pick.total > 0) return pick;

    await sleep(900);
    await evaluateFn(`(() => {
      const btn = document.querySelector('.js_selectCoverFromContent');
      if (btn) btn.click();
    })()`);
    await sleep(500);
  }
  return { index: 0, total: 0, candidates: [] };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const cdpModulePath = pathToFileURL(path.join(path.resolve(opts.skillDir), 'scripts', 'cdp.ts')).href;
  const cdpMod = await import(cdpModulePath) as {
    launchChrome: (url: string, profile?: string) => Promise<{ cdp: any }>;
    getPageSession: (cdp: any, pattern: string) => Promise<any>;
    clickElement: (session: any, selector: string) => Promise<void>;
    evaluate: <T = unknown>(session: any, expression: string) => Promise<T>;
  };

  const { cdp } = await cdpMod.launchChrome('https://mp.weixin.qq.com/', path.resolve(opts.profile));
  try {
    const session = await cdpMod.getPageSession(cdp, `appmsgid=${opts.appmsgid}`);
    const evaluateFn = async (expr: string) => cdpMod.evaluate(session, expr);

    // Open menu: 从正文选择.
    await cdpMod.clickElement(session, '.js_cover_btn_area');
    await sleep(600);
    await evaluateFn(`(() => {
      const btn = document.querySelector('.js_selectCoverFromContent');
      if (btn) btn.click();
    })()`);
    await sleep(1000);

    const pick = await pickCoverCandidateWithRetry(
      evaluateFn,
      path.resolve(opts.coverPath),
      opts.preferRatio,
      8
    );
    if (pick.total <= 0) throw new Error('No content image available for cover selection.');

    await evaluateFn(`(() => {
      const items = Array.from(document.querySelectorAll('.appmsg_content_img_item'));
      const idx = ${pick.index};
      const item = items[idx];
      if (item) item.click();
    })()`);
    await sleep(700);

    const nextOk = await clickDialogButtonByText(evaluateFn, '下一步');
    if (nextOk) await sleep(1000);

    const confirmOk = await clickDialogButtonByText(evaluateFn, '确认')
      || await clickDialogButtonByText(evaluateFn, '完成')
      || await clickDialogButtonByText(evaluateFn, '确定');
    if (!confirmOk) {
      throw new Error('Cover crop confirm button not found/clickable.');
    }
    await sleep(1400);

    await cdpMod.evaluate(session, `(() => {
      const btn = document.querySelector('#js_submit button');
      if (btn) btn.click();
    })()`);
    await sleep(2800);

    const draftUrl = await cdpMod.evaluate<string>(session, 'window.location.href');
    const coverStyle = await cdpMod.evaluate<string>(session, `(() => {
      const node = document.querySelector('.js_cover_preview_new');
      return node ? (node.getAttribute('style') || '') : '';
    })()`);
    const coverUrlMatch = coverStyle.match(/url\\("([^"]+)"\\)/) || coverStyle.match(/url\\('([^']+)'\\)/);
    let coverUrl = coverUrlMatch ? coverUrlMatch[1] : '';
    if (!coverUrl) {
      const picked = pick.candidates.find((c) => c.idx === pick.index);
      coverUrl = picked?.url || '';
    }

    fs.mkdirSync(path.resolve(opts.auditDir), { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = sanitizeFileToken(opts.auditPrefix || `cover-${opts.appmsgid}`);
    const screenshotPath = path.join(path.resolve(opts.auditDir), `${prefix}-cover-appmsgid-${opts.appmsgid}-${ts}.png`);
    const reportPath = path.join(path.resolve(opts.auditDir), `${prefix}-cover-appmsgid-${opts.appmsgid}-${ts}.json`);

    const shot = await cdp.send<{ data: string }>('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true
    }, { sessionId: session.sessionId });
    fs.writeFileSync(screenshotPath, Buffer.from(shot.data, 'base64'));

    const report = {
      ts: new Date().toISOString(),
      appmsgid: opts.appmsgid,
      draftUrl: String(draftUrl).replace(/([?&]token=)[^&]+/g, '$1<redacted>'),
      selectedIndex: pick.index,
      totalCandidates: pick.total,
      candidates: pick.candidates,
      coverPreviewStyle: coverStyle,
      coverUrl,
      screenshotPath
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    process.stdout.write(JSON.stringify({
      appmsgid: opts.appmsgid,
      draftUrl: report.draftUrl,
      coverUrl,
      reportPath,
      screenshotPath
    }));
  } finally {
    cdp.close();
  }
}

main().catch((err) => {
  console.error(`wechat-cover-apply failed: ${err.message}`);
  process.exit(1);
});
