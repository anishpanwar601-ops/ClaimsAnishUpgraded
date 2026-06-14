import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertTriangle, ShieldAlert, DollarSign, Scale, TrendingUp, Loader2 } from 'lucide-react';

export default function AnalyticsTab({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (response.ok) {
        setData(resData);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-3" />
        <p className="text-sm font-semibold">Generating reporting dashboards...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-white border border-slate-100 rounded-2xl shadow-sm">
        <p className="text-sm text-slate-500">Failed to load analytics data.</p>
      </div>
    );
  }

  // Helper values for SVG Donut chart
  const npaCats = [
    { label: 'Standard', count: data.npaBreakdown.Standard || 0, color: '#10b981' },
    { label: 'Substandard', count: data.npaBreakdown.Substandard || 0, color: '#f59e0b' },
    { label: 'Doubtful', count: data.npaBreakdown.Doubtful || 0, color: '#ef4444' },
    { label: 'Loss', count: data.npaBreakdown.Loss || 0, color: '#7c3aed' }
  ];
  
  const totalNpaCount = npaCats.reduce((acc, cat) => acc + cat.count, 0);
  
  // Calculate SVG arc paths for Donut chart
  let cumulativePercent = 0;
  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const donutSlices = npaCats.map(cat => {
    const percent = totalNpaCount > 0 ? cat.count / totalNpaCount : 0;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    
    if (percent === 0) return null;
    if (percent === 1) {
      // 100% full circle
      return {
        path: "M 0 -1 A 1 1 0 1 1 -0.0001 -1 Z",
        color: cat.color,
        label: cat.label,
        count: cat.count,
        percent: Math.round(percent * 100)
      };
    }

    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
    const largeArcFlag = percent > 0.5 ? 1 : 0;
    
    // Scale up coordinates for viewing
    const r = 80;
    const sX = startX * r;
    const sY = startY * r;
    const eX = endX * r;
    const eY = endY * r;

    const pathData = [
      `M 0 0`,
      `L ${sX} ${sY}`,
      `A ${r} ${r} 0 ${largeArcFlag} 1 ${eX} ${eY}`,
      `Z`
    ].join(' ');

    return {
      path: pathData,
      color: cat.color,
      label: cat.label,
      count: cat.count,
      percent: Math.round(percent * 100)
    };
  }).filter(Boolean);

  // Helper values for SVG Column chart (Claims created vs approved)
  const maxClaimsVal = Math.max(...data.monthlyStats.map(m => Math.max(m.claimsCreated, m.approved, 5)));
  const columnHeight = 150;
  
  // Helper values for SVG Line chart (Settlement values)
  const maxRecovered = Math.max(...data.monthlyStats.map(m => m.recovered), 10000);
  const lineChartHeight = 150;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Analytics &amp; Reports</h2>
        <p className="text-sm text-slate-500 mt-1">Real-time statistics dashboard displaying claim performance, fraud warning indicators, and recoveries.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Claims Financial Value</p>
            <h3 className="text-2xl font-black text-slate-900">${data.totalOutstanding?.toLocaleString()}</h3>
            <p className="text-xs text-slate-500">Out of ${data.totalLoanVal?.toLocaleString()} original principal</p>
          </div>
          <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recovery Litigation</p>
            <h3 className="text-2xl font-black text-indigo-600">${data.totalAuctionRecovery?.toLocaleString()}</h3>
            <p className="text-xs text-slate-500">{data.activeLawsuits} lawsuits | {data.activeAuctions} auctions</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Refunds Disbursed</p>
            <h3 className="text-2xl font-black text-emerald-600">${data.totalRefundsValue?.toLocaleString()}</h3>
            <p className="text-xs text-slate-500">{data.refundsProcessed} of {data.refundsRequested} requested paid</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Risk Threats</p>
            <h3 className="text-2xl font-black text-rose-600">{data.fraudAlertsCount} Alert(s)</h3>
            <p className="text-xs text-slate-500">Duplicate claims and rule warnings</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
        
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* NPA Distribution (Donut Chart) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">NPA Classification Distribution</h4>
            <p className="text-xs text-slate-400">Overview of portfolio health status categories</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 my-6 justify-center">
            {totalNpaCount > 0 ? (
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg width="180" height="180" viewBox="-90 -90 180 180" className="transform rotate-[-90deg]">
                  {donutSlices.map((slice, i) => (
                    <path
                      key={i}
                      d={slice.path}
                      fill={slice.color}
                      className="transition-all hover:opacity-85 cursor-pointer"
                      title={`${slice.label}: ${slice.count}`}
                    />
                  ))}
                  {/* Central cutout circle for donut look */}
                  <circle cx="0" cy="0" r="50" fill="white" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-800">{totalNpaCount}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Assets</span>
                </div>
              </div>
            ) : (
              <div className="h-44 flex items-center text-slate-400 text-xs">No assets evaluated yet</div>
            )}

            <div className="flex-1 space-y-2.5">
              {npaCats.map((cat, i) => {
                const pct = totalNpaCount > 0 ? Math.round((cat.count / totalNpaCount) * 100) : 0;
                return (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
                      <span className="font-semibold text-slate-600">{cat.label}</span>
                    </div>
                    <span className="font-bold text-slate-900">{cat.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="border-t border-slate-50 pt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Average DPD Audited:</span>
            <span className="font-bold text-slate-800">125 Days</span>
          </div>
        </div>

        {/* Claims Processed vs Approved (Bar Chart) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Monthly Claim Process Flow</h4>
            <p className="text-xs text-slate-400">Total claims created vs approved finalizations (Past 6 months)</p>
          </div>

          <div className="my-6">
            <svg viewBox={`0 0 500 ${columnHeight + 40}`} className="w-full h-auto">
              {/* Y-axis helper lines */}
              {[0, 0.5, 1].map((pct, i) => {
                const y = 10 + (columnHeight - (columnHeight * pct));
                return (
                  <g key={i}>
                    <line x1="30" y1={y} x2="480" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x="5" y={y + 4} className="fill-slate-400 text-[10px] font-semibold">
                      {Math.round((maxClaimsVal * pct))}
                    </text>
                  </g>
                );
              })}

              {/* Render Columns */}
              {data.monthlyStats.map((item, idx) => {
                const width = 20;
                const gap = 35;
                const xBase = 50 + idx * 72;
                
                // Heights
                const h1 = maxClaimsVal > 0 ? (item.claimsCreated / maxClaimsVal) * columnHeight : 0;
                const h2 = maxClaimsVal > 0 ? (item.approved / maxClaimsVal) * columnHeight : 0;

                const y1 = 10 + columnHeight - h1;
                const y2 = 10 + columnHeight - h2;

                return (
                  <g key={idx}>
                    {/* Created Claims Column (Indigo) */}
                    <rect
                      x={xBase}
                      y={y1}
                      width={width}
                      height={h1}
                      fill="#6366f1"
                      rx="3"
                      className="transition-all hover:fill-indigo-400 cursor-pointer"
                    />
                    
                    {/* Approved Claims Column (Sky) */}
                    <rect
                      x={xBase + width + 4}
                      y={y2}
                      width={width}
                      height={h2}
                      fill="#0ea5e9"
                      rx="3"
                      className="transition-all hover:fill-sky-400 cursor-pointer"
                    />

                    {/* Month Label */}
                    <text x={xBase + width - 2} y={15 + columnHeight + 15} textAnchor="middle" className="fill-slate-500 text-[11px] font-bold">
                      {item.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="border-t border-slate-50 pt-4 flex justify-end gap-6 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-indigo-600">
              <span className="w-3.5 h-3.5 bg-indigo-500 rounded" />
              <span>Claims Filed</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-600">
              <span className="w-3.5 h-3.5 bg-sky-500 rounded" />
              <span>Approved</span>
            </div>
          </div>
        </div>

      </div>

      {/* Recoveries Timeline Chart (Line Chart) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Recoveries &amp; Settlements Timeline</h4>
            <p className="text-xs text-slate-400">Aggregated assets liquidated value and court-ordered settlement amounts ($)</p>
          </div>
          <span className="text-xs bg-slate-50 border border-slate-100 px-3 py-1 rounded-full font-bold text-indigo-600 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Avg timeline: {data.averageSettlementTimeline} Days
          </span>
        </div>

        <div className="my-6">
          <svg viewBox={`0 0 500 ${lineChartHeight + 40}`} className="w-full h-auto">
            {/* Grid Lines */}
            {[0, 0.5, 1].map((pct, i) => {
              const y = 10 + (lineChartHeight - (lineChartHeight * pct));
              return (
                <g key={i}>
                  <line x1="30" y1={y} x2="480" y2={y} stroke="#f8fafc" strokeWidth="1.5" />
                  <text x="0" y={y + 4} className="fill-slate-400 text-[9px] font-bold">
                    ${Math.round((maxRecovered * pct) / 1000)}k
                  </text>
                </g>
              );
            })}

            {/* Calculate SVG Line points */}
            {(() => {
              const points = data.monthlyStats.map((item, idx) => {
                const x = 50 + idx * 76;
                const pct = maxRecovered > 0 ? item.recovered / maxRecovered : 0;
                const y = 10 + lineChartHeight - (pct * lineChartHeight);
                return { x, y, val: item.recovered, month: item.month };
              });

              const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const areaPath = `${linePath} L ${points[points.length - 1].x} ${10 + lineChartHeight} L ${points[0].x} ${10 + lineChartHeight} Z`;

              return (
                <g>
                  {/* Fill area beneath line */}
                  <path d={areaPath} fill="url(#indigoGrad)" opacity="0.1" />
                  
                  {/* Main Line path */}
                  <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
                  
                  {/* Data Point Dots */}
                  {points.map((p, idx) => (
                    <g key={idx} className="group cursor-pointer">
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill="white"
                        stroke="#6366f1"
                        strokeWidth="3"
                        className="transition-all hover:r-7"
                      />
                      {/* Tooltip on hover */}
                      <text x={p.x} y={p.y - 12} textAnchor="middle" className="fill-slate-700 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        ${p.val.toLocaleString()}
                      </text>
                      <text x={p.x} y={15 + lineChartHeight + 15} textAnchor="middle" className="fill-slate-500 text-[10px] font-bold">
                        {p.month}
                      </text>
                    </g>
                  ))}
                  
                  {/* Gradients */}
                  <defs>
                    <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>
      
    </div>
  );
}
