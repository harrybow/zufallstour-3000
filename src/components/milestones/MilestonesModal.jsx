import React from "react";
import Modal from "../Modal";
import MilestonesView from "./MilestonesView.jsx";

export default function MilestonesModal({
  open,
  onClose,
  percent,
  visitedCount,
  total,
  lineIndex,
  typeStats,
  stations,
}) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Meilensteine">
      <MilestonesView
        percent={percent}
        visitedCount={visitedCount}
        total={total}
        lineIndex={lineIndex}
        typeStats={typeStats}
        stations={stations}
      />
    </Modal>
  );
}
