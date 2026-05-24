# CrystalSay — 表达晶体星系

一个面向主动英语学习者的 3D 交互式口语练习产品。用户收藏英语学习视频 → AI 提取表达句 → 转化为 3D 晶体 → 练习点亮 → 沉淀为晶花园。

## 技术栈

- React 19 + TypeScript + Vite 8
- Tailwind CSS 4
- Three.js (@react-three/fiber + drei) 用于 3D 星系和花园
- Zustand + persist 中间件做状态管理
- Framer Motion 做页面过渡
- React Router v7

## 页面结构

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | GalaxyPage | 3D 晶体星系，按话题聚类，只显示未掌握晶体 |
| `/crystal/:id` | DetailPage | 语块重组 → 朗读整句，3 轮完整练习后掌握 |
| `/update` | UpdatePage | 按收藏视频分组选句加入星系，未选归入历史 |
| `/celestial` | CelestialPage | 碎片花园，掌握晶体赚碎片，手动种植晶花 |

## 晶体学习流程（核心）

1. 进入详情页 → 语块重组（手动提交检查）
2. 通过后 → 朗读整句（显示英文，点击"我念完了"）
3. 每轮完成后晶体点亮，跳回星系
4. 需完成 **3 轮**（每轮 = 语块 + 朗读），每轮之间至少间隔 1 天
5. 3 轮满 → 自动掌握 → 星系中爆炸 → 晶体消失 → 碎片加入沉淀区

## 晶体视觉模型

- **大小** = reuseValue（1-5 线性映射 0.30-0.62）
- **亮度** = 掌握或今天练过 → 1.0，超 24h 未练 → 0.3
- **复杂度** = difficulty：简单 1 碎片 0 线框 / 中等 4 碎片 / 较难 8 碎片 + 加密线框
- **表面花纹** = Canvas 生成的 procedural pattern，难度越高越密
- **颜色** = 四主题色：amethyst / blue-green / amber / ice-white

## 沉淀区（CelestialPage）

- 掌握晶体 → 赚碎片（简单 3 / 中等 6 / 较难 10）
- 碎片可用于种植晶花：晶芽 5 / 晶花 15 / 晶簇 35 / 晶王 60
- 花型 = 八面体晶片排列，4 层 × 3 变体 = 12 种形态
- 随机散布 + 碰撞避免 + 萤火虫粒子环境
- 撤回按钮在种植栏下方，低层级文字链接
- 花园状态从 `public/data/garden.json` 加载（文件驱动，非 localStorage）

## 关键设计决策

- ❌ 不用 emoji 做图标，用 SVG
- ❌ 不要绿色大字提示（AI 土味）
- ❌ 晶体名不要"XX晶"后缀，用自然短句
- ❌ 不手动标记掌握，全部自动触发
- ❌ 3D 晶体不加辉光球和外层点光源（会产方框）
- ✅ 底部导航用图标 + 文字，标题始终居中
- ✅ 触控目标 ≥ 44px
- ✅ 每轮学习后自动跳回星系

## 账号系统（计划中，未实施）

- SyncAdapter 接口已定义（`src/types/sync.ts`）
- 当前实现：LocalStorageSync
- 将来实现：SupabaseSync（Supabase Auth + PostgreSQL）
- 数据分两段：静态数据（JSON 加载）+ 用户状态（sync 接口）
- MVP 不做账号，等用户量验证后再加

## 文件约定

- 页面放 `src/pages/`
- 组件放 `src/components/`
- 工具放 `src/utils/`
- 类型放 `src/types/`
- 静态数据放 `public/data/`
- 状态集中在 `src/store/useStore.ts`
