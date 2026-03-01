# Luna TV 配置编辑器（自用）
https://hafrey1.github.io/LunaTV-config  

如果源不可用,一般都是被墙了,要使用代理才能使用 !  

--- 

##  Luna-TV配置
订阅使用：复制下面链接  

👉 Base58编码订阅链接[精简版🎬源链接](https://raw.githubusercontent.com/hafrey1/LunaTV-config/refs/heads/main/jin18.txt)    （推荐使用自己部署的代理）精简版禁18源

```bash
https://j18pz.hafrey.dpdns.org?config=0&encode=base58
```
```bash
https://raw.githubusercontent.com/hafrey1/LunaTV-config/refs/heads/main/jin18.txt
```
👉 Base58编码订阅链接[精简版🎬+🔞源链接](https://jjpz.hafrey.dpdns.org?config=0&encode=base58) （推荐使用自己部署的代理）精简版剔除无搜索结果和污染搜索结果源                             
```bash
https://jjpz.hafrey.dpdns.org?config=0&encode=base58
```
```bash
https://raw.githubusercontent.com/hafrey1/LunaTV-config/refs/heads/main/jingjian.txt
```

--- 

# 🌐 CORSAPI（API 代理 & JSON 订阅器）

> 基于 Cloudflare Workers 的 API 中转与 JSON 前缀替换工具，支持代理任意 API、自动添加中转、生成 Base58 订阅格式。一键部署即可拥有自己的中转 API 与订阅链接！

<details>
<summary>🚀 部署方法</summary>
  
#   
  
**部署代码：**  
- [精简版代码](https://raw.githubusercontent.com/hafrey1/LunaTV-config/refs/heads/main/CORSAPI/jingjian_worker.js)  
- [禁18版代码](https://raw.githubusercontent.com/hafrey1/LunaTV-config/refs/heads/main/CORSAPI/jin18_worker.js)

### 🧭 部署步骤
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)  
2. 新建 **Workers & Pages → Worker**  
3. 将上述 `worker.js` 代码粘贴到编辑器中  
4. 保存并部署  

部署完成后，你就拥有了自己的 API 代理与订阅转换服务！

---   

</details>

<details>
<summary>🔗 使用示例</summary>
  
#  

```bash
假设你的 Worker 部署在：

https://api.example.workers.dev

### ① 代理任意 API  
https://api.example.workers.dev/?url=https://ikunzyapi.com/api.php/provide/vod

### ② 获取原始 JSON 配置  
https://api.example.workers.dev/?config=0

### ③ 获取中转后的 JSON 配置  
https://api.example.workers.dev/?config=1

### ④ 获取 Base58 编码订阅  
https://api.example.workers.dev/?config=1&encode=base58
```
---   
  
</details>

<details>
<summary>🛠️ 参数说明</summary>
  
# 
  
| 参数 | 说明 | 示例 |
|------|------|------|
| `url` | 代理任意 API 请求 | `?url=https://...` |
| `config=0` | 返回原始 JSON 配置 | `?config=0` |
| `config=1` | 返回使用中转代理的 JSON 配置 | `?config=1` |
| `encode=base58` | 将 JSON 配置编码为 Base58 | `?config=1&encode=base58` |
| `(可选) prefix` | 手动指定 API 代理前缀，默认使用当前域名 | `?config=1&prefix=https://api.example.com/?url=` |

🧩 **前缀替换逻辑**  
- 若 JSON 中的 `api` 字段已包含旧前缀（`?url=`），系统会自动去除旧前缀并替换为新的代理前缀。  
- 可自定义代理路径，方便接入私有 API 或多 Worker 配置。
  
---   
  
</details>

<details>
<summary>📌 注意事项</summary>
  
# 
  
- ☁️ **Workers 免费额度：**  
  每日 10 万次请求，适合轻量部署与个人订阅使用。  

- 🔄 **API代理逻辑：**  
  自动替换 JSON 中的 `api` 字段前缀，保证所有接口都经过中转代理。  

- 💾 **Base58 编码：**  
  生成的 Base58 结果可直接导入支持订阅的客户端。  

---   
  
</details>


## 🆕 更新内容

- 📄 **Luna-TV配置编辑器**：专业的 JSON 配置文件可视化编辑器。  
- 🔍 **自动检测API状态**：每 1 小时检测一次 API 可用性，并记录最近 100 次测试报告。  
- 🧩 **API名称添加图标**：源前添加识别图标，方便区分。  
- 🌐 **被墙资源自动中转**：为受限 API 提供 CF Worker 中转能力。  
  
---   

## 🧪 测试与示例

### ✅ 使用中转API测试
- 通过 CORSAPI 转发后，大幅提升视频源可用率。  
- 可“复活”原本无法访问的资源。  

### ⚙️ 精简版源更新
- 去除污染源与无搜索结果源（如 🎬虎牙、🔞丝袜、🔞色猫）。  
- 精简后共 **61 个可用源**，在中转代理下全部可访问。  
<details>
<summary>示例</summary>
<img width="1025" height="486" alt="61" src="https://github.com/user-attachments/assets/81c80108-7c03-4583-87ab-b7b57cdfd3bd" />
  
  
</details>

---   
  
# API 健康报告（每日自动检测API状态）

## API 状态（最近更新：2026-03-01 18:34 CST）

- 总 API 数量：108
- 成功 API 数量：81
- 失败 API 数量：27
- 平均可用率：82.6%
- 完美可用率（100%）：24 个
- 高可用率（80%-99%）：66 个
- 中等可用率（50%-79%）：1 个
- 低可用率（<50%）：17 个

<div style="font-size: 11px;">

<!-- API_TABLE_START -->
| 状态 | API 名称 | API 地址 | 成功次数 | 失败次数 | 可用率 | 连续失败天数 |
|------|----------|----------|---------:|---------:|-------:|-------------:|
| ✅ | 🎬TV-1080资源 | https://api.1080zyku.com/inc/api_mac10.php | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-360资源 | https://360zy.com/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-ikun资源 | https://ikunzyapi.com/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-wujinapi无尽 | https://api.wujinapi.cc/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-最大点播 | http://zuidazy.me/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-旺旺资源 | https://api.wwzy.tv/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-牛牛点播 | https://api.niuniuzy.me/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-神马云 | https://api.1080zyku.com/inc/apijson.php/ | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-索尼资源 | https://suoniapi.com/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-豆瓣资源 | https://dbzy.tv/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-量子资源 | https://cj.lziapi.com/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-闪电资源 | https://sdzyapi.com/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| 🔁 | 🎬如意资源 | https://cj.rycjapi.com/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| 🔁 | 🎬如意资源 | https://cj.rycjapi.com/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🔞AV-155资源 | https://155api.com/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🔞AV-淫水机资源 | https://www.xrbsp.com/api/json.php | 100 | 0 | 100.0% | 0 |
| ✅ | 🔞AV-白嫖资源 | https://www.kxgav.com/api/json.php | 100 | 0 | 100.0% | 0 |
| ✅ | 🔞AV-美少女资源 | https://www.msnii.com/api/json.php | 100 | 0 | 100.0% | 0 |
| ✅ | 🔞AV-老色逼资源 | https://apilsbzy1.com/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🔞AV-香奶儿资源 | https://www.gdlsp.com/api/json.php | 100 | 0 | 100.0% | 0 |
| ✅ | 🔞小鸡资源 | https://api.xiaojizy.live/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🔞性吧资源 | https://xingba111.com/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🔞豆豆资源 | https://api.douapi.cc/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🔞黄色资源啊啊 | https://hsckzy888.com/api.php/provide/vod | 100 | 0 | 100.0% | 0 |
| ✅ | 🎬TV-CK资源 | https://ckzy.me/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-丫丫点播 | https://cj.yayazy.net/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-光速资源 | https://api.guangsuapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-最大资源 | https://api.zuidapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-卧龙点播 | https://collect.wolongzyw.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-卧龙资源 | https://collect.wolongzy.cc/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-天涯资源 | https://tyyszy.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-无尽资源 | https://api.wujinapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-无尽资源 | https://api.wujinapi.me/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-无尽资源 | https://api.wujinapi.net/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-旺旺短剧 | https://wwzy.tv/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-暴风资源 | https://bfzyapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-电影天堂资源 | http://caiji.dyttzyapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-红牛资源 | https://www.hongniuzy2.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-虎牙资源 | https://www.huyaapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-金鹰点播 | https://jinyingzy.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-金鹰资源 | https://jyzyapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-非凡资源 | https://cj.ffzyapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬优质资源库1080zyk6.com高清 | https://api.yzzy-api.com/inc/ldg_api_all.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬大地资源网络 | https://dadiapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬快车资源阿 | https://caiji.kuaichezy.org/api.php/provide | 99 | 1 | 99.0% | 0 |
| 🔁 | 🎬新浪资源阿 | https://api.xinlangapi.com/xinlangapi.php/provide/vod | 99 | 1 | 99.0% | 0 |
| 🔁 | 🎬新浪资源阿 | https://api.xinlangapi.com/xinlangapi.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬极速资源 | https://jszyapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬红牛资源 | https://www.hongniuzy3.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬索尼-闪电资源 | https://xsd.sdzyapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬豆瓣资源 | https://caiji.dbzy5.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬金鹰资源采集网 | https://jyzyapi.com/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬非凡影视new | https://api.ffzyapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🔞AV-JKUN资源 | https://jkunzyapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🔞AV-乐播资源 | https://lbapi9.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🔞AV-森林资源 | https://slapibf.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🔞AV-百万资源 | https://api.bwzyz.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🔞AV-精品资源 | https://www.jingpinx.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🔞AV-辣椒资源 | https://apilj.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🔞AV-鲨鱼资源 | https://shayuapi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🔞大奶子 | https://apidanaizi.com/api.php/provide/vod | 99 | 1 | 99.0% | 0 |
| ✅ | 🎬TV-卧龙资源 | https://wolongzyw.com/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🎬TV-樱花资源 | https://m3u8.apiyhzy.com/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🎬TV-茅台资源 | https://caiji.maotaizy.cc/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🎬TV-豆瓣资源 | https://caiji.dbzy.tv/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🎬TV-豪华资源 | https://hhzyapi.com/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🎬TV-速博资源 | https://subocaiji.com/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🎬TV-飘零资源 | https://p2100.net/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🎬量子资源 | https://cj.lzcaiji.com/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🔞AV-AIvin | http://lbapiby.com/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🔞AV-玉兔资源 | https://apiyutu.com/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🔞AV-黄AV资源 | https://www.pgxdy.com/api/json.php | 98 | 2 | 98.0% | 0 |
| ✅ | 🔞优优资源 | https://www.yyzywcj.com/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🔞桃花资源 | https://thzy1.me/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🔞滴滴资源 | https://api.ddapi.cc/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ✅ | 🔞细胞采集黄色 | https://www.xxibaozyw.com/api.php/provide/vod | 98 | 2 | 98.0% | 0 |
| ❌ | 🎬TV-魔都动漫 | https://caiji.moduapi.cc/api.php/provide/vod | 97 | 3 | 97.0% | 1 |
| ❌ | 🎬TV-魔都资源 | https://www.mdzyapi.com/api.php/provide/vod | 97 | 3 | 97.0% | 1 |
| ✅ | 🎬爱奇艺 | https://iqiyizyapi.com/api.php/provide/vod | 97 | 3 | 97.0% | 0 |
| ✅ | 🔞AV-番号资源 | http://fhapi9.com/api.php/provide/vod | 96 | 4 | 96.0% | 0 |
| ✅ | 🎬爱短剧.cc | https://www.aiduanju.cc/ | 95 | 5 | 95.0% | 0 |
| ✅ | 🔞AV-奥斯卡资源 | https://aosikazy.com/api.php/provide/vod | 95 | 5 | 95.0% | 0 |
| ✅ | 🔞AV-奶香香 | https://Naixxzy.com/api.php/provide/vod | 95 | 5 | 95.0% | 0 |
| 🔁 | 🎬U酷88 | https://api.ukuapi88.com/api.php/provide/vod | 94 | 6 | 94.0% | 0 |
| 🔁 | 🎬U酷88 | https://api.ukuapi88.com/api.php/provide/vod | 94 | 6 | 94.0% | 0 |
| 🔁 | 🎬U酷资源 | https://api.ukuapi.com/api.php/provide/vod | 93 | 7 | 93.0% | 0 |
| 🔁 | 🎬U酷资源 | https://api.ukuapi.com/api.php/provide/vod | 93 | 7 | 93.0% | 0 |
| ✅ | 🎬猫眼资源 | https://api.maoyanapi.top/api.php/provide/vod | 93 | 7 | 93.0% | 0 |
| ✅ | 🔞AV-91麻豆 | https://91md.me/api.php/provide/vod | 92 | 8 | 92.0% | 0 |
| ✅ | 🔞黄色仓库 | https://hsckzy.xyz/api.php/provide/vod | 88 | 12 | 88.0% | 0 |
| ✅ | 🎬七七影视 | https://www.qiqidys.com/api.php/provide/vod/ | 69 | 31 | 69.0% | 0 |
| 🚨 | 🎬iqiyi资源 | https://www.iqiyizyapi.com/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🎬TV-小猫咪资源 | https://zy.xmm.hk/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🎬TV-步步高资源 | https://api.yparse.com/api/json | 0 | 100 | 0.0% | 100 |
| 🚨 | 🎬TV-百度云资源 | https://api.apibdzy.com/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🎬TV-魔爪资源 | https://mozhuazy.com/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🎬TV-黑木耳 | https://json.heimuer.xyz/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🎬TV-黑木耳点播 | https://json02.heimuer.xyz/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🎬华为吧资源 | https://huawei8.live/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🎬快播资源网站 | https://gayapi.com/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🎬淘片资源 | https://taopianapi.com/cjapi/sda/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🎬蜂巢片库 | https://api.fczy888.me/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🎬金马资源网 | https://api.jmzy.com/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🔞AV-souav资源 | https://api.souavzy.vip/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🔞AV-色嗨国 | https://api.sexnguon.com/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🔞AV-色猫资源 | https://api.maozyapi.com/inc/apijson_vod.php | 0 | 100 | 0.0% | 100 |
| 🚨 | 🔞最色资源 | https://api.zuiseapi.com/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
| 🚨 | 🔞幸资源 | https://xzybb2.com/api.php/provide/vod | 0 | 100 | 0.0% | 100 |
<!-- API_TABLE_END -->







































































































































































