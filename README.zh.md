# ChatGPT Enhancement Extension

功能：

- [Prompt 提示](#prompt-提示)：在输入区域输入“/”并查看提示。
- [PDF 自动阅读](#pdf-自动阅读)：使用[Regex Prompt Group](#正则-prompt-组)逐页加载 PDF 文件并阅读。
- [Markdown 转换支持](#markdown-转换支持)：将对话转换为 markdown 格式。
- [复制、保存和导出页面](#额外功能按钮)：通过[注入按钮组](#额外功能按钮)复制、保存和导出对话。
- [后台管理](#后台管理)：在选项页面中轻松管理所有。
- [在任意位置提问](#在任意位置提问)：无需 API，开启一个 ChatGPT 页面即可跨页面提问。

## Prompt 提示

![](./images/prompt-hint.gif)

按 `Enter` 直接发送提示信息，或按 `Tab` 进行编辑。

## PDF 自动阅读

将 PDF 文件拖入文本区，然后每页都会自动生成一个提示信息。

![](./images/overview-pdf.gif)

根据[Regex Prompt Group](#regex-prompt-group)，每个页面字符串末尾都会添加附加提示信息。

### 正则 Prompt 组

![](./images/reg-prompt-0.png)![](./images/reg-prompt-1.png)

## Markdown 转换支持

![](./images/preview.png)

### 额外功能按钮

![](./images/injected-button-preview.png)

## 后台管理

编辑 Prompt：

![](./images/dashboard-0.png)

编辑正则 Prompt ：

![](./images/dashboard-1.png)

编辑保存的对话历史记录：

![](./images/dashboard-2.png)

## 在任意位置提问

在任意页面选中文本，按 `c` 键直接发送到 ChatGPT 页面，按 `x` 弹出 Prompt-hint 选择 Prompt 发送。

![](images/re-prompt.gif)

这一功能是跨页面的：

![](images/connect-cross-page-with-prompt.gif)

![](images/connect-cross-page.gif)

在地址栏键入 `. `，按下回车即可在 ChatGPT 页面提问：

![](images/omnibox-1.png)

> 目前不支持 Arc 浏览器（浏览器层面的问题，暂时无法解决）

# 安装

## 从 Chrome 网上应用店安装

因为近期更新较快，但审核流程较长的原因，商店的版本远低于 Github 版本，如果有条件，请尽量安装 Github 分发的版本。

[web store](https://chrome.google.com/webstore/detail/fdbinkcfdihppebpojopiljcmekfedkg?hl=en&authuser=0)

## 从 crx 安装

在 Chrome / Arc / Edge 浏览器中：

- [下载 dist.crx](./dist.crx)
- 进入扩展管理页面
- 打开“开发者模式”
- 在出现的按钮中单击“加载已解压的扩展程序”
- 将 `./dist.crx` 拖到扩展管理页面。
- 刷新 ChatGPT 页面

> 如果您对加载扩展程序有任何疑问，请尝试向 ChatGPT 提问。

## 额外安装 KeepChatGPT

> 推荐安装 [KeepChatGPT](https://github.com/xcanwin/KeepChatGPT/) 减少 `something went wrong` 错误，提高使用体验。


# 开发

```bash
git clone --depth=1 https://github.com/sailist/chatgpt-enhancement-extension/
cd chatgpt-enhancement-extension
npm install
npm run dev

# 在Chrome浏览器中加载./dist
```

# Buy me a coffee

开发这款插件处于我的个人兴趣。如果您喜欢这款插件，请考虑请我喝一杯咖啡，您的支持将提供给我充足的动力，谢谢！

![](images/coffee.png)

# ❤ 致谢

- [chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate) ：提供了非常完善的 Chrome 插件开发脚手架
- ChatGPT：解决了很多疑难杂症。
