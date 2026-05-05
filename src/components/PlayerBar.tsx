import type { PlayerItem } from '../api/apiTypes';

export function PlayerBar({ players, selected, onSelect, onSeed }: { players: PlayerItem[]; selected: string; onSelect: (id: string) => void; onSeed: () => void }) {
  const p = players.find((x) => x.id === selected);
  return <div className="playerBar"><select value={selected} onChange={(e) => onSelect(e.target.value)}>{players.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}</select><span>{p?.status ?? 'unknown'}</span><span>{p?.currentTrack ?? 'N/A'} — {p?.currentArtist ?? 'N/A'}</span><button onClick={onSeed}>Seed from current player</button></div>;
}
