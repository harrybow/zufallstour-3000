import React from "react";
import logo from "../assets/header-logo.svg";

export default function HeaderLogo(){
  return (
    <div className="flex flex-col items-center select-none mt-2 mb-6">
      <img src={logo} alt="Zufallstour 3000 Logo" className="w-full max-w-xl h-auto" />
    </div>
  );
}
