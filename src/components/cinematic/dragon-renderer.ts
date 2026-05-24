/** Hand-crafted pixel-art dragon for cinematic intro — side view, head faces +X */

export interface DragonPath {
  p0: { x: number; y: number }
  p1: { x: number; y: number }
  p2: { x: number; y: number }
  p3: { x: number; y: number }
}

export const DRAGON_PATH: DragonPath = {
  p0: { x: -0.25, y: 1.1 },
  p1: { x: 0.15, y: 0.6 },
  p2: { x: 0.55, y: 0.35 },
  p3: { x: 1.3, y: -0.15 },
}

export function bezier(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
) {
  const mt = 1 - t
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  }
}

export function bezierTangent(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
) {
  const mt = 1 - t
  return {
    x: 3 * (mt * mt * (p1.x - p0.x) + 2 * mt * t * (p2.x - p1.x) + t * t * (p3.x - p2.x)),
    y: 3 * (mt * mt * (p1.y - p0.y) + 2 * mt * t * (p2.y - p1.y) + t * t * (p3.y - p2.y)),
  }
}

type Px =
  | '.'
  | 'O'
  | 'D'
  | 'd'
  | 'B'
  | 'b'
  | 'L'
  | 'l'
  | 'G'
  | 'R'
  | 'H'
  | 'K'
  | 'Y'
  | 'y'
  | 'n'
  | 'W'
  | 'w'
  | 'V'

const BODY_W = 76
const BODY_H = 36
const WING_W = 36
const WING_H = 20

/** Pivot: body center for rotation along flight path */
const ANCHOR_X = 38
const ANCHOR_Y = 18

function buildPalette(accent: string): Record<Exclude<Px, '.'>, string> {
  return {
    O: '#0c0604',
    D: '#160a06',
    d: '#281208',
    B: '#3d1a0a',
    b: '#5c3018',
    L: '#7a5030',
    l: '#4a2818',
    G: '#a08058',
    R: accent,
    H: '#9a7820',
    K: '#362010',
    Y: '#fef08a',
    y: '#120a06',
    n: '#0a0404',
    W: '#100804',
    w: '#241008',
    V: '#5c3818',
  }
}

/** Tail ← · scaled belly · back ridges · neck · head/snout/eye → */
const BODY_SPRITE: string[] = [
  '............................................................H.......H...H...',
  '...........................................................H.......H.....H..',
  '..........................................................H.................',
  '............................................................................',
  '............................................................................',
  '................................................RRRRRRRRRRRRRRRRRRRRRR......',
  '..............................................RRRRRRRRRRRRRRRRRRRRRRRRRR....',
  '............................................RRRRRRRRRRRRRRRRRRRRRRYyRRR.....',
  '..........................................RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR..',
  '..........................................RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRD.',
  '..........................................RRRRRRRRRRbbbbbbbbbbbbbbbbbbbb.n..',
  '................H...H...H...H...H...H...H.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbO.',
  '................H...R...H...R...H...R...H.bbbbbbbbbbbbbbbbbbbbbbbbbbbb......',
  '..............DDDDDDDDDDDDDDDDDDDDDDDDDDDDbbbbbbbbbbbbbbbb.................',
  '................RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR...........................',
  '................RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR...........................',
  '................RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR...........................',
  '................RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR...........................',
  '................BBLlGLlGLlGLlGLlGLlGLlGLlGLlBBBB...........................',
  '................BBlGLlGLlGLlGLlGLlGLlGLlGLlGBBBB...........................',
  '................BBGLlGLlGLlGLlGLlGLlGLlGLlGLBBBB...........................',
  '................BBLlGLlGLlGLlGLlGLlGLlGLlGLlBBBB...........................',
  'BBBBBBBBBBBBBBBBBBlGLlGD...................................................',
  'BBBBBBBBBBBBBBBBBBGLlDKK...................................................',
  'BBBBBBBBBBBBBBBBBBBR..KK............KK.....................................',
  'BBBBBBBBBBBBBBBBBH....KK............KK.....................................',
  'BBBBBBBBBBBBBBHD......KK............KK.....................................',
  'bbbbbbbbbbbRbD.......K..K...........KK.....................................',
  'bbbbbbbbbbbD.......................K..K....................................',
  'bbbbbbbbbD.................................................................',
  'bbbbbbbD...................................................................',
  'bbbbbD.....................................................................',
  '............................................................................',
  '............................................................................',
  '............................................................................',
  '............................................................................',
]

const WING_DOWN: string[] = [
  '....................................',
  '....................................',
  '....................................',
  '.................................Ww.',
  '.........................VVVVVVVVVw.',
  '........................VVVVVVVVVVw.',
  '.......................VVVVVVVVVVVw.',
  '......................wWwWwWwWwWwWw.',
  '.....................wWwWwWwWwWwWww.',
  '....................wWwWwWwWwWwWwWw.',
  '................VV...wWwWwWwWwWwWww.',
  '..................VVVVwWwWwWwWwWwWw.',
  '......................VVVVWwWwWwWww.',
  '........................wWVVVVwWwWw.',
  '.........................wWwWwVVVVw.',
  '.................................Ww.',
  '....................................',
  '....................................',
  '....................................',
  '....................................',
]

const WING_UP: string[] = [
  '.......................VVVVVVVVVVVw.',
  '......................wWwWVVVVVVVVw.',
  '.....................wWwWwwWwWwWwWw.',
  '................VV..wWwWwWWwWwWwWww.',
  '.....................wWwWwwWwWwWwWw.',
  '..................VVVVwWwWWwWwWwWww.',
  '......................VVVVwWwWwWwWw.',
  '........................wWWwWwWwWww.',
  '.........................wVVVVwWwWw.',
  '..........................WwWwVVVVw.',
  '.................................Ww.',
  '..................................w.',
  '....................................',
  '....................................',
  '....................................',
  '....................................',
  '....................................',
  '....................................',
  '....................................',
  '....................................',
]

function drawPixelLayer(
  ctx: CanvasRenderingContext2D,
  sprite: string[],
  palette: Record<Exclude<Px, '.'>, string>,
  ox: number,
  oy: number,
  px: number
) {
  const prevSmooth = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false

  for (let y = 0; y < sprite.length; y++) {
    const row = sprite[y]
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] as Px
      if (ch === '.') continue
      ctx.fillStyle = palette[ch]
      ctx.fillRect(ox + x * px, oy + y * px, px, px)
    }
  }

  ctx.imageSmoothingEnabled = prevSmooth
}

export function drawDragon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  t: number,
  wingPhase: number,
  accentColor: string,
  canvasScale: number
) {
  const px = Math.max(2.5, (110 * canvasScale * 2.4) / BODY_W)
  const palette = buildPalette(accentColor)
  const bodyOx = -ANCHOR_X * px
  const bodyOy = -ANCHOR_Y * px

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)

  // Soft accent glow behind dragon
  const glowR = BODY_W * px * 0.55
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR)
  glow.addColorStop(0, `${accentColor}28`)
  glow.addColorStop(0.55, `${accentColor}10`)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, glowR, 0, Math.PI * 2)
  ctx.fill()

  const wingSin = Math.sin(wingPhase)
  const wingSprite = wingSin > 0 ? WING_UP : WING_DOWN
  const wingLift = Math.max(0, wingSin) * px * 3.5

  // Back wing (slightly dimmed, offset down)
  ctx.globalAlpha = 0.45
  drawPixelLayer(ctx, wingSprite, palette, bodyOx - 10 * px, bodyOy - 14 * px + px * 2, px)
  ctx.globalAlpha = 1

  // Body
  drawPixelLayer(ctx, BODY_SPRITE, palette, bodyOx, bodyOy, px)

  // Fore wing
  drawPixelLayer(ctx, wingSprite, palette, bodyOx - 10 * px, bodyOy - 14 * px - wingLift, px)

  // Eye glow
  const eyeX = bodyOx + 66 * px + px * 0.5
  const eyeY = bodyOy + 7 * px + px * 0.5
  ctx.shadowColor = accentColor
  ctx.shadowBlur = px * 2.5
  ctx.fillStyle = '#fef08a'
  ctx.fillRect(eyeX, eyeY, px, px)
  ctx.shadowBlur = 0

  // Fire breath from snout
  if (t > 0.08) {
    const flicker = Math.sin(Date.now() * 0.018) * 0.15
    const snoutX = (74 - ANCHOR_X) * px
    const snoutY = (10 - ANCHOR_Y) * px
    const fireLen = BODY_W * px * (0.55 + flicker)

    const layers = [
      { alpha: 0.95, colors: ['#fff7cc', '#ffd54f', '#ff8c00', 'rgba(200,40,0,0)'], width: 1.0 },
      { alpha: 0.7, colors: ['#ffcc00', '#ff6600', '#cc2200', 'rgba(80,10,0,0)'], width: 1.35 },
      { alpha: 0.45, colors: ['#ff9900', '#ff3300', 'rgba(150,20,0,0.3)', 'rgba(0,0,0,0)'], width: 1.7 },
    ]

    for (const layer of layers) {
      ctx.globalAlpha = layer.alpha
      const fireGrad = ctx.createLinearGradient(snoutX, snoutY, snoutX + fireLen * layer.width, snoutY)
      layer.colors.forEach((c, i) => fireGrad.addColorStop(i / (layer.colors.length - 1), c))

      const wobble = Math.sin(Date.now() * 0.009) * px * 2
      ctx.beginPath()
      ctx.moveTo(snoutX, snoutY - px)
      ctx.bezierCurveTo(
        snoutX + fireLen * 0.25,
        snoutY - px * 3 + wobble,
        snoutX + fireLen * 0.55,
        snoutY + px * 4 - wobble,
        snoutX + fireLen * layer.width,
        snoutY + px * 0.5
      )
      ctx.bezierCurveTo(
        snoutX + fireLen * 0.55,
        snoutY - px * 2,
        snoutX + fireLen * 0.25,
        snoutY - px * 4,
        snoutX,
        snoutY - px
      )
      ctx.fillStyle = fireGrad
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  ctx.restore()
}
