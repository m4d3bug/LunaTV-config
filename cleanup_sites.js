// cleanup_sites.js — 清理 LunaTV 站点侧的残留 custom 源（可选步骤）
//
// 背景：LunaTV 的 refineConfig 会把"已不在订阅文件中的源"转成 from:'custom'
// 而不是删除（见 src/lib/config.ts），自动剔除后这些死源会残留在站点上拖慢搜索。
// 本脚本在流水线发布后运行，删除既不在最新订阅里、也不在保留名单里的 custom 源。
//
// 需要的环境变量（缺 LUNATV_SITES 则整体跳过）：
//   LUNATV_SITES           逗号分隔的站点地址，如 https://tv.example.com,https://tv2.example.com
//   LUNATV_ADMIN_USER      站长用户名
//   LUNATV_ADMIN_PASSWORD  站长密码
//   LUNATV_KEEP_CUSTOM     逗号分隔的 custom 源 key 保留名单（可选，默认保留以下 5 个实测可用源）

const KEEP_DEFAULT = ['liangzi', 'feifan', 'ziyuan360', 'hongniu', 'ikun'];
const MAX_PASSES = 10;

async function postJson(base, path, body, cookie) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie');
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 200) }; }
  return { status: res.status, data, setCookie };
}

async function getJson(base, path, cookie) {
  const res = await fetch(base + path, { headers: cookie ? { Cookie: cookie } : {} });
  return res.json();
}

async function cleanupSite(base, user, password, keep) {
  console.log(`\n🧹 清理站点: ${base}`);
  const login = await postJson(base, '/api/login', { username: user, password });
  if (!login.data || login.data.ok !== true) {
    console.log('  ⚠️ 登录失败，跳过该站点');
    return;
  }
  const cookie = (login.setCookie || '').split(';')[0];

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const cfg = (await getJson(base, '/api/admin/config', cookie)).Config;
    const stale = (cfg.SourceConfig || [])
      .filter(s => s.from === 'custom' && !keep.has(s.key))
      .map(s => s.key);
    console.log(`  第 ${pass + 1} 轮: 残留 ${stale.length} 个`);
    if (stale.length === 0) break;
    for (const key of stale) {
      const r = await postJson(base, '/api/admin/source', { action: 'delete', key }, cookie);
      if (r.status !== 200) console.log(`    ⚠️ 删除 ${key} 失败: ${r.status}`);
    }
    await new Promise(r => setTimeout(r, 2000)); // 给多实例缓存一点收敛时间
  }
  console.log('  ✅ 完成');
}

(async () => {
  const sites = (process.env.LUNATV_SITES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (sites.length === 0) {
    console.log('未配置 LUNATV_SITES，跳过站点清理');
    return;
  }
  const user = process.env.LUNATV_ADMIN_USER || '';
  const password = process.env.LUNATV_ADMIN_PASSWORD || '';
  const keep = new Set(
    (process.env.LUNATV_KEEP_CUSTOM || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  if (keep.size === 0) KEEP_DEFAULT.forEach(k => keep.add(k));

  for (const base of sites) {
    try {
      await cleanupSite(base, user, password, keep);
    } catch (e) {
      console.log(`  ⚠️ 站点 ${base} 清理异常: ${e.message}`);
    }
  }
})();
