export async function postMusicAssistantCommand(command: string, args: Record<string, unknown>) {
  console.log('[MA] command', command);
  const r = await fetch('/dev-api/music-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command, args }) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? `Music Assistant command failed (${command})`);
  return data;
}

export const getPlayers = () => postMusicAssistantCommand('players/all', {});
export const searchMusic = (query: string, mediaTypes: string[], limit: number) => postMusicAssistantCommand('music/search', { search_query: query, media_types: mediaTypes, limit });
export const playMedia = (playerId: string, mediaUri: string) => postMusicAssistantCommand('player_queues/play_media', { queue_id: playerId, media_id: mediaUri });
