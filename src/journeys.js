export async function fetchJourneyDuration(from, to){
  const url = `https://v5.vbb.transport.rest/journeys?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&results=1&language=de`;
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
