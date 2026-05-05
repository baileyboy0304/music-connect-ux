import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArtistNeighbourhood, ArtistNode, GraphPhase } from '../types';
import { ACTIVE_BUBBLE_RADIUS, DRIFT_STRENGTH, EXPLOSION_SPEED, FLY_IN_SPEED, IDLE_DAMPING } from '../utils/animationConstants';
import { pickOffscreen } from '../utils/graphLayout';

type SimNode = ArtistNode & {
  x: number; y: number; vx: number; vy: number; tx: number; ty: number; r: number;
  opacity: number; scale: number;
};

const textRadius = (name: string) => Math.max(28, name.length * 3.8 + 14);

export function BubbleGraph({
  data, onSelectArtist, phase, setPhase,
}: {
  data: ArtistNeighbourhood;
  onSelectArtist: (a: ArtistNode) => void;
  phase: GraphPhase;
  setPhase: (p: GraphPhase) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 620 });
  const [tick, setTick] = useState(0);
  const center = useMemo(() => ({ x: size.w / 2, y: size.h / 2 }), [size]);
  const nodes = useRef<SimNode[]>([]);
  const activeScale = useRef(1);
  const pending = useRef<ArtistNode | null>(null);

  const initNodes = () => {
    const list = data.similarArtists.slice(0, 18);
    const total = list.length;
    nodes.current = list.map((n, i) => {
      const baseR = textRadius(n.name);
      const sim = n.similarity ?? 0.6;
      const r = baseR + sim * 8;
      const angle = (i / total) * Math.PI * 2;
      const ring = ACTIVE_BUBBLE_RADIUS + r + 8; // touching look
      const tx = center.x + Math.cos(angle) * ring;
      const ty = center.y + Math.sin(angle) * ring;
      const start = pickOffscreen(size.w, size.h);
      return { ...n, x: start.x, y: start.y, tx, ty, vx: 0, vy: 0, r, opacity: 0, scale: 1 };
    });
  };

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const r = wrap.current?.getBoundingClientRect();
      if (!r) return;
      setSize({ w: r.width, h: r.height });
    });
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    initNodes();
    setPhase('fly-in-new-neighbours');
  }, [data.artist.id, center.x, center.y]);

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      if (phase === 'fly-in-new-neighbours') {
        let done = true;
        for (const n of nodes.current) {
          const dx = n.tx - n.x; const dy = n.ty - n.y;
          n.vx = dx * FLY_IN_SPEED; n.vy = dy * FLY_IN_SPEED;
          n.x += n.vx; n.y += n.vy;
          n.opacity = Math.min(1, n.opacity + 0.04);
          if (Math.hypot(dx, dy) > 3) done = false;
        }
        if (done) {
          setPhase('collision-pulse');
          activeScale.current = 0.92;
          setTimeout(() => { activeScale.current = 1.05; }, 120);
          setTimeout(() => { activeScale.current = 1; setPhase('settle'); }, 290);
        }
      } else if (phase === 'explode-out') {
        let out = true;
        for (const n of nodes.current) {
          const dx = n.x - center.x; const dy = n.y - center.y;
          const mag = Math.max(0.01, Math.hypot(dx, dy));
          n.vx = (dx / mag) * EXPLOSION_SPEED;
          n.vy = (dy / mag) * EXPLOSION_SPEED;
          n.x += n.vx; n.y += n.vy;
          n.opacity = Math.max(0, n.opacity - 0.03);
          if (n.x > -200 && n.x < size.w + 200 && n.y > -200 && n.y < size.h + 200) out = false;
        }
        if (out && pending.current) {
          setPhase('recenter-new-active');
          onSelectArtist(pending.current);
          pending.current = null;
        }
      } else if (phase === 'idle' || phase === 'settle') {
        for (const n of nodes.current) {
          const dx = n.tx - n.x; const dy = n.ty - n.y;
          n.vx = (n.vx + dx * 0.02 + (Math.random() - 0.5) * DRIFT_STRENGTH) * IDLE_DAMPING;
          n.vy = (n.vy + dy * 0.02 + (Math.random() - 0.5) * DRIFT_STRENGTH) * IDLE_DAMPING;
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
    setPhase('inflate-selected');
    n.scale = 1.16;
    setTimeout(() => { setPhase('explode-out'); }, 200);
  };

  return (
    <div className="graph" ref={wrap}>
      <svg viewBox={`0 0 ${size.w} ${size.h}`} key={tick}>
        <g transform={`translate(${center.x},${center.y}) scale(${activeScale.current})`}>
          <circle r={ACTIVE_BUBBLE_RADIUS} className="activeBubble" />
          <text textAnchor="middle" y="4" className="label">{data.artist.name}</text>
        </g>
        {nodes.current.map((n) => (
          <g key={n.id} transform={`translate(${n.x},${n.y}) scale(${n.scale})`} onClick={() => select(n)} style={{ opacity: n.opacity }}>
            <circle r={n.r} className="relatedBubble" />
            <text textAnchor="middle" y="4" className="label">{n.name}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
