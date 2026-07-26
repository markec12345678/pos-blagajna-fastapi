import React, { useState, useEffect } from 'react';

const MenuV7Page: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<string>('pricing');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pricing, perf, allergens, recipes, digital, subs] = await Promise.all([
        fetch('/api/v1/menu-v7/dynamic-pricing').then(r => r.json()),
        fetch('/api/v1/menu-v7/menu-performance-deep').then(r => r.json()),
        fetch('/api/v1/menu-v7/allergen-management').then(r => r.json()),
        fetch('/api/v1/menu-v7/recipe-optimization').then(r => r.json()),
        fetch('/api/v1/menu-v7/digital-menu').then(r => r.json()),
        fetch('/api/v1/menu-v7/ingredient-substitution').then(r => r.json()),
      ]);
      setData({ pricing, perf, allergens, recipes, digital, subs });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const tabs = [
    { key: 'pricing', label: 'Dinamično cenjenje' },
    { key: 'perf', label: 'Uspešnost' },
    { key: 'allergens', label: 'Alergeni' },
    { key: 'recipes', label: 'Optimizacija' },
    { key: 'digital', label: 'Digitalni meni' },
    { key: 'subs', label: 'Nadomestki' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Meni V7</h1>
        <button onClick={loadData} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{loading ? '...' : 'Osveži'}</button>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'pricing' && data.pricing && (
        <div>
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 mb-6">
            <p className="text-sm text-emerald-600">Skupni vpliv</p>
            <p className="text-2xl font-bold">€{data.pricing.total_impact} • Povprečen popust: {data.pricing.avg_discount}%</p>
          </div>
          <div className="space-y-3">
            {data.pricing.rules?.map((r: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-sm text-gray-500">Pogoj: {r.condition} • Artikli: {r.items.join(', ')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-orange-600">{r.discount_pct || r.surcharge_pct}% {r.discount_pct ? 'popust' : 'doplačilo'}</span>
                  <span className={`px-2 py-1 rounded text-xs ${r.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{r.active ? 'Aktivno' : 'Neaktivno'}</span>
                  <span className="text-sm text-green-600">+€{r.revenue_impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'perf' && data.perf && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {['Star', 'Puzzle', 'Dog'].map(q => (
              <div key={q} className={`p-3 rounded-lg border ${q === 'Star' ? 'bg-green-50 border-green-200' : q === 'Puzzle' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                <p className="font-medium">{q}</p>
                <p className="text-sm text-gray-600">{data.perf.performance?.filter((p: any) => p.quadrant === q).length} artiklov</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {data.perf.performance?.map((item: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.item}</p>
                    <p className="text-xs text-gray-500">{item.category} • {item.quadrant}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>Priljubljenost: {item.popularity_score}</span>
                    <span>Donosnost: {item.profitability_score}</span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-1">{item.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'allergens' && data.allergens && (
        <div>
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-3">Artikli z alergeni: {data.allergens.allergens?.items_with_allergens}</h3>
            <div className="space-y-2">
              {data.allergens.allergens?.allergen_distribution?.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-32 text-sm">{a.allergen}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${a.percentage}%` }}></div>
                  </div>
                  <span className="text-sm">{a.items} ({a.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Možnosti nadomestkov</h3>
            <div className="space-y-2">
              {data.allergens.allergens?.substitution_options?.map((s: any, i: number) => (
                <div key={i} className="p-2 bg-gray-50 rounded border">
                  <p className="text-sm"><span className="font-medium">{s.original}</span> → {s.substitute}</p>
                  <p className="text-xs text-orange-600">Povečanje stroška: +€{s.cost_increase}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recipes' && data.recipes && (
        <div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
            <p className="text-sm text-green-600">Skupni letni prihranki</p>
            <p className="text-2xl font-bold">€{data.recipes.total_annual_savings}</p>
          </div>
          <div className="space-y-3">
            {data.recipes.optimizations?.map((opt: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <p className="font-medium">{opt.item}</p>
                  <span className="text-sm text-green-600 font-bold">€{opt.savings}/kos</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>Trenutni strošek: €{opt.current_cost}</div>
                  <div>Optimiziran: €{opt.optimized_cost}</div>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Spremembe:</p>
                  <ul className="text-xs text-gray-600 list-disc pl-4">{opt.changes?.map((c: string, j: number) => <li key={j}>{c}</li>)}</ul>
                </div>
                <p className="text-xs text-gray-500 mt-1">Vpliv na kakovost: {opt.quality_impact} • Letni prihranek: €{opt.annual_savings}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'digital' && data.digital && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">QR skeni danes</p><p className="text-2xl font-bold">{data.digital.digital_menu?.qr_scans_today}</p></div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Spletni ogledi</p><p className="text-2xl font-bold">{data.digital.digital_menu?.online_views}</p></div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200"><p className="text-sm text-purple-600">Stopnja konverzije</p><p className="text-2xl font-bold">{data.digital.digital_menu?.conversion_rate}%</p></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200"><p className="text-sm text-orange-600">Mobilni delež</p><p className="text-2xl font-bold">{data.digital.digital_menu?.mobile_share}%</p></div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Najbolj gledani artikli</h3>
            <div className="space-y-2">
              {data.digital.digital_menu?.top_viewed_items?.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">{item.item}</span>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Ogledi: {item.views}</span>
                    <span>Naročila: {item.orders}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subs' && data.subs && (
        <div className="space-y-3">
          {data.subs.substitutions?.map((s: any, i: number) => (
            <div key={i} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{s.original} → {s.alternative}</p>
                  <p className="text-sm text-gray-500">Artikli: {s.items_affected.join(', ')}</p>
                </div>
                <span className="text-sm font-bold text-green-600">€{s.cost_diff}/kos</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Vpliv na kakovost: {s.quality_diff}</p>
            </div>
          ))}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-600">Skupni potencialni prihranki</p>
            <p className="text-2xl font-bold">€{data.subs.total_potential_savings}/kos</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuV7Page;
