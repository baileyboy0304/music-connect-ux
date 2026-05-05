export const normaliseName = (value: string) => value.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export const extractArtists = (item: any): string[] => {
  const cands = [item?.artists, item?.artist, item?.album?.artists, item?.current_media?.artists, item?.current_item?.artists, item?.current_media_item?.artists];
  const out: string[] = [];
  for (const c of cands) {
    if (Array.isArray(c)) for (const v of c) if (typeof v === 'string') out.push(v); else if (v?.name) out.push(v.name);
    else if (typeof c === 'string') out.push(c);
  }
  return out.filter(Boolean);
};

export const artistListIncludes = (artists: string[], activeArtist: string) => {
  const n = normaliseName(activeArtist);
  return artists.some((a) => normaliseName(a) === n);
};
