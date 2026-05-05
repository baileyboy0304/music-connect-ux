import { useMemo, useState } from 'react';
import { neighbourhoods, mockPlayers } from '../mockData';
import type { ArtistNode, GraphPhase } from '../types';
import { lookupNeighbourhood } from '../utils/artistLookup';
import { BubbleGraph } from './BubbleGraph';
import { ManualArtistSearch } from './ManualArtistSearch';
import { MediaPanel } from './MediaPanel';
import { MockEventLog } from './MockEventLog';
import { PlayerBar } from './PlayerBar';

export function MusicNeighbourhoodPage() {
  const [activeId, setActiveId] = useState('radiohead'); const [error, setError] = useState(''); const [phase, setPhase] = useState<GraphPhase>('idle'); const [selectedPlayer, setSelectedPlayer] = useState(mockPlayers[0].id); const [events, setEvents] = useState<string[]>([]);
  const active = useMemo(() => neighbourhoods[activeId], [activeId]);
  const setArtist = (node: ArtistNode) => { if (!neighbourhoods[node.id]) { setError(`No mock neighbourhood is available for ${node.name}.`); return; } console.log('Active artist change', node.name); setError(''); setActiveId(node.id); };
  return <div className="page"><main><div className="toolbar"><ManualArtistSearch onSearch={(t)=>{ const n=lookupNeighbourhood(t); if(!n){setError('No mock data for this artist.'); return;} setArtist(n.artist); }} />{error && <p className="error">{error}</p>}<p className="phase">Phase: {phase}</p></div><BubbleGraph data={active} onSelectArtist={setArtist} phase={phase} setPhase={(p)=>{ console.log('Phase',p); setPhase(p); }} /><MockEventLog events={events} /></main><MediaPanel data={active} onExplore={(artist)=>{ const n=lookupNeighbourhood(artist); if(!n){setError(`No mock neighbourhood is available for ${artist}.`); return;} setArtist(n.artist); }} onPlay={(kind,title)=>{ const p=mockPlayers.find(x=>x.id===selectedPlayer); const msg=`Mock playback: ${kind} “${title}” on ${p?.name ?? 'Unknown player'}`; console.log(msg); setEvents((e)=>[...e,msg]); }} /><PlayerBar players={mockPlayers} selected={selectedPlayer} onSelect={(id)=>{ console.log('Selected player',id); setSelectedPlayer(id); }} onSeed={()=>{ const p=mockPlayers.find(x=>x.id===selectedPlayer); if(!p){setError('No selected player.'); return;} const n=lookupNeighbourhood(p.currentArtist); if(!n){setError('No mock neighbourhood for selected player\'s current artist.'); return;} setArtist(n.artist); }} /></div>;
}
