"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedMarqueeHeroProps {
  tagline: string;
  title: React.ReactNode;
  description: string;
  ctaText: string;
  images: string[];
  className?: string;
  onCtaClick?: () => void;
}

import { ArrowRight } from "lucide-react";

const ActionButton = ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="mt-8 px-8 py-4 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white font-bold shadow-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:ring-opacity-75 flex items-center gap-2 mx-auto"
  >
    {children} <ArrowRight className="w-5 h-5" />
  </motion.button>
);

export const AnimatedMarqueeHero: React.FC<AnimatedMarqueeHeroProps> = ({
  tagline, title, description, ctaText, images, className, onCtaClick
}) => {
  const FADE_IN_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
  };
  const duplicatedImages = [...images, ...images];

  return (
    <section className={cn("relative w-full min-h-screen overflow-hidden bg-background flex flex-col items-center justify-center text-center px-4 pt-32 pb-48 md:pb-64", className)}>
      <div className="z-20 flex flex-col items-center relative">
        <div className="absolute inset-0 bg-white/40 blur-3xl -z-10 rounded-[100%] scale-150"></div>
        <motion.div initial="hidden" animate="show" variants={FADE_IN_ANIMATION_VARIANTS}
          className="mb-4 inline-block rounded-full border border-border bg-card/80 px-4 py-1.5 text-sm font-medium text-foreground backdrop-blur-sm">
          {tagline}
        </motion.div>
        <motion.h1 initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground drop-shadow-sm">
          {typeof title === "string"
            ? title.split(" ").map((word, i) => (
                <motion.span key={i} variants={FADE_IN_ANIMATION_VARIANTS} className="inline-block">{word}&nbsp;</motion.span>
              ))
            : title}
        </motion.h1>
        <motion.p initial="hidden" animate="show" variants={FADE_IN_ANIMATION_VARIANTS} transition={{ delay: 0.5 }}
          className="mt-6 max-w-xl text-lg text-slate-700 font-medium relative z-10 bg-white/60 p-4 rounded-2xl backdrop-blur-sm border border-white/50 shadow-sm">
          {description}
        </motion.p>
        <motion.div initial="hidden" animate="show" variants={FADE_IN_ANIMATION_VARIANTS} transition={{ delay: 0.6 }}>
          <ActionButton onClick={onCtaClick}>{ctaText}</ActionButton>
        </motion.div>
      </div>
      <div className="absolute top-[65%] md:top-[70%] left-0 w-full h-1/3 md:h-2/5 z-0 pointer-events-none [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
        <motion.div className="flex gap-4"
          animate={{ x: ["-100%", "0%"], transition: { ease: "linear", duration: 40, repeat: Infinity } }}>
          {duplicatedImages.map((src, index) => (
            <div key={index} className="relative aspect-[3/4] h-48 md:h-64 flex-shrink-0"
              style={{ rotate: `${index % 2 === 0 ? -2 : 5}deg` }}>
              <img src={src} alt={`Showcase image ${index + 1}`} className="w-full h-full object-cover rounded-2xl shadow-md" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
