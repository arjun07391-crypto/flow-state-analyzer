import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Activity, CATEGORY_COLORS, CATEGORY_LABELS, ActivityCategory } from '@/types/activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TimeChartsProps {
  activities: Activity[];
}

export const TimeCharts: React.FC<TimeChartsProps> = ({ activities }) => {
  const { pieData, barData, totalMinutes } = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    activities.forEach((activity) => {
      if (activity.duration) {
        const cat = activity.category;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + activity.duration;
      }
    });

    const pie = Object.entries(categoryTotals)
      .map(([category, minutes]) => ({
        name: CATEGORY_LABELS[category as ActivityCategory],
        value: minutes,
        color: CATEGORY_COLORS[category as ActivityCategory],
        category,
      }))
      .sort((a, b) => b.value - a.value);

    // Productive vs Leisure breakdown
    const productiveCategories = ['work', 'coding', 'meetings', 'commute'];
    const leisureCategories = ['leisure', 'social', 'break'];
    const essentialCategories = ['meals', 'sleep', 'personal_care', 'exercise'];

    const productiveTime = Object.entries(categoryTotals)
      .filter(([cat]) => productiveCategories.includes(cat))
      .reduce((sum, [, mins]) => sum + mins, 0);

    const leisureTime = Object.entries(categoryTotals)
      .filter(([cat]) => leisureCategories.includes(cat))
      .reduce((sum, [, mins]) => sum + mins, 0);

    const essentialTime = Object.entries(categoryTotals)
      .filter(([cat]) => essentialCategories.includes(cat))
      .reduce((sum, [, mins]) => sum + mins, 0);

    const bar = [
      { name: 'Productive', minutes: productiveTime, color: 'hsl(var(--chart-1))' },
      { name: 'Essential', minutes: essentialTime, color: 'hsl(var(--chart-2))' },
      { name: 'Leisure', minutes: leisureTime, color: 'hsl(var(--chart-5))' },
    ];

    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    return { pieData: pie, barData: bar, totalMinutes: total };
  }, [activities]);

  if (activities.length === 0 || totalMinutes === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Complete some activities to see your time breakdown
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatMinutes(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Total tracked: <span className="font-medium">{formatMinutes(totalMinutes)}</span>
          </p>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => formatMinutes(v)} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip
                  formatter={(value: number) => formatMinutes(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
