/** Upgraded procedural dragon for cinematic intro canvas */

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

function drawScalePlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number,
  fill: string,
  stroke: string
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.beginPath()
  ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 0.6
  ctx.stroke()
  ctx.restore()
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
  const sz = 105 * canvasScale

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)

  // Ambient body glow
  const glowGrad = ctx.createRadialGradient(sz * 0.1, 0, 0, sz * 0.1, 0, sz * 1.1)
  glowGrad.addColorStop(0, `${accentColor}33`)
  glowGrad.addColorStop(0.5, `${accentColor}14`)
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.ellipse(sz * 0.05, 0, sz * 1.0, sz * 0.45, 0, 0, Math.PI * 2)
  ctx.fillStyle = glowGrad
  ctx.fill()

  const wingSin = Math.sin(wingPhase)
  const wingSpread = 0.55 + wingSin * 0.45

  // Back wing (depth layer)
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  ctx.moveTo(-sz * 0.15, -sz * 0.08)
  ctx.bezierCurveTo(
    -sz * 0.2,
    -sz * (0.65 + wingSpread * 0.75),
    sz * 0.35,
    -sz * (0.95 + wingSpread * 0.55),
    sz * 0.48,
    -sz * (0.35 + wingSpread * 0.25)
  )
  ctx.bezierCurveTo(sz * 0.25, -sz * 0.18, sz * 0.05, -sz * 0.1, -sz * 0.15, -sz * 0.08)
  ctx.fillStyle = 'rgba(15, 8, 2, 0.85)'
  ctx.fill()
  ctx.globalAlpha = 1

  // Main upper wing with membrane
  ctx.beginPath()
  ctx.moveTo(-sz * 0.08, -sz * 0.04)
  ctx.bezierCurveTo(
    -sz * 0.05,
    -sz * (0.55 + wingSpread * 0.85),
    sz * 0.42,
    -sz * (0.88 + wingSpread * 0.65),
    sz * 0.55,
    -sz * (0.32 + wingSpread * 0.28)
  )
  ctx.bezierCurveTo(sz * 0.32, -sz * 0.14, sz * 0.12, -sz * 0.07, -sz * 0.08, -sz * 0.04)
  const wingGrad = ctx.createLinearGradient(-sz * 0.1, -sz * 1.3, sz * 0.55, 0)
  wingGrad.addColorStop(0, '#120804')
  wingGrad.addColorStop(0.5, '#3d1f08')
  wingGrad.addColorStop(1, '#6b3412')
  ctx.fillStyle = wingGrad
  ctx.fill()
  ctx.strokeStyle = `${accentColor}55`
  ctx.lineWidth = 1.2 * canvasScale * 100
  ctx.stroke()

  // Wing finger bones
  ctx.strokeStyle = 'rgba(220, 140, 40, 0.35)'
  ctx.lineWidth = 1 * canvasScale * 100
  for (let i = 1; i <= 5; i++) {
    const ft = i / 6
    ctx.beginPath()
    ctx.moveTo(-sz * 0.04, -sz * 0.04)
    ctx.quadraticCurveTo(
      sz * (0.15 * ft),
      -sz * (0.5 + wingSpread * 0.7) * ft,
      sz * (0.48 * ft),
      -sz * (0.75 + wingSpread * 0.55) * ft
    )
    ctx.stroke()
  }

  // Lower wing
  ctx.beginPath()
  ctx.moveTo(sz * 0.08, sz * 0.06)
  ctx.bezierCurveTo(
    sz * 0.12,
    sz * (0.35 + wingSpread * 0.45),
    sz * 0.42,
    sz * (0.58 + wingSpread * 0.38),
    sz * 0.52,
    sz * (0.18 + wingSpread * 0.12)
  )
  ctx.bezierCurveTo(sz * 0.32, sz * 0.1, sz * 0.14, sz * 0.07, sz * 0.08, sz * 0.06)
  ctx.fillStyle = '#1a0a03'
  ctx.fill()

  // Tail with fin
  ctx.beginPath()
  ctx.moveTo(-sz * 0.48, sz * 0.04)
  ctx.bezierCurveTo(-sz * 0.72, sz * 0.1, -sz * 0.95, sz * 0.28, -sz * 1.15, sz * 0.02)
  ctx.bezierCurveTo(-sz * 1.05, -sz * 0.12, -sz * 0.88, -sz * 0.06, -sz * 0.72, -sz * 0.02)
  ctx.bezierCurveTo(-sz * 0.85, -sz * 0.18, -sz * 0.95, -sz * 0.22, -sz * 1.05, -sz * 0.08)
  ctx.bezierCurveTo(-sz * 0.9, -sz * 0.04, -sz * 0.68, sz * 0.02, -sz * 0.48, sz * 0.04)
  ctx.fillStyle = '#2a0e03'
  ctx.fill()

  // Body core
  const bodyGrad = ctx.createLinearGradient(-sz * 0.55, -sz * 0.22, sz * 0.75, sz * 0.22)
  bodyGrad.addColorStop(0, '#0d0502')
  bodyGrad.addColorStop(0.35, '#4a2008')
  bodyGrad.addColorStop(0.65, '#6b3010')
  bodyGrad.addColorStop(1, '#1a0a02')
  ctx.beginPath()
  ctx.ellipse(sz * 0.08, 0, sz * 0.66, sz * 0.2, 0, 0, Math.PI * 2)
  ctx.fillStyle = bodyGrad
  ctx.fill()

  // Spine ridge spikes
  for (let i = 0; i < 7; i++) {
    const sx = -sz * 0.35 + i * sz * 0.12
    const sh = sz * (0.08 + (i % 2) * 0.03)
    ctx.beginPath()
    ctx.moveTo(sx, -sz * 0.12)
    ctx.lineTo(sx - sz * 0.025, -sz * 0.12 - sh)
    ctx.lineTo(sx + sz * 0.025, -sz * 0.12 - sh)
    ctx.closePath()
    ctx.fillStyle = i > 4 ? accentColor : '#5c2a08'
    ctx.fill()
  }

  // Scale plates along body
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      const px = -sz * 0.3 + col * sz * 0.11
      const py = -sz * 0.02 + row * sz * 0.07
      drawScalePlate(
        ctx,
        px,
        py,
        sz * 0.045,
        sz * 0.028,
        col * 0.15,
        row === 0 ? '#5c3010' : '#3d1a05',
        `${accentColor}44`
      )
    }
  }

  // Neck
  ctx.beginPath()
  ctx.moveTo(sz * 0.62, -sz * 0.06)
  ctx.bezierCurveTo(sz * 0.74, -sz * 0.2, sz * 0.8, -sz * 0.24, sz * 0.76, -sz * 0.14)
  ctx.bezierCurveTo(sz * 0.76, -sz * 0.04, sz * 0.68, sz * 0.05, sz * 0.62, sz * 0.07)
  ctx.closePath()
  ctx.fillStyle = '#4a2008'
  ctx.fill()

  // Head + snout
  ctx.beginPath()
  ctx.ellipse(sz * 0.8, -sz * 0.14, sz * 0.17, sz * 0.1, -0.35, 0, Math.PI * 2)
  ctx.fillStyle = '#2a0e03'
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(sz * 0.88, -sz * 0.12)
  ctx.lineTo(sz * 1.02, -sz * 0.1)
  ctx.lineTo(sz * 0.9, -sz * 0.06)
  ctx.closePath()
  ctx.fillStyle = '#1a0802'
  ctx.fill()

  // Jaw highlight
  ctx.beginPath()
  ctx.moveTo(sz * 0.72, -sz * 0.08)
  ctx.quadraticCurveTo(sz * 0.9, -sz * 0.04, sz * 0.98, -sz * 0.09)
  ctx.strokeStyle = `${accentColor}66`
  ctx.lineWidth = 1.5 * canvasScale * 100
  ctx.stroke()

  // Eyes (both) with glow
  for (const [ex, ey] of [
    [sz * 0.86, -sz * 0.16],
    [sz * 0.82, -sz * 0.155],
  ] as const) {
    ctx.shadowColor = accentColor
    ctx.shadowBlur = 10 * canvasScale * 80
    ctx.beginPath()
    ctx.ellipse(ex, ey, sz * 0.032, sz * 0.022, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#fef08a'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ex + sz * 0.008, ey, sz * 0.012, 0, Math.PI * 2)
    ctx.fillStyle = '#0f0f0f'
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // Horns (crown)
  const horns: [number, number, number, number][] = [
    [sz * 0.84, -sz * 0.22, sz * 0.9, -sz * 0.38],
    [sz * 0.78, -sz * 0.21, sz * 0.8, -sz * 0.34],
    [sz * 0.74, -sz * 0.19, sz * 0.72, -sz * 0.3],
  ]
  ctx.strokeStyle = '#8b4513'
  ctx.lineWidth = 2.5 * canvasScale * 100
  ctx.lineCap = 'round'
  for (const [x1, y1, x2, y2] of horns) {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // Fire breath (multi-layer)
  if (t > 0.08) {
    const flicker = Math.sin(Date.now() * 0.018) * 0.15
    const fireLen = sz * (2.8 + flicker)

    const layers = [
      { alpha: 0.95, colors: ['#fff7cc', '#ffd54f', '#ff8c00', 'rgba(200,40,0,0)'], width: 1.0 },
      { alpha: 0.7, colors: ['#ffcc00', '#ff6600', '#cc2200', 'rgba(80,10,0,0)'], width: 1.35 },
      { alpha: 0.45, colors: ['#ff9900', '#ff3300', 'rgba(150,20,0,0.3)', 'rgba(0,0,0,0)'], width: 1.7 },
    ]

    for (const layer of layers) {
      ctx.globalAlpha = layer.alpha
      const fireGrad = ctx.createLinearGradient(sz * 0.75, 0, sz * 0.75 + fireLen * layer.width, 0)
      layer.colors.forEach((c, i) => fireGrad.addColorStop(i / (layer.colors.length - 1), c))

      ctx.beginPath()
      ctx.moveTo(sz * 0.72, -sz * 0.1)
      ctx.bezierCurveTo(
        sz * 0.95,
        -sz * 0.04,
        sz * 0.85 + fireLen * 0.45,
        sz * 0.18 * Math.sin(Date.now() * 0.009),
        sz * 0.78 + fireLen * layer.width,
        sz * 0.06 * Math.sin(Date.now() * 0.007)
      )
      ctx.bezierCurveTo(
        sz * 0.85 + fireLen * 0.45,
        -sz * 0.2,
        sz * 0.95,
        -sz * 0.22,
        sz * 0.72,
        -sz * 0.1
      )
      ctx.fillStyle = fireGrad
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  ctx.restore()
}
