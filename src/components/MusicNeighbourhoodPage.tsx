import { useEffect, useRef, useState } from 'react';
import type { ArtistNode, MediaItem, PlayerItem } from '../api/apiTypes';
import { loadConfig } from '../api/configClient';
import { getSimilarArtists, getTopAlbums } from '../api/lastfmClient';
import { getPlayers, playMedia, searchMusic } from '../api/musicAssistantClient';
import type { GraphPhase } from '../types';
import { artistListIncludes, extractArtists, normaliseName } from '../utils/artistMatching';
import { pickArray, unwrapResult } from '../utils/maResponse';
import { BubbleGraph } from './BubbleGraph';
import { ManualArtistSearch } from './ManualArtistSearch';
import { MediaPanel } from './MediaPanel';
import { PlayerBar } from './PlayerBar';

export function MusicNeighbourhoodPage() {
  const [activeArtist, setActiveArtist] = useState<ArtistNode>({ id: 'initial', name: 'Loading...' });
  const [similarArtists, setSimilarArtists] = useState<ArtistNode[]>([]);
  const [albums, setAlbums] = useState<MediaItem[]>([]);
  const [tracks, setTracks] = useState<MediaItem[]>([]);
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [phase, setPhase] = useState<GraphPhase>('idle');
  const [error, setError] = useState('');
  const [loadingMedia, setLoadingMedia] = useState(false);
  const didBootstrap = useRef(false);

  const loadArtist = async (artistName: string) => {
    console.log('Active artist change', artistName);
    setLoadingMedia(true);
    setError('');
    setActiveArtist({ id: normaliseName(artistName).replace(/\s+/g, '-'), name: artistName });
    try {
      const [similar, topAlbums, search] = await Promise.all([getSimilarArtists(artistName, 20), getTopAlbums(artistName, 30), searchMusic(artistName, ['artist', 'album', 'track'], 80)]);
      const searchRoot = unwrapResult(search);
      console.log('[MA] search response keys', Object.keys(search || {}));
      const similarsRaw = Array.isArray(similar?.similarartists?.artist) ? similar.similarartists.artist : similar?.similarartists?.artist ? [similar.similarartists.artist] : [];
      setSimilarArtists(similarsRaw.slice(0, 20).map((a: any) => ({ id: normaliseName(a.name).replace(/\s+/g, '-'), name: a.name, similarity: Number(a.match) || 0.2 })));
      const albumsRaw = searchRoot?.album ?? searchRoot?.albums ?? searchRoot?.results?.album ?? [];
      const tracksRaw = searchRoot?.track ?? searchRoot?.tracks ?? searchRoot?.results?.track ?? [];
      console.log('[MA] search parsed counts', { albums: Array.isArray(albumsRaw) ? albumsRaw.length : 0, tracks: Array.isArray(tracksRaw) ? tracksRaw.length : 0 });
      const allAlbums = (Array.isArray(albumsRaw) ? albumsRaw : []).filter((a: any) => artistListIncludes(extractArtists(a), artistName));
      const topList = Array.isArray(topAlbums?.topalbums?.album) ? topAlbums.topalbums.album : [];
      const rank = new Map(topList.map((a: any, i: number) => [normaliseName(a.name), i]));
      const albumItems = allAlbums.map((a: any) => ({ id: a.item_id || a.uri || a.name, uri: a.uri || '', title: a.name || 'Unknown', artistName: extractArtists(a)[0] || artistName, year: a.year, artwork: a.image, raw: a })) as MediaItem[];
      albumItems.sort((a, b) => Number(rank.get(normaliseName(a.title)) ?? 9999) - Number(rank.get(normaliseName(b.title)) ?? 9999));
      setAlbums(albumItems.slice(0, 30));

      const allTracks = (Array.isArray(tracksRaw) ? tracksRaw : []).filter((t: any) => artistListIncludes(extractArtists(t), artistName));
      const dedup = new Map<string, MediaItem>();
      for (const t of allTracks) {
        const item: MediaItem = { id: t.item_id || t.uri || t.name, uri: t.uri || '', title: t.name || 'Unknown', artistName: extractArtists(t)[0] || artistName, album: t.album?.name, popularity: t.metadata?.popularity ?? 0, artwork: t.image, raw: t };
        const key = normaliseName(item.title);
        const existing = dedup.get(key);
        if (!existing || (item.popularity ?? 0) > (existing.popularity ?? 0)) dedup.set(key, item);
      }
      setTracks(Array.from(dedup.values()).sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)).slice(0, 30));
      if (similarsRaw.length === 0) setError('Last.fm no similar artists');
    } catch (e: any) {
      setError(e.message || 'Failed loading artist');
    } finally { setLoadingMedia(false); }
  };

  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;
    (async () => {
    try {
      const config = await loadConfig();
      if (!config.has_music_assistant_url) throw new Error('missing Music Assistant URL');
      if (!config.has_music_assistant_token) throw new Error('missing Music Assistant token');
      if (!config.has_lastfm_api_key) throw new Error('missing Last.fm API key');
      const playersData = await getPlayers();
      const playersRoot = unwrapResult(playersData);
      const list = pickArray(playersRoot);
      console.log('[MA] players response keys', Object.keys(playersData || {}));
      console.log('[MA] players parsed count', list.length);
      const mapped = list.map((p: any) => ({ id: p.player_id || p.id, name: p.display_name || p.name || 'Unknown', status: p.state || p.status || 'unknown', currentTrack: p.current_media?.name || p.current_item?.name || p.current_media_item?.name || 'N/A', currentArtist: p.current_media?.artist || p.current_item?.artist || p.current_media_item?.artist || 'N/A', raw: p }));
      setPlayers(mapped);
      const selected = mapped.find((p: PlayerItem) => p.id === config.default_player)?.id || mapped[0]?.id || '';
      setSelectedPlayer(selected);
      const seedArtist = mapped.find((p: PlayerItem) => p.id === selected)?.currentArtist;
      if (seedArtist && seedArtist !== 'N/A') loadArtist(seedArtist); else { setActiveArtist({ id: 'manual', name: 'Enter artist' }); setError('No artist currently playing. Enter an artist manually.'); }
    } catch (e: any) { setError(e.message); }
  })(); }, []);

  return (
    <div className="page">
      <main>
        <div className="toolbar">
          <ManualArtistSearch onSearch={(t) => loadArtist(t)} />
          {error && <p className="error">{error}</p>}
          <p className="phase">Phase: {phase}</p>
        </div>
        <BubbleGraph activeArtist={activeArtist} similarArtists={similarArtists} onSelectArtist={(a) => { loadArtist(a.name); return true; }} phase={phase} setPhase={(p) => { console.log('Phase', p); setPhase(p); }} />
      </main>
      <MediaPanel
        albums={albums}
        tracks={tracks}
        loading={loadingMedia}
        onExploreArtist={(artist) => artist && artist !== activeArtist.name && loadArtist(artist)}
        onPlayAlbum={async (a) => {
          if (!selectedPlayer) return setError('no selected player');
          if (!a.uri) return setError('playback request failed');
          try { await playMedia(selectedPlayer, a.uri); } catch { setError('playback request failed'); }
        }}
        onPlayTrack={async (t) => {
          if (!selectedPlayer) return setError('no selected player');
          if (!t.uri) return setError('playback request failed');
          try { await playMedia(selectedPlayer, t.uri); } catch { setError('playback request failed'); }
        }}
      />
      <PlayerBar players={players} selected={selectedPlayer} onSelect={(id) => { console.log('Selected player', id); setSelectedPlayer(id); }} onSeed={() => { const p = players.find((x) => x.id === selectedPlayer); if (!p?.currentArtist || p.currentArtist === 'N/A') { setError('No artist currently playing on this player.'); return; } loadArtist(p.currentArtist); }} />
    </div>
  );
}
