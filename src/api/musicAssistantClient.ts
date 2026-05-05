const parseResponse = async (r: Response) => {
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { error: text || 'Unknown error' }; }
};

export async function postMusicAssistantCommand(command: string, args: Record<string, unknown>) {
  console.log('[MA] command', command, Object.keys(args));
  const r = await fetch('/dev-api/music-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command, args }) });
  const data = await parseResponse(r);
  if (!r.ok) { console.error('[MA] command failed', command, data); throw new Error(data.error ?? data.message ?? `Music Assistant command failed (${command})`); }
  return data;
}

export const getPlayers = () => postMusicAssistantCommand('players/all', {});
export const searchMusic = (query: string, mediaTypes: string[], limit: number) => postMusicAssistantCommand('music/search', { search_query: query, media_types: mediaTypes, limit });
export async function getAlbumTracks(albumId: string) {
  const attempts = [
    { command: 'music/album/tracks', args: { item_id: albumId } },
    { command: 'music/albums/tracks', args: { item_id: albumId } },
    { command: 'music/albums/album_tracks', args: { item_id: albumId } },
    { command: 'music/albums/get_album_tracks', args: { item_id: albumId } }
  ];
  for (const a of attempts) {
    try { return await postMusicAssistantCommand(a.command, a.args); } catch (e) { console.warn('[MA] album tracks command failed', a.command, (e as Error).message); }
  }
  return { result: [] };
}

export async function playMedia(playerId: string, mediaUri: string) {
  const attempts: Array<{ command: string; args: Record<string, unknown> }> = [
    { command: 'player_queues/play_media', args: { queue_id: playerId, media: [mediaUri] } },
    { command: 'player_queues/play_media', args: { queue_id: playerId, media_id: mediaUri } }
  ];
  let lastError: Error | null = null;
  for (const attempt of attempts) {
    try { return await postMusicAssistantCommand(attempt.command, attempt.args); } catch (error) { lastError = error as Error; }
  }
  throw lastError ?? new Error('Playback failed');
}
