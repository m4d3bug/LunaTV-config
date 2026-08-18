// pipeline.js — 每日全自动流水线
// 1) 对全量源测活：连续失败自动打 _comment 剔除标，恢复后自动复活（替代人工打标）
// 2) 全网发现新源（影视站长圈/Shodan/FOFA/GitHub/公开列表）并验证入库
// 3) 自动派生 jingjian.json（剔除版）与 jin18.json（禁18版）
// 4) 基于测活结果生成 report.md 健康报告（替代原 check_apis.js 的重复扫描）
const fs = require('fs');
const path = require('path');
const {
  validateApi,
  normalizeUrl,
  generateKey,
  discoverFromYszzq,
  discoverFromWaifuProject,
  discoverFromHelpPages,
  discoverFromPublicLists,
  discoverFromShodan,
  discoverFromFofa,
  discoverFromGithub,
} = require('./discover_apis.js');

const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const JINGJIAN_PATH = path.join(__dirname, 'jingjian.json');
const JIN18_PATH = path.join(__dirname, 'jin18.json');
const REPORT_PATH = path.join(__dirname, 'report.md');
const CACHE_PATH = path.join(__dirname, 'discovery_cache.json');

const PRUNE_THRESHOLD = 2;          // 连续测活失败 N 次（天）自动剔除
const AUTO_COMMENT = '自动剔除';     // 自动打标前缀，用于区分人工标记
const VALIDATE_CONCURRENCY = Number(process.env.VALIDATE_CONCURRENCY || 8);
const DISCOVER_MAX_VALIDATE = Number(process.env.DISCOVER_MAX_VALIDATE || 50);
const CACHE_EXPIRE_DAYS = 7;
const REPORT_MAX_DAYS = 100;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 简单并发池
async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// ============ 阶段 1：全量测活 + 自动剔除/复活 ============

async function revalidateAll(config) {
  const entries = Object.entries(config.api_site);
  console.log(`\n🩺 阶段1: 全量测活 ${entries.length} 个源（并发 ${VALIDATE_CONCURRENCY}）...`);

  let done = 0;
  const results = await mapPool(entries, VALIDATE_CONCURRENCY, async ([key, site]) => {
    const r = await validateApi(site.api);
    done++;
    if (done % 10 === 0) process.stdout.write(`  进度 ${done}/${entries.length}\r`);
    return { key, site, ok: r.valid };
  });

  let pruned = 0, revived = 0, failed = 0;
  for (const { site, ok } of results) {
    if (ok) {
      // 自动复活：仅解除本流水线打的标，人工标记不动
      if (site._fails || (site._comment && String(site._comment).startsWith(AUTO_COMMENT))) {
        delete site._fails;
        if (site._comment && String(site._comment).startsWith(AUTO_COMMENT)) delete site._comment;
        revived++;
      }
    } else {
      failed++;
      site._fails = (site._fails || 0) + 1;
      if (site._fails >= PRUNE_THRESHOLD && !site._comment) {
        site._comment = `${AUTO_COMMENT}：连续${site._fails}次测活失败`;
        pruned++;
      }
    }
  }

  console.log(`  ✅ 测活完成: 存活 ${results.length - failed} / 失败 ${failed} / 新剔除 ${pruned} / 复活 ${revived}`);
  return results; // 供报告复用，避免二次扫描
}

// ============ 阶段 2：发现新源 ============

async function discoverNew(config) {
  console.log('\n📡 阶段2: 发现新源...');
  const existingUrls = new Set(Object.values(config.api_site).map(s => normalizeUrl(s.api)));
  const existingKeys = new Set(Object.keys(config.api_site));

  let cache = { failed: {}, lastRun: null };
  if (fs.existsSync(CACHE_PATH)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')); } catch { }
  }
  const now = Date.now();

  const groups = await Promise.all([
    discoverFromYszzq(),
    discoverFromWaifuProject(),
    discoverFromHelpPages(),
    discoverFromPublicLists(),
    discoverFromShodan(),
    discoverFromFofa(),
    discoverFromGithub(),
  ]);
  const allCandidates = new Set();
  groups.flat().forEach(u => u && allCandidates.add(u));

  const newCandidates = [...allCandidates].filter(url => {
    if (existingUrls.has(url)) return false;
    const f = cache.failed[url];
    if (f && (now - f.time) < CACHE_EXPIRE_DAYS * 86400000) return false;
    return true;
  });

  console.log(`\n🔍 候选 ${allCandidates.size} 个，去重后待验证 ${newCandidates.length} 个`);
  const toValidate = newCandidates.slice(0, DISCOVER_MAX_VALIDATE);
  if (newCandidates.length > DISCOVER_MAX_VALIDATE) {
    console.log(`  ⚠️ 候选过多，本次只验证前 ${DISCOVER_MAX_VALIDATE} 个`);
  }

  const added = [];
  for (const url of toValidate) {
    await sleep(500);
    process.stdout.write(`  验证: ${url} ... `);
    const r = await validateApi(url);
    if (!r.valid) {
      cache.failed[url] = { time: now };
      console.log('❌');
      continue;
    }
    let key = generateKey(url);
    let suffix = '', counter = 1;
    while (existingKeys.has(key + suffix)) suffix = '_' + counter++;
    key += suffix;

    const name = r.isAdult ? `🔞AV-${key}` : `🎬TV-${key}`;
    config.api_site[key] = { api: url, name, detail: '', is_adult: r.isAdult, auto_discovered: true };
    existingKeys.add(key);
    existingUrls.add(url);
    added.push({ key, url, name });
    console.log('✅', name);
  }

  // 清理过期失败缓存并保存
  for (const [url, entry] of Object.entries(cache.failed)) {
    if (now - entry.time > CACHE_EXPIRE_DAYS * 86400000) delete cache.failed[url];
  }
  cache.lastRun = new Date().toISOString();
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');

  console.log(`  ✨ 新增 ${added.length} 个有效源`);
  return added;
}

// ============ 阶段 3：派生精简版/禁18版 ============

function derive(config) {
  const alive = Object.fromEntries(
    Object.entries(config.api_site).filter(([, s]) => !s._comment)
  );
  const jingjian = { cache_time: config.cache_time || 7200, api_site: alive };
  fs.writeFileSync(JINGJIAN_PATH, JSON.stringify(jingjian, null, 2), 'utf-8');

  const nonAdult = Object.fromEntries(
    Object.entries(alive).filter(([, s]) => !s.is_adult && !String(s.name || '').startsWith('🔞'))
  );
  const jin18 = { cache_time: config.cache_time || 7200, api_site: nonAdult };
  fs.writeFileSync(JIN18_PATH, JSON.stringify(jin18, null, 2), 'utf-8');

  console.log(`\n📦 阶段3: 完整版 ${Object.keys(config.api_site).length} → 精简版 ${Object.keys(alive).length} → 禁18版 ${Object.keys(nonAdult).length}`);
}

// ============ 阶段 4：健康报告（复用测活结果，沿用原 report.md 格式） ============

function writeReport(config, results) {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' CST';

  let history = [];
  if (fs.existsSync(REPORT_PATH)) {
    const old = fs.readFileSync(REPORT_PATH, 'utf-8');
    const m = old.match(/```json\n([\s\S]+?)\n```/);
    if (m) { try { history = JSON.parse(m[1]); } catch { } }
  }

  const todayResults = results.map(({ site, ok }) => ({ name: site.name, api: site.api, success: ok }));
  history.push({ date: new Date().toISOString().slice(0, 10), results: todayResults });
  if (history.length > REPORT_MAX_DAYS) history = history.slice(-REPORT_MAX_DAYS);

  const apiCountMap = {};
  for (const site of Object.values(config.api_site)) {
    apiCountMap[site.api] = (apiCountMap[site.api] || 0) + 1;
  }

  const stats = {};
  for (const site of Object.values(config.api_site)) {
    const api = site.api;
    stats[api] = { name: site.name, ok: 0, fail: 0, fail_streak: 0, status: '❌', duplicate: apiCountMap[api] > 1 };
    let streak = 0;
    for (const day of history) {
      const r = day.results.find(x => x.api === api);
      if (!r) continue;
      if (r.success) { stats[api].ok++; streak = 0; } else { stats[api].fail++; streak++; }
      stats[api].fail_streak = streak;
    }
    const latest = todayResults.find(x => x.api === api);
    if (stats[api].fail_streak >= 3) stats[api].status = '🚨';
    else if (latest && latest.success) stats[api].status = '✅';
    if (stats[api].duplicate) stats[api].status = '🔁';
  }

  const totalAPIs = Object.keys(config.api_site).length;
  const duplicateAPIs = Object.values(apiCountMap).filter(c => c > 1).length;

  let md = `# API 健康检查报告\n\n最近更新：${now}\n\n`;
  md += `**总 API 数量:** ${totalAPIs}  |  **重复 API 数量:** ${duplicateAPIs}\n\n`;
  md += `## 最近 ${REPORT_MAX_DAYS} 次 API 健康统计\n\n`;
  md += '| 状态 | API 名称 | API 地址 | 成功次数 | 失败次数 | 可用率 | 连续失败天数 |\n';
  md += '|------|----------|----------|---------:|---------:|-------:|-------------:|\n';
  for (const site of Object.values(config.api_site)) {
    const s = stats[site.api];
    const total = s.ok + s.fail;
    const rate = total > 0 ? ((s.ok / total) * 100).toFixed(1) + '%' : '-';
    md += `| ${s.status} | ${s.name} | ${site.api} | ${s.ok} | ${s.fail} | ${rate} | ${s.fail_streak} |\n`;
  }
  md += `\n## 详细历史数据 (JSON)\n`;
  md += '```json\n' + JSON.stringify(history, null, 2) + '\n```\n';

  fs.writeFileSync(REPORT_PATH, md, 'utf-8');
  console.log('  📊 report.md 已更新');
}

// ============ 主流程 ============

(async () => {
  console.log('🚀 LunaTV-config 全自动流水线启动');
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

  const results = await revalidateAll(config);
  await discoverNew(config);

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  derive(config);
  writeReport(config, results);

  console.log('\n🏁 流水线完成');
})().catch(e => {
  console.error('流水线异常:', e);
  process.exit(1);
});
