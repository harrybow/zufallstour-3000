import React, { useMemo } from "react";
import { Check } from "lucide-react";
import { formatDate } from "../../formatDate.js";
import { useI18n } from "../../i18n";

function HoverCard({ info, children }: { info: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <div className="pointer-events-none absolute z-20 hidden group-hover:block group-focus-within:block left-1/2 -translate-x-1/2 top-full mt-1 w-56 p-2 rounded-lg border-2 border-black bg-white text-xs shadow">
        {info}
      </div>
    </div>
  );
}

interface Station {
  id: string;
  name: string;
  types: string[];
  lines: string[];
  visits: { date: string; photos?: string[] }[];
}

export default function MilestonesSection({ stations }: { stations: Station[] }) {
  const { t } = useI18n();
  const visitedCount = stations.filter((s) => s.visits.length > 0).length;
  const total = stations.length || 1;
  const percent = Math.round((visitedCount / total) * 100);

  const lineIndex = useMemo(() => {
    const map: Record<string, { total: number; visited: number }> = {};
    stations.forEach((s) => {
      (s.lines || []).forEach((l) => {
        if (!map[l]) map[l] = { total: 0, visited: 0 };
        map[l].total += 1;
        if (s.visits.length > 0) map[l].visited += 1;
      });
    });
    return map;
  }, [stations]);

  const typeStats = useMemo(() => {
    const stats = {
      S: { total: 0, visited: 0 },
      U: { total: 0, visited: 0 },
      R: { total: 0, visited: 0 },
    };
    stations.forEach((s) => {
      if (s.types.includes("S")) {
        stats.S.total += 1;
        if (s.visits.length > 0) stats.S.visited += 1;
      }
      if (s.types.includes("U")) {
        stats.U.total += 1;
        if (s.visits.length > 0) stats.U.visited += 1;
      }
      if (s.types.includes("R")) {
        stats.R.total += 1;
        if (s.visits.length > 0) stats.R.visited += 1;
      }
    });
    return stats;
  }, [stations]);

  const firstVisitDates = useMemo(
    () => stations.map((s) => s.visits[0]?.date).filter(Boolean).sort(),
    [stations],
  );
  const dateForCount = (n: number) => firstVisitDates[n - 1] || null;

  const stationMilestones = [
    { label: t("profile.milestone.first"), count: 1, desc: t("profile.milestone.firstDesc") },
    { label: t("profile.milestone.hattrick"), count: 3, desc: t("profile.milestone.hattrickDesc") },
    { label: "10%", percent: 10 },
    { label: "25%", percent: 25 },
    { label: "50%", percent: 50 },
    { label: "75%", percent: 75 },
    { label: t("profile.milestone.almost"), count: Math.max(total - 3, 0), desc: t("profile.milestone.almostDesc") },
    { label: "100%", percent: 100 },
  ].map((m) => {
    const count = m.count ?? Math.ceil(total * (m.percent! / 100));
    const done = visitedCount >= count;
    const date = done ? dateForCount(count) : null;
    const base = m.percent
      ? `${m.label} - das entspricht ${Math.round(total * (m.percent / 100))} besuchten Bahnhöfen`
      : m.desc;
    const info = done ? `${base}. Erreicht am: ${formatDate(date)}` : `${base}. Noch nicht erreicht.`;
    return { ...m, count, done, info };
  });

  const { S = { total: 0, visited: 0 }, U = { total: 0, visited: 0 }, R = { total: 0, visited: 0 } } = typeStats || {};

  return (
    <div className="space-y-6">
      <section>
        <div className="font-extrabold mb-2">Gesamt-Fortschritt</div>
        <div className="w-full h-4 rounded-full border-4 border-black bg-white overflow-hidden">
          {percent > 0 && <div className="h-full bg-green-500" style={{ width: `${percent}%` }} />}
        </div>
        <div className="text-sm mt-1">{visitedCount}/{total} ({percent}%)</div>
      </section>
      <section>
        <div className="font-extrabold mb-2">Stationen-Ziele</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stationMilestones.map((m) => (
            <HoverCard key={m.label} info={m.info}>
              <div
                className={`w-full rounded-xl border-4 border-black p-2 text-center ${m.done ? "bg-green-300" : "bg-white"}`}
              >
                <div className="font-black">{m.label}</div>
                <div className="text-xs flex items-center justify-center gap-1">
                  {m.done ? <Check size={14} /> : null} {m.done ? "erreicht" : "offen"}
                </div>
              </div>
            </HoverCard>
          ))}
        </div>
      </section>
      <section>
        <div className="font-extrabold mb-2">Netz-Ziele</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { label: t("profile.milestone.allS"), stat: S, type: "S" },
            { label: t("profile.milestone.allU"), stat: U, type: "U" },
            { label: t("profile.milestone.allR"), stat: R, type: "R" },
          ].map(({ label, stat, type }) => {
            const done = stat.visited >= stat.total && stat.total > 0;
            const pct = stat.total ? Math.round((stat.visited / stat.total) * 100) : 0;
            const dates = stations
              .filter((s) => s.types.includes(type) && s.visits[0]?.date)
              .map((s) => s.visits[0].date)
              .sort();
            const date = done ? dates[stat.total - 1] : null;
            const info = done
              ? `${label} - erreicht am: ${formatDate(date)}`
              : `${stat.visited}/${stat.total} Bahnhöfe (${pct}%)`;
            return (
              <HoverCard key={label} info={info}>
                <div
                  className={`w-full rounded-xl border-4 border-black p-2 text-center ${done ? "bg-green-300" : "bg-white"}`}
                >
                  <div className="font-black">{label}</div>
                  <div className="text-xs flex items-center justify-center gap-1">
                    {done ? <Check size={14} /> : null} {done ? "erreicht" : `${stat.visited}/${stat.total} (${pct}%)`}
                  </div>
                </div>
              </HoverCard>
            );
          })}
        </div>
      </section>
      <section>
        <div className="font-extrabold mb-2">Linien</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(lineIndex).map(([line, stat]) => {
            const done = stat.visited >= stat.total && stat.total > 0;
            const pct = Math.round((stat.visited / stat.total) * 100);
            const visitedStations = stations.filter(
              (s) => (s.lines || []).includes(line) && s.visits.length > 0,
            );
            const visitedNames = visitedStations.map((s) => s.name);
            const dates = visitedStations
              .map((s) => s.visits[0]?.date)
              .filter(Boolean)
              .sort();
            const date = done ? dates[stat.total - 1] : null;
            const info = visitedNames.length
              ? done
                ? `Alle Bahnhöfe besucht${date ? ` am ${formatDate(date)}` : ""}`
                : `Besuchte Bahnhöfe: ${visitedNames.join(", ")}`
              : "Noch keine Bahnhöfe besucht";
            return (
              <HoverCard key={line} info={info}>
                <div
                  className={`w-full rounded-xl border-4 border-black p-2 ${done ? "bg-green-200" : "bg-white"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-black rounded-full border-2 border-black bg-white">{line}</span>
                    <div className="text-xs ml-auto">{stat.visited}/{stat.total} ({pct}%)</div>
                  </div>
                  <div className="w-full h-3 rounded-full border-2 border-black bg-white overflow-hidden">
                    {pct > 0 && <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />}
                  </div>
                </div>
              </HoverCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}

