import React, { useState, useEffect } from 'react';

const ReportsV3Page: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<string>('templates');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templates, scheduled, recent, stats] = await Promise.all([
        fetch('/api/v1/reports-v3/templates').then(r => r.json()),
        fetch('/api/v1/reports-v3/scheduled').then(r => r.json()),
        fetch('/api/v1/reports-v3/recent').then(r => r.json()),
        fetch('/api/v1/reports-v3/stats').then(r => r.json()),
      ]);
      setData({ templates, scheduled, recent, stats });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const tabs = [
    { key: 'templates', label: 'Predloge' },
    { key: 'scheduled', label: 'Načrtovana' },
    { key: 'recent', label: 'Nedavna' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Poročila V3</h1>
        <button onClick={loadData} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">{loading ? '...' : 'Osveži'}</button>
      </div>

      {data.stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200"><p className="text-sm text-teal-600">Predloge</p><p className="text-2xl font-bold">{data.stats.total_templates}</p></div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Načrtovana</p><p className="text-2xl font-bold">{data.stats.active_schedules}</p></div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Generirano ta mesec</p><p className="text-2xl font-bold">{data.stats.reports_generated_this_month}</p></div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200"><p className="text-sm text-purple-600">Zadnje generirano</p><p className="text-lg font-bold">{data.stats.last_generated}</p></div>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-teal-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'templates' && data.templates && (
        <div className="space-y-3">
          {data.templates.templates?.map((t: any) => (
            <div key={t.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
              <div><p className="font-medium">{t.name}</p><p className="text-sm text-gray-500">{t.description}</p></div>
              <div className="text-right text-sm">
                <span className="px-2 py-1 bg-gray-100 rounded text-xs">{t.frequency}</span>
                <p className="text-gray-500 mt-1">Zadnji: {t.last_run}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'scheduled' && data.scheduled && (
        <div className="space-y-3">
          {data.scheduled.scheduled?.map((s: any) => (
            <div key={s.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div><p className="font-medium">{s.template}</p><p className="text-sm text-gray-500">{s.frequency} • Format: {s.format}</p></div>
                <span className={`px-2 py-1 rounded text-xs ${s.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{s.active ? 'Aktivno' : 'Neaktivno'}</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>Naslednji: {s.next_run}</p>
                <p>Prejemniki: {s.recipients.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'recent' && data.recent && (
        <div className="space-y-3">
          {data.recent.reports?.map((r: any) => (
            <div key={r.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
              <div><p className="font-medium">{r.name}</p><p className="text-sm text-gray-500">{r.generated_by} • {r.generated}</p></div>
              <div className="text-right text-sm">
                <span className="px-2 py-1 bg-gray-100 rounded text-xs uppercase">{r.format}</span>
                <p className="text-gray-500 mt-1">{r.size}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsV3Page;
