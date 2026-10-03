"use client";
import React from "react";
import { motion } from "framer-motion";

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function AuroraGrainBackground({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative isolate min-h-screen w-full overflow-hidden bg-[#8FD3AE] dark:bg-[#0B1F18] ${className}`}>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <motion.div className="absolute left-[8%] top-[10%] h-[55vh] w-[40vw] rounded-full bg-[#3F8466] opacity-80 blur-[90px] dark:bg-[#1F5A44]"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute left-[38%] -top-[8%] h-[45vh] w-[35vw] rounded-full bg-[#EAEDB0] opacity-90 blur-[80px] dark:bg-[#6B7A3A] dark:opacity-50"
          animate={{ x: [0, -30, 0], y: [0, 25, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute bottom-[-12%] left-[45%] h-[55vh] w-[38vw] rounded-full bg-[#2F5A48] opacity-85 blur-[100px] dark:bg-[#0F3D2E]"
          animate={{ x: [0, 35, 0], y: [0, -30, 0] }} transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }} />
        <div className="absolute inset-0 opacity-[0.35] mix-blend-overlay" style={{ backgroundImage: NOISE }} />
      </div>
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
