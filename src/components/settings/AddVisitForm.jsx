import React, { useState } from "react";
import { Camera } from "lucide-react";
import { useI18n } from "../../i18n.jsx";
import { fileToDataUrl } from "../../imageUtils.js";

export default function AddVisitForm({ stationId, onSave }) {
  const { t } = useI18n();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);

  async function onFile(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const urls = await Promise.all(files.map(fileToDataUrl));
    setPhotos((p) => [...p, ...urls]);
  }

  function submit() {
    if (!date) return alert(t("addVisitForm.dateRequired"));
    onSave(stationId, {
      date,
      note: note.trim() || undefined,
      photos: photos.length ? photos : undefined,
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="font-bold text-sm">{t("addVisitForm.date")}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded-lg border-4 border-black bg-white"
        />
      </div>
      <div>
        <label className="font-bold text-sm">{t("addVisitForm.note")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full mt-1 px-3 py-2 rounded-lg border-2 border-black bg-white"
          placeholder="z.B. Sonnenuntergang auf der Brücke 🌇"
        />
      </div>
      <div>
        <label className="font-bold text-sm block mb-1">{t("addVisitForm.photos")}</label>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-300 border-4 border-black cursor-pointer font-extrabold">
          <Camera size={18} /> {t("addVisitForm.chooseFile")}
          <input type="file" accept="image/*" multiple className="hidden" onChange={onFile} />
        </label>
        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <img key={i} src={p} alt="Preview" className="max-h-56 rounded-xl border-4 border-black" />
            ))}
          </div>
        )}
      </div>
      <div className="flex">
        <button
          onClick={submit}
          className="w-full md:w-auto px-6 py-2 rounded-full bg-black text-white font-extrabold border-4 border-black"
        >
          {t("addVisitForm.save")}
        </button>
      </div>
    </div>
  );
}
