import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import MapView from './components/map/MapView';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapPin, Trash2, Truck, Plus, CheckCircle, Map as MapIcon, BarChart3, AlertCircle, LogOut, User, Shield, Zap, Home, Info, Briefcase, ChevronRight, Menu, X, Route as RouteIcon, Clock, Check, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedMarqueeHero } from '@/components/ui/hero-3';
import { GradientBackground } from '@/components/ui/dark-gradient-background';
import { cn } from '@/lib/utils';
import CitizenRouter from './pages/Citizen';
import { DashboardShell } from './components/DashboardShell';
import { useLiveEvents } from '@/hooks/useLiveEvents';
import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:5000/api';

const WASTE_IMAGES = [
  "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1605600659908-0ef719419d41?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1604187351574-c75ca79f5807?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1528190336454-13cd56b45b5a?q=80&w=800&auto=format&fit=crop"
];

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function MainApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      if (!stored?.token) return null;
      // Decode JWT exp without a library
      const payload = JSON.parse(atob(stored.token.split('.')[1]));
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        localStorage.removeItem('user');
        return null;
      }
      return stored;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [toast, setToast] = useState('');
  
  useLiveEvents();

  const [stats, setStats] = useState({ requests: 0, collected: 0, vehicles: 0, divertedKg: 0 });
  useEffect(() => {
    fetch(`${API_URL}/public/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const login = async (email, password, role) => {
    try {
      const res = await api.post('/auth/login', { email, password, role });
      
      const meRes = await api.get('/auth/me', { headers: { Authorization: `Bearer ${res.data.token}` } });
      const fullUser = meRes.data;
      
      localStorage.setItem('user', JSON.stringify(fullUser));
      setUser(fullUser);
      navigate(`/${fullUser.role}`);
    } catch(e) {
      throw new Error(e.response?.data?.error || "Invalid credentials");
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 20 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <Routes>
        <Route path="/" element={<LandingPage onLogin={login} stats={stats} user={user} />} />
        <Route path="/citizen/*" element={user?.role === 'citizen' ? <DashboardShell user={user} logout={logout}><CitizenRouter /></DashboardShell> : <Navigate to="/" />} />
        <Route path="/admin/*" element={user?.role === 'admin' ? <DashboardShell user={user} logout={logout}><AdminPortal /></DashboardShell> : <Navigate to="/" />} />
        <Route path="/driver/*" element={user?.role === 'driver' ? <DriverShell user={user} logout={logout}><DriverPortal user={user} /></DriverShell> : <Navigate to="/" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

// --- LANDING PAGE ---
function LandingPage({ onLogin, stats, user }) {
  const navigate = useNavigate();
  const selectorRef = useRef(null);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (user) navigate(`/${user.role}`);
    
    const handleScroll = () => {
       setIsScrolled(window.scrollY > window.innerHeight - 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user, navigate]);

  const scrollToLogin = () => {
    selectorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [showModal, setShowModal] = useState(false);
  const [role, setRole] = useState('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const openLogin = (r) => { 
    setRole(r); 
    setEmail(`${r}@smartwaste.in`); 
    setPassword(r.charAt(0).toUpperCase() + r.slice(1) + '@123');
    setErrorMsg('');
    setShowModal(true); 
  }

  return (
    <div className="bg-background">
      <nav className={cn("fixed top-0 w-full z-50 transition-all duration-300 py-4 px-6 flex items-center", isScrolled ? "bg-black/80 backdrop-blur-md shadow-md border-b border-white/10 text-white" : "bg-background/80 backdrop-blur-md border-b border-border shadow-sm text-secondary")}>
         <div className="flex items-center gap-2 text-2xl font-black transition-colors">
           <Leaf className={cn("w-8 h-8 transition-colors", isScrolled ? "text-[#B6F24A]" : "text-[#16A34A]")} /> SmartWaste
         </div>
      </nav>

      <AnimatedMarqueeHero 
        tagline="Smart waste collection for cleaner cities"
        title={<>Cleaner Cities,<br/>Smarter Pickups</>}
        description="Request, track, and collect waste in real-time. Join the eco-revolution and help us build a sustainable future with AI-optimized logistics."
        ctaText="Get Started"
        images={WASTE_IMAGES}
        onCtaClick={scrollToLogin}
      />

      <GradientBackground className="!min-h-0 pt-24 pb-32">
        <div className="max-w-6xl mx-auto px-6 mb-24 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="bg-white/10 border border-white/20 backdrop-blur-md p-6 rounded-[2rem] shadow-lg flex flex-col items-center hover:-translate-y-1 transition-transform">
               <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4"><Briefcase className="w-6 h-6 text-white" /></div>
               <span className="text-4xl font-black text-[#B6F24A]">{stats.requests || 0}</span>
               <span className="text-sm font-medium mt-2 text-white/80 uppercase tracking-widest">Total Requests</span>
            </motion.div>
            <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.1}} className="bg-white/10 border border-white/20 backdrop-blur-md p-6 rounded-[2rem] shadow-lg flex flex-col items-center hover:-translate-y-1 transition-transform">
               <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4"><CheckCircle className="w-6 h-6 text-white" /></div>
               <span className="text-4xl font-black text-white">{stats.collected || 0}</span>
               <span className="text-sm font-medium mt-2 text-white/80 uppercase tracking-widest">Collected Today</span>
            </motion.div>
            <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.2}} className="bg-white/10 border border-white/20 backdrop-blur-md p-6 rounded-[2rem] shadow-lg flex flex-col items-center hover:-translate-y-1 transition-transform">
               <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4"><Truck className="w-6 h-6 text-white" /></div>
               <span className="text-4xl font-black text-[#B6F24A]">{stats.vehicles || 0}</span>
               <span className="text-sm font-medium mt-2 text-white/80 uppercase tracking-widest">Active Vehicles</span>
            </motion.div>
            <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.3}} className="bg-white/10 border border-white/20 backdrop-blur-md p-6 rounded-[2rem] shadow-lg flex flex-col items-center hover:-translate-y-1 transition-transform">
               <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4"><Leaf className="w-6 h-6 text-white" /></div>
               <span className="text-4xl font-black text-white">{(stats.divertedKg || 0).toLocaleString()} kg</span>
               <span className="text-sm font-medium mt-2 text-white/80 uppercase tracking-widest">Waste Diverted</span>
            </motion.div>
        </div>

        <section ref={selectorRef} className="px-6 max-w-5xl mx-auto text-center relative z-10">
           <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">Choose how you want to continue</h2>
           <p className="text-white/70 mb-16 max-w-2xl mx-auto text-lg">Select your portal to securely access the SmartWaste network and begin managing pickups.</p>
           
           <div className="flex flex-col items-center gap-6">
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={() => openLogin('citizen')} 
                 className="w-full max-w-2xl bg-gradient-to-br from-[#16A34A] to-[#0F3D2E] p-10 rounded-[2rem] shadow-2xl text-left relative overflow-hidden group">
                 <div className="absolute -right-20 -top-20 opacity-10 group-hover:scale-110 transition-transform duration-500">
                   <User className="w-96 h-96 text-white" />
                 </div>
                 <h3 className="text-4xl font-black text-white mb-4 flex items-center gap-4"><User className="w-10 h-10"/> Citizen Login / Sign up</h3>
                 <p className="text-white/90 text-lg mb-6 max-w-md font-medium">Report waste, request pickups, and track collection status in real-time. Join the movement.</p>
                 <ul className="text-white/90 mb-8 space-y-2">
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Snap and tag overflowing bins</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Track your eco impact</li>
                 </ul>
                 <span className="inline-flex items-center gap-2 bg-white text-[#0F3D2E] px-6 py-3 rounded-full font-bold shadow-md">Continue <ChevronRight className="w-4 h-4"/></span>
              </motion.button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                 <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={() => openLogin('admin')} 
                    className="bg-white/10 border border-white/20 backdrop-blur-md text-white p-8 rounded-[2rem] shadow-lg flex flex-col items-center text-center group hover:bg-white/20 transition-colors">
                    <div className="bg-[#B6F24A] p-4 rounded-full mb-4 shadow-[0_0_15px_rgba(182,242,74,0.5)] group-hover:shadow-[0_0_25px_rgba(182,242,74,0.8)] transition-all"><Shield className="w-8 h-8 text-[#0F3D2E]"/></div>
                    <h3 className="text-2xl font-bold mb-2">Admin Login</h3>
                    <p className="text-white/70 text-sm">Manage fleet operations and algorithms.</p>
                 </motion.button>

                 <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={() => openLogin('driver')} 
                    className="bg-white/10 border border-white/20 backdrop-blur-md text-white p-8 rounded-[2rem] shadow-lg flex flex-col items-center text-center group hover:bg-white/20 transition-colors">
                    <div className="bg-[#B6F24A] p-4 rounded-full mb-4 shadow-[0_0_15px_rgba(182,242,74,0.5)] group-hover:shadow-[0_0_25px_rgba(182,242,74,0.8)] transition-all"><Truck className="w-8 h-8 text-[#0F3D2E]"/></div>
                    <h3 className="text-2xl font-bold mb-2">Truck Driver Login</h3>
                    <p className="text-white/70 text-sm">Access your optimized daily routes.</p>
                 </motion.button>
              </div>
           </div>
        </section>
      </GradientBackground>

      <footer className="bg-secondary text-secondary-foreground py-12 text-center border-t border-border/20">
         <p className="opacity-60">© 2026 SmartWaste Eco-Logistics. All rights reserved.</p>
      </footer>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <motion.div initial={{opacity:0, scale:0.95, y:20}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.95, y:20}} 
                className="bg-card text-card-foreground rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
                <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground bg-muted rounded-full p-2"><X className="w-5 h-5"/></button>
                <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                   {role === 'admin' ? <Shield className="w-8 h-8 text-primary"/> : role === 'driver' ? <Truck className="w-8 h-8 text-primary"/> : <User className="w-8 h-8 text-primary"/>}
                </div>
                <h2 className="text-3xl font-black mb-2 capitalize">{role} Login</h2>
                <p className="text-muted-foreground mb-6">Enter your credentials to access the portal.</p>
                
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full mb-4 p-4 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none font-medium" />
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full mb-6 p-4 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none font-medium" />
                
                {errorMsg && <p className="text-red-500 font-bold mb-4 text-center">{errorMsg}</p>}

                <button onClick={() => onLogin(email, password, role).catch(e => setErrorMsg(e.message))} className="w-full bg-primary hover:bg-ecodark text-primary-foreground font-bold py-4 rounded-xl transition-transform active:scale-95 shadow-md">
                   Sign In Securely
                </button>
                
                <div className="mt-6 text-center">
                   <button onClick={() => { setEmail(`${role}@smartwaste.in`); setPassword(role.charAt(0).toUpperCase() + role.slice(1) + '@123'); setErrorMsg(''); }} className="inline-flex items-center gap-1 bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-muted/80 hover:text-foreground cursor-pointer transition-colors">
                     <Info className="w-3 h-3"/> Demo credentials
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-8xl font-black text-primary mb-4">404</h1>
      <p className="text-xl font-medium text-muted-foreground">Oops, that bin is empty.</p>
      <Link to="/" className="mt-8 bg-primary text-white px-6 py-3 rounded-full font-bold">Go Home</Link>
    </div>
  )
}

// --- DASHBOARD SHELLS ---
function DashboardShell({ children, user, logout }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
         <div className="p-6 flex items-center gap-2 text-xl font-black text-secondary">
           <Leaf className="w-6 h-6 text-primary" /> SmartWaste
         </div>
         <div className="px-6 py-4 mb-4">
           <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Logged in as</p>
           <p className="font-bold text-foreground truncate">{user.name}</p>
         </div>
         <nav className="flex-1 px-4 space-y-2">
            {/* Nav links would go here for a real multi-page SPA */}
            <div className="bg-primary/10 text-primary px-4 py-3 rounded-xl font-bold flex items-center gap-3"><Home className="w-5 h-5"/> Overview</div>
         </nav>
         <div className="p-4 border-t border-border">
           <button onClick={logout} className="w-full flex items-center gap-3 text-muted-foreground hover:text-destructive font-bold px-4 py-3 rounded-xl transition-colors">
             <LogOut className="w-5 h-5"/> Logout
           </button>
         </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
         <header className="bg-card border-b border-border h-16 flex items-center px-8 justify-between shrink-0">
            <h2 className="font-bold text-lg">Dashboard</h2>
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">{user.name.charAt(0)}</div>
         </header>
         <div className="flex-1 overflow-auto p-8">
            {children}
         </div>
      </main>
    </div>
  )
}

function DriverShell({ children, user, logout }) {
  // Mobile first bottom nav shell
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <header className="bg-secondary text-secondary-foreground p-4 flex items-center justify-between shrink-0 z-20 shadow-md">
         <div className="flex items-center gap-2 font-bold"><Truck className="w-5 h-5 text-lime"/> Driver Portal</div>
         <button onClick={logout} className="text-secondary-foreground/60 hover:text-white font-bold text-sm"><LogOut className="w-4 h-4"/></button>
      </header>
      <main className="flex-1 overflow-auto relative z-10">
         {children}
      </main>
      <nav className="bg-card border-t border-border shrink-0 flex justify-around p-3 pb-6 z-20">
         <div className="flex flex-col items-center gap-1 text-primary"><RouteIcon className="w-6 h-6"/><span className="text-[10px] font-bold">Today</span></div>
         <div className="flex flex-col items-center gap-1 text-muted-foreground"><MapIcon className="w-6 h-6"/><span className="text-[10px] font-bold">Map</span></div>
         <div className="flex flex-col items-center gap-1 text-muted-foreground"><User className="w-6 h-6"/><span className="text-[10px] font-bold">Profile</span></div>
      </nav>
    </div>
  )
}

// --- CITIZEN PORTAL ---
function CitizenPortal() {
  const [step, setStep] = useState(1);
  const [pointId, setPointId] = useState(1);
  const [wasteType, setWasteType] = useState('General');
  const [qty, setQty] = useState(10);
  const [showConfetti, setShowConfetti] = useState(false);
  const queryClient = useQueryClient();

  const { data: points = [] } = useQuery({ queryKey: ['points'], queryFn: async () => (await api.get('/points')).data });
  const { data: requests = [] } = useQuery({ queryKey: ['requests'], queryFn: async () => (await api.get('/requests')).data });

  const reqMutation = useMutation({
    mutationFn: async (data) => await api.post('/requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setShowConfetti(true);
      setStep(4);
      setTimeout(() => { setShowConfetti(false); setStep(1); }, 3000);
    }
  });

  const submitReq = () => {
    reqMutation.mutate({ point_id: pointId, waste_type: wasteType, quantity_kg: qty });
  };

  const types = [
    { name: 'General', icon: Trash2 },
    { name: 'Recyclable', icon: Leaf },
    { name: 'Medical', icon: AlertCircle },
    { name: 'Hazardous', icon: Zap }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-3xl shadow-sm border border-border">
             <p className="text-muted-foreground font-bold text-sm uppercase tracking-wider mb-2">My Requests</p>
             <p className="text-4xl font-black text-foreground">{requests.length}</p>
          </div>
          <div className="bg-card p-6 rounded-3xl shadow-sm border border-border">
             <p className="text-muted-foreground font-bold text-sm uppercase tracking-wider mb-2">Pending Pickups</p>
             <p className="text-4xl font-black text-foreground">{requests.filter(r => r.status === 'Pending').length}</p>
          </div>
          <div className="bg-primary text-primary-foreground p-6 rounded-3xl shadow-md">
             <p className="font-bold text-sm uppercase tracking-wider mb-2 opacity-80">Eco Impact</p>
             <p className="text-4xl font-black">154 kg</p>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-card p-8 rounded-3xl shadow-sm border border-border relative overflow-hidden">
             {showConfetti && <div className="absolute inset-0 bg-primary/20 z-50 flex items-center justify-center"><h2 className="text-4xl font-black text-primary animate-bounce">Success!</h2></div>}
             <h2 className="text-2xl font-bold mb-6">Request Pickup</h2>
             
             {/* Progress */}
             <div className="flex gap-2 mb-8">
                {[1,2,3].map(i => <div key={i} className={cn("h-2 flex-1 rounded-full", step >= i ? "bg-primary" : "bg-muted")}></div>)}
             </div>

             {step === 1 && (
               <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}>
                  <h3 className="font-bold text-lg mb-4">Select Location</h3>
                  <div className="h-48 rounded-xl overflow-hidden mb-4 border border-border">
                     <MapView points={points.slice(0,5)} selectedId={pointId} onMapClick={(id) => setPointId(id)} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">Tap a marker on the map to select the collection point.</p>
                  <button onClick={()=>setStep(2)} className="w-full bg-foreground text-background font-bold py-4 rounded-xl hover:bg-foreground/90">Continue</button>
               </motion.div>
             )}

             {step === 2 && (
               <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}>
                  <h3 className="font-bold text-lg mb-4">Waste Type</h3>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                     {types.map(t => (
                        <div key={t.name} onClick={()=>setWasteType(t.name)} 
                           className={cn("p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 text-center", wasteType === t.name ? "border-primary bg-primary/5" : "border-border hover:border-border/80")}>
                           <t.icon className={cn("w-8 h-8", wasteType === t.name ? "text-primary" : "text-muted-foreground")} />
                           <span className="font-bold">{t.name}</span>
                        </div>
                     ))}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={()=>setStep(1)} className="w-1/3 bg-muted text-foreground font-bold py-4 rounded-xl">Back</button>
                    <button onClick={()=>setStep(3)} className="w-2/3 bg-foreground text-background font-bold py-4 rounded-xl">Continue</button>
                  </div>
               </motion.div>
             )}

             {step === 3 && (
               <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}>
                  <h3 className="font-bold text-lg mb-4">Quantity</h3>
                  <div className="bg-muted p-6 rounded-xl mb-8 flex flex-col items-center">
                     <span className="text-5xl font-black text-foreground mb-4">{qty} kg</span>
                     <input type="range" min="5" max="100" step="5" value={qty} onChange={e=>setQty(Number(e.target.value))} className="w-full accent-primary" />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={()=>setStep(2)} className="w-1/3 bg-muted text-foreground font-bold py-4 rounded-xl">Back</button>
                    <button onClick={submitReq} disabled={reqMutation.isPending} className="w-2/3 bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-lg">{reqMutation.isPending ? 'Submitting...' : 'Submit Request'}</button>
                  </div>
               </motion.div>
             )}
             
             {step === 4 && (
               <div className="text-center py-12">
                  <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Request Sent!</h3>
                  <p className="text-muted-foreground">The fleet has been notified.</p>
               </div>
             )}
          </div>

          <div className="bg-card p-8 rounded-3xl shadow-sm border border-border">
             <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
             <div className="space-y-4">
                {requests.slice(0,5).map((r, i) => (
                   <div key={r.id} className="flex gap-4 items-start p-4 bg-muted/50 rounded-2xl">
                      <div className="mt-1">
                         {r.status === 'Pending' ? <div className="w-4 h-4 rounded-full bg-red-400"/> : r.status === 'Assigned' ? <div className="w-4 h-4 rounded-full bg-orange-400"/> : <div className="w-4 h-4 rounded-full bg-primary"/>}
                      </div>
                      <div>
                         <h4 className="font-bold text-foreground">{r.waste_type}</h4>
                         <p className="text-sm text-muted-foreground mb-2">{r.quantity_kg} kg • Point {r.point_id}</p>
                         <span className="text-xs font-bold px-2 py-1 bg-background rounded border border-border uppercase tracking-wide">{r.status}</span>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  )
}

// --- ADMIN PORTAL ---
function AdminPortal() {
  const queryClient = useQueryClient();
  const { data: points = [] } = useQuery({ queryKey: ['points'], queryFn: async () => (await api.get('/points')).data });
  const { data: requests = [] } = useQuery({ queryKey: ['requests'], queryFn: async () => (await api.get('/requests')).data });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: async () => (await api.get('/vehicles')).data });

  const pending = requests.filter(r => r.status === 'Pending');

  const assignMutation = useMutation({
     mutationFn: async (data) => await api.post('/assign', data),
     onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['requests'] });
     }
  });
  const assignAll = () => {
     if(vehicles.length === 0) return alert("No vehicles");
     if(pending.length === 0) return alert("No pending requests");
     const vId = vehicles[0].id;
     assignMutation.mutate({ vehicle_id: vId, request_ids: pending.map(r=>r.id) });
  };

  const simulateMutation = useMutation({
     mutationFn: async () => await api.post('/simulate-fill'),
     onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['points'] });
        queryClient.invalidateQueries({ queryKey: ['requests'] });
     }
  });
  const simulateFill = () => simulateMutation.mutate();

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center mb-2">
         <div>
            <h1 className="text-3xl font-black text-foreground">Command Center</h1>
            <p className="text-muted-foreground">Monitor city-wide live logistics.</p>
         </div>
         <button onClick={simulateFill} disabled={simulateMutation.isPending} className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm hover:shadow transition"><Zap className="w-4 h-4"/> Simulate Fill</button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Bins</p>
             <p className="text-3xl font-black">{points.length}</p>
          </div>
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pending Pickups</p>
             <p className="text-3xl font-black text-destructive">{pending.length}</p>
          </div>
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Active Fleet</p>
             <p className="text-3xl font-black">{vehicles.length}</p>
          </div>
          <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-md">
             <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">Collection Efficiency</p>
             <p className="text-3xl font-black">94%</p>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Map View */}
          <div className="lg:col-span-2 bg-card rounded-3xl shadow-sm border border-border overflow-hidden relative">
             <div className="absolute top-4 left-4 z-20 bg-background/90 backdrop-blur p-4 rounded-2xl shadow-lg border border-border">
                <h3 className="font-bold mb-2">Live Map</h3>
                <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 bg-emerald-500 rounded-full"/> Normal</div>
                <div className="flex items-center gap-2 text-xs mt-1"><div className="w-3 h-3 bg-orange-500 rounded-full"/> Warning</div>
                <div className="flex items-center gap-2 text-xs mt-1"><div className="w-3 h-3 bg-red-500 rounded-full"/> Critical</div>
             </div>
             <MapView points={points} />
          </div>

          {/* Queue Panel */}
          <div className="flex flex-col gap-6">
             <div className="bg-card p-6 rounded-3xl shadow-sm border border-border flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="font-bold text-xl">Priority Queue</h2>
                   <button onClick={assignAll} disabled={assignMutation.isPending} className="bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold hover:bg-foreground/90">Auto-Assign</button>
                </div>
                <div className="overflow-y-auto pr-2 space-y-3 flex-1">
                   {pending.length === 0 ? (
                      <p className="text-muted-foreground text-sm italic text-center mt-10">Queue is clear.</p>
                   ) : (
                      pending.sort((a,b)=>b.priority_score - a.priority_score).map((r, i) => (
                         <div key={r.id} className="p-4 bg-muted/50 border border-border rounded-2xl flex items-center justify-between">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold">{r.waste_type}</span>
                                  {i === 0 && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Urgent</span>}
                               </div>
                               <p className="text-sm text-muted-foreground">{r.quantity_kg} kg @ Point {r.point_id}</p>
                            </div>
                            <div className="text-right">
                               <span className="text-2xl font-black text-foreground">{r.priority_score}</span><br/>
                               <span className="text-[10px] text-muted-foreground uppercase font-bold">Score</span>
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </div>
          </div>
       </div>
    </div>
  )
}

// --- DRIVER PORTAL ---
function DriverPortal({ user }) {
  const queryClient = useQueryClient();
  const { data: requests = [] } = useQuery({ queryKey: ['requests'], queryFn: async () => (await api.get('/requests')).data });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: async () => (await api.get('/vehicles')).data });

  const vehicle = vehicles.find(v => v.worker_id === user.id);
  const myReqs = requests.filter(r => r.vehicle_id === vehicle?.id && r.status === 'Assigned');

  const collectMutation = useMutation({
     mutationFn: async (id) => await api.post('/collect', { request_id: id }),
     onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['requests'] });
     }
  });

  const collect = (id) => {
    collectMutation.mutate(id);
  };

  return (
    <div className="pb-24">
       <div className="bg-secondary text-secondary-foreground pt-12 pb-24 px-6 rounded-b-[3rem] relative z-0">
          <h1 className="text-4xl font-black mb-2">{vehicle?.name || "No Vehicle"}</h1>
          <p className="opacity-80 font-medium text-lg">{myReqs.length} assigned stops for today.</p>
       </div>
       
       <div className="px-4 -mt-16 relative z-10 space-y-4 max-w-lg mx-auto">
          {myReqs.length === 0 ? (
             <div className="bg-card p-12 rounded-[2rem] shadow-xl text-center border border-border">
                <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">All Done!</h2>
                <p className="text-muted-foreground">Route complete. Head back to depot.</p>
             </div>
          ) : (
             myReqs.map((r, i) => (
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}} key={r.id} className="bg-card p-6 rounded-[2rem] shadow-lg border border-border">
                   <div className="flex justify-between items-start mb-6">
                      <div>
                         <span className="inline-block bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">Stop {i+1}</span>
                         <h3 className="font-black text-2xl text-foreground mb-1">{r.waste_type}</h3>
                         <p className="text-muted-foreground font-medium flex items-center gap-1"><MapPin className="w-4 h-4"/> Point {r.point_id} ({r.lat?.toFixed(3)}, {r.lng?.toFixed(3)})</p>
                      </div>
                      <div className="bg-primary/10 text-primary text-xl font-black px-4 py-2 rounded-xl">
                         {r.quantity_kg}kg
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <button className="flex-1 bg-muted text-foreground font-bold py-4 rounded-2xl flex justify-center items-center gap-2 hover:bg-muted/80">
                         <RouteIcon className="w-5 h-5"/> Navigate
                      </button>
                      <button onClick={() => collect(r.id)} disabled={collectMutation.isPending} className="flex-[2] bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-md hover:bg-ecodark active:scale-95 transition-transform flex justify-center items-center gap-2">
                         <Check className="w-5 h-5"/> Mark Collected
                      </button>
                   </div>
                </motion.div>
             ))
          )}
       </div>
    </div>
  )
}

