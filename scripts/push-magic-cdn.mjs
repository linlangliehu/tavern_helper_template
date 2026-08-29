// 推送魔禁卡 6 个脚本到 GitHub CDN tag=mfrs-magic-v1
// 用法: D:/Nodejs/node.exe scripts/push-magic-cdn.mjs
// 需要: 环境变量 GITHUB_PERSONAL_ACCESS_TOKEN 或 GH_TOKEN (repo 权限)
// 改进点(对照记忆#14): 创建 tag 后额外建 refs/tags/<tag>，否则 jsdelivr CDN 拉不到
import { readFileSync } from 'node:fs';
import https from 'node:https';

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GH_TOKEN;
if (!token) { console.error('❌ 未设置 token: 请设置 GITHUB_PERSONAL_ACCESS_TOKEN 或 GH_TOKEN'); process.exit(1); }

const owner = 'linlangliehu';
const repo = 'tavern_helper_template';
const branch = 'main';
const TAG = 'mfrs-magic-v1';
const baseDir = 'D:/project/tavern_helper_template/dist/魔法禁书目录模拟器/脚本';
const files = [
  { path: 'dist/魔法禁书目录模拟器/脚本/MVU/index.js',                  local: `${baseDir}/MVU/index.js` },
  { path: 'dist/魔法禁书目录模拟器/脚本/变量结构/index.js',              local: `${baseDir}/变量结构/index.js` },
  { path: 'dist/魔法禁书目录模拟器/脚本/固定状态栏/index.js',            local: `${baseDir}/固定状态栏/index.js` },
  { path: 'dist/魔法禁书目录模拟器/脚本/界面美化/index.js',              local: `${baseDir}/界面美化/index.js` },
  { path: 'dist/魔法禁书目录模拟器/脚本/消息内面板/index.js',            local: `${baseDir}/消息内面板/index.js` },
  { path: 'dist/魔法禁书目录模拟器/脚本/mvu-protocol-applier/index.js',  local: `${baseDir}/mvu-protocol-applier/index.js` },
];

function api(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      method,
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}${urlPath}`,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'node-push',
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0,
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    console.log('=== 推送魔禁卡脚本到 CDN (tag=mfrs-magic-v1) ===');
    // 1. base sha
    const ref = await api('GET', `/git/refs/heads/${branch}`);
    if (ref.status !== 200) { console.error('ref err', ref); process.exit(1); }
    const baseSha = ref.json.object.sha;
    console.log('1. base sha:', baseSha.slice(0, 7));

    // 2. base tree
    const commit = await api('GET', `/git/commits/${baseSha}`);
    const baseTreeSha = commit.json.tree.sha;
    console.log('2. base tree:', baseTreeSha.slice(0, 7));

    // 3. blobs
    const treeItems = [];
    for (const f of files) {
      const bytes = readFileSync(f.local);
      const b64 = bytes.toString('base64');
      const blob = await api('POST', '/git/blobs', { encoding: 'base64', content: b64 });
      if (blob.status !== 201) { console.error('blob err', f.path, blob); process.exit(1); }
      treeItems.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.json.sha });
      console.log(`3. blob: ${f.path} (${bytes.length}B -> ${blob.json.sha.slice(0, 7)})`);
    }

    // 4. new tree
    const newTree = await api('POST', '/git/trees', { base_tree: baseTreeSha, tree: treeItems });
    console.log('4. new tree:', newTree.json.sha.slice(0, 7));

    // 5. new commit
    const newCommit = await api('POST', '/git/commits', {
      message: 'feat(mfrs): 方案B — 界面美化脚本接管开局页 data-act 交互(绕过 DOMPurify sanitize)',
      tree: newTree.json.sha,
      parents: [baseSha],
    });
    console.log('5. commit:', newCommit.json.sha.slice(0, 7));

    // 6. update main ref
    const updated = await api('PATCH', `/git/refs/heads/${branch}`, { sha: newCommit.json.sha, force: false });
    console.log('6. main ref:', updated.json.object.sha.slice(0, 7));

    // 7. create tag object
    const tag = await api('POST', '/git/tags', {
      tag: TAG,
      message: 'Magic Index Simulator scripts v1 - 能力卡3段式重构',
      object: newCommit.json.sha,
      type: 'commit',
    });
    if (tag.status === 422) {
      console.log('7. tag object 已存在,尝试更新...');
    } else {
      console.log('7. tag:', tag.json.tag, '->', tag.json.object?.sha?.slice(0, 7));
    }

    // 8. 创建/更新 tag ref (关键!记忆#14: git/tags只建tag object不建ref,必须建refs/tags/<tag>)
    const tagSha = tag.json.sha || tag.json.object?.sha;
    if (tagSha) {
      // 尝试新建 ref,已存在则 PATCH 更新
      const newRef = await api('POST', '/git/refs', { ref: `refs/tags/${TAG}`, sha: tagSha });
      if (newRef.status === 201) {
        console.log(`8. tag ref 创建: refs/tags/${TAG} -> ${tagSha.slice(0, 7)}`);
      } else if (newRef.status === 422) {
        // ref 已存在,用 PATCH 更新
        const patchRef = await api('PATCH', `/git/refs/tags/${TAG}`, { sha: tagSha, force: true });
        if (patchRef.status === 200) {
          console.log(`8. tag ref 更新: refs/tags/${TAG} -> ${tagSha.slice(0, 7)}`);
        } else {
          console.error('8. tag ref PATCH 失败:', patchRef);
        }
      } else {
        console.error('8. tag ref 创建失败:', newRef);
      }
    }

    console.log('\n✅ DONE — CDN tag mfrs-magic-v1 已更新');
    console.log('   验证: https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@mfrs-magic-v1/dist/魔法禁书目录模拟器/脚本/消息内面板/index.js');
    console.log('   (jsdelivr 缓存最长 ~12h, 可加 ?t=<ts> 强制刷新)');
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
