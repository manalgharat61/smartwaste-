import React from 'react';
import { Leaf, Award, TrendingUp, Search } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function EcoRewards({ data }) {
  const points = 120;
  const level = "Seedling";
  const recycled = data?.requests?.filter(r=>r.status==='Collected').reduce((a,b)=>a+b.quantity_kg,0) || 0;
  
  const chartData = [
    { name: 'Organic', value: 400 },
    { name: 'Recyclable', value: 300 },
    { name: 'E-waste', value: 100 },
  ];
  const COLORS = ['#16A34A', '#3B82F6', '#8B5CF6'];

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-4xl mx-auto">
      <h2 className="text-3xl font-black mb-6">Eco Rewards</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary to-ecodark text-white p-6 rounded-3xl shadow-lg flex flex-col justify-between relative overflow-hidden">
           <Award className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20"/>
           <p className="text-sm font-bold opacity-80 uppercase tracking-widest mb-2">Total Points</p>
           <p className="text-5xl font-black mb-2">{points}</p>
           <div className="w-full bg-white/20 h-2 rounded-full mt-4"><div className="bg-white h-full rounded-full w-1/3"></div></div>
           <p className="text-xs font-medium mt-2">180 pts to Sapling</p>
        </div>
        
        <div className="bg-card p-6 rounded-3xl shadow-sm border border-border flex flex-col justify-center items-center text-center">
           <Leaf className="w-10 h-10 text-lime-500 mb-2"/>
           <p className="text-4xl font-black">{recycled} <span className="text-xl text-muted-foreground">kg</span></p>
           <p className="text-sm font-bold text-muted-foreground uppercase mt-2">Waste Diverted</p>
        </div>

        <div className="bg-card p-6 rounded-3xl shadow-sm border border-border flex flex-col justify-center items-center text-center">
           <TrendingUp className="w-10 h-10 text-blue-500 mb-2"/>
           <p className="text-4xl font-black">{(recycled * 2.5).toFixed(1)} <span className="text-xl text-muted-foreground">kg</span></p>
           <p className="text-sm font-bold text-muted-foreground uppercase mt-2">CO2 Saved</p>
        </div>
      </div>

      <div className="bg-card p-6 rounded-3xl shadow-sm border border-border">
         <h3 className="text-xl font-bold mb-4">Impact by Category</h3>
         <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                 {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
               </Pie>
               <Tooltip />
             </PieChart>
           </ResponsiveContainer>
         </div>
      </div>
    </div>
  )
}
