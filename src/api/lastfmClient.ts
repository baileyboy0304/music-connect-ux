export async function getSimilarArtists(artistName: string, limit: number) {
  const r = await fetch(`/dev-api/lastfm/similar?artist=${encodeURIComponent(artistName)}&limit=${limit}`);
  if (!r.ok) throw new Error('Last.fm unavailable');
  return r.json();
}

export async function getTopAlbums(artistName: string, limit: number) {
  const r = await fetch(`/dev-api/lastfm/top-albums?artist=${encodeURIComponent(artistName)}&limit=${limit}`);
  if (!r.ok) throw new Error('Last.fm unavailable');
  return r.json();
}
