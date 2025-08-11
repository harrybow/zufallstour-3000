import fs from 'fs/promises';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'server', 'db.json');

async function loadDb(){
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveDb(db){
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db));
}

async function compressDataUrl(dataUrl, options = {}){
  const {
    maxSize = 1600,
    quality = 0.8,
  } = options;

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    throw new Error('Missing dependency "sharp". Install it with `npm install sharp`.');
  }

  const match = /^data:(.*?);base64,(.*)$/.exec(dataUrl);
  if (!match) {
    return { data: dataUrl, format: 'unknown', size: Buffer.byteLength(dataUrl) };
  }

  const [, , base64] = match;
  let img = sharp(Buffer.from(base64, 'base64'));
  const meta = await img.metadata();

  if (meta.width && meta.height) {
    const maxDim = Math.max(meta.width, meta.height);
    if (maxDim > maxSize) {
      if (meta.width >= meta.height) {
        img = img.resize({ width: maxSize });
      } else {
        img = img.resize({ height: maxSize });
      }
    }
  }

  const out = await img.webp({ quality: Math.round(quality * 100) }).toBuffer();
  return {
    data: `data:image/webp;base64,${out.toString('base64')}`,
    format: 'webp',
    size: out.length,
  };
}

async function run(){
  const db = await loadDb();
  if (!db) {
    console.log('No database found, nothing to do.');
    return;
  }

  let changed = false;
  for (const [userId, stations] of Object.entries(db.data || {})) {
    if (!Array.isArray(stations)) continue;
    for (const station of stations) {
      if (!Array.isArray(station.visits)) continue;
      for (const visit of station.visits) {
        if (!Array.isArray(visit.photos)) continue;
        const newPhotos = [];
        for (const p of visit.photos) {
          const src = typeof p === 'string' ? p : p?.data;
          if (!src) continue;
          try {
            const compressed = await compressDataUrl(src);
            newPhotos.push(compressed);
            changed = true;
          } catch (err) {
            console.warn('Failed to compress photo for user', userId, err);
            newPhotos.push({ data: src, format: 'unknown', size: src.length });
          }
        }
        visit.photos = newPhotos;
      }
    }
  }

  if (changed) {
    await saveDb(db);
    console.log('Compression complete.');
  } else {
    console.log('No photos to compress.');
  }
}

run().catch(err => {
  console.error(err.message || err);
});
