import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArtistNode } from '../api/apiTypes';
import type { GraphPhase } from '../types';
import { ACTIVE_BUBBLE_RADIUS, EXPLOSION_SPEED, FLY_IN_SPEED } from '../utils/animationConstants';
import { pickOffscreen } from '../utils/graphLayout';

type SimNode = ArtistNode & {
  x: number; y: number;
  vx: number; vy: number;
  tx: number; ty: number;
  r: number;
  opacity: number;
  scale: number;
  selected?: boolean;
  driftPhase: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const bubbleRadius = (name: string, similarity: number) => {
  const sim = clamp01(similarity);
  const base = 38 + sim * 28;
  const textNeeded = (name?.length ?? 0) * 4.0 + 22;
  return Math.max(base, textNeeded);
};

const bubbleColor = (similarity: number) => {
  const sim = clamp01(similarity);
  const hue = 8 + sim * 122;
  const sat = 55 + sim * 15;
  const light = 48 + sim * 6;
  return `hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`;
};

const bubbleStroke = (similarity: number) => {
  const sim = clamp01(similarity);
  const hue = 8 + sim * 122;
  return `hsl(${hue.toFixed(0)}, 70%, 70%)`;
};

export function BubbleGraph({
  activeArtist, similarArtists, onSelectArtist, phase, setPhase
}: {
  activeArtist: ArtistNode;
  similarArtists: ArtistNode[];
  onSelectArtist: (a: ArtistNode) => boolean;
  phase: GraphPhase;
  setPhase: (p: GraphPhase) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 620 });
  const [, setTick] = useState(0);
  const center = useMemo(() => ({ x: size.w / 2, y: size.h / 2 }), [size]);
  const nodes = useRef<SimNode[]>([]);
  const activeScale = useRef(1);
  const activeLabel = useRef(activeArtist.name);
  const activePos = useRef({ x: center.x, y: center.y, vx: 0, vy: 0, exploding: false });
  const pending = useRef<SimNode | null>(null);

  const placeTargets = (list: SimNode[]) => {
    const padding = 18;
    const maxR = list.reduce((m, n) => Math.max(m, n.r), 0);
    const circumference = list.reduce((s, n) => s + n.r * 2 + padding, 0);
    const ring = Math.max(ACTIVE_BUBBLE_RADIUS + 60 + maxR, circumference / (2 * Math.PI));
    let arc = -Math.PI / 2;
    for (const n of list) {
      const w = (n.r * 2 + padding) / ring;
      arc += w / 2;
      n.tx = center.x + Math.cos(arc) * ring;
      n.ty = center.y + Math.sin(arc) * ring;
      arc += w / 2;
    }
  };

  const initNodes = () => {
    const list: SimNode[] = similarArtists.map((n, i) => ({
      ...n,
      r: bubbleRadius(n.name, n.similarity ?? 0.4),
      x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0,
      opacity: 0, scale: 1,
      driftPhase: i * 0.7 + Math.random() * Math.PI * 2
    }));
    placeTargets(list);
    nodes.current = list.map((n) => ({ ...n, ...pickOffscreen(size.w, size.h) }));
  };

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const r = wrap.current?.getBoundingClientRect();
      if (r) setSize({ w: r.width, h: r.height });
    });
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    activeLabel.current = activeArtist.name;
    activePos.current = { x: center.x, y: center.y, vx: 0, vy: 0, exploding: false };
    initNodes();
    setPhase('fly-in-new-neighbours');
  }, [activeArtist.id, activeArtist.name, similarArtists, center.x, center.y]);

  useEffect(() => {
    let raf = 0;
    let frameCount = 0;
    const frame = () => {
      frameCount++;

      if (phase === 'fly-in-new-neighbours') {
        let done = true;
        for (const n of nodes.current) {
          const dx = n.tx - n.x;
          const dy = n.ty - n.y;
          n.x += dx * FLY_IN_SPEED;
          n.y += dy * FLY_IN_SPEED;
          n.opacity = Math.min(1, n.opacity + 0.04);
          if (Math.hypot(dx, dy) > 3) done = false;
        }
        if (done) {
          setPhase('collision-pulse');
          activeScale.current = 0.92;
          setTimeout(() => (activeScale.current = 1.05), 120);
          setTimeout(() => { activeScale.current = 1; setPhase('settle'); }, 300);
        }
      } else if (phase === 'explode-out') {
        let out = true;
        if (activePos.current.exploding) {
          activePos.current.x += activePos.current.vx;
          activePos.current.y += activePos.current.vy;
        }
        for (const n of nodes.current) {
          if (n.selected) {
            n.x += (center.x - n.x) * 0.06;
            n.y += (center.y - n.y) * 0.06;
            continue;
          }
          const dx = n.x - center.x;
          const dy = n.y - center.y;
          const mag = Math.max(0.01, Math.hypot(dx, dy));
          n.x += (dx / mag) * EXPLOSION_SPEED;
          n.y += (dy / mag) * EXPLOSION_SPEED;
          n.opacity = Math.max(0, n.opacity - 0.03);
          if (n.x > -220 && n.x < size.w + 220 && n.y > -220 && n.y < size.h + 220) out = false;
        }
        if (pending.current && Math.hypot(center.x - pending.current.x, center.y - pending.current.y) < 6) {
          const selected = pending.current;
          pending.current = null;
          onSelectArtist(selected);
        }
        if (out && pending.current === null) setPhase('recenter-new-active');
      } else if (phase === 'idle' || phase === 'settle' || phase === 'collision-pulse') {
        const arr = nodes.current;
        const t = frameCount * 0.03;

        // Spring toward target with subtle radial/tangential breathing
        for (const n of arr) {
          const angleFromCenter = Math.atan2(n.ty - center.y, n.tx - center.x);
          const radialOffset = Math.sin(t + n.driftPhase) * 4;
          const tangentialOffset = Math.cos(t * 0.7 + n.driftPhase * 1.3) * 6;
          const targetX = n.tx + Math.cos(angleFromCenter) * radialOffset
                         + Math.cos(angleFromCenter + Math.PI / 2) * tangentialOffset;
          const targetY = n.ty + Math.sin(angleFromCenter) * radialOffset
                         + Math.sin(angleFromCenter + Math.PI / 2) * tangentialOffset;

          const dx = targetX - n.x;
          const dy = targetY - n.y;
          n.vx += dx * 0.012;
          n.vy += dy * 0.012;

          // Tiny random jitter so collisions feel organic
          n.vx += (Math.random() - 0.5) * 0.05;
          n.vy += (Math.random() - 0.5) * 0.05;

          // Damping
          n.vx *= 0.90;
          n.vy *= 0.90;
        }

        // Collisions between sibling bubbles (elastic-ish)
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            const a = arr[i], b = arr[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.0001;
            const minDist = a.r + b.r + 4;
            if (dist < minDist) {
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              a.x -= nx * overlap * 0.5;
              a.y -= ny * overlap * 0.5;
              b.x += nx * overlap * 0.5;
              b.y += ny * overlap * 0.5;
              const av = a.vx * nx + a.vy * ny;
              const bv = b.vx * nx + b.vy * ny;
              const exch = (av - bv) * 0.6;
              a.vx -= exch * nx;
              a.vy -= exch * ny;
              b.vx += exch * nx;
              b.vy += exch * ny;
            }
          }
        }

        // Collision against active centre bubble
        for (const n of arr) {
          const dx = n.x - center.x;
          const dy = n.y - center.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const minDist = ACTIVE_BUBBLE_RADIUS + n.r + 6;
          if (dist < minDist) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            n.x += nx * overlap;
            n.y += ny * overlap;
            const v = n.vx * nx + n.vy * ny;
            if (v < 0) {
              n.vx -= 2 * v * nx * 0.8;
              n.vy -= 2 * v * ny * 0.8;
            }
          }
        }

        for (const n of arr) {
          n.x += n.vx;
          n.y += n.vy;
        }

        if (phase === 'settle') setPhase('idle');
      }

      setTick((t) => (t + 1) % 100000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, center.x, center.y, onSelectArtist, setPhase, size.h, size.w, activeArtist.name]);

  const select = (n: SimNode) => {
    if (phase !== 'idle') return;
    pending.current = n;
    for (const node of nodes.current) node.selected = node.id === n.id;
    n.scale = 1.16;
    activeLabel.current = activeArtist.name;
    const angle = Math.atan2(center.y - n.y, center.x - n.x) + Math.PI;
    activePos.current = {
      x: center.x, y: center.y,
      vx: Math.cos(angle) * EXPLOSION_SPEED,
      vy: Math.sin(angle) * EXPLOSION_SPEED,
      exploding: true
    };
    setPhase('inflate-selected');
    setTimeout(() => setPhase('explode-out'), 200);
  };

  return (
    <div className="graph" ref={wrap}>
      <svg viewBox={`0 0 ${size.w} ${size.h}`}>
        <defs>
          <radialGradient id="activeGradient" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#a78bff" />
            <stop offset="60%" stopColor="#7d8dff" />
            <stop offset="100%" stopColor="#3f48a8" />
          </radialGradient>
        </defs>

        {/* Connector lines from active to each related */}
        <g>
          {nodes.current.map((n) => {
            if (n.selected) return null;
            const sim = clamp01(n.similarity ?? 0.4);
            return (
              <line
                key={`line-${n.id}`}
                className="connectorLine"
                x1={activePos.current.x}
                y1={activePos.current.y}
                x2={n.x}
                y2={n.y}
                stroke={bubbleStroke(sim)}
                strokeOpacity={n.opacity * (0.18 + sim * 0.32)}
                strokeWidth={1 + sim * 2}
              />
            );
          })}
        </g>

        {/* Active bubble */}
        <g
          transform={`translate(${activePos.current.x},${activePos.current.y}) scale(${activeScale.current})`}
          style={{ opacity: activePos.current.exploding ? 0.9 : 1 }}
        >
          <circle r={ACTIVE_BUBBLE_RADIUS} className="activeBubble" />
          <text textAnchor="middle" y="6" className="activeLabel">{activeLabel.current}</text>
        </g>

        {/* Related bubbles */}
        {nodes.current.map((n) => {
          const sim = clamp01(n.similarity ?? 0.4);
          const fill = bubbleColor(sim);
          return (
            <g
              key={n.id}
              className="bubbleGroup"
              transform={`translate(${n.x},${n.y}) scale(${n.scale})`}
              onClick={() => select(n)}
              style={{ opacity: n.selected ? 1 : n.opacity, cursor: 'pointer' }}
            >
              <circle r={n.r + 8} fill="transparent" />
              <circle r={n.r} className="relatedBubble" fill={fill} />
              <text textAnchor="middle" y="5" className="relatedLabel">{n.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
