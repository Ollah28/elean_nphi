import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  Download, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Award,
  FileDown
} from 'lucide-react';

const COLORS = ['#0077cc', '#00a8a8', '#ffc107', '#28a745', '#6c757d'];

type EnrollmentRow = { month: string; enrollments: number };
type CompletionRateRow = { course: string; rate: number };
type CategoryRow = { category: string; value: number };
type UserStats = {
  totalUsers: number;
  activeUsers: number;
  coursesCompleted: number;
  averageCpdPoints: number;
};
type ReportsOverview = {
  enrollmentByMonth: EnrollmentRow[];
  completionRates: CompletionRateRow[];
  categoryDistribution: CategoryRow[];
  userStats: UserStats;
};

const Reports: React.FC = () => {
  const { user } = useAuth();
  const canBackup = user?.role === 'manager';
  const showCpd = user?.role === 'manager';
  const [overview, setOverview] = useState<ReportsOverview>({
    enrollmentByMonth: [],
    completionRates: [],
    categoryDistribution: [],
    userStats: {
      totalUsers: 0,
      activeUsers: 0,
      coursesCompleted: 0,
      averageCpdPoints: 0,
    },
  });

  useEffect(() => {
    if (!user) return;
    const managerParam = user.role === 'manager' ? `?managerId=${encodeURIComponent(user.id)}` : '';
    void api
      .get<ReportsOverview>(`/reports/overview${managerParam}`)
      .then(({ data }) => {
        setOverview({
          enrollmentByMonth: data.enrollmentByMonth || [],
          completionRates: data.completionRates || [],
          categoryDistribution: data.categoryDistribution || [],
          userStats: data.userStats || {
            totalUsers: 0,
            activeUsers: 0,
            coursesCompleted: 0,
            averageCpdPoints: 0,
          },
        });
      })
      .catch(() => {
        setOverview({
          enrollmentByMonth: [],
          completionRates: [],
          categoryDistribution: [],
          userStats: {
            totalUsers: 0,
            activeUsers: 0,
            coursesCompleted: 0,
            averageCpdPoints: 0,
          },
        });
      });
  }, [user]);

  const { enrollmentByMonth, completionRates, categoryDistribution, userStats } = overview;
  const completionRatesTop = useMemo(() => completionRates.slice(0, 8), [completionRates]);

  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Header */}
        <section className="bg-card border-b border-border py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Reports & Analytics</h1>
                <p className="text-muted-foreground">Monitor learning outcomes and platform usage</p>
              </div>
              {canBackup && (
                <button 
                  onClick={() => downloadCSV(enrollmentByMonth, 'enrollment-report')}
                  className="btn-secondary flex items-center gap-2"
                >
                  <FileDown className="w-5 h-5" />
                  Export All Data
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Stats Overview */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{userStats.totalUsers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{userStats.activeUsers.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{userStats.coursesCompleted.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Courses Completed</p>
                </div>
              </div>
            </div>
            {showCpd && (
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{userStats.averageCpdPoints}</p>
                    <p className="text-sm text-muted-foreground">Avg CPD Points</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enrollment Trends */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Enrollment Trends</h3>
                  <p className="text-sm text-muted-foreground">Monthly new enrollments</p>
                </div>
                {canBackup && (
                  <button 
                    onClick={() => downloadCSV(enrollmentByMonth, 'enrollment-trends')}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Download CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={enrollmentByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="enrollments" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Completion Rates */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Completion Rates</h3>
                  <p className="text-sm text-muted-foreground">By course</p>
                </div>
                {canBackup && (
                  <button 
                    onClick={() => downloadCSV(completionRates, 'completion-rates')}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Download CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={completionRatesTop} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      type="number" 
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      dataKey="course" 
                      type="category" 
                      width={100}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`${value}%`, 'Completion Rate']}
                    />
                    <Bar 
                      dataKey="rate" 
                      fill="hsl(var(--success))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Course Categories</h3>
                  <p className="text-sm text-muted-foreground">Distribution of enrollments</p>
                </div>
              </div>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {categoryDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {categoryDistribution.map((item, index) => (
                  <div key={item.category} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-muted-foreground">{item.category}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Table */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Monthly Summary</h3>
                  <p className="text-sm text-muted-foreground">Detailed enrollment data</p>
                </div>
                {canBackup && (
                  <button 
                    onClick={() => downloadCSV(enrollmentByMonth, 'monthly-summary')}
                    className="btn-secondary text-sm py-1 px-3 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    CSV
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-semibold text-foreground">Month</th>
                      <th className="text-right py-3 px-2 font-semibold text-foreground">Enrollments</th>
                      <th className="text-right py-3 px-2 font-semibold text-foreground">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentByMonth.map((row, index) => {
                      const prevEnrollments = index > 0 ? enrollmentByMonth[index - 1].enrollments : row.enrollments;
                      const growth = ((row.enrollments - prevEnrollments) / prevEnrollments * 100).toFixed(1);
                      const isPositive = parseFloat(growth) >= 0;
                      
                      return (
                        <tr key={row.month} className="border-b border-border last:border-0">
                          <td className="py-3 px-2 text-foreground">{row.month}</td>
                          <td className="py-3 px-2 text-right text-foreground font-medium">{row.enrollments}</td>
                          <td className={`py-3 px-2 text-right font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                            {index === 0 ? '-' : `${isPositive ? '+' : ''}${growth}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Reports;
