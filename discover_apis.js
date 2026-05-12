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

// PLACEHOLDER_DISCOVER_MORE

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

// ============ 主流程 ============

(async () => {
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

  const [yszzqUrls, waifuUrls, helpUrls, publicUrls] = await Promise.all([
    discoverFromYszzq(),
    discoverFromWaifuProject(),
    discoverFromHelpPages(),
    discoverFromPublicLists(),
  ]);

  [...yszzqUrls, ...waifuUrls, ...helpUrls, ...publicUrls].forEach(u => {
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

  // 5. 验证每个候选 API
  let addedCount = 0;
  const newApis = [];

  for (const url of newCandidates) {
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
})();
