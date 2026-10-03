import React, { useState } from 'react';
import { Search, Info, CheckCircle } from 'lucide-react';

const GUIDE = [
  { k: 'pizza box', c: 'General', type: 'General Waste', color: 'bg-stone-800 text-white', tip: 'Greasy boxes cannot be recycled.' },
  { k: 'battery', c: 'Hazardous', type: 'Hazardous', color: 'bg-red-700 text-white', tip: 'Never put batteries in general waste!' },
  { k: 'glass bottle', c: 'Recyclable', type: 'Recycling', color: 'bg-blue-700 text-white', tip: 'Rinse before recycling.' },
  { k: 'syringe', c: 'Medical', type: 'Medical', color: 'bg-yellow-500 text-black', tip: 'Must go in a sharps container.' },
  { k: 'old phone', c: 'E-waste', type: 'E-Waste', color: 'bg-purple-700 text-white', tip: 'Drop at a certified center.' },
  { k: 'banana peel', c: 'Organic', type: 'Compost', color: 'bg-green-700 text-white', tip: 'Great for compost.' },
];

export default function SortingGuide() {
  const [q, setQ] = useState('');
  const results = GUIDE.filter(g => g.k.includes(q.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="text-center mb-8">
         <h2 className="text-3xl font-black mb-2">Sorting Guide</h2>
         <p className="text-muted-foreground">Not sure where it goes? Search below.</p>
      </div>

      <div className="relative">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6"/>
         <input type="text" placeholder="e.g. pizza box, battery, bottle..." value={q} onChange={e=>setQ(e.target.value)} 
            className="w-full bg-card border-2 border-border p-4 pl-14 rounded-full text-lg font-bold shadow-sm focus:outline-none focus:border-primary transition" />
      </div>

      <div className="grid gap-4 mt-8">
         {results.map(g => (
            <div key={g.k} className="bg-card p-6 rounded-2xl shadow-sm border border-border flex items-center justify-between">
               <div>
                  <h3 className="text-xl font-bold capitalize mb-1">{g.k}</h3>
                  <p className="text-muted-foreground text-sm flex items-center gap-1"><Info className="w-4 h-4"/> {g.tip}</p>
               </div>
               <div className={`px-4 py-2 rounded-full font-bold text-sm shadow-sm ${g.color}`}>
                  {g.type}
               </div>
            </div>
         ))}
         {results.length === 0 && <p className="text-center text-muted-foreground py-8">No exact matches found. Check general categories.</p>}
      </div>
    </div>
  )
}
