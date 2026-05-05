const parseResponse = async (r: Response) => {
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || 'Unknown error' };
  }
};

export async function postMusicAssistantCommand(command: string, args: Record<string, unknown>) {
  console.log('[MA] command', command);
  const r = await fetch('/dev-api/music-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, args })
  });
  const data = await parseResponse(r);
  if (!r.ok) {
    console.error('[MA] command failed', command, data);
    throw new Error(data.error ?? data.message ?? `Music Assistant command failed (${command})`);
  }
  console.log('[MA] command ok', command, Object.keys(data || {}));
  return data;
}

export const getPlayers = () => postMusicAssistantCommand('players/all', {});
export const searchMusic = (query: string, mediaTypes: string[], limit: number) => postMusicAssistantCommand('music/search', { search_query: query, media_types: mediaTypes, limit });
export const playMedia = (playerId: string, mediaUri: string) => postMusicAssistantCommand('player_queues/play_media', { queue_id: playerId, media_id: mediaUri });
