'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export interface SalesDataPoint {
  date: string
  omset: number
  unit: number
}

export function SalesChart({ data }: { data: SalesDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest font-bold border border-dashed border-border">
        Belum ada data penjualan tercatat
      </div>
    )
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOmset" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1c4c37" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#1c4c37" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={11} 
            tickFormatter={(v) => `Rp${(v/1000).toFixed(0)}k`} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--popover))', 
              border: '1px solid hsl(var(--border))', 
              borderRadius: '0px',
              fontSize: '12px'
            }}
            formatter={(value: any, name: any) => [
              name === 'omset' ? `Rp ${Number(value || 0).toLocaleString('id-ID')}` : `${value} unit`,
              name === 'omset' ? 'Omset' : 'Unit Terjual'
            ]}
          />
          <Area 
            type="monotone" 
            dataKey="omset" 
            stroke="#1c4c37" 
            fillOpacity={1} 
            fill="url(#colorOmset)" 
            strokeWidth={2} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
