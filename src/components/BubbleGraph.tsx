import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArtistNeighbourhood, ArtistNode, GraphPhase } from '../types';
import { ACTIVE_BUBBLE_RADIUS, DRIFT_STRENGTH, EXPLOSION_SPEED, FLY_IN_SPEED, IDLE_DAMPING } from '../utils/animationConstants';
import { pickOffscreen } from '../utils/graphLayout';

type SimNode = ArtistNode & { x:number;y:number;vx:number;vy:number;tx:number;ty:number;r:number;opacity:number;scale:number;selected?:boolean };
const textRadius = (name: string) => Math.max(28, name.length * 3.8 + 14);

export function BubbleGraph({ data, onSelectArtist, phase, setPhase }: { data: ArtistNeighbourhood; onSelectArtist: (a: ArtistNode) => void; phase: GraphPhase; setPhase: (p: GraphPhase) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 620 });
  const [tick, setTick] = useState(0);
  const center = useMemo(() => ({ x: size.w / 2, y: size.h / 2 }), [size]);
  const nodes = useRef<SimNode[]>([]);
  const activeScale = useRef(1);
  const activePos = useRef({ x: center.x, y: center.y });
  const pending = useRef<SimNode | null>(null);

  const placeTargets = (list: SimNode[], attachX: number, attachY: number) => {
    const circumference = list.reduce((sum, n) => sum + n.r * 2 + 14, 0);
    const ring = Math.max(ACTIVE_BUBBLE_RADIUS + 30 + Math.max(...list.map((n) => n.r)), circumference / (2 * Math.PI));
    let arc = -Math.PI / 2;
    for (const n of list) {
      const w = (n.r * 2 + 14) / ring;
      arc += w / 2;
      n.tx = attachX + Math.cos(arc) * ring;
      n.ty = attachY + Math.sin(arc) * ring;
      arc += w / 2;
    }
  };

  const initNodes = () => {
    const list: SimNode[] = data.similarArtists.slice(0, 18).map((n) => ({ ...n, r: textRadius(n.name) + (n.similarity ?? 0.6) * 8, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, opacity: 0, scale: 1 }));
    placeTargets(list, activePos.current.x, activePos.current.y);
    nodes.current = list.map((n) => ({ ...n, ...pickOffscreen(size.w, size.h) }));
  };

  useEffect(() => { activePos.current = { x: center.x, y: center.y }; }, [center.x, center.y]);
  useEffect(() => { const ro = new ResizeObserver(() => { const r = wrap.current?.getBoundingClientRect(); if (r) setSize({ w: r.width, h: r.height }); }); if (wrap.current) ro.observe(wrap.current); return () => ro.disconnect(); }, []);
  useEffect(() => { initNodes(); setPhase('fly-in-new-neighbours'); }, [data.artist.id, center.x, center.y]);

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      if (phase === 'fly-in-new-neighbours') {
        let done = true;
        for (const n of nodes.current) {
          const dx = n.tx - n.x; const dy = n.ty - n.y;
          n.x += dx * FLY_IN_SPEED; n.y += dy * FLY_IN_SPEED; n.opacity = Math.min(1, n.opacity + 0.04);
          if (Math.hypot(dx, dy) > 3) done = false;
        }
        if (done) { setPhase('collision-pulse'); activeScale.current = 0.92; setTimeout(() => { activeScale.current = 1.05; }, 120); setTimeout(() => { activeScale.current = 1; setPhase('settle'); }, 300); }
      } else if (phase === 'explode-out') {
        let out = true;
        for (const n of nodes.current) {
          if (n.selected) continue;
          const dx = n.x - activePos.current.x; const dy = n.y - activePos.current.y; const mag = Math.max(0.01, Math.hypot(dx, dy));
          n.x += (dx / mag) * EXPLOSION_SPEED; n.y += (dy / mag) * EXPLOSION_SPEED; n.opacity = Math.max(0, n.opacity - 0.03);
          if (n.x > -220 && n.x < size.w + 220 && n.y > -220 && n.y < size.h + 220) out = false;
        }
        if (pending.current) {
          activePos.current.x += (center.x - activePos.current.x) * 0.06;
          activePos.current.y += (center.y - activePos.current.y) * 0.06;
        }
        if (out && pending.current) { setPhase('recenter-new-active'); onSelectArtist(pending.current); pending.current = null; }
      } else if (phase === 'idle' || phase === 'settle') {
        for (let i = 0; i < nodes.current.length; i++) {
          const n = nodes.current[i];
          const dx = n.tx - n.x; const dy = n.ty - n.y;
          n.vx = (n.vx + dx * 0.02 + (Math.random() - 0.5) * DRIFT_STRENGTH) * IDLE_DAMPING;
          n.vy = (n.vy + dy * 0.02 + (Math.random() - 0.5) * DRIFT_STRENGTH) * IDLE_DAMPING;
          for (let j = i + 1; j < nodes.current.length; j++) {
            const m = nodes.current[j];
            const rx = n.x - m.x; const ry = n.y - m.y; const d = Math.hypot(rx, ry) || 1;
            const min = n.r + m.r + 6;
            if (d < min) {
              const push = (min - d) * 0.08;
              n.vx += (rx / d) * push; n.vy += (ry / d) * push;
              m.vx -= (rx / d) * push; m.vy -= (ry / d) * push;
            }
          }
          n.x += n.vx; n.y += n.vy;
        }
        if (phase === 'settle') setPhase('idle');
      }
      setTick((t) => (t + 1) % 100000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, center.x, center.y, onSelectArtist, setPhase, size.h, size.w]);

  const select = (n: SimNode) => {
    if (phase !== 'idle') return;
    pending.current = n;
    activePos.current = { x: n.x, y: n.y }; // selected stays onscreen first
    for (const node of nodes.current) node.selected = node.id === n.id;
    n.scale = 1.16;
    setPhase('inflate-selected');
    setTimeout(() => setPhase('explode-out'), 200);
  };

  return <div className="graph" ref={wrap}><svg viewBox={`0 0 ${size.w} ${size.h}`} data-tick={tick}><g transform={`translate(${activePos.current.x},${activePos.current.y}) scale(${activeScale.current})`}><circle r={ACTIVE_BUBBLE_RADIUS} className="activeBubble" /><text textAnchor="middle" y="4" className="label">{data.artist.name}</text></g>{nodes.current.map((n)=><g key={n.id} transform={`translate(${n.x},${n.y}) scale(${n.scale})`} onClick={()=>select(n)} style={{ opacity: n.selected ? 0 : n.opacity, cursor: 'pointer' }}><circle r={n.r + 8} fill="transparent" /><circle r={n.r} className="relatedBubble" /><text textAnchor="middle" y="4" className="label">{n.name}</text></g>)}</svg></div>;
}
