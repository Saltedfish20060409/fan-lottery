# 粉丝橱窗抽奖

给画师用的手机网页抽奖工具：上传 B站 / 小红书 / 抖音评论截图 → 服务端 OCR 点选昵称 → 多种动效抽奖。

静态页托管在 GitHub Pages；识别走 `vnscriptstudio.cn/fan-lottery-ocr`（内存识别、不落盘）。也可改 `.env.production` 里的 `VITE_OCR_API_BASE`。

## 本地开发

```bash
npm install
npm run dev
```

## 部署（给朋友手机直接用）

这是纯静态站点：构建后把 `dist/` 放到任意静态托管即可。

### 方式 A：GitHub Pages（推荐，免费）

1. 在 GitHub 新建仓库，把本项目推上去（默认分支 `main`）
2. 仓库 **Settings → Pages → Source** 选 **GitHub Actions**
3. 推送后会自动跑 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
4. 几分钟后打开 Pages 给的地址（形如 `https://你的用户名.github.io/fan-lottery/`）
5. 把链接发给朋友；可用手机浏览器「添加到主屏幕」

### 方式 B：你自己的域名 + 轻量服务器

在服务器上：

```bash
npm ci
npm run build
# 把 dist/ 目录内容拷到网站根目录，例如 /var/www/fan-lottery/
```

Nginx 示例：

```nginx
server {
  listen 80;
  server_name lottery.example.com;
  root /var/www/fan-lottery;
  index index.html;

  # 大文件：OCR 模型与 wasm
  location /ort/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
  location /models/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

HTTPS 用 Let’s Encrypt / Cloudflare 即可。朋友访问你的域名就能用。

### 方式 C：Cloudflare Pages / Vercel

连接同一 Git 仓库，构建命令 `npm run build`，输出目录 `dist`。

## 说明

- 识别引擎 WASM 在构建时从 `onnxruntime-web` 复制到 `public/ort`（无需提交进 Git）
- 中文模型在 `public/models/`（需随仓库一起发布）
- 使用 Hash 路由，适合子路径与静态托管
