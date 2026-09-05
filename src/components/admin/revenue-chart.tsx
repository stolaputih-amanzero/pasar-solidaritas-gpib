"use client"

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { Order } from '@/types/database'

interface RevenueChartProps {
  orders: Order[]
}

export function RevenueChart({ orders }: RevenueChartProps) {
  const data = useMemo(() => {
    // 1. Get the last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      d.setHours(0, 0, 0, 0)
      return {
        date: d,
        label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        fullDate: d.toLocaleDateString('id-ID'),
        revenue: 0
      }
    })

    // 2. Aggregate revenue for each of those 7 days from verified/completed orders
    const paidStatuses = ['confirmed', 'processing', 'ready_for_pickup', 'completed']
    
    orders.forEach(order => {
      if (paidStatuses.includes(order.status)) {
        const orderDate = new Date(order.created_at)
        orderDate.setHours(0, 0, 0, 0)
        
        const dayMatch = days.find(d => d.date.getTime() === orderDate.getTime())
        if (dayMatch) {
          dayMatch.revenue += Number(order.total_amount)
        }
      }
    })

    return days
  }, [orders])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {payload[0].payload.fullDate}
          </p>
          <p className="font-serif font-bold text-primary">
            Rp {Number(payload[0].value).toLocaleString('id-ID')}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 0,
            left: -20,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="label" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => `Rp ${(value / 1000)}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))' }} />
          <Bar 
            dataKey="revenue" 
            fill="hsl(var(--primary))" 
            radius={[0, 0, 0, 0]} 
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
