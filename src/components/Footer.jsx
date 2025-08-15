import React from "react";

export default function Footer(){
  return (
    <footer className="text-center text-xs p-4">
      <a href="/impressum.html" className="underline">Impressum</a>
      {" "}·{" "}
      <a href="/datenschutz.html" className="underline">Datenschutz</a>
    </footer>
  );
}
