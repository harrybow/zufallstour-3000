import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import ChangePasswordForm from "../src/components/settings/ChangePasswordForm";

describe("ChangePasswordForm", () => {
  it("renders password fields", () => {
    const html = renderToString(<ChangePasswordForm onSave={() => {}} onCancel={() => {}} />);
    expect(html).toContain("Altes Passwort");
    expect(html).toContain("Neues Passwort");
  });
});
