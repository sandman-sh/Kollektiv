import { useEffect, useRef } from "react";
import { Block } from "../lib/api";

const VS = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FS: Record<string, string> = {
  fluid: `
    precision mediump float;
    uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_mouse;
    uniform vec3 u_c1; uniform vec3 u_c2;
    uniform float u_speed; uniform float u_freq; uniform float u_amp;
    void main(){
      vec2 uv=gl_FragCoord.xy/u_resolution;
      float mx=u_mouse.x/u_resolution.x, my=u_mouse.y/u_resolution.y;
      float w=sin(uv.x*u_freq+u_time*u_speed)*u_amp
             +sin(uv.y*u_freq*.7+u_time*u_speed*1.3)*u_amp*.6
             +sin((uv.x+uv.y)*u_freq*.5+u_time*u_speed*.8)*u_amp*.4
             +sin(distance(uv,vec2(mx,my))*u_freq*.5)*u_amp*.2;
      float t=clamp(uv.y+w,0.,1.);
      gl_FragColor=vec4(mix(u_c1,u_c2,t),1.);
    }`,

  grain: `
    precision mediump float;
    uniform float u_time; uniform vec2 u_resolution;
    uniform float u_intensity; uniform float u_speed; uniform int u_anim;
    float rand(vec2 c){return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
      vec2 uv=gl_FragCoord.xy/u_resolution;
      float t=u_anim>0?u_time*u_speed:0.;
      float n=rand(uv*600.+floor(t*24.)/24.);
      gl_FragColor=vec4(vec3(n),u_intensity);
    }`,

  holographic: `
    precision mediump float;
    uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_mouse;
    uniform float u_speed;
    vec3 hsl(vec3 c){
      vec3 r=clamp(abs(mod(c.x*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.);
      return c.z+c.y*(r-.5)*(1.-abs(2.*c.z-1.));
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/u_resolution;
      vec2 m=u_mouse/u_resolution;
      float h=uv.x*.5+uv.y*.3+u_time*u_speed*.05+distance(uv,m)*.1;
      float s=.8+.1*sin(u_time*.3);
      gl_FragColor=vec4(hsl(vec3(h,s,.55)),1.);
    }`,

  crt: `
    precision mediump float;
    uniform float u_time; uniform vec2 u_resolution;
    uniform float u_intensity; uniform float u_freq;
    void main(){
      vec2 uv=gl_FragCoord.xy/u_resolution;
      vec2 c=uv*2.-1.;
      c*=1.+dot(c,c)*.06;
      uv=(c+1.)*.5;
      if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.){gl_FragColor=vec4(0,0,0,1);return;}
      float sl=.7+.3*sin(uv.y*u_freq*6.28318);
      float g=.08+.04*sin(u_time*5.);
      gl_FragColor=vec4(.04+g*.5,sl*.35+g,sl*.04,1.);
    }`,

  glass: `
    precision mediump float;
    uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_mouse;
    uniform float u_intensity;
    void main(){
      vec2 uv=gl_FragCoord.xy/u_resolution;
      vec2 m=u_mouse/u_resolution;
      float d=distance(uv,m);
      float ripple=sin(d*20.-u_time*3.)*u_intensity*.04/(d+.3);
      vec2 displaced=uv+vec2(ripple);
      float rr=.6+.2*sin(displaced.x*8.+u_time*.7);
      float gg=.75+.15*cos(displaced.y*6.+u_time*.9);
      float bb=.95+.05*sin(d*10.-u_time*.5);
      gl_FragColor=vec4(rr,gg,bb,.28+.08*sin(u_time*.4));
    }`,
};

function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1],16)/255, parseInt(r[2],16)/255, parseInt(r[3],16)/255] : [0.4,0.4,1];
}

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("[Shader compile]", gl.getShaderInfoLog(s), "\n---\n", src);
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export const SHADER_TYPES = [
  { id: "fluid",       label: "Fluid / Wave"      },
  { id: "grain",       label: "Grain / Noise"      },
  { id: "holographic", label: "Holographic"         },
  { id: "crt",         label: "CRT / Retro TV"     },
  { id: "glass",       label: "Glass Distortion"   },
  { id: "custom",      label: "Custom GLSL"        },
];

interface Props { block: Block }

export function ShaderBlock({ block }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const glRef      = useRef<WebGLRenderingContext | null>(null);
  const progRef    = useRef<WebGLProgram | null>(null);
  const rafRef     = useRef(0);
  const t0Ref      = useRef(Date.now());
  const mouseRef   = useRef({ x: 0, y: 0 });
  // Always-fresh block ref so animation loop doesn't use stale closure
  const blockRef   = useRef(block);
  blockRef.current = block;

  // Rebuild WebGL only when shader type or source changes
  const shaderType = block.shaderType || "fluid";
  const fragSrc = shaderType === "custom" && block.shaderCode?.trim()
    ? block.shaderCode
    : FS[shaderType] || FS.fluid;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Mouse tracking (flip Y for WebGL coords)
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: canvas.height - (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    };
    canvas.addEventListener("mousemove", onMouseMove);

    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, preserveDrawingBuffer: false });
    if (!gl) { console.warn("[ShaderBlock] WebGL not available"); return; }
    glRef.current = gl;
    t0Ref.current = Date.now();

    const vs = compileShader(gl, gl.VERTEX_SHADER, VS);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("[ShaderBlock] Link error:", gl.getProgramInfoLog(prog));
      return;
    }
    progRef.current = prog;
    gl.useProgram(prog);

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const tick = () => {
      if (!glRef.current || !progRef.current) return;
      const g = glRef.current;
      const p = progRef.current;
      const b = blockRef.current; // always fresh!
      const w = canvas.width, h = canvas.height;
      const t = (Date.now() - t0Ref.current) / 1000;

      g.viewport(0, 0, w, h);
      g.useProgram(p);

      // Helper to set uniforms safely
      const f  = (n: string, v: number)                    => { const l=g.getUniformLocation(p,n); if(l!==null) g.uniform1f(l,v); };
      const v2 = (n: string, x: number, y: number)          => { const l=g.getUniformLocation(p,n); if(l!==null) g.uniform2f(l,x,y); };
      const v3 = (n: string, r: number, gg: number, b2: number) => { const l=g.getUniformLocation(p,n); if(l!==null) g.uniform3f(l,r,gg,b2); };
      const i  = (n: string, v: number)                    => { const l=g.getUniformLocation(p,n); if(l!==null) g.uniform1i(l,v); };

      f("u_time", t);
      v2("u_resolution", w, h);
      v2("u_mouse", mouseRef.current.x, mouseRef.current.y);
      f("u_speed",     b.shaderSpeed     ?? 1);
      f("u_intensity", b.shaderIntensity ?? 0.5);
      f("u_freq",      b.shaderFrequency ?? 6);
      f("u_amp",       b.shaderAmplitude ?? 0.2);
      i("u_anim",      b.shaderAnimated !== false ? 1 : 0);

      const [r1,g1,b1] = hexToRgb(b.shaderColor1 || "#6366f1");
      v3("u_c1", r1, g1, b1); v3("u_color1", r1, g1, b1);
      const [r2,g2,b2] = hexToRgb(b.shaderColor2 || "#ec4899");
      v3("u_c2", r2, g2, b2); v3("u_color2", r2, g2, b2);

      g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
      if (progRef.current && glRef.current) {
        glRef.current.deleteProgram(progRef.current);
        progRef.current = null;
      }
    };
  // Only rebuild WebGL when shader type/code actually changes
  }, [fragSrc, shaderType]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      width={Math.max(1, Math.round(block.width))}
      height={Math.max(1, Math.round(block.height))}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
