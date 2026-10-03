import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Truck, CheckCircle, PlusCircle, MapPin, Calendar, Clock, AlertTriangle, HelpCircle, Map as MapIcon, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import MapView from '../../components/map/MapView';
import { MAP_CONFIG } from '@/config/map';

export default function Home({ data }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [overview, setOverview] = useState({ active: 0, completed: 0, recycled: 0, points: 0, latest_request: null });
  const currentReq = overview.latest_request;

  useEffect(() => {
    fetch('http://localhost:5000/api/citizen/overview', {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
    .then(r => r.json())
    .then(d => setOverview(d))
    .catch(console.error);
  }, []);

  return (
    <div className="space-y-12 pb-24 md:pb-8 max-w-6xl mx-auto">
      {/* Huge Editorial Hero */}
      <div className="pt-8 pb-4">
         <motion.p initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-sm mb-4">
           Ready to make an impact today?
         </motion.p>
         <motion.h1 initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}} 
            className="text-[clamp(3rem,8vw,8rem)] font-[800] leading-[0.9] tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-br from-[#2A6B4F] to-[#0F3D2E] dark:from-[#8FD3AE] dark:to-[#FFFFFF] mb-8">
           HELLO, {user.name ? user.name.split(' ')[0] : 'JOHN'}
         </motion.h1>
         
         <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <Link to="/citizen/request">
               <motion.button initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} transition={{delay:0.2}} whileHover={{y:-5}}
                  className="bg-[#12261D] dark:bg-white text-white dark:text-black px-8 py-5 rounded-2xl font-bold shadow-xl flex items-center gap-3 hover:shadow-2xl transition-all">
                  Request a pickup <ArrowRight className="w-5 h-5"/>
               </motion.button>
            </Link>
            <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}} className="text-[var(--text-muted)] font-medium text-sm flex items-center gap-2">
               Scroll for a closer look &darr;
            </motion.p>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-3xl shadow-lg flex flex-col justify-between">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Active</p>
            <p className="text-4xl font-black text-[var(--text)]">{overview.active}</p>
         </div>
         <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-3xl shadow-lg flex flex-col justify-between">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Completed</p>
            <p className="text-4xl font-black text-[var(--text)]">{overview.completed}</p>
         </div>
         <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-3xl shadow-lg flex flex-col justify-between">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center gap-2"><Leaf className="w-4 h-4"/> Recycled</p>
            <p className="text-4xl font-black text-[#16A34A] dark:text-[#8FD3AE]">{overview.recycled} <span className="text-lg">kg</span></p>
         </div>
         <div className="bg-gradient-to-br from-[#2A6B4F] to-[#0F3D2E] text-white p-6 rounded-3xl shadow-lg flex flex-col justify-between relative overflow-hidden">
            <Leaf className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20"/>
            <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-2 z-10 relative">Level: {user.level || 'Seedling'}</p>
            <div className="z-10 relative">
               <p className="text-4xl font-black text-white">{overview.points || 0} <span className="text-lg">pts</span></p>
               <div className="w-full bg-white/20 h-1.5 rounded-full mt-3"><div className="bg-[#B6F24A] h-full rounded-full w-[40%] shadow-[0_0_10px_#B6F24A]"></div></div>
            </div>
         </div>
      </div>

      {/* Tracker */}
      {currentReq ? (
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 md:p-10 rounded-[2.5rem] shadow-lg">
          <h2 className="text-xl font-bold mb-8 text-[var(--text)]">Your current pickup</h2>
          <div className="flex justify-between mb-8 relative z-0">
             <div className="absolute top-5 left-0 w-full h-1 bg-black/5 dark:bg-white/10 -z-10 rounded-full"></div>
             {['Pending', 'Assigned', 'Collected'].map((step, i) => {
                const isActive = step === currentReq.status || (step === 'Pending' && currentReq.status === 'Assigned');
                const isPassed = step === 'Pending' && currentReq.status !== 'Pending';
                return (
                  <div key={step} className="flex flex-col items-center gap-3">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-colors ${isActive || isPassed ? 'bg-[#12261D] dark:bg-white text-white dark:text-black scale-110' : 'bg-white dark:bg-black/50 text-[var(--text-muted)]'}`}>
                        {isPassed ? <CheckCircle className="w-5 h-5"/> : i+1}
                     </div>
                     <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{step}</span>
                  </div>
                )
             })}
          </div>
          {currentReq.status === 'Assigned' && (
             <div className="bg-[#8FD3AE]/20 dark:bg-[#0F3D2E]/40 border border-[#8FD3AE]/50 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 justify-between">
                <div>
                   <p className="text-2xl font-black text-[var(--text)] mb-2">Truck is on the way!</p>
                   <p className="text-sm font-bold text-[var(--text-muted)] flex items-center gap-2"><Truck className="w-4 h-4"/> Driver: John Doe • ETA: 15 mins</p>
                </div>
                <div className="w-full md:w-64 h-32 bg-black/5 rounded-2xl overflow-hidden border border-white/20">
                    <MapView />
                </div>
             </div>
          )}
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 p-10 rounded-[2.5rem] shadow-lg text-center flex flex-col items-center">
           <div className="w-24 h-24 bg-[#8FD3AE]/30 dark:bg-[#0F3D2E]/50 rounded-full flex items-center justify-center mb-6"><Leaf className="w-10 h-10 text-[#0F3D2E] dark:text-[#8FD3AE]"/></div>
           <h2 className="text-2xl font-bold mb-2 text-[var(--text)]">No active pickups</h2>
           <p className="text-[var(--text-muted)] mb-8 max-w-md">You're all caught up! Whenever you have waste ready, just let us know.</p>
           <Link to="/citizen/request" className="bg-[#12261D] dark:bg-white text-white dark:text-black px-8 py-4 rounded-xl font-bold shadow-lg flex items-center gap-2"><PlusCircle className="w-5 h-5"/> Request a pickup</Link>
        </div>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-[2rem] shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg text-[var(--text)]">Nearby Bins</h3>
               <Link to="/citizen/map" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">Open map <ArrowRight className="w-4 h-4"/></Link>
            </div>
            <div className="flex-1 h-64 bg-black/5 rounded-2xl overflow-hidden">
               <MapView />
            </div>
         </div>
         <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-[2rem] shadow-lg">
            <h3 className="font-bold text-lg text-[var(--text)] mb-4">Recent Activity</h3>
            <div className="space-y-4">
               {[1,2,3].map(i => (
                  <div key={i} className="flex gap-4">
                     <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 text-[var(--text-muted)]"><Clock className="w-4 h-4"/></div>
                     <div>
                        <p className="font-bold text-sm text-[var(--text)]">Pickup Collected</p>
                        <p className="text-xs text-[var(--text-muted)]">2 days ago • +15 pts</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
         <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-3xl shadow-lg">
            <Calendar className="w-8 h-8 text-[var(--text-muted)] mb-4"/>
            <h3 className="font-bold text-[var(--text)]">Next Scheduled</h3>
            <p className="text-[var(--text-muted)] text-sm">Tomorrow, 9:00 AM</p>
         </div>
         <div className="bg-[#B6F24A]/20 dark:bg-[#B6F24A]/10 border border-[#B6F24A]/50 p-6 rounded-3xl shadow-lg">
            <Leaf className="w-8 h-8 text-[#0F3D2E] dark:text-[#B6F24A] mb-4"/>
            <h3 className="font-bold text-[var(--text)]">Eco Tip</h3>
            <p className="text-[var(--text-muted)] text-sm">Crush plastic bottles to save bin space!</p>
         </div>
         <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/60 dark:border-white/10 p-6 rounded-3xl shadow-lg">
            <h3 className="font-bold text-[var(--text)] mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-2">
               <Link to="/citizen/sorting" className="text-sm font-bold text-[var(--text-muted)] hover:text-primary flex items-center gap-2"><HelpCircle className="w-4 h-4"/> Sorting Guide</Link>
               <Link to="/citizen/report" className="text-sm font-bold text-[var(--text-muted)] hover:text-primary flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Report Issue</Link>
            </div>
         </div>
      </div>
    </div>
  )
}
