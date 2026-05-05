import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArtistNeighbourhood, ArtistNode, GraphPhase } from '../types';
import { ACTIVE_BUBBLE_RADIUS, DRIFT_STRENGTH, IDLE_ATTRACTION, IDLE_DAMPING, IDLE_REPULSION, RELATED_BUBBLE_MAX_RADIUS, RELATED_BUBBLE_MIN_RADIUS } from '../utils/animationConstants';
import { pickOffscreen, targetPosition } from '../utils/graphLayout';

type SimNode = ArtistNode & { x: number; y: number; vx: number; vy: number; tx: number; ty: number; r: number; inflate?: boolean; gone?: boolean; incoming?: boolean };

export function BubbleGraph({ data, onSelectArtist, phase, setPhase, selectedId }: { data: ArtistNeighbourhood; onSelectArtist: (a: ArtistNode) => void; phase: GraphPhase; setPhase: (p: GraphPhase) => void; selectedId?: string }) {
  const wrap = useRef<HTMLDivElement>(null); const svg = useRef<SVGSVGElement>(null); const [size, setSize] = useState({ w: 800, h: 600 });
  const nodes = useRef<SimNode[]>([]); const activeScale = useRef(1);
  const center = useMemo(() => ({ x: size.w / 2, y: size.h / 2 }), [size]);
  useEffect(()=>{ const ro = new ResizeObserver(()=>{ const r = wrap.current?.getBoundingClientRect(); if (r) setSize({ w: r.width, h: r.height }); }); if (wrap.current) ro.observe(wrap.current); return ()=>ro.disconnect(); },[]);

  useEffect(() => {
    nodes.current = data.similarArtists.slice(0, 18).map((n, i, arr) => { const t = targetPosition(i, arr.length, n.similarity ?? 0.6, center.x, center.y); const s = pickOffscreen(size.w, size.h); const sim = n.similarity ?? 0.6; return { ...n, x: s.x, y: s.y, vx: 0, vy: 0, tx: t.x, ty: t.y, r: RELATED_BUBBLE_MIN_RADIUS + sim * (RELATED_BUBBLE_MAX_RADIUS - RELATED_BUBBLE_MIN_RADIUS), incoming: true }; });
    setPhase('fly-in-new-neighbours');
  }, [data.artist.id]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = svg.current; if (!el) return;
      nodes.current.forEach((n, idx) => {
        const dx = n.tx - n.x; const dy = n.ty - n.y;
        n.vx += dx * IDLE_ATTRACTION + (Math.random() - 0.5) * DRIFT_STRENGTH;
        n.vy += dy * IDLE_ATTRACTION + (Math.random() - 0.5) * DRIFT_STRENGTH;
        nodes.current.forEach((m, j) => { if (idx !== j) { const rx = n.x - m.x; const ry = n.y - m.y; const d2 = Math.max(60, rx * rx + ry * ry); n.vx += (rx / d2) * IDLE_REPULSION * 0.0001; n.vy += (ry / d2) * IDLE_REPULSION * 0.0001; }});
        n.vx *= IDLE_DAMPING; n.vy *= IDLE_DAMPING; n.x += n.vx; n.y += n.vy;
      });
      if (phase === 'fly-in-new-neighbours' && nodes.current.every((n) => Math.hypot(n.tx - n.x, n.ty - n.y) < 15)) { activeScale.current = 0.92; setPhase('collision-pulse'); setTimeout(() => { activeScale.current = 1.04; }, 120); setTimeout(() => { activeScale.current = 1; setPhase('settle'); }, 290); }
      if (phase === 'settle') setPhase('idle');
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [phase]);

  const beginSelect = (n: SimNode) => {
    if (phase !== 'idle') return;
    setPhase('inflate-selected');
    setTimeout(() => { setPhase('explode-out'); }, 180);
    setTimeout(() => { setPhase('recenter-new-active'); onSelectArtist(n); }, 620);
  };

  return <div className="graph" ref={wrap}><svg ref={svg} viewBox={`0 0 ${size.w} ${size.h}`}>{nodes.current.map((n)=> <line key={`l-${n.id}`} x1={center.x} y1={center.y} x2={n.x} y2={n.y} stroke={`rgba(140,160,255,${n.similarity ?? 0.5})`} strokeWidth={1 + (n.similarity ?? 0.5) * 2} />)}<g transform={`translate(${center.x},${center.y}) scale(${activeScale.current})`}><circle r={ACTIVE_BUBBLE_RADIUS} className="activeBubble"/><text textAnchor="middle" y="4">{data.artist.name}</text></g>{nodes.current.map((n)=><g key={n.id} transform={`translate(${n.x},${n.y}) scale(${phase==='inflate-selected'&&selectedId===n.id?1.16:1})`} onClick={()=>beginSelect(n)}><circle r={n.r} className="relatedBubble" style={{ opacity: 0.65 + (n.similarity ?? 0.5) * 0.35 }} /><text textAnchor="middle" y="4">{n.name}</text></g>)}</svg></div>;
}
