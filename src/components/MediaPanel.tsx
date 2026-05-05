import { useMemo, useState } from 'react';
import type { MediaItem } from '../api/apiTypes';

export function MediaPanel({ albums, tracks, albumTrackMap, onExpandAlbum, onPlayAlbum, onPlayTrack, onExploreArtist, loading }: { albums: MediaItem[]; tracks: MediaItem[]; albumTrackMap: Record<string, MediaItem[]>; onExpandAlbum: (a: MediaItem) => void; onPlayAlbum: (a: MediaItem) => void; onPlayTrack: (t: MediaItem) => void; onExploreArtist: (artist: string) => void; loading: boolean }) {
  const [expandedAlbum, setExpandedAlbum] = useState<string>('');
  const uniqAlbums = useMemo(() => {
    const seen = new Set<string>();
    return albums.filter((a) => { const k = `${a.title.toLowerCase()}::${a.year ?? ''}`; if (seen.has(k)) return false; seen.add(k); return true; });
  }, [albums]);

  return <aside className="mediaPanel"><h3>Albums</h3>{loading && <p>Loading albums/tracks...</p>}{uniqAlbums.map((a)=>{ const isOpen=expandedAlbum===a.id; const list=albumTrackMap[a.id] ?? []; return <div key={a.id} className="card" onClick={()=>{ const next=isOpen?'':a.id; setExpandedAlbum(next); if(next) onExpandAlbum(a); }}><button onClick={(e)=>{e.stopPropagation();onPlayAlbum(a);}}>▶</button><div><strong>{a.title}</strong><p onClick={(e)=>{e.stopPropagation(); onExploreArtist(a.artistName);}}>{a.artistName} {a.year ? `(${a.year})` : ''}</p>{isOpen && <div>{list.length===0 ? <small>No track listing available for this album.</small> : list.map((t)=><div key={t.id} className="card"><button onClick={(e)=>{e.stopPropagation();onPlayTrack(t);}}>▶</button><span>{t.title}</span></div>)}</div>}</div></div>;})}<h3>Tracks</h3>{tracks.map((t)=><div key={t.id} className="card" onClick={()=>onExploreArtist(t.artistName)}><button onClick={(e)=>{e.stopPropagation();onPlayTrack(t);}}>▶</button><div><strong>{t.title}</strong><p>{t.artistName}{t.album ? ` — ${t.album}` : ''}</p></div></div>)}</aside>;
}
