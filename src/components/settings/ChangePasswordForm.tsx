import React, { useState } from "react";

export default function ChangePasswordForm({ onSave, onCancel }: { onSave: (oldPw: string, newPw: string) => void; onCancel: () => void }) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <label className="font-bold text-sm">Altes Passwort</label>
        <input
          type="password"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded-lg border-4 border-black bg-white"
        />
      </div>
      <div>
        <label className="font-bold text-sm">Neues Passwort</label>
        <input
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded-lg border-4 border-black bg-white"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-white">
          Abbrechen
        </button>
        <button
          onClick={() => onSave(oldPw, newPw)}
          className="px-4 py-2 rounded-lg bg-black text-white"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
