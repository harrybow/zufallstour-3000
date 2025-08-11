import React from "react";
import logo from "../assets/header-logo.svg";

export default function HeaderLogo({ className = "" }) {
  return (
    <img
      src={logo}
      alt="Zufallstour 3000 Logo"
      className={`select-none mt-2 mb-6 w-full max-w-xl h-auto ${className}`}
    />
  );
}