import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check } from 'lucide-react';

const steps = [
  { title: "Welcome to SmartWaste!", desc: "Let's take a quick tour to get you started on your eco journey.", target: null },
  { title: "Request a Pickup", desc: "Use this button anytime you have waste ready for collection. It's fast and easy.", target: ".tour-request" },
  { title: "Explore the Map", desc: "Find nearby collection points and see the status of public bins in your area.", target: ".tour-map" },
  { title: "Stay Notified", desc: "We'll let you know when the truck is on its way or when you earn eco points!", target: ".tour-bell" }
];

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, []);

  const complete = () => {
    localStorage.setItem('hasSeenTour', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={complete}></div>
       <motion.div initial={{opacity:0, scale:0.9, y:20}} animate={{opacity:1, scale:1, y:0}} className="bg-card text-card-foreground p-8 rounded-3xl shadow-2xl max-w-md w-full relative z-10 text-center">
          <button onClick={complete} aria-label="Close tour" className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
          <div className="flex gap-2 justify-center mb-6">
             {steps.map((s,i) => <div key={i} className={`w-2 h-2 rounded-full ${i === currentStep ? 'bg-primary w-6' : 'bg-muted'} transition-all`}></div>)}
          </div>
          <h2 className="text-2xl font-black mb-4">{step.title}</h2>
          <p className="text-muted-foreground mb-8 text-lg">{step.desc}</p>
          <div className="flex justify-between items-center">
             <button onClick={complete} className="text-muted-foreground font-bold">Skip</button>
             <button onClick={() => {
               if(currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
               else complete();
             }} className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-ecodark transition flex items-center gap-2">
               {currentStep < steps.length - 1 ? <>Next <ChevronRight className="w-4 h-4"/></> : <>Get Started <Check className="w-4 h-4"/></>}
             </button>
          </div>
       </motion.div>
    </div>
  )
}
