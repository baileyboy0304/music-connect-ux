import type { ArtistNeighbourhood } from '../types';

export function MediaPanel({ data, onPlay, onExplore }: { data: ArtistNeighbourhood; onPlay: (kind: 'album'|'track', title: string) => void; onExplore: (artist: string) => void }) {
  return <aside className="mediaPanel"><h3>Albums</h3>{data.albums.map((a)=><div key={a.id} className="card" onClick={()=>onExplore(a.artistName)}><button onClick={(e)=>{e.stopPropagation();onPlay('album',a.title);}}>▶</button><div><strong>{a.title}</strong><p>{a.artistName}</p></div></div>)}<h3>Tracks</h3>{data.tracks.map((t)=><div key={t.id} className="card" onClick={()=>onExplore(t.artistName)}><button onClick={(e)=>{e.stopPropagation();onPlay('track',t.title);}}>▶</button><div><strong>{t.title}</strong><p>{t.artistName}</p></div></div>)}</aside>;
}
