import { useMemo, useState } from 'react';
import type { MediaItem } from '../api/apiTypes';

type Props = {
  albums: MediaItem[];
  tracks: MediaItem[];
  albumTrackMap: Record<string, MediaItem[]>;
  onExpandAlbum: (a: MediaItem) => void;
  onPlayAlbum: (a: MediaItem) => void;
  onPlayTrack: (t: MediaItem) => void;
  onExploreArtist: (artist: string) => void;
  loading: boolean;
};

export function MediaPanel({ albums, tracks, albumTrackMap, onExpandAlbum, onPlayAlbum, onPlayTrack, onExploreArtist, loading }: Props) {
  const [expandedAlbum, setExpandedAlbum] = useState<string>('');

  const uniqAlbums = useMemo(() => {
    const seen = new Set<string>();
    return albums.filter((a) => {
      const k = `${a.title.toLowerCase()}::${a.year ?? ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [albums]);

  return (
    <div className="mediaPanel">
      <section className="mediaColumn">
        <h3>Albums</h3>
        <div className="mediaList">
          {loading && albums.length === 0 && <div className="empty">Loading albums…</div>}
          {!loading && uniqAlbums.length === 0 && <div className="empty">No albums available</div>}
          {uniqAlbums.map((a) => {
            const isOpen = expandedAlbum === a.id;
            const list = albumTrackMap[a.id] ?? [];
            return (
              <div key={a.id}>
                <div
                  className="card"
                  onClick={() => {
                    const next = isOpen ? '' : a.id;
                    setExpandedAlbum(next);
                    if (next) onExpandAlbum(a);
                  }}
                >
                  <button className="playBtn" onClick={(e) => { e.stopPropagation(); onPlayAlbum(a); }} aria-label="Play album">▶</button>
                  <div className="cardBody">
                    <div className="cardTitle">{a.title}</div>
                    <div
                      className="cardSub"
                      onClick={(e) => { e.stopPropagation(); onExploreArtist(a.artistName); }}
                    >
                      {a.artistName}{a.year ? ` · ${a.year}` : ''}
                    </div>
                  </div>
                </div>
                {isOpen && (
                  <div className="albumTracks">
                    {list.length === 0
                      ? <div className="empty">No track listing available</div>
                      : list.map((t) => (
                          <div key={t.id} className="albumTrack">
                            <span className="albumTrackTitle">{t.title}</span>
                            <button onClick={(e) => { e.stopPropagation(); onPlayTrack(t); }} aria-label="Play track">▶</button>
                          </div>
                        ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mediaColumn">
        <h3>Tracks</h3>
        <div className="mediaList">
          {loading && tracks.length === 0 && <div className="empty">Loading tracks…</div>}
          {!loading && tracks.length === 0 && <div className="empty">No tracks available</div>}
          {tracks.map((t) => (
            <div key={t.id} className="card" onClick={() => onExploreArtist(t.artistName)}>
              <button className="playBtn" onClick={(e) => { e.stopPropagation(); onPlayTrack(t); }} aria-label="Play track">▶</button>
              <div className="cardBody">
                <div className="cardTitle">{t.title}</div>
                <div className="cardSub">{t.artistName}{t.album ? ` · ${t.album}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
