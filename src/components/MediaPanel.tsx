import { useMemo, useState } from 'react';
import type { MediaItem } from '../api/apiTypes';

export function MediaPanel({ albums, tracks, onPlayAlbum, onPlayTrack, onExploreArtist, loading }: { albums: MediaItem[]; tracks: MediaItem[]; onPlayAlbum: (a: MediaItem) => void; onPlayTrack: (t: MediaItem) => void; onExploreArtist: (artist: string) => void; loading: boolean }) {
  const [expandedAlbum, setExpandedAlbum] = useState<string>('');
  const albumTracks = useMemo(() => tracks.filter((t) => expandedAlbum && t.album && t.album.toLowerCase() === expandedAlbum.toLowerCase()).slice(0, 20), [tracks, expandedAlbum]);

  return <aside className="mediaPanel"><h3>Albums</h3>{loading && <p>Loading albums/tracks...</p>}{albums.map((a)=><div key={a.id} className="card" onClick={()=>setExpandedAlbum(a.title)}><button onClick={(e)=>{e.stopPropagation();onPlayAlbum(a);}}>▶</button><div><strong>{a.title}</strong><p onClick={(e)=>{e.stopPropagation(); onExploreArtist(a.artistName);}}>{a.artistName} {a.year ? `(${a.year})` : ''}</p>{expandedAlbum.toLowerCase()===a.title.toLowerCase() && <div>{albumTracks.length===0 ? <small>No track listing available for this album.</small> : albumTracks.map((t)=><div key={t.id} className="card"><button onClick={(e)=>{e.stopPropagation();onPlayTrack(t);}}>▶</button><span>{t.title}</span></div>)}</div>}</div></div>)}<h3>Tracks</h3>{tracks.map((t)=><div key={t.id} className="card" onClick={()=>onExploreArtist(t.artistName)}><button onClick={(e)=>{e.stopPropagation();onPlayTrack(t);}}>▶</button><div><strong>{t.title}</strong><p>{t.artistName}{t.album ? ` — ${t.album}` : ''}</p></div></div>)}</aside>;
}
