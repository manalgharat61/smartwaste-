import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MapView from '../../components/map/MapView';
import { MapPin, Trash2, CheckCircle, ChevronLeft, ChevronRight, AlertTriangle, Leaf, PlusCircle, Search, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAP_CONFIG } from '@/config/map';
import { api } from '@/lib/api';
const API_URL = 'http://localhost:5000/api';

const wasteTypes = [
  { name: 'Organic', desc: 'Food scraps, yard waste', icon: Leaf },
  { name: 'Recyclable', desc: 'Paper, plastic, glass', icon: Trash2 },
  { name: 'Hazardous', desc: 'Chemicals, batteries', icon: AlertTriangle, alert: true },
  { name: 'E-waste', desc: 'Electronics, cables', icon: AlertTriangle },
];

export default function RequestPickup({ data }) {
  const [step, setStep] = useState(1);
  const [latlng, setLatlng] = useState<[number, number] | null>(null);
  const [type, setType] = useState('Recyclable');
  const [qty, setQty] = useState(10);
  const [isDone, setIsDone] = useState(false);

  const LocationPicker = () => {
    useMapEvents({
      click(e) { setLatlng([e.latlng.lat, e.latlng.lng]); }
    });
    return latlng ? <CircleMarker center={latlng} radius={8} pathOptions={{color:'#0F3D2E', fillColor:'#16A34A', fillOpacity:1}} /> : null;
  };

  const submit = async () => {
     try {
       await api.post('/citizen/requests', {
         lat: latlng?.[0], lng: latlng?.[1], 
         zone_type: 'residential',
         waste_type: type.toLowerCase(), 
         quantity_kg: qty,
         fill_level: 100,
         overflowing: false,
         address: 'Dropped pin',
         notes: ''
       });
       setIsDone(true);
     } catch(e) { alert("Error submitting request") }
  };

  if (isDone) return (
     <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <motion.div initial={{scale:0}} animate={{scale:1}} className="w-32 h-32 bg-[#8FD3AE]/30 rounded-full flex items-center justify-center mb-6"><CheckCircle className="w-16 h-16 text-[#0F3D2E]"/></motion.div>
        <h2 className="text-4xl font-black mb-4 text-[var(--text)]">Request Confirmed!</h2>
        <p className="text-[var(--text-muted)] text-lg mb-8 max-w-md">We've added your request to the priority queue. We'll notify you when a driver is assigned.</p>
        <div className="flex gap-4">
           <button onClick={()=>{setStep(1);setIsDone(false);setLatlng(null);}} className="bg-black/5 dark:bg-white/10 text-[var(--text)] font-bold px-8 py-4 rounded-xl hover:bg-black/10 transition">Request Another</button>
           <button className="bg-[#12261D] dark:bg-white text-white dark:text-black font-bold px-8 py-4 rounded-xl hover:bg-opacity-90 transition shadow-lg">Track Pickup</button>
        </div>
     </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-32 md:pb-24">
       <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 md:p-10 rounded-[2.5rem] shadow-lg">
          
          {/* Header Steps */}
          <div className="flex justify-between items-center mb-8 relative z-0">
             <div className="absolute top-1/2 left-0 w-full h-1 bg-black/5 dark:bg-white/10 -z-10 rounded-full -translate-y-1/2"></div>
             {['Location', 'Waste type', 'Details', 'Review'].map((label, i) => {
                const s = i + 1;
                const isActive = step === s;
                const isPassed = step > s;
                return (
                  <div key={label} onClick={()=> { if(isPassed) setStep(s) }} className={`flex flex-col items-center gap-2 cursor-pointer ${isPassed?'hover:opacity-80':''}`}>
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-colors ${isActive ? 'bg-[#12261D] dark:bg-white text-white dark:text-black ring-4 ring-[#12261D]/20' : isPassed ? 'bg-primary text-white' : 'bg-white dark:bg-black/50 text-[var(--text-muted)]'}`}>
                        {isPassed ? <CheckCircle className="w-5 h-5"/> : s}
                     </div>
                     <span className={`text-xs font-bold uppercase tracking-wider hidden sm:block ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
                  </div>
                )
             })}
          </div>

          <AnimatePresence mode="wait">
             {step === 1 && (
               <motion.div key="s1" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Left Panel */}
                 <div className="flex flex-col gap-6 lg:h-[60vh] overflow-y-auto pr-2">
                    <h2 className="text-3xl font-black text-[var(--text)]">Where is the waste?</h2>
                    
                    <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5"/>
                       <input type="text" placeholder="Search address..." className="w-full bg-black/5 dark:bg-white/5 border border-white/20 p-4 pl-12 rounded-2xl text-[var(--text)] font-medium focus:outline-none focus:ring-2 focus:ring-[#12261D]" />
                    </div>
                    
                    <button className="flex items-center gap-3 p-4 bg-[#8FD3AE]/20 dark:bg-white/5 rounded-2xl text-[var(--text)] font-bold hover:bg-[#8FD3AE]/40 transition">
                       <Navigation className="w-5 h-5 text-primary"/> Use my current location
                    </button>

                    <div>
                       <h3 className="font-bold text-sm text-[var(--text-muted)] uppercase tracking-wider mb-3">Nearby Bins</h3>
                       <div className="space-y-3">
                          {[1,2,3].map(i => (
                             <div key={i} className="p-4 bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-2xl cursor-pointer hover:border-primary transition">
                                <p className="font-bold text-[var(--text)]">Greenwich Park Bin {i}</p>
                                <p className="text-xs text-[var(--text-muted)] mb-2">120m away • Collected 2h ago</p>
                                <div className="w-full h-1.5 bg-black/5 rounded-full"><div className="w-[30%] h-full bg-primary rounded-full"></div></div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* Right Panel Map */}
                 <div className="lg:col-span-2 h-[50vh] lg:h-[60vh] rounded-[2rem] overflow-hidden border-4 border-white/40 shadow-inner relative z-0">
                   <MapView />
                   
                   <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-md bg-white/90 dark:bg-black/80 backdrop-blur-md p-4 rounded-2xl shadow-xl z-[400] border border-black/10">
                      {latlng ? (
                        <div>
                           <p className="font-bold text-[var(--text)] flex items-center gap-2"><MapPin className="w-4 h-4 text-primary"/> Selected Location</p>
                           <p className="text-sm text-[var(--text-muted)] truncate">Lat: {latlng[0].toFixed(4)}, Lng: {latlng[1].toFixed(4)}</p>
                        </div>
                      ) : (
                        <p className="text-center font-bold text-[var(--text-muted)]">Tap the map or pick a bin from the list.</p>
                      )}
                   </div>
                 </div>
               </motion.div>
             )}

             {step === 2 && (
               <motion.div key="s2" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="max-w-2xl mx-auto">
                 <h2 className="text-3xl font-black mb-2 text-center text-[var(--text)]">What kind of waste?</h2>
                 <p className="text-center text-[var(--text-muted)] mb-8">Select the category that best fits your items.</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {wasteTypes.map(t => (
                       <div key={t.name} onClick={()=>setType(t.name)} className={cn("p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex items-center gap-4", type===t.name ? "border-[#12261D] dark:border-white bg-[#8FD3AE]/20 dark:bg-white/10" : "border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10")}>
                          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0", type===t.name ? "bg-[#12261D] dark:bg-white text-white dark:text-black" : "bg-white dark:bg-black/20 text-[var(--text-muted)]")}>
                             <t.icon className="w-6 h-6" />
                          </div>
                          <div>
                             <p className="font-bold text-lg text-[var(--text)]">{t.name}</p>
                             <p className="text-sm text-[var(--text-muted)]">{t.desc}</p>
                          </div>
                       </div>
                    ))}
                 </div>
               </motion.div>
             )}

             {step === 3 && (
               <motion.div key="s3" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="max-w-2xl mx-auto">
                 <h2 className="text-3xl font-black mb-2 text-center text-[var(--text)]">How much is there?</h2>
                 <p className="text-center text-[var(--text-muted)] mb-8">Estimate the total weight.</p>
                 <div className="bg-black/5 dark:bg-white/5 p-10 rounded-[2rem] text-center">
                    <p className="text-7xl font-black text-[#12261D] dark:text-white mb-8">{qty} <span className="text-3xl text-[var(--text-muted)]">kg</span></p>
                    <input type="range" min="1" max="100" value={qty} onChange={e=>setQty(Number(e.target.value))} className="w-full h-3 bg-black/10 dark:bg-white/20 rounded-full appearance-none cursor-pointer accent-[#12261D] dark:accent-white" />
                    <div className="flex flex-wrap justify-center gap-3 mt-8">
                       {[5, 10, 25, 50].map(v => (
                         <button key={v} onClick={()=>setQty(v)} className="px-6 py-3 bg-white dark:bg-black/40 rounded-full font-bold text-[var(--text)] hover:shadow-md transition">{v} kg</button>
                       ))}
                    </div>
                 </div>
               </motion.div>
             )}

             {step === 4 && (
               <motion.div key="s4" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="max-w-xl mx-auto text-center">
                 <h2 className="text-3xl font-black mb-8 text-[var(--text)]">Review & Submit</h2>
                 <div className="bg-white dark:bg-black/40 border border-black/5 dark:border-white/10 p-8 rounded-[2rem] space-y-6 text-left shadow-md mb-8">
                    <div className="flex justify-between items-center border-b border-black/5 dark:border-white/10 pb-4">
                       <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-sm">Location</span>
                       <span className="font-bold text-[var(--text)] flex items-center gap-1"><MapPin className="w-4 h-4"/> Selected</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-black/5 dark:border-white/10 pb-4">
                       <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-sm">Waste Type</span>
                       <span className="font-bold text-[var(--text)]">{type}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-black/5 dark:border-white/10 pb-4">
                       <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-sm">Quantity</span>
                       <span className="font-bold text-[var(--text)]">{qty} kg</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-sm">Priority</span>
                       <span className="font-black text-red-500 uppercase">High</span>
                    </div>
                 </div>
               </motion.div>
             )}
          </AnimatePresence>
       </div>

       {/* Sticky Bottom Bar */}
       <div className="fixed bottom-0 left-0 md:left-72 right-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-black/5 dark:border-white/10 p-4 px-8 z-[100] flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <button onClick={()=>setStep(Math.max(1, step-1))} className={cn("px-6 py-3 rounded-xl font-bold text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/5 transition", step===1 && "opacity-0 pointer-events-none")}>
            Back
          </button>
          
          {step < 4 ? (
             <button onClick={()=>setStep(step+1)} disabled={step===1 && !latlng} title={step===1 && !latlng ? "Pick a location first" : ""}
                className={cn("bg-[#12261D] dark:bg-white text-white dark:text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition", (!latlng && step===1) ? "opacity-50 cursor-not-allowed" : "hover:scale-105")}>
                Next <ChevronRight className="w-5 h-5"/>
             </button>
          ) : (
             <button onClick={submit} className="bg-primary hover:bg-[#15803D] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:scale-105 transition">
                Confirm Pickup <CheckCircle className="w-5 h-5"/>
             </button>
          )}
       </div>
    </div>
  )
}
