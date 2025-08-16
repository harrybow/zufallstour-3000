import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import MilestonesModal from "../src/components/milestones/MilestonesModal";

describe("MilestonesModal", () => {
  it("renders milestone sections", () => {
    const html = renderToString(
      <MilestonesModal
        open={true}
        onClose={() => {}}
        percent={0}
        visitedCount={0}
        total={10}
        lineIndex={{}}
        typeStats={{}}
        stations={[]}
      />
    );
    expect(html).toContain("Gesamt-Fortschritt");
    expect(html).toContain("Stationen-Ziele");
  });
});
