// discover_apis.js — 自动发现新的 MacCMS 影视采集站 API
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const CACHE_PATH = path.join(__dirname, 'discovery_cache.json');
const TIMEOUT = 8000;
const DELAY_MS = 500; // 请求间隔，避免被封

// 成人内容关键词
const ADULT_KEYWORDS = ['伦理', '福利', '写真', '三级', 'AV', '成人', '情色', '无码', '有码', '中文字幕', '麻豆', '蜜桃', '91', '色情', '黄色', '裸体'];
// 成人域名特征
const ADULT_DOMAIN_PATTERNS = ['av', 'sex', 'porn', 'adult', 'xxx', '91md', 'lbapi', 'fhapi', 'souav', 'jkun', 'bwzy', 'hsck', 'xingba', 'naixx', 'apilj', 'apiyutu', 'shayuapi', 'msnii', 'gdlsp', 'pgxdy', 'kxgav', 'xrbsp', 'jingpinx', 'apilsbzy', 'sexnguon', 'maozyapi', 'slapibf', 'aosika', 'thzy', 'douapi', 'ddapi', 'danaizi', 'xzybb', 'zuiseapi', 'xiaojizy', 'xxibaozyw', 'hsckzy', 'heiliaozy', 'xiangjiao', 'vnzyz', 'yyzywcj'];

// ============ 工具函数 ============

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeUrl(url) {
  try {
    let u = url.trim().replace(/\/+$/, '');
    if (!u.startsWith('http')) u = 'https://' + u;
    // 统一用 https，去重时忽略协议差异
    u = u.replace(/^http:\/\//, 'https://');
    return u;
  } catch {
    return null;
  }
}

function generateKey(url) {
  try {
    const u = new URL(url);
    let host = u.hostname.replace(/^(www|api|cj|caiji|collect|json|json02|m3u8)\./i, '');
    // 取主域名部分作为 key
    let key = host.replace(/\.(com|net|org|me|cc|tv|xyz|live|top|vip|hk)$/i, '').replace(/\./g, '_');
    return key.toLowerCase();
  } catch {
    return 'unknown_' + Date.now();
  }
}

function isAdultByDomain(url) {
  const lower = url.toLowerCase();
  return ADULT_DOMAIN_PATTERNS.some(p => lower.includes(p));
}

function isAdultByContent(data) {
  if (!data || !data.list || !Array.isArray(data.list)) return false;
  const sample = data.list.slice(0, 20);
  let adultCount = 0;
  for (const item of sample) {
    const text = `${item.type_name || ''} ${item.vod_class || ''} ${item.vod_name || ''}`;
    if (ADULT_KEYWORDS.some(kw => text.includes(kw))) adultCount++;
  }
  return adultCount > sample.length * 0.3; // 超过30%内容为成人
}

// ============ API 验证 ============

async function validateApi(url) {
  try {
    // Step 1: 基本连通性 - 获取分类列表
    const controller1 = new AbortController();
    const t1 = setTimeout(() => controller1.abort(), TIMEOUT);
    const res = await fetch(url + '?ac=list', { signal: controller1.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(t1);

    if (!res.ok) return { valid: false };
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { return { valid: false }; }

    // 检查 MacCMS 响应结构
    if (!data || (data.code !== 1 && data.code !== '1' && !data.class && !data.list)) {
      return { valid: false };
    }

    // Step 2: 搜索测试
    const controller2 = new AbortController();
    const t2 = setTimeout(() => controller2.abort(), TIMEOUT);
    const searchRes = await fetch(url + '?ac=videolist&wd=' + encodeURIComponent('你好'), { signal: controller2.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(t2);

    if (!searchRes.ok) return { valid: false };
    const searchText = await searchRes.text();
    let searchData;
    try { searchData = JSON.parse(searchText); } catch { return { valid: false }; }

    const hasResults = searchData && Array.isArray(searchData.list) && searchData.list.length > 0;
    if (!hasResults) return { valid: false };

    // Step 3: 判断是否成人内容
    const isAdult = isAdultByDomain(url) || isAdultByContent(searchData);

    return { valid: true, isAdult, searchData };
  } catch (e) {
    return { valid: false };
  }
}

// ============ 发现源：从网页抓取 ============

// 从 HTML 中提取所有可能的 API URL
function extractApiUrls(html) {
  const urls = new Set();
  // 匹配常见的 MacCMS API URL 模式
  const patterns = [
    /https?:\/\/[^\s"'<>]+?\/api\.php\/provide\/vod/gi,
    /https?:\/\/[^\s"'<>]+?\/inc\/api_mac10\.php/gi,
    /https?:\/\/[^\s"'<>]+?\/inc\/apijson\.php/gi,
    /https?:\/\/[^\s"'<>]+?\/inc\/apijson_vod\.php/gi,
    /https?:\/\/[^\s"'<>]+?\/api\/json\.php/gi,
    /https?:\/\/[^\s"'<>]+?\/provide\/vod/gi,
  ];
  for (const pattern of patterns) {
    const matches = html.match(pattern) || [];
    matches.forEach(m => urls.add(normalizeUrl(m)));
  }
  return [...urls].filter(Boolean);
}

// 从影视站长圈抓取
async function discoverFromYszzq() {
  const urls = new Set();
  console.log('📡 正在从影视站长圈发现新源...');

  for (let page = 1; page <= 3; page++) {
    try {
      const pageUrl = page === 1
        ? 'https://www.yszzq.com/ziyuan/api/'
        : `https://www.yszzq.com/ziyuan/api/index_${page}.html`;

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(pageUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      clearTimeout(t);

      if (!res.ok) continue;
      const html = await res.text();

      // 先从列表页本身提取 API URL
      const listFound = extractApiUrls(html);
      listFound.forEach(u => urls.add(u));

      // 提取详情页链接并逐个访问
      const detailLinks = html.match(/href="(\/ziyuan\/api\/\d+\.html)"/g) || [];
      for (const link of detailLinks.slice(0, 15)) { // 每页最多访问15个详情页
        const detailPath = link.match(/href="([^"]+)"/)?.[1];
        if (!detailPath) continue;

        await sleep(DELAY_MS);
        try {
          const detailUrl = 'https://www.yszzq.com' + detailPath;
          const dc = new AbortController();
          const dt = setTimeout(() => dc.abort(), 10000);
          const detailRes = await fetch(detailUrl, { signal: dc.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
          clearTimeout(dt);

          if (!detailRes.ok) continue;
          const detailHtml = await detailRes.text();
          const found = extractApiUrls(detailHtml);
          found.forEach(u => urls.add(u));

          // 额外尝试从文本中提取域名+常见路径
          const domainMatches = detailHtml.match(/https?:\/\/[a-zA-Z0-9._-]+\.(com|net|org|me|cc|tv|xyz|live|top|vip|hk)/gi) || [];
          for (const domain of domainMatches) {
            const candidate = normalizeUrl(domain + '/api.php/provide/vod');
            if (candidate) urls.add(candidate);
          }
        } catch { /* skip */ }
      }

      await sleep(DELAY_MS);
    } catch (e) {
      console.warn(`  ⚠️ 影视站长圈第${page}页抓取失败:`, e.message);
    }
  }

  console.log(`  ✅ 影视站长圈发现 ${urls.size} 个候选 URL`);
  return [...urls];
}

// 从 Shodan 搜索引擎发现
async function discoverFromShodan() {
  const urls = new Set();
  const SHODAN_KEY = process.env.SHODAN_API_KEY;
  const MAX_SHODAN_URLS = 50; // 限制 Shodan 最多返回50个候选，避免验证时间过长

  if (!SHODAN_KEY) {
    console.log('📡 Shodan: 未配置 SHODAN_API_KEY，跳过');
    return [];
  }

  console.log('📡 正在从 Shodan 发现新源...');

  // Shodan 搜索查询 - 搜索包含 MacCMS API 特征的主机
  const queries = [
    'http.html:"api.php/provide/vod"',
    'http.html:"inc/apijson" http.html:"vod_id"',
  ];

  for (const query of queries) {
    if (urls.size >= MAX_SHODAN_URLS) break;

    try {
      const encodedQuery = encodeURIComponent(query);
      const apiUrl = `https://api.shodan.io/shodan/host/search?key=${SHODAN_KEY}&query=${encodedQuery}&page=1`;

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(t);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`  ⚠️ Shodan 查询失败 (${res.status}): ${errText.slice(0, 100)}`);
        continue;
      }

      const data = await res.json();
      if (!data.matches || !Array.isArray(data.matches)) continue;

      console.log(`  📊 Shodan 查询 "${query.slice(0, 40)}..." 返回 ${data.matches.length} 条结果`);

      for (const match of data.matches) {
        if (urls.size >= MAX_SHODAN_URLS) break;

        const ip = match.ip_str;
        const port = match.port;
        const hostnames = match.hostnames || [];
        const http = match.http || {};
        const html = http.html || match.data || '';

        // 从响应体中提取 API URL
        const foundUrls = extractApiUrls(html);
        foundUrls.forEach(u => urls.add(u));

        // 从域名构造可能的 API URL
        for (const hostname of hostnames) {
          const candidates = [
            `https://${hostname}/api.php/provide/vod`,
            `http://${hostname}/api.php/provide/vod`,
            `https://${hostname}/inc/apijson.php`,
          ];
          candidates.forEach(u => urls.add(normalizeUrl(u)));
        }

        // 跳过裸 IP（不稳定，通常是临时部署）
      }

      await sleep(1500); // Shodan API 限流：1 请求/秒
    } catch (e) {
      console.warn(`  ⚠️ Shodan 查询异常:`, e.message);
    }
  }

  console.log(`  ✅ Shodan 发现 ${urls.size} 个候选 URL`);
  return [...urls].filter(Boolean);
}

// 从 FOFA 搜索引擎发现
async function discoverFromFofa() {
  const urls = new Set();
  const FOFA_EMAIL = process.env.FOFA_EMAIL;
  const FOFA_KEY = process.env.FOFA_KEY;
  const MAX_FOFA_URLS = 50;

  if (!FOFA_EMAIL || !FOFA_KEY) {
    console.log('📡 FOFA: 未配置 FOFA_EMAIL/FOFA_KEY，跳过');
    return [];
  }

  console.log('📡 正在从 FOFA 发现新源...');

  // FOFA 搜索查询 - 精准命中 MacCMS 采集站
  const queries = [
    'body="provide/vod" && body="vod_name" && status_code=200',
    'body="api.php/provide/vod" && body="list" && body="code" && status_code=200',
  ];

  for (const query of queries) {
    if (urls.size >= MAX_FOFA_URLS) break;

    try {
      const qbase64 = Buffer.from(query).toString('base64');
      const apiUrl = `https://fofa.so/api/v1/search/all?email=${encodeURIComponent(FOFA_EMAIL)}&key=${FOFA_KEY}&qbase64=${qbase64}&size=50&fields=host,ip,port,protocol,domain`;

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(t);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`  ⚠️ FOFA 查询失败 (${res.status}): ${errText.slice(0, 100)}`);
        continue;
      }

      const data = await res.json();

      if (data.error) {
        console.warn(`  ⚠️ FOFA 错误: ${data.errmsg || data.error}`);
        continue;
      }

      if (!data.results || !Array.isArray(data.results)) continue;

      console.log(`  📊 FOFA 查询 "${query.slice(0, 50)}..." 返回 ${data.results.length} 条结果 (总计 ${data.size})`);

      for (const result of data.results) {
        if (urls.size >= MAX_FOFA_URLS) break;

        // result 格式: [host, ip, port, protocol, domain]
        const [host, ip, port, protocol, domain] = result;

        // 优先用 host（可能包含完整 URL）
        if (host && host.includes('/')) {
          // host 已经是完整 URL 形式
          const candidate = normalizeUrl(host.replace(/\/$/, '') + '/api.php/provide/vod');
          if (candidate) urls.add(candidate);
        } else if (domain) {
          // 用域名构造
          const candidates = [
            `https://${domain}/api.php/provide/vod`,
            `https://${domain}/inc/apijson.php`,
          ];
          candidates.forEach(u => urls.add(normalizeUrl(u)));
          // 也试试 api. 子域名
          if (!domain.startsWith('api.')) {
            urls.add(normalizeUrl(`https://api.${domain}/api.php/provide/vod`));
          }
        } else if (host && !host.match(/^\d+\.\d+\.\d+\.\d+/)) {
          // host 是域名形式
          urls.add(normalizeUrl(`https://${host}/api.php/provide/vod`));
        }
        // 跳过裸 IP
      }

      await sleep(1000); // FOFA 限流
    } catch (e) {
      console.warn(`  ⚠️ FOFA 查询异常:`, e.message);
    }
  }

  console.log(`  ✅ FOFA 发现 ${urls.size} 个候选 URL`);
  return [...urls].filter(Boolean);
}

// 从 waifu-project 的 JSON 获取
async function discoverFromWaifuProject() {
  const urls = new Set();
  console.log('📡 正在从 waifu-project 发现新源...');

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const res = await fetch('https://waifu-project.github.io/v1/yoyo.json', { signal: controller.signal });
    clearTimeout(t);

    if (res.ok) {
      const data = await res.json();
      // yoyo.json 格式: 数组，每项有 api 字段
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.api) urls.add(normalizeUrl(item.api));
        });
      }
    }
  } catch (e) {
    console.warn('  ⚠️ waifu-project 抓取失败:', e.message);
  }

  console.log(`  ✅ waifu-project 发现 ${urls.size} 个候选 URL`);
  return [...urls].filter(Boolean);
}

// 从已知资源站帮助页发现
async function discoverFromHelpPages() {
  const urls = new Set();
  console.log('📡 正在从资源站帮助页发现新源...');

  const helpPages = [
    'https://help.feisuzyapi.com/',
    'https://www.lzizy7.com/help',
    'https://shan01.com/help/',
    'https://www.hongniuzy2.com/help',
    'https://www.huyaapi.com/help',
    'https://suoniapi.com/help/',
    'https://bfzyapi.com/help/',
    'https://sdzyapi.com/help/',
    'https://hhzyapi.com/help/',
    'https://jszyapi.com/help/',
    'https://ikunzyapi.com/help/',
    'https://wolongzyw.com/help/',
    'https://tyyszy.com/help/',
    'https://jyzyapi.com/help/',
    'https://cj.ffzyapi.com/help/',
    'https://dbzy.tv/help/',
  ];

  for (const helpUrl of helpPages) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(helpUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      clearTimeout(t);

      if (!res.ok) continue;
      const html = await res.text();
      const found = extractApiUrls(html);
      found.forEach(u => urls.add(u));
      await sleep(300);
    } catch { /* skip */ }
  }

  console.log(`  ✅ 帮助页发现 ${urls.size} 个候选 URL`);
  return [...urls].filter(Boolean);
}

// 从搜索引擎/公开列表页发现
async function discoverFromPublicLists() {
  const urls = new Set();
  console.log('📡 正在从公开列表发现新源...');

  const listUrls = [
    'https://www.ps288.com/wangluoxiangguan/ziyuan/4557.html',
    'https://www.juwandh.com/item/43',
  ];

  for (const listUrl of listUrls) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(listUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      clearTimeout(t);

      if (!res.ok) continue;
      const html = await res.text();
      const found = extractApiUrls(html);
      found.forEach(u => urls.add(u));
      await sleep(300);
    } catch { /* skip */ }
  }

  console.log(`  ✅ 公开列表发现 ${urls.size} 个候选 URL`);
  return [...urls].filter(Boolean);
}

// 从 GitHub 代码搜索发现（TVBox/影视配置仓库里沉淀着大量采集 API）
async function discoverFromGithub() {
  const urls = new Set();
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const MAX_GH_URLS = 50;

  if (!token) {
    console.log('📡 GitHub: 未配置 GITHUB_TOKEN，跳过');
    return [];
  }

  console.log('📡 正在从 GitHub 代码搜索发现新源...');

  const queries = [
    '"api.php/provide/vod"',
    '"inc/apijson.php" vod',
  ];

  for (const query of queries) {
    if (urls.size >= MAX_GH_URLS) break;
    try {
      const apiUrl = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=30`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.text-match+json',
          'User-Agent': 'lunatv-config-pipeline',
        },
      });
      clearTimeout(t);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`  ⚠️ GitHub 搜索失败 (${res.status}): ${errText.slice(0, 120)}`);
        continue;
      }

      const data = await res.json();
      const items = data.items || [];
      console.log(`  📊 GitHub 查询 ${query} 返回 ${items.length} 个文件`);

      for (const item of items) {
        if (urls.size >= MAX_GH_URLS) break;
        // text_matches 的 fragment 里含有命中上下文，直接从中提取 API URL
        for (const m of item.text_matches || []) {
          const found = extractApiUrls(m.fragment || '');
          found.forEach(u => urls.add(u));
        }
      }

      await sleep(7000); // GitHub 代码搜索限流：10 请求/分钟
    } catch (e) {
      console.warn(`  ⚠️ GitHub 查询异常:`, e.message);
    }
  }

  console.log(`  ✅ GitHub 发现 ${urls.size} 个候选 URL`);
  return [...urls].filter(Boolean);
}

// ============ 主流程 ============

async function main() {
  console.log('🚀 开始自动发现新的影视采集站 API...\n');

  // 1. 加载现有配置
  const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const config = JSON.parse(rawConfig);
  const existingUrls = new Set(
    Object.values(config.api_site).map(s => normalizeUrl(s.api))
  );
  const existingKeys = new Set(Object.keys(config.api_site));

  console.log(`📋 现有 API 数量: ${existingUrls.size}\n`);

  // 2. 加载发现缓存（避免重复探测已知无效的 URL）
  let cache = { failed: {}, lastRun: null };
  if (fs.existsSync(CACHE_PATH)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')); } catch { }
  }
  const CACHE_EXPIRE_DAYS = 7; // 失败缓存7天后重试
  const now = Date.now();

  // 3. 从多个来源发现候选 URL
  const allCandidates = new Set();

  const [yszzqUrls, waifuUrls, helpUrls, publicUrls, shodanUrls, fofaUrls, githubUrls] = await Promise.all([
    discoverFromYszzq(),
    discoverFromWaifuProject(),
    discoverFromHelpPages(),
    discoverFromPublicLists(),
    discoverFromShodan(),
    discoverFromFofa(),
    discoverFromGithub(),
  ]);

  [...yszzqUrls, ...waifuUrls, ...helpUrls, ...publicUrls, ...shodanUrls, ...fofaUrls, ...githubUrls].forEach(u => {
    if (u) allCandidates.add(u);
  });

  console.log(`\n🔍 总共发现 ${allCandidates.size} 个候选 URL`);

  // 4. 过滤已存在和缓存中的失败 URL
  const newCandidates = [...allCandidates].filter(url => {
    if (existingUrls.has(url)) return false;
    // 检查失败缓存
    const failedEntry = cache.failed[url];
    if (failedEntry && (now - failedEntry.time) < CACHE_EXPIRE_DAYS * 86400000) {
      return false;
    }
    return true;
  });

  console.log(`🆕 去重后需要验证的新 URL: ${newCandidates.length}\n`);

  // 5. 验证每个候选 API（限制最多验证50个，避免超时）
  const MAX_VALIDATE = 50;
  const toValidate = newCandidates.slice(0, MAX_VALIDATE);
  if (newCandidates.length > MAX_VALIDATE) {
    console.log(`  ⚠️ 候选过多，本次只验证前 ${MAX_VALIDATE} 个\n`);
  }

  let addedCount = 0;
  const newApis = [];

  for (const url of toValidate) {
    await sleep(DELAY_MS);
    process.stdout.write(`  验证: ${url} ... `);

    const result = await validateApi(url);

    if (result.valid) {
      const isAdult = result.isAdult;
      let key = generateKey(url);

      // 确保 key 唯一
      let suffix = '';
      let counter = 1;
      while (existingKeys.has(key + suffix)) {
        suffix = '_' + counter++;
      }
      key = key + suffix;

      const name = isAdult ? `🔞AV-${key}` : `🎬TV-${key}`;

      config.api_site[key] = {
        api: url,
        name: name,
        detail: '',
        is_adult: isAdult,
        auto_discovered: true,
      };

      existingKeys.add(key);
      existingUrls.add(url);
      newApis.push({ key, url, name, isAdult });
      addedCount++;
      console.log('✅ 有效!', isAdult ? '(成人)' : '(普通)');
    } else {
      // 记录失败缓存
      cache.failed[url] = { time: now };
      console.log('❌ 无效');
    }
  }

  // 6. 保存结果
  if (addedCount > 0) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`\n✨ 成功添加 ${addedCount} 个新 API 到配置文件!`);
    console.log('新增源:');
    newApis.forEach(a => console.log(`  - ${a.name}: ${a.url}`));
  } else {
    console.log('\n📭 本次未发现新的有效 API');
  }

  // 7. 保存缓存
  cache.lastRun = new Date().toISOString();
  // 清理过期缓存
  for (const [url, entry] of Object.entries(cache.failed)) {
    if ((now - entry.time) > CACHE_EXPIRE_DAYS * 86400000) {
      delete cache.failed[url];
    }
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');

  console.log('\n🏁 发现流程完成');
}

// 作为脚本直接运行时执行主流程；被 pipeline.js require 时只导出函数
if (require.main === module) {
  main().catch(e => {
    console.error('发现流程异常:', e);
    process.exit(1);
  });
}

module.exports = {
  validateApi,
  extractApiUrls,
  normalizeUrl,
  generateKey,
  isAdultByDomain,
  discoverFromYszzq,
  discoverFromWaifuProject,
  discoverFromHelpPages,
  discoverFromPublicLists,
  discoverFromShodan,
  discoverFromFofa,
  discoverFromGithub,
};
