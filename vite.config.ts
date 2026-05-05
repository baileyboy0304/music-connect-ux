import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

type SecretsConfig = {
  music_assistant_url?: string;
  music_assistant_token?: string;
  lastfm_api_key?: string;
  default_player?: string;
  max_similar_artists?: number;
  max_albums?: number;
  max_tracks?: number;
};

const normaliseMusicAssistantUrl = (raw: string): string => {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  const url = new URL(withProtocol);
  if (!url.port) {
    url.port = '8095';
  }
  url.pathname = '/api';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
};

const safeParseSecrets = (secretsPath: string): { ok: true; config: SecretsConfig } | { ok: false; message: string } => {
  if (!fs.existsSync(secretsPath)) {
    return { ok: false, message: 'Missing secrets.json. Copy secrets.example.json to secrets.json and enter your Music Assistant and Last.fm values.' };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(secretsPath, 'utf-8')) as SecretsConfig;
    return { ok: true, config: parsed };
  } catch {
    return { ok: false, message: 'Invalid secrets.json. Check JSON syntax.' };
  }
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-config-and-proxy',
      configureServer(server) {
        server.middlewares.use('/local-config', (_req, res) => {
          const secretsPath = path.resolve(server.config.root, 'secrets.json');
          const parsed = safeParseSecrets(secretsPath);
          res.setHeader('Content-Type', 'application/json');

          if (!parsed.ok) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: parsed.message }));
            return;
          }

          const config = parsed.config;
          res.end(JSON.stringify({
            ok: true,
            config: {
              default_player: config.default_player ?? '',
              max_similar_artists: config.max_similar_artists ?? 20,
              max_albums: config.max_albums ?? 30,
              max_tracks: config.max_tracks ?? 30,
              has_music_assistant_url: Boolean(config.music_assistant_url?.trim()),
              has_music_assistant_token: Boolean(config.music_assistant_token?.trim()),
              has_lastfm_api_key: Boolean(config.lastfm_api_key?.trim())
            }
          }));
        });

        server.middlewares.use('/dev-api/music-assistant', async (req, res) => {
          if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
          const secretsPath = path.resolve(server.config.root, 'secrets.json');
          const parsed = safeParseSecrets(secretsPath);
          res.setHeader('Content-Type', 'application/json');
          if (!parsed.ok) { res.statusCode = 500; res.end(JSON.stringify({ error: parsed.message })); return; }
          const { music_assistant_url, music_assistant_token } = parsed.config;
          if (!music_assistant_url?.trim()) { res.statusCode = 400; res.end(JSON.stringify({ error: 'missing Music Assistant URL' })); return; }
          if (!music_assistant_token?.trim()) { res.statusCode = 400; res.end(JSON.stringify({ error: 'missing Music Assistant token' })); return; }

          const chunks: Uint8Array[] = [];
          for await (const chunk of req) chunks.push(chunk);
          const bodyRaw = Buffer.concat(chunks).toString('utf-8');
          const body = JSON.parse(bodyRaw || '{}') as { command?: string; args?: Record<string, unknown> };
          const command = body.command;
          const args = body.args ?? {};

          const endpoint = normaliseMusicAssistantUrl(music_assistant_url);
          const payload = { message_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, command, args };
          console.log('[MA] command', command);
          const maResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${music_assistant_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const text = await maResponse.text();
          res.statusCode = maResponse.status;
          res.end(text);
        });

        server.middlewares.use('/dev-api/lastfm/similar', async (req, res) => {
          const secretsPath = path.resolve(server.config.root, 'secrets.json');
          const parsed = safeParseSecrets(secretsPath);
          res.setHeader('Content-Type', 'application/json');
          if (!parsed.ok) { res.statusCode = 500; res.end(JSON.stringify({ error: parsed.message })); return; }
          const { lastfm_api_key } = parsed.config;
          if (!lastfm_api_key?.trim()) { res.statusCode = 400; res.end(JSON.stringify({ error: 'missing Last.fm API key' })); return; }
          const url = new URL(req.url ?? '', 'http://localhost');
          const artist = url.searchParams.get('artist') ?? '';
          const limit = url.searchParams.get('limit') ?? '20';
          const target = `https://ws.audioscrobbler.com/2.0/?method=artist.getSimilar&artist=${encodeURIComponent(artist)}&api_key=${encodeURIComponent(lastfm_api_key)}&format=json&limit=${encodeURIComponent(limit)}`;
          const r = await fetch(target);
          res.statusCode = r.status;
          res.end(await r.text());
        });

        server.middlewares.use('/dev-api/lastfm/top-albums', async (req, res) => {
          const secretsPath = path.resolve(server.config.root, 'secrets.json');
          const parsed = safeParseSecrets(secretsPath);
          res.setHeader('Content-Type', 'application/json');
          if (!parsed.ok) { res.statusCode = 500; res.end(JSON.stringify({ error: parsed.message })); return; }
          const { lastfm_api_key } = parsed.config;
          if (!lastfm_api_key?.trim()) { res.statusCode = 400; res.end(JSON.stringify({ error: 'missing Last.fm API key' })); return; }
          const url = new URL(req.url ?? '', 'http://localhost');
          const artist = url.searchParams.get('artist') ?? '';
          const limit = url.searchParams.get('limit') ?? '30';
          const target = `https://ws.audioscrobbler.com/2.0/?method=artist.getTopAlbums&artist=${encodeURIComponent(artist)}&api_key=${encodeURIComponent(lastfm_api_key)}&format=json&limit=${encodeURIComponent(limit)}`;
          const r = await fetch(target);
          res.statusCode = r.status;
          res.end(await r.text());
        });
      }
    }
  ]
});
