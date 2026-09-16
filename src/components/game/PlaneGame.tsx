import { useEffect, useRef, useState } from 'react'
import './PlaneGame.css'

/**
 * 星云背景之上的轻量互动层：鼠标即飞机。
 * 自动开火、击落飞碟加分、撞机爆炸、3 秒后自动重开。
 * 全部用 Canvas 2D 绘制，不引入新依赖，也不干预星云渲染。
 *
 * 生命周期由 active 控制：只有首页（第一页）active=true。
 * active 变 false 时整个组件被卸载，浏览器事件、rAF 循环、重开定时器
 * 和鼠标光标样式全部在 effect cleanup 里回收，后台不会残留任何游戏逻辑。
 */

const FIRE_INTERVAL = 0.14 // 秒
const BULLET_SPEED = 820 // px / 秒
const SPAWN_INTERVAL = 0.7
const SPAWN_JITTER = 0.4
const ENEMY_SPEED_MIN = 70
const ENEMY_SPEED_MAX = 155
const PLANE_R = 11
const ENEMY_R = 32
// 撞机判定只取飞机半径的一部分，避免机翼擦到就算死
const PLANE_HIT = 0.8

// 难度随时间缓慢上升，都有封顶，重开归零
const ENEMY_CAP_START = 6
const ENEMY_CAP_MAX = 10
const ENEMY_CAP_RAMP = 12 // 每多少秒 +1 架
const ENEMY_SPEED_RAMP = 40 // 每多少秒速度翻倍（在 ENEMY_SPEED_MIN/MAX 基础上乘算）
const ENEMY_SPEED_CAP = 2.2 // 速度倍率上限

// ---- 敌人攻击 ----
// 敌人随机的 4 种攻击方式
const ATK_SPREAD = 0
const ATK_BURST = 1
const ATK_SNIPE = 2
const ATK_HOMING = 3
// 攻击节奏：开局 4 秒一发，随时间线性压到 2 秒一发。
// 冷却必须短于飞碟穿过开火区间的时间，否则敌人会一发不放直接飞出去
// （速度倍率越高越明显），所以下限压到 2 秒就不再降。
const ATK_COOLDOWN_START = 4
const ATK_COOLDOWN_END = 2
const ATK_COOLDOWN_JITTER = 0.6
const ATK_RAMP = 60 // 多少秒后从 START 降到 END
const ATK_GAP = 0.45 // 两次攻击之间的全局最短间隔，防止攻击叠在同一个瞬间
const ATK_FIRST_MIN = 0.7 // 刚进场的首发延迟，比常规冷却短，让敌人一上来就有存在感
const ATK_FIRST_JITTER = 0.8
const ATK_BAND_TOP = 20 // 只在这个纵向区间内开火，刚生成的先落地再说
const ATK_BAND_BOTTOM = 0.92 // 屏高比例，放宽到接近底部，给快速下落的敌人留出开火窗口
const EBULLET_CAP = 90 // 敌弹上限，作为弹幕密度的兜底

// 4×3 散弹
const SPREAD_COLS = 4
const SPREAD_ROWS = 3
const SPREAD_SPEED = 265
const SPREAD_STEP_X = 24
const SPREAD_STEP_Y = 17
const SPREAD_FAN = 0.13

// 高速 5 连射
const BURST_COUNT = 5
const BURST_GAP = 0.1
const BURST_SPEED = 650

// 超高速狙击弹
const SNIPE_CHARGE = 0.5 // 锁定预警时长，玩家有这么久可以走位
const SNIPE_SPEED = 1700

// 追踪爆破弹
const HOMING_SPEED = 260
const HOMING_TURN = 1.6 // 弧度/秒，转得慢所以绕大圈，玩家跑得掉
const HOMING_FUSE = 4.0
// 离玩家这么近就引爆。必须小于爆炸半径，否则站着不动永远打不中；
// 躲避空间来自 HOMING_TURN 限制的转弯半径，而不是这个阈值。
const HOMING_TRIGGER = 46
const BLAST_R = 72
const BLAST_LIFE = 0.36

// ---- 道具 ----
const POWER_SPREAD = 0
const POWER_HOMING = 1
const POWER_SHIELD = 2

const DROP_CHANCE = 0.25 // 固定掉落率，不再随时间变化
// 掉落加权：护盾固定 5%，其余 20% 由散弹和追踪火炮平分（各 10%）。
// 本局第一次捡到的若不是护盾，就从另一个身上再拿走 5%，总数仍是 25%。
const POWER_W_BASE = 10
const POWER_W_SHIELD = 5
const POWER_W_SHIFT = 5
const POWER_R = 11
const POWER_VY = 62
const POWER_LIFE = 14
// 首次拾取直接给满 7 秒；已经生效期间再拾取，是在剩余时间上加 3 秒，最多还是 7 秒。
const BUFF_ADD = 3
const BUFF_CAP = 7
const MAX_STACK = 5 // 叠加层数上限，防止散弹/追踪弹数量失控
const SHIELD_R = 26
const SHIELD_COST = 1 // 护盾每挡一发扣掉的秒数（再除以层数）
const HBULLET_SPEED = 950
const HBULLET_TURN = 6 // 弧度/秒，转弯半径约 158px
const HBULLET_BASE = 2 // 追踪火炮每次发射的弹数（1 层）
const HBULLET_MAX = 6
const HBULLET_INTERVAL = 0.4 // 固定发射间隔，不随层数变化
// 只锁正前方 ±60°（合计 120°）扇形内的敌人，圈里没目标就不开火
const HBULLET_CONE = (Math.PI / 180) * 60
// 玩家散弹：1 层 3 发，每多 1 层 +1 发，5 层 7 发。
// 每两级之间张开 10°，7 发时首尾正好 60°。
const GUN_SPREAD_BASE = 3
const GUN_SPREAD_STEP = (Math.PI / 180) * 10

// 爆炸火花
const SPARK_COUNT = 28
const SPARK_LIFE_MIN = 0.45
const SPARK_LIFE_MAX = 0.85
const SPARK_SPEED_MIN = 70
const SPARK_SPEED_MAX = 340
const SPARK_DRAG = 2.8 // 每秒衰减

const EDGE = ENEMY_R + 12 // 敌人生成时离屏幕左右边缘的距离
const FOLLOW = 22 // 飞机跟随鼠标的收敛速度
const AUTO_RESTART_MS = 3000 // 爆炸后自动重开的间隔

const ACCENT = '#a3bcf2'
const BULLET_COLOR = 'rgba(163, 188, 242, 0.92)'
const ENEMY_COLOR = 'rgba(152, 163, 184, 0.85)'
// 敌弹统一用低饱和暖色，在冷色背景上既醒目又不刺眼
const DANGER = 'rgba(238, 150, 138, 0.92)'
const DANGER_GLOW = 'rgba(238, 150, 138, 0.7)'

// 道具配色，与 POWER_* 下标一一对应，保持整体低饱和
const POWER_COLORS = ['#7fd4c1', '#b3a3f2', '#a3bcf2']

const BEST_KEY = 'plane-game-best'
const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

type Bullet = { x: number; y: number; vx: number; vy: number }
type Enemy = {
  x: number
  y: number
  vy: number
  r: number
  atk: number // 这只飞碟绑定的攻击方式
  cd: number // 距离下一次攻击
  charge: number // >0 表示狙击蓄力中
  burst: number // 5 连射剩余发数
  burstT: number // 连射内部间隔
  lx: number // 狙击锁定的目标点
  ly: number
}
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number }
// 敌弹。kind 0 = 直飞，1 = 追踪爆破
type EBullet = { x: number; y: number; vx: number; vy: number; kind: number; life: number; t: number }
type Blast = { x: number; y: number; life: number; max: number }
type PowerUp = { x: number; y: number; vy: number; type: number; age: number; t: number }
// 玩家追踪弹，target 直接持有敌人引用，比存下标稳（数组会 splice）
// 玩家追踪弹没有存活时间，飞出屏幕就回收
type HBullet = { x: number; y: number; vx: number; vy: number; target: Enemy | null }

/**
 * 飞碟是扁的（碟身宽 2r、高 0.68r），用椭圆判定。
 * 用圆形判定会让碟身上下各 20 多像素的空白也算命中，看着像打空气。
 */
const hitEnemy = (x: number, y: number, e: Enemy, pad: number) => {
  const dx = (x - e.x) / (e.r + pad)
  const dy = (y - e.y) / (e.r * 0.45 + pad)
  return dx * dx + dy * dy < 1
}

/** 点到线段的距离，用于高速子弹的扫掠判定 */
const segDist = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) => {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t))
}

type PlaneGameProps = {
  /** 是否处于游戏页面（首页）。false 时游戏完全卸载并还原鼠标光标 */
  active: boolean
}

export default function PlaneGame({ active }: PlaneGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(readBest)
  // 触摸设备没有鼠标指针，整个小游戏不启用
  const [enabled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches,
  )

  useEffect(() => {
    if (!enabled || !active) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 飞机在飞的时候隐藏系统光标；爆炸后把电脑原来的光标还回去
    const setPlaneCursor = (on: boolean) =>
      document.documentElement.classList.toggle('plane-cursor', on)

    setPlaneCursor(true)

    let w = 0
    let h = 0

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    /* ---------- 状态 ---------- */

    const plane = { x: 0, y: 0 }
    const target = { x: 0, y: 0 }
    let bullets: Bullet[] = []
    let enemies: Enemy[] = []
    let sparks: Spark[] = []
    let ebullets: EBullet[] = []
    let blasts: Blast[] = []
    let powerups: PowerUp[] = []
    let hbullets: HBullet[] = []

    // 四种道具各自独立计时、独立层数；层数上限 MAX_STACK
    const buffs = [
      { time: 0, stacks: 0 }, // 0 连发散弹
      { time: 0, stacks: 0 }, // 1 追踪火炮
      { time: 0, stacks: 0 }, // 2 护盾
    ]

    let fireTimer = 0
    let homingTimer = 0
    let atkGap = 0 // 全局攻击间隔计时
    let spawnTimer = 0.6
    // 本局第一个捡到的非护盾道具，决定掉落权重往哪边偏
    let firstPick: number | null = null
    let started = false // 鼠标第一次移动前不画飞机
    let snapping = false // 刚从窗口外回来，下一次移动直接落位而不是滑过去
    let pts = 0
    let bestScore = readBest()
    let gameOver = false
    let restartTimer = 0
    let runTime = 0 // 本局已进行的时间，重开清零

    const enemyCap = () =>
      Math.min(
        ENEMY_CAP_MAX,
        ENEMY_CAP_START + Math.floor(runTime / ENEMY_CAP_RAMP),
      )

    const enemySpeedScale = () =>
      Math.min(ENEMY_SPEED_CAP, 1 + runTime / ENEMY_SPEED_RAMP)

    // 攻击欲望随时间上升：4 秒一发线性压到 2 秒一发，60 秒到顶
    const atkCooldown = () => {
      const t = Math.min(1, runTime / ATK_RAMP)
      return (
        ATK_COOLDOWN_START +
        (ATK_COOLDOWN_END - ATK_COOLDOWN_START) * t +
        Math.random() * ATK_COOLDOWN_JITTER
      )
    }

    /** 撞击点炸开一圈火花 */
    const spawnExplosion = (x: number, y: number) => {
      for (let i = 0; i < SPARK_COUNT; i++) {
        const angle = (i / SPARK_COUNT) * Math.PI * 2 + Math.random() * 0.6
        const speed =
          SPARK_SPEED_MIN + Math.random() * (SPARK_SPEED_MAX - SPARK_SPEED_MIN)
        const life = SPARK_LIFE_MIN + Math.random() * (SPARK_LIFE_MAX - SPARK_LIFE_MIN)
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          max: life,
        })
      }
    }

    /** 爆炸：一圈扩散环 + 火花，两者都是短期对象，播完即回收 */
    const addBlast = (x: number, y: number) => {
      blasts.push({ x, y, life: BLAST_LIFE, max: BLAST_LIFE })
      spawnExplosion(x, y)
    }

    const killPlayer = () => {
      if (gameOver) return
      spawnExplosion(plane.x, plane.y)
      gameOver = true
      setPlaneCursor(false)
      restartTimer = window.setTimeout(reset, AUTO_RESTART_MS)
    }

    /** 扣血入口：有护盾先扣护盾时间，层数越高每发扣得越少 */
    const damagePlayer = () => {
      const sh = buffs[POWER_SHIELD]
      if (sh.time > 0) {
        sh.time = Math.max(0, sh.time - SHIELD_COST / sh.stacks)
        if (sh.time <= 0) sh.stacks = 0
        return
      }
      killPlayer()
    }

    /**
     * 掉落加权：护盾固定 5%。散弹和追踪火炮默认各 10%，
     * 本局第一个捡到哪个，哪个就涨到 15%，另一个被拿走 5% 降到 5%。
     * 下标与 POWER_* 一致：0 散弹 / 1 追踪火炮 / 2 护盾。
     */
    const rollPowerType = () => {
      const w = [POWER_W_BASE, POWER_W_BASE, POWER_W_SHIELD]
      if (firstPick === POWER_SPREAD) {
        w[POWER_SPREAD] += POWER_W_SHIFT
        w[POWER_HOMING] -= POWER_W_SHIFT
      } else if (firstPick === POWER_HOMING) {
        w[POWER_HOMING] += POWER_W_SHIFT
        w[POWER_SPREAD] -= POWER_W_SHIFT
      }
      let r = Math.random() * (POWER_W_BASE * 2 + POWER_W_SHIELD)
      for (let i = 0; i < w.length; i++) {
        r -= w[i]
        if (r < 0) return i
      }
      return POWER_SHIELD
    }

    /** 击落一架飞碟：炸开火花、加分、刷新纪录、按 25% 掉落道具 */
    const destroyEnemy = (i: number) => {
      const e = enemies[i]
      enemies.splice(i, 1)
      spawnExplosion(e.x, e.y) // 与玩家阵亡同款死亡效果
      pts += 1
      setScore(pts)
      if (pts > bestScore) {
        bestScore = pts
        setBest(pts)
        try {
          localStorage.setItem(BEST_KEY, String(bestScore))
        } catch {
          /* 隐私模式下写不了，忽略 */
        }
      }
      if (Math.random() < DROP_CHANCE) {
        powerups.push({
          x: e.x,
          y: e.y,
          vy: POWER_VY,
          type: rollPowerType(),
          age: 0,
          t: 0,
        })
      }
    }

    /**
     * 拾取：首次（或过期后重新拾取）给满 5 秒；
     * 已经生效期间再拾取，只在剩余时间上加 2 秒，上限仍是 5 秒。两种情况都叠一层强度。
     */
    const pickUp = (type: number) => {
      const b = buffs[type]
      b.time = b.time <= 0 ? BUFF_CAP : Math.min(BUFF_CAP, b.time + BUFF_ADD)
      b.stacks = Math.min(MAX_STACK, b.stacks + 1)
      // 本局第一个捡到的非护盾道具，之后掉落权重往它偏（护盾不参与）
      if (firstPick === null && type !== POWER_SHIELD) firstPick = type
    }

    const reset = () => {
      window.clearTimeout(restartTimer)
      bullets = []
      enemies = []
      sparks = []
      ebullets = []
      blasts = []
      powerups = []
      hbullets = []
      for (const b of buffs) {
        b.time = 0
        b.stacks = 0
      }
      fireTimer = 0
      homingTimer = 0
      atkGap = 0
      spawnTimer = 0.6
      firstPick = null
      pts = 0
      runTime = 0
      gameOver = false
      setScore(0)
      setPlaneCursor(true)
    }

    /* ---------- 敌人攻击 ---------- */

    const pushEBullet = (x: number, y: number, vx: number, vy: number, kind: number) => {
      if (ebullets.length >= EBULLET_CAP) return
      ebullets.push({ x, y, vx, vy, kind, life: kind === 1 ? HOMING_FUSE : 0, t: 0 })
    }

    /** 朝玩家方向的单位向量，敌人所有攻击都用它作为基准 */
    const aimAt = (x: number, y: number) => {
      const dx = plane.x - x
      const dy = plane.y - y
      const d = Math.hypot(dx, dy) || 1
      return { x: dx / d, y: dy / d }
    }

    /**
     * 4×3 散弹：以瞄准方向为轴，横向 4 列展开成扇形，纵向 3 排错开起点。
     * 12 发同时出膛，玩家往侧向拉开就能穿缝。
     */
    const fireSpread = (e: Enemy) => {
      const a = aimAt(e.x, e.y)
      const base = Math.atan2(a.y, a.x)
      const px = -a.y
      const py = a.x
      for (let row = 0; row < SPREAD_ROWS; row++) {
        for (let col = 0; col < SPREAD_COLS; col++) {
          const off = (col - (SPREAD_COLS - 1) / 2) * SPREAD_STEP_X
          const back = row * SPREAD_STEP_Y
          const ang = base + (col - (SPREAD_COLS - 1) / 2) * SPREAD_FAN
          pushEBullet(
            e.x + px * off - a.x * back,
            e.y + py * off - a.y * back,
            Math.cos(ang) * SPREAD_SPEED,
            Math.sin(ang) * SPREAD_SPEED,
            0,
          )
        }
      }
    }

    /** 高速 5 连射：逐发重新瞄准，形成一串追着玩家走的火线 */
    const fireBurstShot = (e: Enemy) => {
      const a = aimAt(e.x, e.y)
      pushEBullet(e.x + a.x * e.r, e.y + a.y * e.r, a.x * BURST_SPEED, a.y * BURST_SPEED, 0)
    }

    /** 超高速狙击弹：锁定点是蓄力开始那一刻的位置，走开就躲掉了 */
    const fireSnipe = (e: Enemy) => {
      const dx = e.lx - e.x
      const dy = e.ly - e.y
      const d = Math.hypot(dx, dy) || 1
      pushEBullet(e.x, e.y, (dx / d) * SNIPE_SPEED, (dy / d) * SNIPE_SPEED, 0)
    }

    /** 追踪爆破弹 */
    const fireHoming = (e: Enemy) => {
      const a = aimAt(e.x, e.y)
      pushEBullet(e.x, e.y, a.x * HOMING_SPEED, a.y * HOMING_SPEED, 1)
    }

    const startAttack = (e: Enemy) => {
      if (e.atk === ATK_SPREAD) {
        fireSpread(e)
      } else if (e.atk === ATK_BURST) {
        e.burst = BURST_COUNT
        e.burstT = 0
      } else if (e.atk === ATK_SNIPE) {
        e.charge = SNIPE_CHARGE
        e.lx = plane.x
        e.ly = plane.y
      } else if (e.atk === ATK_HOMING) {
        fireHoming(e)
      }
    }

    /** 推进单个敌人的攻击状态机 */
    const updateEnemyAttack = (e: Enemy, dt: number) => {
      // 连射进行中：不再受冷却和全局间隔影响，先把这一串打完
      if (e.burst > 0) {
        e.burstT -= dt
        if (e.burstT <= 0) {
          e.burstT = BURST_GAP
          e.burst--
          fireBurstShot(e)
        }
        return
      }
      if (e.charge > 0) {
        e.charge -= dt
        if (e.charge <= 0) fireSnipe(e)
        return
      }
      e.cd -= dt
      // 只在屏幕中段开火，且受全局间隔和敌弹总数限制，避免糊成弹幕
      if (e.cd > 0 || atkGap > 0 || ebullets.length >= EBULLET_CAP) return
      if (e.y < ATK_BAND_TOP || e.y > h * ATK_BAND_BOTTOM) return
      e.cd = atkCooldown()
      atkGap = ATK_GAP
      startAttack(e)
    }

    /** 追踪弹转向：限制角速度，转不过来就会绕圈飞出去，这是玩家的躲避空间 */
    const steerHoming = (b: EBullet, dt: number) => {
      const dx = plane.x - b.x
      const dy = plane.y - b.y
      const want = Math.atan2(dy, dx)
      let cur = Math.atan2(b.vy, b.vx)
      let d = want - cur
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      const max = HOMING_TURN * dt
      cur += Math.max(-max, Math.min(max, d))
      b.vx = Math.cos(cur) * HOMING_SPEED
      b.vy = Math.sin(cur) * HOMING_SPEED
    }

    /** 追踪炮弹在玩家附近引爆，范围伤害 */
    const detonate = (b: EBullet) => {
      addBlast(b.x, b.y)
      if (Math.hypot(b.x - plane.x, b.y - plane.y) < BLAST_R + PLANE_R * 0.6) damagePlayer()
    }

    /* ---------- 道具 / 玩家武器 ---------- */

    /**
     * 追踪火炮选目标：在机头正前方 ±60° 扇形内，取偏角最小的敌人（不是最近的）。
     * 弹体出膛方向是正上方，偏角越小需要转的弯越小，越不容易打空。
     * 扇形内没有敌人就返回 null，此时不开火。
     */
    const frontEnemy = () => {
      let best: Enemy | null = null
      let bd = Infinity
      for (const e of enemies) {
        if (e.y < -20 || e.y > h + 20) continue
        // 以正上方为 0 度的偏角，取绝对值所以左右对称
        const dev = Math.abs(Math.atan2(e.x - plane.x, plane.y - e.y))
        if (dev > HBULLET_CONE) continue
        if (dev < bd) {
          bd = dev
          best = e
        }
      }
      return best
    }

    const fireHomingWeapon = () => {
      const target = frontEnemy()
      // 前方扇形没敌人就不开火。不重置计时器，目标一进圈立刻就能打出去
      if (!target) return
      const st = buffs[POWER_HOMING].stacks
      const n = Math.min(HBULLET_MAX, HBULLET_BASE + st - 1) // 1 层 = 2 发，之后每层 +1
      homingTimer = HBULLET_INTERVAL
      for (let k = 0; k < n; k++) {
        // 多发时给一点横向错位，看起来是散出去的而不是一根线
        const off = (k - (n - 1) / 2) * 14
        hbullets.push({
          x: plane.x + off,
          y: plane.y - PLANE_R,
          vx: off * 3,
          vy: -HBULLET_SPEED * 0.5,
          target,
        })
      }
    }

    /**
     * 时长归零时：
     * - 散弹 / 追踪火炮如果还叠着多层，不直接消失，而是退一级并返还 3 秒（= BUFF_ADD）；
     *   5 层会依次退成 4 层 3 秒、3 层 3 秒…… 最后 1 层耗尽才真正结束。
     * - 护盾不参与退级，时间到就结束（它的强度体现为抵挡次数，退级没有意义）。
     */
    const updateBuffs = (dt: number) => {
      for (let type = 0; type < buffs.length; type++) {
        const b = buffs[type]
        if (b.time <= 0) continue
        b.time -= dt
        if (b.time > 0) continue
        if (type !== POWER_SHIELD && b.stacks > 1) {
          b.stacks -= 1
          b.time = BUFF_ADD
        } else {
          b.time = 0
          b.stacks = 0
        }
      }
    }

    /* ---------- 输入 ---------- */

    const onPointerMove = (e: PointerEvent) => {
      // plane 存的是机身中心，机头在 center.y - PLANE_R；
      // 下移 PLANE_R 让机头对准鼠标，而不是机身中心对准鼠标
      target.x = e.clientX
      target.y = e.clientY + PLANE_R
      if (!started || snapping) {
        // 首次出现、以及从窗口外回来时直接落位，避免横穿整个屏幕
        plane.x = e.clientX
        plane.y = e.clientY + PLANE_R
        started = true
        snapping = false
      }
    }

    // 鼠标移出窗口后收不到 pointermove，飞机停在原地继续开火，
    // 整局游戏不暂停；这里只标记一下，回来时直接落位
    const onLeave = () => {
      snapping = true
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onLeave)

    /* ---------- 绘制 ---------- */

    const drawPlane = () => {
      ctx.save()
      ctx.translate(plane.x, plane.y)
      ctx.shadowColor = 'rgba(122, 162, 247, 0.8)'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.moveTo(0, -PLANE_R)
      ctx.lineTo(PLANE_R * 0.66, PLANE_R * 0.7)
      ctx.lineTo(0, PLANE_R * 0.32)
      ctx.lineTo(-PLANE_R * 0.66, PLANE_R * 0.7)
      ctx.closePath()
      ctx.fillStyle = ACCENT
      ctx.fill()
      ctx.restore()
    }

    const drawSparks = () => {
      ctx.save()
      for (const s of sparks) {
        const a = s.life / s.max
        ctx.globalAlpha = a * 0.9
        ctx.fillStyle = a > 0.6 ? '#dce6fb' : ACCENT
        ctx.beginPath()
        ctx.arc(s.x, s.y, 1 + a * 1.7, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    const drawBullets = () => {
      ctx.save()
      ctx.shadowColor = 'rgba(163, 188, 242, 0.75)'
      ctx.shadowBlur = 6
      ctx.fillStyle = BULLET_COLOR
      ctx.strokeStyle = BULLET_COLOR
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      for (const b of bullets) {
        // 散弹有斜向弹道，按速度方向画一条短线而不是固定竖直的矩形
        ctx.beginPath()
        ctx.moveTo(b.x, b.y)
        ctx.lineTo(b.x - b.vx * 0.011, b.y - b.vy * 0.011)
        ctx.stroke()
      }
      ctx.restore()
    }

    // 飞碟：扁碟身 + 半圆舱盖，不旋转
    const drawEnemies = () => {
      ctx.save()
      ctx.strokeStyle = ENEMY_COLOR
      ctx.fillStyle = 'rgba(152, 163, 184, 0.1)'
      ctx.lineWidth = 1.6
      ctx.shadowColor = 'rgba(152, 163, 184, 0.45)'
      ctx.shadowBlur = 7
      for (const e of enemies) {
        const r = e.r

        // 碟身
        ctx.beginPath()
        ctx.ellipse(e.x, e.y, r, r * 0.34, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // 舱盖
        ctx.beginPath()
        ctx.ellipse(e.x, e.y - r * 0.1, r * 0.46, r * 0.46, 0, Math.PI, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.restore()
    }

    // 敌弹：直飞是小圆点，追踪弹是带脉动外环的稍大圆点
    const drawEBullets = () => {
      ctx.save()
      ctx.shadowColor = DANGER_GLOW
      ctx.shadowBlur = 7
      for (const b of ebullets) {
        if (b.kind === 1) {
          const p = 1 + Math.sin(b.t * 9) * 0.16
          ctx.fillStyle = DANGER
          ctx.beginPath()
          ctx.arc(b.x, b.y, 4.6 * p, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 0.42
          ctx.strokeStyle = DANGER
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.arc(b.x, b.y, 9 * p, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1
        } else {
          ctx.fillStyle = DANGER
          ctx.beginPath()
          ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
    }

    // 爆炸范围：一圈迅速扩散并淡出的环
    const drawBlasts = () => {
      ctx.save()
      for (const b of blasts) {
        const k = 1 - b.life / b.max
        ctx.globalAlpha = (1 - k) * 0.75
        ctx.strokeStyle = DANGER
        ctx.lineWidth = 2 * (1 - k) + 0.6
        ctx.beginPath()
        ctx.arc(b.x, b.y, BLAST_R * (0.35 + k * 0.75), 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }

    // 狙击预警：一条指向锁定点的细线 + 敌人身上的准星环，随蓄力变亮
    const drawTelegraphs = () => {
      ctx.save()
      for (const e of enemies) {
        if (e.charge <= 0) continue
        const k = 1 - e.charge / SNIPE_CHARGE
        ctx.globalAlpha = 0.15 + k * 0.5
        ctx.strokeStyle = DANGER
        ctx.lineWidth = 1
        ctx.setLineDash([5, 6])
        ctx.beginPath()
        ctx.moveTo(e.x, e.y)
        ctx.lineTo(e.lx, e.ly)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.r * (0.5 + k * 0.5), 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }

    // 道具：菱形外框 + 内部标识，缓慢自转
    const drawPowerups = () => {
      ctx.save()
      ctx.lineWidth = 1.4
      for (const p of powerups) {
        const c = POWER_COLORS[p.type]
        // 快消失时闪烁提醒
        const fade = p.age > POWER_LIFE - 3 ? 0.4 + Math.abs(Math.sin(p.age * 8)) * 0.6 : 1
        const s = POWER_R * (1 + Math.sin(p.t * 4) * 0.07)
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.t * 1.1)
        ctx.globalAlpha = fade
        ctx.strokeStyle = c
        ctx.shadowColor = c
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(0, -s)
        ctx.lineTo(s, 0)
        ctx.lineTo(0, s)
        ctx.lineTo(-s, 0)
        ctx.closePath()
        ctx.stroke()

        ctx.beginPath()
        if (p.type === POWER_SPREAD) {
          // 三道斜线 = 散开
          for (let i = -1; i <= 1; i++) {
            ctx.moveTo(i * 3.2, -4)
            ctx.lineTo(i * 5.4, 4)
          }
        } else if (p.type === POWER_HOMING) {
          ctx.arc(0, 0, 3.6, 0, Math.PI * 2)
        } else {
          ctx.arc(0, 0, 4.4, Math.PI * 0.15, Math.PI * 0.85)
        }
        ctx.stroke()
        ctx.restore()
      }
      ctx.restore()
    }

    // 玩家追踪弹：小点 + 拖尾
    const drawHBullets = () => {
      ctx.save()
      ctx.strokeStyle = POWER_COLORS[POWER_HOMING]
      ctx.fillStyle = POWER_COLORS[POWER_HOMING]
      ctx.shadowColor = POWER_COLORS[POWER_HOMING]
      ctx.shadowBlur = 8
      for (const b of hbullets) {
        ctx.globalAlpha = 0.5
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(b.x, b.y)
        ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(b.x, b.y, 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // 护盾：飞机外一圈细环，受击后会有短暂缺口闪动
    const drawShield = () => {
      const st = buffs[POWER_SHIELD].stacks
      const r = SHIELD_R + st * 4
      ctx.save()
      ctx.globalAlpha = 0.25 + Math.abs(Math.sin(performance.now() / 320)) * 0.3
      ctx.strokeStyle = ACCENT
      ctx.lineWidth = 1.6
      ctx.shadowColor = ACCENT
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(plane.x, plane.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // 左下角的道具剩余时间条：一条一种道具，分段表示层数
    const drawBuffBar = () => {
      ctx.save()
      let y = h - 24
      for (let type = 0; type < buffs.length; type++) {
        const b = buffs[type]
        if (b.time <= 0) continue
        const k = Math.min(1, b.time / BUFF_CAP)
        ctx.globalAlpha = 1
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.fillRect(26, y - 3, 76, 6)
        ctx.globalAlpha = 0.45 + k * 0.55
        ctx.fillStyle = POWER_COLORS[type]
        ctx.fillRect(26, y - 3, 76 * k, 6)
        // 层数用右侧短竖线表示
        ctx.globalAlpha = 1
        for (let s = 0; s < b.stacks; s++) {
          ctx.fillRect(108 + s * 5, y - 5, 2.5, 10)
        }
        y -= 14
      }
      ctx.restore()
    }

    /* ---------- 主循环 ---------- */

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      ctx.clearRect(0, 0, w, h)

      if (!started) return

      plane.x += (target.x - plane.x) * Math.min(1, dt * FOLLOW)
      plane.y += (target.y - plane.y) * Math.min(1, dt * FOLLOW)

      if (!gameOver) {
        runTime += dt
        atkGap = Math.max(0, atkGap - dt)
        updateBuffs(dt)

        fireTimer -= dt
        if (fireTimer <= 0) {
          const sp = buffs[POWER_SPREAD]
          // 1 层 3 发，每多 1 层 +1 发，5 层 7 发
          const n = sp.time > 0 ? GUN_SPREAD_BASE + sp.stacks - 1 : 1
          // 散弹状态下同时打多路，略微加快节奏但不超过上限
          fireTimer = sp.time > 0 ? FIRE_INTERVAL * 0.85 : FIRE_INTERVAL
          for (let k = 0; k < n; k++) {
            const ang = -Math.PI / 2 + (k - (n - 1) / 2) * GUN_SPREAD_STEP
            bullets.push({
              x: plane.x,
              y: plane.y - PLANE_R,
              vx: Math.cos(ang) * BULLET_SPEED,
              vy: Math.sin(ang) * BULLET_SPEED,
            })
          }
        }

        // 追踪火炮：定期朝最近的敌人丢几发
        if (buffs[POWER_HOMING].time > 0) {
          homingTimer -= dt
          if (homingTimer <= 0) fireHomingWeapon()
        }

        spawnTimer -= dt
        if (spawnTimer <= 0 && enemies.length < enemyCap()) {
          spawnTimer = SPAWN_INTERVAL + Math.random() * SPAWN_JITTER
          enemies.push({
            x: EDGE + Math.random() * Math.max(1, w - EDGE * 2),
            y: -20,
            // 倍率只作用于新生成的飞碟，已经在场上的保持原速度
            vy:
              (ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN)) *
              enemySpeedScale(),
            r: ENEMY_R,
            // 每只飞碟生成时随机绑定一种攻击方式，不做职业体系
            atk: (Math.random() * 4) | 0,
            // 首发比常规冷却短，保证飞碟在飞出开火区间之前至少打得出一轮
            cd: ATK_FIRST_MIN + Math.random() * ATK_FIRST_JITTER,
            charge: 0,
            burst: 0,
            burstT: 0,
            lx: 0,
            ly: 0,
          })
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]
          b.x += b.vx * dt
          b.y += b.vy * dt
          if (b.y < -20 || b.x < -20 || b.x > w + 20) bullets.splice(i, 1)
        }

        for (let i = hbullets.length - 1; i >= 0; i--) {
          const b = hbullets[i]
          if (b.target && enemies.includes(b.target)) {
            const want = Math.atan2(b.target.y - b.y, b.target.x - b.x)
            let cur = Math.atan2(b.vy, b.vx)
            let d = want - cur
            while (d > Math.PI) d -= Math.PI * 2
            while (d < -Math.PI) d += Math.PI * 2
            const max = HBULLET_TURN * dt
            cur += Math.max(-max, Math.min(max, d))
            b.vx = Math.cos(cur) * HBULLET_SPEED
            b.vy = Math.sin(cur) * HBULLET_SPEED
          } else {
            b.target = frontEnemy()
          }
          b.x += b.vx * dt
          b.y += b.vy * dt
          // 没有存活时间，飞出屏幕就回收
          if (b.x < -20 || b.x > w + 20 || b.y < -20 || b.y > h + 20) {
            hbullets.splice(i, 1)
          }
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i]
          e.y += e.vy * dt
          if (e.y > h + 30) {
            enemies.splice(i, 1)
            continue
          }
          updateEnemyAttack(e, dt)
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i]

          let hit = false
          for (let j = bullets.length - 1; j >= 0; j--) {
            if (hitEnemy(bullets[j].x, bullets[j].y, e, 3)) {
              bullets.splice(j, 1)
              hit = true
              break
            }
          }
          if (!hit) {
            for (let j = hbullets.length - 1; j >= 0; j--) {
              const hb = hbullets[j]
              if (hb.y - e.y < -e.r * 2.5) continue // 还没飞到，不判定
              if (hitEnemy(hb.x, hb.y, e, 4)) {
                hbullets.splice(j, 1)
                hit = true
                break
              }
            }
          }

          if (hit) {
            destroyEnemy(i)
            continue
          }

          // 撞机也算一次伤害，有护盾时同样由护盾吃掉，飞碟自毁
          if (hitEnemy(plane.x, plane.y, e, PLANE_R * PLANE_HIT)) {
            enemies.splice(i, 1)
            spawnExplosion(e.x, e.y) // 自毁同样是死亡，给同款效果
            damagePlayer()
            break
          }
        }

        for (let i = ebullets.length - 1; i >= 0; i--) {
          const b = ebullets[i]
          b.t += dt
          if (b.kind === 1) {
            b.life -= dt
            steerHoming(b, dt)
          }
          b.x += b.vx * dt
          b.y += b.vy * dt

          if (b.x < -40 || b.x > w + 40 || b.y < -40 || b.y > h + 40) {
            ebullets.splice(i, 1)
            continue
          }
          if (b.kind === 1 && b.life <= 0) {
            ebullets.splice(i, 1)
            detonate(b)
            continue
          }

          // 狙击弹一帧能走 20 多像素，比飞机判定半径还大，只比单点距离会穿过去，
          // 所以用上一帧到当前帧的线段做判定
          const d = segDist(plane.x, plane.y, b.x - b.vx * dt, b.y - b.vy * dt, b.x, b.y)

          if (buffs[POWER_SHIELD].time > 0 && d < SHIELD_R + buffs[POWER_SHIELD].stacks * 4) {
            // 被护盾拦住
            ebullets.splice(i, 1)
            damagePlayer()
            continue
          }
          if (b.kind === 1) {
            if (d < HOMING_TRIGGER) {
              ebullets.splice(i, 1)
              detonate(b)
              break
            }
          } else if (d < PLANE_R + 3) {
            ebullets.splice(i, 1)
            damagePlayer()
            break
          }
        }

        for (let i = powerups.length - 1; i >= 0; i--) {
          const p = powerups[i]
          p.t += dt
          p.age += dt
          p.y += p.vy * dt
          if (p.age > POWER_LIFE || p.y > h + 24) {
            powerups.splice(i, 1)
            continue
          }
          if (Math.hypot(p.x - plane.x, p.y - plane.y) < POWER_R + PLANE_R) {
            pickUp(p.type)
            powerups.splice(i, 1)
          }
        }

        for (let i = blasts.length - 1; i >= 0; i--) {
          blasts[i].life -= dt
          if (blasts[i].life <= 0) blasts.splice(i, 1)
        }
      }

      // 火花在 game over 之后继续播，所以放在外面
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.life -= dt
        if (s.life <= 0) {
          sparks.splice(i, 1)
          continue
        }
        const drag = Math.max(0, 1 - SPARK_DRAG * dt)
        s.vx *= drag
        s.vy *= drag
        s.x += s.vx * dt
        s.y += s.vy * dt
      }

      drawBlasts()
      drawSparks()
      drawPowerups()
      drawBullets()
      drawHBullets()
      drawEnemies()
      drawEBullets()
      drawTelegraphs()
      if (!gameOver) {
        drawPlane()
        if (buffs[POWER_SHIELD].time > 0) drawShield()
      }
      drawBuffBar()
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(restartTimer)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('mouseleave', onLeave)
      setPlaneCursor(false)
    }
  }, [enabled, active])

  // 离开首页：canvas、DOM 与所有监听一起消失，光标样式已由 cleanup 还原
  if (!enabled || !active) return null

  return (
    <div className="pg" aria-hidden="true">
      <canvas ref={canvasRef} className="pg__canvas" />
      <div className="pg__score">
        {best > 0 && (
          <div className="pg__score-row">
            <span className="pg__score-label">BEST</span>
            <span className="pg__score-best">{best}</span>
          </div>
        )}
        <div className="pg__score-row">
          <span className="pg__score-label">SCORE</span>
          <span className="pg__score-value">{score}</span>
        </div>
      </div>
    </div>
  )
}
