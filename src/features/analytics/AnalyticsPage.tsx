import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { IndianRupee, TrendingUp, Gauge, Award, Download } from 'lucide-react';

const monthlyExpenseData = [
  { month: 'Apr 2026', expense: 42000 },
  { month: 'May 2026', expense: 53500 },
  { month: 'Jun 2026', expense: 48000 },
  { month: 'Jul 2026', expense: 61000 },
  { month: 'Aug 2026', expense: 57200 },
  { month: 'Sep 2026', expense: 45000 },
];

const categoryData = [
  { category: 'Fuel', amount: 32000 },
  { category: 'Toll', amount: 8400 },
  { category: 'Maintenance', amount: 15400 },
  { category: 'Repairs', amount: 4800 },
  { category: 'Fines', amount: 1200 },
];

const distanceData = [
  { vehicle: 'MH 12 AB 1234', km: 3420 },
  { vehicle: 'DL 01 AX 5678', km: 2850 },
  { vehicle: 'KA 05 MN 9012', km: 1980 },
  { vehicle: 'TS 09 XY 3456', km: 4120 },
];

const statusData = [
  { name: 'Active / On Trip', value: 2, color: '#10b981' },
  { name: 'In Service', value: 1, color: '#3b82f6' },
  { name: 'Idle', value: 1, color: '#f59e0b' },
  { name: 'Under Maintenance', value: 1, color: '#ef4444' },
];

const topDrivers = [
  { rank: 1, name: 'Ramesh Kumar', trips: 48, distance: '6,840 km', rating: '4.9 ★' },
  { rank: 2, name: 'Suresh Patil', trips: 42, distance: '5,920 km', rating: '4.8 ★' },
  { rank: 3, name: 'Vikram Singh', trips: 31, distance: '4,150 km', rating: '4.6 ★' },
];

export function AnalyticsPage() {
  const [range, setRange] = useState('6m');

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Month,Expense\n" + monthlyExpenseData.map(e => `${e.month},${e.expense}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fleet_analytics_report.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fleet Analytics & Intelligence</h1>
          <p className="text-sm text-gray-500">Six-month commercial cost breakdown, fuel efficiency, and vehicle utilization</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-md flex text-xs font-medium">
            {['1m', '3m', '6m', '1y'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded capitalize ${range === r ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-gray-600'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1.5" /> Export Data
          </Button>
        </div>
      </div>

      {/* Top Cost-Efficiency Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Average Cost Per KM</CardTitle>
            <Gauge className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹8.42 / km</div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1" /> 4.2% lower than Q2 average
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Distance Logged (6M)</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">36,870 km</div>
            <p className="text-xs text-gray-400 mt-1">Across 4 commercial vehicles</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Monthly Fuel Burn</CardTitle>
            <IndianRupee className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹34,150</div>
            <p className="text-xs text-gray-400 mt-1">68% of total operational expenditure</p>
          </CardContent>
        </Card>
      </div>

      {/* Primary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Expense Trend Line Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Expense Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyExpenseData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, 'Total Expense']} />
                <Line type="monotone" dataKey="expense" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expenses by Category Bar Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, 'Spend']} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distance per Vehicle Horizontal Bar Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Vehicle Mileage Utilization (KM)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={distanceData}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `${v} km`} />
                <YAxis dataKey="vehicle" type="category" width={110} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip formatter={(v: any) => [`${v} km`, 'Distance Run']} />
                <Bar dataKey="km" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fleet Status Donut Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Fleet Operational Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} Vehicles`, 'Count']} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Drivers Leaderboard */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Driver Performance Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {topDrivers.map((driver) => (
              <div key={driver.rank} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    driver.rank === 1 ? 'bg-amber-100 text-amber-800' :
                    driver.rank === 2 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-800'
                  }`}>
                    #{driver.rank}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">{driver.name}</h4>
                    <p className="text-xs text-gray-400">{driver.trips} Trips Completed</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-gray-900">{driver.distance}</div>
                  <div className="text-xs text-emerald-600 font-medium">{driver.rating}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}