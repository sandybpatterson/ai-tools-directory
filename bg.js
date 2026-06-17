(() => {
  const canvas = document.getElementById('bg-canvas');
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance'
  });
  if (!gl) return;

  const DPR_CAP = 1.5;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    canvas.width  = Math.floor(innerWidth  * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
  }
  resize();
  addEventListener('resize', resize);

  const VS = `#version 300 es
in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const FS = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_click;
uniform vec2  u_clickPos;

float hash21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),            hash21(i+vec2(1,0)), u.x),
             mix(hash21(i+vec2(0,1)),  hash21(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float ar = u_res.x / u_res.y;
  vec2 p  = (uv       - 0.5) * vec2(ar, 1.0);
  vec2 m  = (u_mouse  - 0.5) * vec2(ar, 1.0);
  vec2 cp = (u_clickPos - 0.5) * vec2(ar, 1.0);

  float bathy = fbm(p*1.3 + vec2(u_time*0.025, -u_time*0.018));
  bathy += 0.4*fbm(p*3.2 - u_time*0.04);

  float speed = 1.2;
  float pingR = u_click * speed;
  float dCp   = length(p - cp);
  float timeSincePassed = max(0.0, -(dCp - pingR) / speed);

  float clkLife = exp(-u_click * 0.22);
  float reveal  = exp(-timeSincePassed * 0.55) * clkLife;

  float bands = bathy * 9.0;
  float c  = abs(fract(bands)  - 0.5);
  float lw = fwidth(bands) * 1.4;
  float line = smoothstep(lw + 0.02, 0.0, c);

  float bandsM = bathy * 2.25;
  float cM  = abs(fract(bandsM) - 0.5);
  float lwM = fwidth(bandsM) * 1.4;
  float lineM = smoothstep(lwM + 0.02, 0.0, cM);

  float ring = exp(-pow((dCp - pingR) * 28.0, 2.0)) * clkLife;

  vec3 cyan = vec3(0.40, 0.95, 1.05);
  vec3 dark = vec3(0.004, 0.012, 0.022);

  vec3 col = dark;
  col += cyan * (line*0.4 + lineM*0.8) * reveal;
  col += cyan * ring * 1.8;

  float md   = length(p - m);
  float wake = exp(-md*md * 4.0);
  col += cyan * wake * 0.15;
  col += cyan * line * wake * 1.2;

  col += (hash21(gl_FragCoord.xy + floor(u_time*30.0)) - 0.5) * 0.018;
  col *= 1.0 - 0.38*length((uv - 0.5)*1.25);
  fragColor = vec4(col, 1.0);
}`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error('bg.js shader error:', gl.getShaderInfoLog(s));
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER,   VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.bindAttribLocation(prog, 0, 'a_pos');
  gl.linkProgram(prog);

  const u = {
    res:      gl.getUniformLocation(prog, 'u_res'),
    time:     gl.getUniformLocation(prog, 'u_time'),
    mouse:    gl.getUniformLocation(prog, 'u_mouse'),
    click:    gl.getUniformLocation(prog, 'u_click'),
    clickPos: gl.getUniformLocation(prog, 'u_clickPos'),
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Ambient state
  const start = performance.now() / 1000;
  let clickTime = -10;
  let clickPos  = [0.5, 0.5];
  let mouse     = [0.5, 0.5];
  let target    = [0.5, 0.5];
  let nextClick = 1.0;

  function frame() {
    requestAnimationFrame(frame);
    const nowS = performance.now() / 1000;
    const at   = nowS - start;

    // Lissajous virtual cursor
    target[0] = 0.5 + 0.34 * Math.sin(at * 0.27) * Math.cos(at * 0.11 + 1.2);
    target[1] = 0.5 + 0.30 * Math.sin(at * 0.19 + 0.6) * Math.cos(at * 0.34);

    // Periodic auto-clicks
    if (at >= nextClick) {
      clickTime    = nowS;
      clickPos     = [0.18 + Math.random() * 0.64, 0.18 + Math.random() * 0.64];
      nextClick    = at + 4.5 + Math.random() * 3.5;
    }

    // Smooth cursor
    const k = 0.08;
    mouse[0] += (target[0] - mouse[0]) * k;
    mouse[1] += (target[1] - mouse[1]) * k;

    const clickAge = Math.max(0, nowS - clickTime);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.uniform2f(u.res,      canvas.width, canvas.height);
    gl.uniform1f(u.time,     at);
    gl.uniform2f(u.mouse,    mouse[0], mouse[1]);
    gl.uniform1f(u.click,    clickAge);
    gl.uniform2f(u.clickPos, clickPos[0], clickPos[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  frame();
})();
