import React, { useState, useEffect } from 'react';

const FinanceV6Page: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<string>('cashflow');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cashflow, tax, centers, investments, analysis, debts] = await Promise.all([
        fetch('/api/v1/finance-v6/cash-flow').then(r => r.json()),
        fetch('/api/v1/finance-v6/tax-reporting').then(r => r.json()),
        fetch('/api/v1/finance-v6/profit-centers').then(r => r.json()),
        fetch('/api/v1/finance-v6/investment-tracker').then(r => r.json()),
        fetch('/api/v1/finance-v6/cost-analysis').then(r => r.json()),
        fetch('/api/v1/finance-v6/debt-management').then(r => r.json()),
      ]);
      setData({ cashflow, tax, centers, investments, analysis, debts });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const tabs = [
    { key: 'cashflow', label: 'Denarni tok' },
    { key: 'tax', label: 'Davki' },
    { key: 'centers', label: 'Dobičkovna središča' },
    { key: 'investments', label: 'Naložbe' },
    { key: 'analysis', label: 'Analiza stroškov' },
    { key: 'debts', label: 'Dolgovi' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Finance V6</h1>
        <button onClick={loadData} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{loading ? '...' : 'Osveži'}</button>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'cashflow' && data.cashflow && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Trenutno stanje</p><p className="text-2xl font-bold">€{data.cashflow.cash_flow?.current_balance?.toLocaleString()}</p></div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Mesecni priliv</p><p className="text-2xl font-bold">€{data.cashflow.cash_flow?.inflows?.month?.toLocaleString()}</p></div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200"><p className="text-sm text-red-600">Mesecni odliv</p><p className="text-2xl font-bold">€{data.cashflow.cash_flow?.outflows?.month?.toLocaleString()}</p></div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200"><p className="text-sm text-purple-600">30-dnevna napoved</p><p className="text-2xl font-bold">€{data.cashflow.cash_flow?.projection_30_days?.toLocaleString()}</p></div>
          </div>
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-3">Opozorila</h3>
            <div className="space-y-2">
              {data.cashflow.cash_flow?.alerts?.map((a: any, i: number) => (
                <div key={i} className={`p-3 rounded border ${a.type === 'positive' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <p className="text-sm">{a.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tax' && data.tax && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">DDV za plačilo</p><p className="text-2xl font-bold">€{data.tax.tax?.vat_balance?.toLocaleString()}</p></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200"><p className="text-sm text-orange-600">Ocenjeni davek</p><p className="text-2xl font-bold">€{data.tax.tax?.estimated_tax?.toLocaleString()}</p></div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Davčna osnova</p><p className="text-2xl font-bold">€{data.tax.tax?.taxable_income?.toLocaleString()}</p></div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium mb-3">Odbitki</h3>
            <div className="space-y-2">
              {data.tax.tax?.deductions_claimed?.map((d: any, i: number) => (
                <div key={i} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>{d.category}</span>
                  <div className="flex gap-4">
                    <span className="font-medium">€{d.amount.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">{d.documentation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'centers' && data.centers && (
        <div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
            <p className="text-sm text-green-600">Skupni prihodek: €{data.centers.total_revenue?.toLocaleString()} • Skupni prispevek: €{data.centers.total_contribution?.toLocaleString()} • Skupna marža: {data.centers.overall_margin}%</p>
          </div>
          <div className="space-y-3">
            {data.centers.centers?.map((c: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <p className="font-medium">{c.name}</p>
                  <span className={`text-sm font-bold ${c.trend === 'up' ? 'text-green-600' : 'text-gray-500'}`}>{c.trend === 'up' ? '↑' : '→'} {c.margin}%</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2 text-sm">
                  <div>Prihodek: €{c.revenue.toLocaleString()}</div>
                  <div>Stroški: €{c.direct_costs.toLocaleString()}</div>
                  <div>Prispevek: €{c.contribution.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'investments' && data.investments && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Skupno vloženo</p><p className="text-2xl font-bold">€{data.investments.total_invested?.toLocaleString()}</p></div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Mesečni prihranki</p><p className="text-2xl font-bold">€{data.investments.total_monthly_savings}</p></div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200"><p className="text-sm text-purple-600">Povprečna vračila</p><p className="text-2xl font-bold">{data.investments.avg_payback} mesecev</p></div>
          </div>
          <div className="space-y-3">
            {data.investments.investments?.map((inv: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <p className="font-medium">{inv.name}</p>
                  <span className={`px-2 py-1 rounded text-xs ${inv.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{inv.status}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                  <div>Vloženo: €{inv.invested.toLocaleString()}</div>
                  <div>Mesečni prihranek: €{inv.monthly_savings}</div>
                  <div>Vračilo: {inv.payback_months} mesecev</div>
                  <div>ROI YTD: {inv.roi_ytd}%</div>
                </div>
                <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, inv.roi_ytd)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analysis' && data.analysis && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-medium mb-3">Fiksni stroški: €{data.analysis.analysis?.total_fixed?.toLocaleString()}</h3>
              <div className="space-y-2">
                {data.analysis.analysis?.fixed_costs?.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{c.item}</span>
                    <span>€{c.amount} ({c.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-medium mb-3">Spremenljivi stroški: €{data.analysis.analysis?.total_variable?.toLocaleString()}</h3>
              <div className="space-y-2">
                {data.analysis.analysis?.variable_costs?.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{c.item}</span>
                    <span>€{c.amount} ({c.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-600 font-medium">Break-even: €{data.analysis.analysis?.breakeven_revenue?.toLocaleString()}/mesec • Trenutni rob nad break-even: {data.analysis.analysis?.margin_above_breakeven}%</p>
          </div>
        </div>
      )}

      {activeTab === 'debts' && data.debts && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200"><p className="text-sm text-red-600">Skupni dolg</p><p className="text-2xl font-bold">€{data.debts.total_remaining?.toLocaleString()}</p></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200"><p className="text-sm text-orange-600">Mesečna obroka</p><p className="text-2xl font-bold">€{data.debts.monthly_debt_service}</p></div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Tveganje</p><p className="text-2xl font-bold">{data.debts.risk_level}</p></div>
          </div>
          <div className="space-y-3">
            {data.debts.debts?.map((d: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <p className="font-medium">{d.name}</p>
                <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                  <div>Ostanek: €{d.remaining.toLocaleString()}</div>
                  <div>Obrok: €{d.monthly_payment}</div>
                  <div>Obrestna mera: {d.interest_rate}%</div>
                  <div>Odplačilo: {d.payoff_date}</div>
                </div>
                <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${((d.original - d.remaining) / d.original) * 100}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Plačano: {(((d.original - d.remaining) / d.original) * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceV6Page;
