'use client'

import { useEffect, useRef } from 'react'

const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const TRAIL_LENGTH = 40

/** The field is soft, so half resolution looks the same at a quarter the work. */
const RENDER_SCALE = 0.5

const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_trail[${TRAIL_LENGTH}];
  uniform float u_trail_time[${TRAIL_LENGTH}];
  uniform vec3 u_base;
  uniform vec3 u_pale;
  uniform vec3 u_soft;
  uniform vec3 u_accent;
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;
    vec2 waveDisp = vec2(0.0);
    for(int i=0; i<${TRAIL_LENGTH}; i++) {
      float age = u_time - u_trail_time[i];
      if (age > 0.0 && age < 2.5) {
        vec2 pos = u_trail[i] / u_resolution.xy;
        pos.x *= aspect;
        float dist = distance(uv, pos);
        float radius = age * 0.15;
        float thickness = 0.1 + age * 0.05;
        float intensity = pow(max(0.0, 1.0 - (age / 2.5)), 1.5);
        float ring = smoothstep(radius + thickness, radius, dist) * smoothstep(radius - thickness, radius, dist);
        vec2 dir = normalize(uv - pos);
        if (dist < 0.001) dir = vec2(0.0);
        float ripple = sin((dist - radius) * 28.0) * ring * intensity;
        waveDisp += dir * ripple * 0.045;
      }
    }
    vec2 distortedUV = uv + waveDisp;
    float time = u_time * 0.1;
    float n1 = snoise(distortedUV * 1.5 + vec2(time, -time * 0.5));
    float n2 = snoise(distortedUV * 2.0 - vec2(-time * 0.8, time * 0.6));
    float n3 = snoise(distortedUV * 1.0 + vec2(sin(time), cos(time)));
    n1 = n1 * 0.5 + 0.5;
    n2 = n2 * 0.5 + 0.5;
    n3 = n3 * 0.5 + 0.5;
    vec3 finalColor = u_base;
    finalColor = mix(finalColor, u_pale, smoothstep(0.1, 0.8, n1));
    finalColor = mix(finalColor, u_soft, smoothstep(0.3, 0.9, n2));
    finalColor = mix(finalColor, u_accent, smoothstep(0.6, 1.0, n3));
    gl_FragColor = vec4(finalColor, 1.0);
  }
`

/**
 * The shader's colours come from these tokens: each hidden swatch resolves its
 * own light or dark value in CSS and the canvas reads the result, so no raw
 * colour lives here and a theme switch recolours the wave.
 */
const TONES = [
  { uniform: 'u_base', className: 'bg-background' },
  { uniform: 'u_pale', className: 'bg-brand-100 dark:bg-brand-900' },
  { uniform: 'u_soft', className: 'bg-brand-200 dark:bg-brand-800' },
  { uniform: 'u_accent', className: 'bg-violet-100 dark:bg-violet-900' },
] as const

function createProgram(gl: WebGLRenderingContext) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return shader
  }
  const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (vertex && fragment && program) {
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
  }
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!program || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }
  return program
}

/** Any CSS colour string to 0–1 RGB, through a one-pixel 2D canvas. */
function createColorReader() {
  const context = document
    .createElement('canvas')
    .getContext('2d', { willReadFrequently: true })
  return (color: string): [number, number, number] | null => {
    if (!context) return null
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data
    return [red / 255, green / 255, blue / 255]
  }
}

function startWave(
  canvas: HTMLCanvasElement,
  wrapper: HTMLElement,
  swatches: HTMLElement
) {
  // A software renderer would run this shader on the main thread's CPU budget
  // and stall the page, so it counts as having no WebGL.
  const gl = canvas.getContext('webgl', {
    failIfMajorPerformanceCaveat: true,
    powerPreference: 'low-power',
  })
  if (!gl) return
  const program = createProgram(gl)
  if (!program) return
  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  )
  const position = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  const uResolution = gl.getUniformLocation(program, 'u_resolution')
  const uTime = gl.getUniformLocation(program, 'u_time')
  const uTrail = gl.getUniformLocation(program, 'u_trail')
  const uTrailTime = gl.getUniformLocation(program, 'u_trail_time')

  const readColor = createColorReader()
  const applyTones = () => {
    Array.from(swatches.children).forEach((swatch, index) => {
      const tone = TONES[index]
      const color = readColor(getComputedStyle(swatch).backgroundColor)
      if (tone && color) {
        gl.uniform3fv(gl.getUniformLocation(program, tone.uniform), color)
      }
    })
  }
  applyTones()
  const themeObserver = new MutationObserver(applyTones)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  const trailCoords = new Float32Array(TRAIL_LENGTH * 2)
  const trailTimes = new Float32Array(TRAIL_LENGTH).fill(-100)
  let trailIndex = 0
  let lastX = -1000
  let lastY = -1000
  const record = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
    if (Math.hypot(x - lastX, y - lastY) <= 6) return
    lastX = x
    lastY = y
    trailCoords[trailIndex * 2] = x * RENDER_SCALE
    trailCoords[trailIndex * 2 + 1] = canvas.height - y * RENDER_SCALE
    trailTimes[trailIndex] = performance.now() / 1000
    trailIndex = (trailIndex + 1) % TRAIL_LENGTH
  }
  const onPointerMove = (event: PointerEvent) =>
    record(event.clientX, event.clientY)
  window.addEventListener('pointermove', onPointerMove, { passive: true })

  const sizeObserver = new ResizeObserver(() => {
    const rect = wrapper.getBoundingClientRect()
    canvas.width = Math.floor(rect.width * RENDER_SCALE)
    canvas.height = Math.floor(rect.height * RENDER_SCALE)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(uResolution, canvas.width, canvas.height)
  })
  sizeObserver.observe(wrapper)

  let visible = true
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true
  })
  visibilityObserver.observe(wrapper)

  let frame = requestAnimationFrame(function render(time) {
    if (visible) {
      gl.uniform1f(uTime, time * 0.001)
      gl.uniform2fv(uTrail, trailCoords)
      gl.uniform1fv(uTrailTime, trailTimes)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }
    frame = requestAnimationFrame(render)
  })

  return () => {
    cancelAnimationFrame(frame)
    visibilityObserver.disconnect()
    sizeObserver.disconnect()
    themeObserver.disconnect()
    window.removeEventListener('pointermove', onPointerMove)
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
  }
}

/**
 * Animated ripple field behind the feature blocks, on wide screens only. With
 * reduced motion, a narrow viewport or no WebGL it never starts and the
 * section keeps its plain background.
 */
export function WaveBackground() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const swatchesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    const swatches = swatchesRef.current
    if (!wrapper || !canvas || !swatches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(min-width: 60rem)').matches) return
    return startWave(canvas, wrapper, swatches)
  }, [])

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      className="pointer-events-none absolute inset-0"
    >
      <canvas ref={canvasRef} className="block size-full" />
      <div ref={swatchesRef} className="hidden">
        {TONES.map((tone) => (
          <span key={tone.uniform} className={tone.className} />
        ))}
      </div>
    </div>
  )
}
