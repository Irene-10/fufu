<p align="center">
  <img src="docs/fufu-day-hero.png" alt="Fufu 从早到晚的健康作息" width="900" />
</p>

<h1 align="center">Fufu</h1>

<p align="center">把一天借给一只认真生活的小狗。</p>

Fufu 是一个 macOS 与 Windows 桌面宠物实验：小狗会按照现实时间起床、工作、吃饭、午休、运动和阅读。它不是一张贴在桌面的日程表，而是用持续可见的状态，让你在走神时自然想起“现在该做什么”。

> 当前是个人开发的早期试用版。数据保存在本机，不需要注册账号。

## 下载与安装

1. 打开 [Releases](https://github.com/Irene-10/fufu/releases)，进入最新版本。
2. 根据电脑下载对应文件：

| 设备 | 下载文件 |
| --- | --- |
| Windows 10/11 64 位 | `Fufu.Setup.x.x.x.exe` |
| Apple 芯片 Mac（M1/M2/M3/M4/M5） | `Fufu-x.x.x-arm64.dmg` |
| Intel 芯片 Mac | `Fufu-x.x.x-x64.dmg` |

Windows 双击 `.exe` 安装；Mac 打开 `.dmg` 后，将 Fufu 拖入 Applications。

当前安装包尚未购买商业代码签名证书。Windows 可能显示“未知发布者”；macOS 首次打开可能被 Gatekeeper 阻止，需要在 Finder 中右键 Fufu 选择“打开”，或前往“系统设置 → 隐私与安全性”确认打开。请只从本仓库的 Releases 页面下载。

## Fufu 的一天

Fufu 默认读取电脑的本地时间并执行这份作息：

| 时间 | 它在做什么 |
| --- | --- |
| 23:00–07:00 | 睡觉 |
| 07:00–08:00 | 起床、自由活动 |
| 08:00–12:00 | 工作 |
| 12:00–13:00 | 吃饭 |
| 13:00–14:00 | 午休 |
| 14:00–18:00 | 工作 |
| 18:00–19:00 | 吃饭 |
| 19:00–20:00 | 自由活动 |
| 20:00–21:00 | 运动 |
| 21:00–23:00 | 看书 |

长期状态会从多个线条小狗动画中随机选择，并每 5 分钟轮换一次，避免一直重复同一个动作。固定作息可以在设置中关闭。

## 你可以怎样使用它

- 跟随作息：看到 Fufu 开始工作、吃饭或运动时，把它当作转换活动的轻提醒。
- 开启专注模式：设置一段专注时间；若检测到分心应用，Fufu 会提醒你回来。
- 设置休息和喝水提醒：到点后通过动画和气泡提醒你。
- 拖动小狗：把它放在不遮挡工作的屏幕角落。
- 右键小狗或托盘图标：打开设置、切换显示状态或退出。

提醒、喝水和专注动画会暂时覆盖日常作息；事件结束后，Fufu 会回到当前时段应该呈现的状态。

## 当前版本的边界

- 时间表暂时固定，不能自定义工作日和周末。
- Windows 上暂不支持分心应用检测，专注倒计时仍可使用；macOS 支持检测，但需要辅助功能权限。
- 没有云端同步、社交功能或养成数值系统。
- 这是未签名的测试版本，建议先在非关键设备上体验并及时反馈问题。

## 隐私

设置、提醒记录和统计数据保存在本机。Fufu 只会在你主动检查更新，或启用“启动时检查更新”后访问本仓库的 GitHub Releases。

## 反馈

发现问题或有建议时，请在 [Issues](https://github.com/Irene-10/fufu/issues) 新建一条记录，并尽量附上 Windows 版本、复现步骤和截图。

## 本地开发

需要 Node.js 24+ 与 pnpm 11：

```bash
git clone https://github.com/Irene-10/fufu.git
cd fufu
corepack enable
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm test       # 运行逻辑测试
pnpm typecheck  # TypeScript 类型检查
pnpm build      # 生产构建
pnpm dist:win   # 生成 Windows 安装包
```

## 代码地图

```text
src/main/       Electron 主进程：窗口、托盘、计时器和本地存储
src/preload/    主进程与界面之间的安全桥接
src/renderer/   React 界面：桌面宠物与设置页
src/shared/     作息规则、类型、文案和宠物动画映射
pet_assets/     内置 GIF 动画
tests/          时间表、设置、窗口定位等逻辑测试
```

技术栈为 Electron、React 19、TypeScript、electron-store 和 electron-builder。

## 来源与许可

Fufu 是独立维护、独立命名、独立发布的项目。项目最初使用 [PawPal](https://github.com/zebangeth/PawPal) 的 MIT 源代码作为工程起点；之后的产品方向、作息系统、视觉表达和版本路线由 Fufu 独立演进。

程序源代码遵循 [MIT License](LICENSE)。`pet_assets/` 下的动画与源代码分开授权，详情见 [ASSET_LICENSE.md](ASSET_LICENSE.md)；在确认每组素材的原始授权前，请勿将这些动画单独提取、二次发布或用于商业用途。
