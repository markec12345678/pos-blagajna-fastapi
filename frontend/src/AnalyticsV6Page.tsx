import React, { useState, useEffect } from 'react';

const AnalyticsV6Page: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<string>('realtime');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [realtime, behavior, revenue, menu, segments, insights] = await Promise.all([
        fetch('/api/v1/analytics-v6/realtime-dashboard').then(r => r.json()),
        fetch('/api/v1/analytics-v6/customer-behavior').then(r => r.json()),
        fetch('/api/v1/analytics-v6/revenue-analytics').then(r => r.json()),
        fetch('/api/v1/analytics-v6/menu-analytics-deep').then(r => r.json()),
        fetch('/api/v1/analytics-v6/customer-segments-deep').then(r => r.json()),
        fetch('/api/v1/analytics-v6/predictive-insights').then(r => r.json()),
      ]);
      setData({ realtime, behavior, revenue, menu, segments, insights });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const tabs = [
    { key: 'realtime', label: 'V živo' },
    { key: 'behavior', label: 'Vedenje strank' },
    { key: 'revenue', label: 'Prihodki' },
    { key: 'menu', label: 'Meni' },
    { key: 'segments', label: 'Segmenti' },
    { key: 'insights', label: 'Napovedi' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Analitika V6</h1>
        <button onClick={loadData} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{loading ? '...' : 'Osveži'}</button>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'realtime' && data.realtime && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Naročila ta uro</p><p className="text-2xl font-bold">{data.realtime.current_hour_orders}</p></div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Prihodek ta uro</p><p className="text-2xl font-bold">€{data.realtime.current_hour_revenue}</p></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200"><p className="text-sm text-orange-600">Aktivne mize</p><p className="text-2xl font-bold">{data.realtime.active_tables}</p></div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200"><p className="text-sm text-purple-600">Čakanje v kuhinji</p><p className="text-2xl font-bold">{data.realtime.avg_wait_time} min</p></div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Napotki v živo</h3>
            <div className="space-y-2">
              {data.realtime.live_feed?.map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <span className="text-xs text-gray-500 font-mono">{e.time}</span>
                  <span className="text-sm">{e.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'behavior' && data.behavior && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-teal-50 p-4 rounded-lg border border-teal-200"><p className="text-sm text-teal-600">Odbijanje</p><p className="text-2xl font-bold">{data.behavior.bounce_rate}%</p></div>
            <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200"><p className="text-sm text-cyan-600">Povprečno trajanje</p><p className="text-2xl font-bold">{data.behavior.avg_session_duration} min</p></div>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200"><p className="text-sm text-indigo-600">Strani na sejo</p><p className="text-2xl font-bold">{data.behavior.pages_per_session}</p></div>
          </div>
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-3">Poti strank</h3>
            <div className="space-y-2">
              {data.behavior.paths?.map((p: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded border">
                  <p className="font-medium">{p.path}</p>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                    <span>Ogledi: {p.count}</span>
                    <span>Konverzija: {p.conversion}</span>
                    <span>Čas: {p.avg_time} min</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Naprava</h3>
            <div className="flex gap-4">
              {Object.entries(data.behavior.device_split || {}).map(([k, v]) => (
                <div key={k} className="flex-1 text-center p-3 bg-gray-50 rounded">
                  <p className="text-2xl font-bold">{v as number}%</p>
                  <p className="text-sm text-gray-500 capitalize">{k === 'mobile' ? 'Mobilni' : k === 'desktop' ? 'Namizni' : 'Tablični'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && data.revenue && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Danes</p><p className="text-2xl font-bold">€{data.revenue.today?.total}</p></div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Tedensko</p><p className="text-2xl font-bold">€{data.revenue.weekly_trend?.reduce((s: number, d: any) => s + d.total, 0)?.toLocaleString()}</p></div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200"><p className="text-sm text-purple-600">Rast Y/Y</p><p className="text-2xl font-bold">+{data.revenue.yoy_growth}%</p></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200"><p className="text-sm text-orange-600">Povprečen dnevni</p><p className="text-2xl font-bold">€{data.revenue.avg_daily}</p></div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Tedenski trend</h3>
            <div className="space-y-2">
              {data.revenue.weekly_trend?.map((d: any) => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-medium">{d.day}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className="h-4 rounded-full bg-green-500" style={{ width: `${(d.total / 7000) * 100}%` }}></div>
                  </div>
                  <span className="w-16 text-sm text-right">€{d.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'menu' && data.menu && (
        <div>
          <div className="space-y-2">
            {data.menu.top_items?.map((item: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-sm font-bold">{i + 1}</span>
                  <div><p className="font-medium">{item.item}</p><p className="text-xs text-gray-500">{item.orders} naročil • {item.margin}% marža</p></div>
                </div>
                <div className="text-right">
                  <p className="font-bold">€{item.revenue.toLocaleString()}</p>
                  <span className={`text-xs ${item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>{item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'}</span>
                </div>
              </div>
            ))}
          </div>
          {data.menu.price_sensitivity && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
              <p className="text-sm text-yellow-600 font-medium">Občutljivost na ceno</p>
              <p className="text-sm text-gray-600">Elastičnost: {data.menu.price_sensitivity.elasticity} • Optimalno zvišanje: {data.menu.price_sensitivity.optimal_increase}% • Vpliv: {data.menu.price_sensitivity.projected_impact}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'segments' && data.segments && (
        <div className="space-y-3">
          {data.segments.segments?.map((s: any, i: number) => (
            <div key={i} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div><p className="font-medium">{s.name}</p><p className="text-sm text-gray-500">{s.count} strank • Povprečna poraba: €{s.avg_spend} • Obiski: {s.visit_freq}/mesec</p></div>
                <span className={`px-2 py-1 rounded text-xs ${s.value === 'Zelo visoka' ? 'bg-green-100 text-green-800' : s.value === 'Visoka' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>{s.value}</span>
              </div>
              <div className="mt-2 flex gap-2 text-xs text-gray-500">
                <span>Predmeti: {s.preferred_items.join(', ')}</span>
                <span>•</span>
                <span>Kanali: {s.channels.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'insights' && data.insights && (
        <div className="space-y-3">
          {data.insights.insights?.map((ins: any, i: number) => (
            <div key={i} className={`border rounded-lg p-4 ${ins.type === 'Demand' ? 'bg-blue-50 border-blue-200' : ins.type === 'Churn' ? 'bg-red-50 border-red-200' : ins.type === 'Menu' ? 'bg-green-50 border-green-200' : ins.type === 'Revenue' ? 'bg-purple-50 border-purple-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex justify-between items-start">
                <div><p className="font-medium">{ins.type}</p><p className="text-sm text-gray-600">{ins.insight}</p></div>
                <span className="text-xs text-gray-500">{(ins.confidence * 100).toFixed(0)}% zaupanje</span>
              </div>
              <p className="text-sm text-blue-600 mt-2">Dejanje: {ins.action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalyticsV6Page;
