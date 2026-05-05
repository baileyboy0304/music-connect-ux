import type { MediaItem } from '../api/apiTypes';

export function MediaPanel({ albums, tracks, onPlayAlbum, onPlayTrack, onExploreArtist, loading }: { albums: MediaItem[]; tracks: MediaItem[]; onPlayAlbum: (a: MediaItem) => void; onPlayTrack: (t: MediaItem) => void; onExploreArtist: (artist: string) => void; loading: boolean }) {
  return <aside className="mediaPanel"><h3>Albums</h3>{loading && <p>Loading albums/tracks...</p>}{albums.map((a)=><div key={a.id} className="card" onClick={()=>onExploreArtist(a.artistName)}><button onClick={(e)=>{e.stopPropagation();onPlayAlbum(a);}}>▶</button><div><strong>{a.title}</strong><p>{a.artistName} {a.year ? `(${a.year})` : ''}</p></div></div>)}<h3>Tracks</h3>{tracks.map((t)=><div key={t.id} className="card" onClick={()=>onExploreArtist(t.artistName)}><button onClick={(e)=>{e.stopPropagation();onPlayTrack(t);}}>▶</button><div><strong>{t.title}</strong><p>{t.artistName}{t.album ? ` — ${t.album}` : ''}</p></div></div>)}</aside>;
}
