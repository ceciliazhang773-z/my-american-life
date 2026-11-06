# My American Life v3

手机优先的第一人称美国寄宿家庭生活模拟器。界面不显示人物台词；AI 生成对话后由浏览器英语语音朗读。支持麦克风英语输入、重复、换一种说法、旁听和中文表达求助。

## 先说明语音能力

- 角色语音：使用手机/电脑浏览器内置的英文语音合成（SpeechSynthesis），不同角色会尽量选择不同的美式英语声音；具体声音取决于设备已安装的语音。
- 你的语音：使用浏览器 Web Speech Recognition 识别为文字后发送给服务端；识别文字不会显示在页面上。
- 这不是持续双向实时音频通话，AI 每轮生成完毕后才播放语音。
- iOS Safari 的语音识别支持会因系统版本和浏览器环境不同而变化。若麦克风不可用，页面会显示文字输入备用方式。
- 部分浏览器的语音识别会把音频发送到浏览器供应商的在线识别服务，不能视为离线识别。

## 本地运行（Windows）

1. 安装 Node.js 20 或更新版本。
2. 将 `.env.example` 复制一份，改名为 `.env`。
3. 用记事本打开 `.env`，把 `GEMINI_API_KEY=` 后面填入你在 Google AI Studio 创建的密钥。
4. 在项目文件夹地址栏输入 `cmd`，回车。
5. 输入 `node server.js` 并回车。
6. Chrome 打开 `http://localhost:3000`。

本项目只使用 Node.js 内置模块，不需要 `npm install`。密钥只保存在服务端 `.env`，绝不能放进 `index.html` 或 `app.js`。

## 免费部署到 Render（手机可访问）

### A. 把项目放到 GitHub

1. 登录 GitHub，打开 https://github.com/new
2. Repository name 填 `my-american-life`。
3. 选择 **Public**（仓库里不包含密钥），勾选 Add a README 可不选，然后点 Create repository。
4. 进入新仓库，选择 **Add file → Upload files**。
5. 把本项目文件夹里的所有文件和文件夹内容上传。必须包括 `index.html`、`app.js`、`server.js`、`manifest.webmanifest`、`sw.js`、`icon.svg`、`render.yaml`、`package.json`、`.gitignore`。
6. 不要上传 `.env`。`.env.example` 可以上传，因为里面没有密钥。
7. 点 Commit changes。

### B. Render 发布

1. 打开 https://render.com/ 并用 GitHub 登录。
2. 选择 **New → Web Service**，连接 GitHub 后选 `my-american-life` 仓库。
3. 设置：
   - Runtime: Node
   - Build Command: 留空
   - Start Command: `node server.js`
   - Instance Type: Free（先试用）
4. 在 Environment 添加：
   - `GEMINI_API_KEY` = 你自己的 Gemini API Key
   - `AI_MODEL` = `gemini-3.8-flash`
   - `AI_BASE_URL` = `https://generativelanguage.googleapis.com/v1beta/openai`
5. 点击 Create Web Service，等待部署成功。
6. Render 会分配一个 `https://....onrender.com` 地址。打开它，页面状态显示 AI 已连接后即可使用。

注意：Render 免费 Web Service 会在一段时间无访问后休眠，重新打开时可能需要等待启动；免费服务也可能重启，不适合高可靠生产用途。Gemini API 是否免费、可用模型和配额以你的 Google AI Studio 项目为准。

## 手机添加到桌面

- Android：用 Chrome 打开 Render 的 HTTPS 地址 → 浏览器菜单 → 安装应用 / 添加到主屏幕。
- iPhone：用 Safari 打开地址 → 分享 → 添加到主屏幕。
- 首次使用请允许麦克风权限。建议戴耳机，避免设备把角色声音再次识别成你的回答。

## 主要交互

- 开始今天的生活：AI 根据当前场景生成随机日常对话。
- 再说一遍：重播刚才最后一句。
- 没听懂：请角色换一种更简单的说法。
- 只听他们聊：角色之间自然交谈，你可以不说话。
- 我想怎么表达：用中文写下意思，角色会给出自然英语说法并继续场景。
- 换个场景：切换早餐、便利店、学校、午餐、客厅、晚餐。

## 隐私与安全

- Gemini Key 只存在 Render 环境变量或本地 `.env`，不进入前端。
- 不要把 `.env` 上传 GitHub，也不要把 API Key 发在聊天里。
- 语音识别可能由浏览器供应商在线处理；请查看设备/浏览器的语音隐私设置。
- 不采集账号或个人档案；对话历史只保存在当前页面内存，刷新后会清空。
