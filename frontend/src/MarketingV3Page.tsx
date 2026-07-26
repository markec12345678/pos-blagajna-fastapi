import React, { useState, useEffect } from 'react';

const MarketingV3Page: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<string>('campaigns');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [campaigns, automations, segments, social, analytics] = await Promise.all([
        fetch('/api/v1/marketing-v2/campaigns').then(r => r.json()),
        fetch('/api/v1/marketing-v2/automations').then(r => r.json()),
        fetch('/api/v1/marketing-v2/segments').then(r => r.json()),
        fetch('/api/v1/marketing-v2/social').then(r => r.json()),
        fetch('/api/v1/marketing-v2/analytics').then(r => r.json()),
      ]);
      setData({ campaigns, automations, segments, social, analytics });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const tabs = [
    { key: 'campaigns', label: 'Kampanje' },
    { key: 'automations', label: 'Avtomatizacije' },
    { key: 'segments', label: 'Segmenti' },
    { key: 'social', label: 'Družbena omrežja' },
    { key: 'analytics', label: 'Analitika' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Marketing V3</h1>
        <button onClick={loadData} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">{loading ? '...' : 'Osveži'}</button>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-violet-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'campaigns' && data.campaigns && (
        <div className="space-y-3">
          {data.campaigns.campaigns?.map((c: any) => (
            <div key={c.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div><p className="font-medium">{c.name}</p><p className="text-sm text-gray-500">{c.type} • Poslano: {c.sent}</p></div>
                <span className={`px-2 py-1 rounded text-xs ${c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-3 text-sm">
                <div>Odpri: {c.open_rate}%</div>
                <div>Klik: {c.click_rate}%</div>
                <div>Konverzije: {c.conversions}</div>
                <div>Odprto: {c.opened}/{c.sent}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'automations' && data.automations && (
        <div className="space-y-3">
          {data.automations.automations?.map((a: any) => (
            <div key={a.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
              <div><p className="font-medium">{a.name}</p><p className="text-sm text-gray-500">Sprožil: {a.trigger} • Akcija: {a.action}</p></div>
              <div className="text-right text-sm">
                <p>Sproženo: {a.triggered}x</p>
                <p className="text-green-600">Konverzije: {a.conversions}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'segments' && data.segments && (
        <div className="space-y-3">
          {data.segments.segments?.map((s: any, i: number) => (
            <div key={i} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div><p className="font-medium">{s.name}</p><p className="text-sm text-gray-500">{s.count} strank • {s.criteria}</p></div>
                <span className="text-sm text-blue-600">{s.avg_open_rate}% odprtost</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Kampanje: {s.campaigns}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'social' && data.social && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Skupni sledilci</p><p className="text-2xl font-bold">{data.social.total_followers}</p></div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Povprečna udeležba</p><p className="text-2xl font-bold">{data.social.avg_engagement}%</p></div>
          </div>
          <div className="space-y-3">
            {data.social.platforms?.map((p: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <p className="font-medium">{p.name}</p>
                <div className="grid grid-cols-4 gap-3 mt-2 text-sm">
                  <div>Sledilci: {p.followers?.toLocaleString()}</div>
                  <div>Udeležba: {p.engagement}%</div>
                  <div>Objave: {p.posts_this_month}</div>
                  <div>Doseg: {p.reach?.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && data.analytics && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200"><p className="text-sm text-purple-600">Doseg</p><p className="text-2xl font-bold">{data.analytics.total_reach?.toLocaleString()}</p></div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Konverzije</p><p className="text-2xl font-bold">{data.analytics.total_conversions}</p></div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">ROI</p><p className="text-2xl font-bold">{data.analytics.roi}x</p></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200"><p className="text-sm text-orange-600">Strošek/akvizicija</p><p className="text-2xl font-bold">€{data.analytics.cost_per_acquisition}</p></div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Po kanalu</h3>
            <div className="space-y-2">
              {data.analytics.by_channel?.map((ch: any, i: number) => (
                <div key={i} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>{ch.channel}</span>
                  <div className="flex gap-4 text-sm">
                    <span>Poslano: {ch.sent}</span>
                    <span>Konverzije: {ch.conversions}</span>
                    <span className="text-green-600">ROI: {ch.roi}x</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingV3Page;
