import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Leaf, LogOut, Home, Map as MapIcon, PlusCircle, List, Award, HelpCircle, AlertTriangle, User as UserIcon, Menu, X, Bell, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AuroraGrainBackground } from './ui/aurora-grain-background';

export function DashboardShell({ children, user, logout }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCitizen = user.role === 'citizen';

  const citizenLinks = [
    { to: "/citizen", icon: Home, label: "Home" },
    { to: "/citizen/request", icon: PlusCircle, label: "Request Pickup" },
    { to: "/citizen/requests", icon: List, label: "My Requests" },
    { to: "/citizen/map", icon: MapIcon, label: "Map" },
    { to: "/citizen/rewards", icon: Award, label: "Eco Rewards" },
    { to: "/citizen/sorting", icon: HelpCircle, label: "Sorting Guide" },
    { to: "/citizen/report", icon: AlertTriangle, label: "Report Issue" },
    { to: "/citizen/profile", icon: UserIcon, label: "Profile" },
  ];
  const adminLinks = [{ to: "/admin", icon: Home, label: "Dashboard" }];
  const links = isCitizen ? citizenLinks : adminLinks;

  const Sidebar = () => (
    <>
      <div className="p-6 flex items-center justify-between shrink-0">
         <div className="flex items-center gap-2 text-xl font-black text-secondary">
           {isCitizen ? <span className="text-2xl tracking-tight text-[var(--text)] font-extrabold lowercase">smartwaste.</span> : <><Leaf className="w-6 h-6 text-primary" /> SmartWaste</>}
         </div>
         <button className="md:hidden" onClick={()=>setMobileOpen(false)} aria-label="Close Menu"><X className="w-6 h-6"/></button>
      </div>
      
      {!isCitizen && (
      <div className="px-6 py-4 mb-4 bg-muted/30 mx-4 rounded-2xl">
         <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Welcome back</p>
         <p className="font-bold text-foreground truncate">{user.name}</p>
      </div>
      )}

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto pb-24 md:pb-0 mt-4">
         {links.map(l => (
           <Link key={l.to} to={l.to} onClick={()=>setMobileOpen(false)}
             className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all", 
               location.pathname === l.to || (l.to !== `/${user.role}` && location.pathname.startsWith(l.to))
               ? "bg-[#12261D] text-white shadow-md dark:bg-white dark:text-black" 
               : "text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--text)]"
             )}>
             <l.icon className="w-5 h-5"/> {l.label}
           </Link>
         ))}
      </nav>
      
      {isCitizen && (
      <div className="p-4 mx-4 mb-4 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center gap-3">
         <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">{user.name?.charAt(0)}</div>
         <div className="flex-1 overflow-hidden">
            <p className="font-bold text-[var(--text)] truncate">{user.name}</p>
            <p className="text-xs font-bold text-primary truncate">{user.level || 'Seedling'}</p>
         </div>
      </div>
      )}

      <div className="p-4 border-t border-black/5 dark:border-white/5 mt-auto hidden md:block">
         <button onClick={logout} className="w-full flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 font-bold px-4 py-3 rounded-xl transition-colors">
           <LogOut className="w-5 h-5"/> Logout
         </button>
      </div>
    </>
  );

  const MainContent = () => (
    <div className="flex h-screen overflow-hidden relative">
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={()=>setMobileOpen(false)}></div>}
      
      <motion.aside initial={false} animate={{x: mobileOpen ? 0 : -300}} className={cn("fixed md:static inset-y-0 left-0 w-72 flex flex-col z-50 md:translate-x-0 transition-transform md:transition-none border-r", isCitizen ? "bg-white/70 dark:bg-black/40 backdrop-blur-xl border-white/60 dark:border-white/10 shadow-lg" : "bg-card border-border")}>
         <Sidebar />
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
         <header className={cn("h-16 flex items-center px-4 md:px-8 justify-between shrink-0 z-30", isCitizen ? "bg-transparent border-none" : "bg-card/80 backdrop-blur-md border-b border-border")}>
            <div className="flex items-center gap-4">
               <button className="md:hidden text-[var(--text)] bg-black/5 dark:bg-white/10 p-2 rounded-lg" onClick={()=>setMobileOpen(true)} aria-label="Open Menu"><Menu className="w-5 h-5"/></button>
               {isCitizen ? <span className="hidden sm:block text-sm font-bold text-[var(--text-muted)]">Your city, your impact</span> : <h2 className="font-bold text-lg hidden sm:block capitalize">{location.pathname.split('/').pop() || 'Dashboard'}</h2>}
            </div>
            
            <div className="flex items-center gap-4 relative">
               {isCitizen ? (
                 <>
                   <button className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition" aria-label="Notifications">
                      <Bell className="w-5 h-5 text-[var(--text-muted)]" />
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--surface)]"></span>
                   </button>
                   <button className="w-10 h-10 bg-[#12261D] dark:bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform" aria-label="Settings"><Settings className="w-5 h-5 text-white dark:text-black"/></button>
                 </>
               ) : (
                 <>
                   <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold cursor-pointer" aria-label="User Avatar">{user.name?.charAt(0)}</div>
                   <button onClick={logout} className="md:hidden text-muted-foreground" aria-label="Logout"><LogOut className="w-5 h-5"/></button>
                 </>
               )}
            </div>
         </header>
         
         <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} transition={{duration:0.2}} className="h-full">
              {children}
            </motion.div>
         </div>
      </main>

      {isCitizen && (
        <nav className="md:hidden fixed bottom-0 w-full bg-white/70 dark:bg-black/60 backdrop-blur-xl border-t border-white/60 dark:border-white/10 shrink-0 flex justify-around p-2 pb-safe z-30 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
           <Link to="/citizen" className="flex flex-col items-center gap-1 p-2"><Home className={cn("w-6 h-6", location.pathname==="/citizen" ? "text-primary" : "text-[var(--text-muted)]")}/><span className="text-[10px] font-bold">Home</span></Link>
           <Link to="/citizen/request" className="flex flex-col items-center gap-1 p-2 -mt-6">
              <div className="bg-[#12261D] dark:bg-white text-white dark:text-black p-3 rounded-full shadow-lg border-4 border-[var(--surface)]"><PlusCircle className="w-6 h-6"/></div>
              <span className="text-[10px] font-bold text-[#12261D] dark:text-white">Request</span>
           </Link>
           <Link to="/citizen/requests" className="flex flex-col items-center gap-1 p-2"><List className={cn("w-6 h-6", location.pathname==="/citizen/requests" ? "text-primary" : "text-[var(--text-muted)]")}/><span className="text-[10px] font-bold">Activity</span></Link>
        </nav>
      )}
    </div>
  );

  return isCitizen ? <AuroraGrainBackground><MainContent /></AuroraGrainBackground> : <MainContent />;
}
