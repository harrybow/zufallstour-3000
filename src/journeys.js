// Cache resolved location ids so we don't hit the /locations endpoint repeatedly
const cache = new Map();

async function resolve(loc, types = []){
  if(!loc) return null;
  // Coordinates or already an id
  if(/^\d{6,}$/.test(loc) || /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(loc)) return loc;
  const query = Array.isArray(types) && types.length ? `${types.join('+')} ${loc}` : loc;
  if(cache.has(query)) return cache.get(query);
  const url = `https://v5.vbb.transport.rest/locations?query=${encodeURIComponent(query)}&results=1`;
  const res = await fetch(url);
  if(!res.ok) return null;
  const data = await res.json().catch(()=>null);
  const id = data?.[0]?.id;
  if(id) cache.set(query, id);
  return id || null;
}

/**
 * Returns the estimated public-transit travel time between two locations in minutes.
 * Resolves free-text station names to VBB IBNR IDs and returns null if no journey is available.
 */
export async function fetchJourneyDuration(from, to, fromTypes = [], toTypes = []){
  const [fromId, toId] = await Promise.all([resolve(from, fromTypes), resolve(to, toTypes)]);
  if(!fromId || !toId) return null;
  const url = `https://v5.vbb.transport.rest/journeys?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}&results=1&language=de`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json().catch(()=>null);
  const journey = data?.journeys?.[0];
  if (!journey || !Array.isArray(journey.legs) || journey.legs.length === 0) return null;
  try {
    const departure = new Date(journey.legs[0].departure);
    const arrival = new Date(journey.legs[journey.legs.length - 1].arrival);
    const diff = Math.round((arrival - departure) / 60000);
    return isFinite(diff) ? diff : null;
  } catch {
    return null;
  }
}
