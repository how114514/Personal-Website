/**
 * 本文件是网站的唯一内容来源，全部文字均取自《Unity游戏客户端开发_校招简历.pdf》。
 * 后续修改文案只需改这里，组件层不硬编码任何简历内容。
 */

export const profile = {
  name: '黄正昊',
  title: 'Unity 游戏客户端开发',
  jobTarget: 'Unity / C# 游戏客户端实习',
  phone: '13435251914',
  email: 'how1539621778@qq.com',
  github: 'github.com/how114514',
  githubUser: 'how114514',
}

/** 个人概况（简历原文，按网页阅读拆成三句） */
export const summary: string[] = [
  '软件工程本科生，主要使用 Unity + C# 进行游戏客户端功能开发。',
  '有完整独立/团队课程项目与 Game Jam 项目经验，能够从玩法逻辑、状态管理、UI、资源加载、音频、数据持久化到打包发布完成较完整的游戏功能闭环。',
  '近期重点准备 Unity 游戏客户端/逻辑开发实习与校招岗位，重视代码结构、模块拆分和实际功能落地。',
]

export const education = {
  school: '嘉应学院',
  major: '软件工程',
  degree: '本科',
  period: '2023.09 – 2027.06（预计）',
  points: [
    '系统学习 C#、面向对象程序设计、数据结构、软件工程等基础课程；主要实践方向为 Unity 游戏客户端开发。',
    '围绕 Unity 完成多项课程/个人项目，并持续进行 Git 版本管理、项目重构与功能迭代。',
  ],
}

export type SkillGroup = {
  /** 技能分类名 */
  category: string
  /** 简历中该分类的原文描述 */
  description: string
  /** 从描述中提取的关键词，仅用于标签展示，不新增简历以外的技术 */
  keywords: string[]
}

export const skills: SkillGroup[] = [
  {
    category: 'Unity',
    description:
      '熟悉 MonoBehaviour 生命周期、Prefab、Scene、UGUI、Animator、Particle System、Physics2D、ScriptableObject 等常用开发流程；能够根据玩法需求选择合适的 Unity 系统。',
    keywords: [
      'MonoBehaviour 生命周期',
      'Prefab',
      'Scene',
      'UGUI',
      'Animator',
      'Particle System',
      'Physics2D',
      'ScriptableObject',
    ],
  },
  {
    category: 'C#',
    description:
      '掌握面向对象、接口与继承、泛型、集合等常用语言特性，能够进行常规游戏逻辑开发。',
    keywords: ['面向对象', '接口 / 继承', '泛型', '集合'],
  },
  {
    category: '工程工具',
    description:
      '实际使用 Addressables、DOTween、Cinemachine、AudioMixer、Unity Input System 等进行项目功能开发；使用 Git/GitHub 管理项目版本。',
    keywords: [
      'Addressables',
      'DOTween',
      'Cinemachine',
      'AudioMixer',
      'Unity Input System',
      'Git / GitHub',
    ],
  },
]

export type Project = {
  name: string
  /** 项目类型 / 技术标签，取自简历标题行 */
  type: string
  period: string
  /** 每条为「要点标题 + 简历原文」；无标题的要点 label 为 null */
  points: { label: string | null; text: string }[]
  /** 有 WebGL 构建可在线试玩时填独立试玩页的路由，否则为 undefined */
  play?: string
}

export const projects: Project[] = [
  {
    name: '《Blackjack》',
    type: 'Unity UGUI 完整卡牌游戏开发',
    period: '2026.05',
    play: '/play/blackjack',
    points: [
      {
        label: null,
        text: '完成一套可完整运行的 21 点游戏流程：牌堆管理、发牌、玩家/庄家手牌、点数计算、爆牌与胜负判定、回合流程及 UI 展示均进行模块化处理。',
      },
      {
        label: '数据驱动',
        text: '使用 ScriptableObject 保存 CardDataSO 等卡牌数据，将卡牌静态信息与运行时牌堆/手牌逻辑分离，减少硬编码并方便后续扩展。',
      },
      {
        label: '资源管理',
        text: '使用 Addressables 处理场景/资源加载，并通过 Persistent 场景承载跨场景对象；结合场景切换与 Fade 效果处理菜单、游戏场景之间的过渡。',
      },
      {
        label: '事件解耦',
        text: '使用 GameEventSO、IntEventSO 等事件对象减少系统间直接引用，让 UI、游戏流程与数据系统之间保持较低耦合。',
      },
      {
        label: '音频系统',
        text: '使用 AudioManager 统一管理 BGM 与 SFX，并通过 AudioMixer 与音量滑块实现音频分类控制。',
      },
      {
        label: '数据持久化',
        text: '使用 JSON 保存胜场、负场、总回合、Blackjack、投降、连胜、最大资金等统计数据，使玩家退出游戏后仍可恢复历史数据。',
      },
      {
        label: '工程迭代',
        text: '从基础玩法逐步补充 UI、音频、资源加载、数据保存和场景流程，最终整理为可独立运行、可打包展示的完整项目；GitHub 发布版本 v1.0。',
      },
    ],
  },
  {
    name: '《Last 30 Seconds》',
    type: 'Unity Game Jam 项目',
    period: '2026.07',
    play: '/play/last-30-seconds',
    points: [
      {
        label: '核心玩法',
        text: '以“30 秒倒计时”为核心循环，玩家在限定时间内击杀敌人获取资源，再进入商店购买强化；通过持续成长解锁 Boss 战，形成“战斗—资源—升级—更强敌人”的短循环。',
      },
      {
        label: '战斗系统',
        text: '拆分玩家攻击、敌人生成、伤害处理和 Boss 等功能；设计攻击伤害、攻击速度、移动速度、闪避、资源倍率等多维强化，使升级结果能够直接反馈到战斗体验。',
      },
      {
        label: '敌人系统',
        text: '支持生成数量、生成间隔、生成点/传送门以及敌人种类等参数调整；强化敌人后提供更高资源收益，并保留回退/调整思路，便于快速进行关卡与数值测试。',
      },
      {
        label: 'Boss 与反馈',
        text: '规划多阶段 Boss 内容，加入 Boss 血条、伤害数字、受击反馈、镜头震动等表现需求，使核心战斗信息更直观。',
      },
      {
        label: '工程实践',
        text: '使用 DOTween、Cinemachine 等 Unity 工具完成动画/镜头相关效果；围绕 30 分钟左右的实际游玩流程进行测试与调整，并尝试 WebGL/itch.io 发布流程。',
      },
      {
        label: '负责范围',
        text: '玩法程序、系统功能实现及部分美术/音频整合；项目能够独立运行并形成可展示的完整游戏流程。',
      },
    ],
  },
  {
    name: '《空洞骑士战斗系统复刻》',
    type: 'Unity / C# 战斗系统与架构重构',
    period: '2026.08',
    play: '/play/hollow-knight',
    points: [
      {
        label: null,
        text: '针对早期 PlayerController 代码职责过度集中、文件规模较大的问题进行结构重构，将输入、移动、动画、物理检测、战斗、状态与特效事件等职责拆分为独立组件。',
      },
      {
        label: '角色架构',
        text: '设计 Player、PlayerInput、PlayerMovement、PlayerAnimation、PhysicsCheck、PlayerCombat 等模块，并以双 PlayerStateMachine 管理角色状态切换。',
      },
      {
        label: '状态管理',
        text: '围绕移动、攻击、受伤、死亡、治疗、冲刺、下砸等动作建立状态逻辑，使不同动作的进入/退出条件更加明确，为后续新增技能和动作提供扩展空间。',
      },
      {
        label: '战斗架构',
        text: '区分 DamageDealer、HitBox、PlayerStats 等职责，使伤害产生、命中检测和角色属性不再全部耦合在角色控制器中。',
      },
      {
        label: '重构目标',
        text: '重点解决“能运行但难维护”的问题，降低单个脚本承担的职责数量，并为后续动画事件、VFX 和战斗效果接入预留接口。',
      },
    ],
  },
  {
    name: '《出格 / Out-of-Grid》',
    type: 'Unity 2D 创意解谜项目',
    period: '2026.07',
    points: [
      {
        label: null,
        text: '以“迷宫空间与层级切换”为核心设计，通过 2D 表现方式模拟具有纵深关系的迷宫结构，重点探索低成本视觉表现与玩法机制之间的结合。',
      },
      {
        label: '关卡设计',
        text: '围绕不同规则设计多关卡内容，包括战争迷雾、镜像、推箱等机制；通过规则变化而不是单纯增加数量提升关卡难度。',
      },
      {
        label: '战争迷雾',
        text: '使用 SpriteMask 等 Unity 组件控制可见区域，并结合动态表现处理探索范围；同时在 UI/场景中保留层数提示，帮助玩家理解当前空间层级。',
      },
      {
        label: '视觉实践',
        text: '采用较克制的纯色/低复杂度美术方案，将主要精力集中在关卡构造、交互反馈和整体视觉统一性上；项目同时作为个人游戏设计与基础美术能力的实践。',
      },
      {
        label: '开发流程',
        text: '持续进行关卡迭代、问题排查和构建测试，并通过 Git 进行版本管理；项目包含多个可游玩关卡及后续扩展空间。',
      },
    ],
  },
]

export type Highlight = { title: string; text: string }

/** 简历「项目亮点」章节 */
export const highlights: Highlight[] = [
  {
    title: '完整闭环',
    text: '不仅制作单一玩法 Demo，而是持续补充场景、UI、音频、资源加载、存档、反馈和发布流程，关注项目从“能跑”到“可展示”的完整性。',
  },
  {
    title: '重视架构',
    text: '在动作游戏项目中主动进行组件化与状态机重构，能够意识到功能增长后代码耦合与维护成本的问题。',
  },
  {
    title: '快速迭代',
    text: '有 Game Jam 实战经历，能够在时间限制下完成核心循环、数值系统和可玩版本，并根据试玩反馈继续调整。',
  },
  {
    title: '愿意深入',
    text: '目前主要方向为 Unity 游戏客户端功能开发，希望在实习中进一步提升大型项目中的模块设计、性能意识、协作开发与工程规范。',
  },
]

/** 简历「其他信息」章节 */
export const others = {
  githubNote:
    'GitHub：how114514；包含 Blackjack、Out-of-Grid、Last 30 Seconds 等 Unity 项目/版本记录。',
  target: '求职方向：Unity 游戏客户端开发 / 游戏逻辑开发 / Unity 功能开发实习或校招岗位。',
  scope: '可根据岗位要求参与客户端功能、UI、玩法逻辑、工具与系统模块开发。',
}

export type WebglGame = {
  /** 试玩页路由 */
  route: string
  /** 卡片与试玩页上显示的项目名 */
  title: string
  /** 副标题，用项目卡片里的类型字段 */
  subtitle: string
  /** 构建目录，对应 public/webgl/<dir>/ */
  dir: string
  /**
   * Unity WebGL 构建文件名，对应 public/webgl/<dir>/Build 下的实际文件。
   * 重新导出 WebGL 构建时若文件名有变，改这里即可。
   */
  loaderFile: string
  dataFile: string
  frameworkFile: string
  codeFile: string
  /**
   * 游戏原生分辨率（画布渲染尺寸），缺省 1280×720。
   * 构建时按多少分辨率摆的 UI 就填多少，页面按 16:9 等比缩放显示，
   * 填成别的值会让固定坐标的 UI 错位。
   */
  canvasWidth?: number
  canvasHeight?: number
  /** 试玩页游戏下方的玩法说明，逐栏渲染；没有就只显示一行通用提示 */
  guide?: GuideSection[]
}

/** 玩法说明的一栏 */
export type GuideSection = {
  title: string
  /** 正文，字符串或多段 */
  body?: string | string[]
  /** 条目：含「：」的渲染成「按键 + 说明」，否则渲染成标签 */
  items?: string[]
  /** 跟在最后一条后面的普通文字（如「等」），不带标签框 */
  trailing?: string
}

/** 可在线试玩的项目：路由 → Unity WebGL 构建信息 */
export const webglGames: Record<string, WebglGame> = {
  '/play/last-30-seconds': {
    route: '/play/last-30-seconds',
    title: 'Last 30 Seconds',
    subtitle: 'Unity Game Jam 项目',
    dir: 'last-30-seconds',
    loaderFile: 'WebGL.loader.js',
    dataFile: 'WebGL.data',
    frameworkFile: 'WebGL.framework.js',
    codeFile: 'WebGL.wasm',
    guide: [
      {
        title: '玩法介绍',
        body: '一款以 COUNT DOWN 为主题的限时战斗游戏。玩家需要在有限的 30 秒内击败敌人获取资源，在战斗与商店之间不断强化自己，最终挑战 Boss。',
      },
      {
        title: '基础操作',
        items: ['A / D：左右移动', 'J：攻击'],
      },
      {
        title: '核心玩法',
        body: [
          '每轮战斗开始后，玩家拥有 30 秒的战斗时间，需要尽可能击败敌人并获取资源。',
          '战斗结束后进入商店，使用获得的资源购买强化，再进入下一轮战斗。随着游戏推进，敌人的数量、种类和强度逐渐提升，并最终解锁 Boss 战。',
        ],
      },
      {
        title: '强化系统',
        body: '玩家可以通过商店提升角色的多项能力，包括：',
        items: [
          '攻击伤害',
          '移动速度',
          '攻击频率',
          '闪避能力',
          '敌人生成',
          '敌人种类',
          'Boss 强化',
        ],
        trailing: '等',
      },
    ],
  },
  '/play/blackjack': {
    route: '/play/blackjack',
    title: 'Blackjack 21 点',
    subtitle: 'Unity UGUI 完整卡牌游戏开发',
    dir: 'blackjack',
    loaderFile: 'WebGL.loader.js',
    dataFile: 'WebGL.data',
    frameworkFile: 'WebGL.framework.js',
    codeFile: 'WebGL.wasm',
    // 构建按 1920×1080 摆的 UI，画布就按原生分辨率渲染，交给 CSS 等比缩小显示
    canvasWidth: 1920,
    canvasHeight: 1080,
    guide: [
      {
        title: '玩法介绍',
        body: '经典 21 点卡牌游戏，玩家与庄家进行对局，通过合理决策让手牌点数尽可能接近 21 点，同时避免爆牌。',
      },
      {
        title: '基础操作',
        items: [
          'Hit：继续要牌',
          'Stand：停止要牌',
          'Double：加倍并再获得一张牌',
          'Surrender：投降并结束本局',
        ],
      },
      {
        title: '游戏规则',
        body: [
          '玩家首先获得两张牌，可以选择继续要牌或停牌。手牌超过 21 点即爆牌并输掉本局；玩家停牌后由庄家按照规则补牌，最终比较双方点数决定胜负。',
        ],
      },
    ],
  },
  '/play/hollow-knight': {
    route: '/play/hollow-knight',
    title: '空洞骑士战斗系统复刻',
    subtitle: 'Unity / C# 战斗系统与架构重构',
    dir: 'hollow-knight',
    loaderFile: 'Hollow Knight_WebGL.loader.js',
    dataFile: 'Hollow Knight_WebGL.data',
    frameworkFile: 'Hollow Knight_WebGL.framework.js',
    codeFile: 'Hollow Knight_WebGL.wasm',
    guide: [
      {
        title: '玩法介绍',
        body: '本项目复刻《空洞骑士》的基础 2D 动作战斗体验，玩家控制角色在场景中移动、跳跃并进行近战攻击，通过闪避与技能应对敌人。',
      },
      {
        title: '基础操作',
        items: [
          'A / D：左右移动',
          'W / S：技能变招',
          'J：普通攻击',
          'K：跳跃',
          'L：冲刺',
          'U：治疗',
          'I：技能',
        ],
      },
      {
        title: '战斗方式',
        body: '通过移动、跳跃和冲刺调整角色位置，在敌人攻击间隙进行近战输出。部分技能具有不同的使用场景，需要结合移动与攻击进行操作。',
      },
    ],
  },
}

/** 顶部导航（与页面区块 id 对应） */
export const navItems = [
  { id: 'about', label: '关于' },
  { id: 'skills', label: '技能' },
  { id: 'projects', label: '项目经历' },
  { id: 'highlights', label: '项目亮点' },
  { id: 'contact', label: '联系方式' },
]
