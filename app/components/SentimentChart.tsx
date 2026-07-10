"use client";

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface SentimentChartProps {
  data: { name: string; value: number; color: string }[];
}

export default function SentimentChart({ data }: SentimentChartProps) {
  return (
    <div className="h-64 w-full">
      <PieChart width={300} height={250}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: '8px', color: '#f3f4f6' }}
          itemStyle={{ color: '#e5e7eb' }}
        />
        <Legend verticalAlign="bottom" height={36} iconType="circle" />
      </PieChart>
    </div>
  );
}
