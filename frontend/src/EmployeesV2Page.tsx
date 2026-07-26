import React, { useState, useEffect } from 'react';

const EmployeesV2Page: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<string>('performance');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [perf, goals, feedback, training, engagement, comp, stats] = await Promise.all([
        fetch('/api/v1/employees/performance').then(r => r.json()),
        fetch('/api/v1/employees/goals').then(r => r.json()),
        fetch('/api/v1/employees/feedback').then(r => r.json()),
        fetch('/api/v1/employees/training').then(r => r.json()),
        fetch('/api/v1/employees/engagement').then(r => r.json()),
        fetch('/api/v1/employees/compensation').then(r => r.json()),
        fetch('/api/v1/employees/stats').then(r => r.json()),
      ]);
      setData({ perf, goals, feedback, training, engagement, comp, stats });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const tabs = [
    { key: 'performance', label: 'Uspešnost' },
    { key: 'goals', label: 'Cilji' },
    { key: 'feedback', label: 'Povratne informacije' },
    { key: 'training', label: 'Usposabljanje' },
    { key: 'engagement', label: 'Vpletenost' },
    { key: 'compensation', label: 'Plače' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Zaposleni V2</h1>
        <button onClick={loadData} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{loading ? '...' : 'Osveži'}</button>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'performance' && data.perf && (
        <div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 mb-6">
            <p className="text-sm text-indigo-600">Povprečna ocena</p>
            <p className="text-2xl font-bold">{data.perf.avg_score}</p>
          </div>
          <div className="space-y-4">
            {data.perf.employees?.map((e: any) => (
              <div key={e.id} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div><p className="font-medium">{e.name}</p><p className="text-sm text-gray-500">{e.role}</p></div>
                  <span className="text-2xl font-bold text-indigo-600">{e.score}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {Object.entries(e.metrics || {}).map(([k, v]) => (
                    <div key={k} className="text-sm">
                      <p className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</p>
                      <p className="font-medium">{typeof v === 'number' && v > 100 ? v.toLocaleString() : String(v)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-4 text-xs text-gray-500">
                  <span>Prisotnost: {e.attendance.present}/{e.attendance.present + e.attendance.absent}</span>
                  <span>Zamude: {e.attendance.late}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'goals' && data.goals && (
        <div className="space-y-3">
          {data.goals.goals?.map((g: any) => (
            <div key={g.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div><p className="font-medium">{g.title}</p><p className="text-sm text-gray-500">{g.employee} • Rok: {g.deadline}</p></div>
                <span className={`px-2 py-1 rounded text-xs ${g.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{g.status}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1"><span>Napredek</span><span>{g.progress}%</span></div>
                <div className="bg-gray-100 rounded-full h-3 overflow-hidden"><div className="bg-indigo-500 h-3 rounded-full" style={{ width: `${g.progress}%` }}></div></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{g.current_value}/{g.target_value}{g.unit}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'feedback' && data.feedback && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Pozitivne</p><p className="text-2xl font-bold">{data.feedback.positive}</p></div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200"><p className="text-sm text-yellow-600">Konstruktivne</p><p className="text-2xl font-bold">{data.feedback.constructive}</p></div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Skupaj</p><p className="text-2xl font-bold">{data.feedback.total}</p></div>
          </div>
          <div className="space-y-3">
            {data.feedback.feedback?.map((f: any) => (
              <div key={f.id} className={`border rounded-lg p-4 ${f.type === 'positive' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex justify-between items-start">
                  <div><p className="font-medium">{f.employee}</p><p className="text-sm text-gray-600">{f.message}</p></div>
                  <span className="text-xs text-gray-500">{f.date}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{f.is_anonymous ? 'Anonimno' : `Od: ${f.from}`} • {f.category}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'training' && data.training && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Skupna usposobljenost</p><p className="text-2xl font-bold">{data.training.overall_completion}%</p></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200"><p className="text-sm text-orange-600">Prihajajoča usposabljanja</p><p className="text-2xl font-bold">{data.training.upcoming_trainings}</p></div>
          </div>
          <div className="space-y-3">
            {data.training.employees?.map((e: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <p className="font-medium">{e.name}</p>
                  <span className="text-sm text-indigo-600">{e.completion_rate}%</span>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-green-600">Dokončano: {e.completed_trainings.join(', ')}</p>
                  <p className="text-xs text-blue-600">V teku: {e.in_progress.join(', ')}</p>
                </div>
                <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${e.completion_rate}%` }}></div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'engagement' && data.engagement && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200"><p className="text-sm text-purple-600">Vpletenost</p><p className="text-2xl font-bold">{data.engagement.engagement_score}%</p></div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200"><p className="text-sm text-red-600">Odliv</p><p className="text-2xl font-bold">{data.engagement.turnover_rate}%</p></div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Povprečna doba</p><p className="text-2xl font-bold">{data.engagement.avg_tenure_months} mesecev</p></div>
          </div>
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-3">Rezultati ankete</h3>
            <div className="space-y-2">
              {Object.entries(data.engagement.survey_results || {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-40 text-sm capitalize">{k.replace(/_/g, ' ')}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden"><div className="bg-purple-500 h-3 rounded-full" style={{ width: `${((v as number) / 5) * 100}%` }}></div></div>
                  <span className="text-sm font-medium">{String(v)}/5</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-2">Priporočila</h3>
            <ul className="text-sm text-gray-600 space-y-1">{data.engagement.recommendations?.map((r: string, i: number) => <li key={i}>• {r}</li>)}</ul>
          </div>
        </div>
      )}

      {activeTab === 'compensation' && data.comp && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Skupne plače</p><p className="text-2xl font-bold">€{data.comp.total_monthly_payroll?.toLocaleString()}</p></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200"><p className="text-sm text-orange-600">Nadure</p><p className="text-2xl font-bold">€{data.comp.overtime_cost}</p></div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Ugodnosti</p><p className="text-2xl font-bold">€{data.comp.benefits_cost}</p></div>
          </div>
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-3">Po vlogi</h3>
            <div className="space-y-2">
              {data.comp.by_role?.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">{r.role}</span>
                  <div className="flex gap-4 text-sm">
                    <span>Povprečje: €{r.avg_salary}</span>
                    <span>Trg: €{r.market_avg}</span>
                    <span className={r.difference > 0 ? 'text-green-600' : 'text-red-600'}>{r.difference > 0 ? '+' : ''}{r.difference}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-2">Insights</h3>
            <ul className="text-sm text-gray-600 space-y-1">{data.comp.insights?.map((ins: string, i: number) => <li key={i}>• {ins}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesV2Page;
