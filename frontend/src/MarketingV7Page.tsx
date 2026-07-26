import React, { useState, useEffect } from 'react';

interface Translations { [key: string]: string }

const lang = localStorage.getItem('lang') || 'sl';
const translations: Translations = {
  'marketing-v7.title': { sl: 'Marketing V7', en: 'Marketing V7' }[lang] || 'Marketing V7',
  'marketing-v7.tab-influencer': { sl: 'Influencerji', en: 'Influencers' }[lang] || 'Influencerji',
  'marketing-v7.tab-geofencing': { sl: 'Geolokacija', en: 'Geofencing' }[lang] || 'Geolokacija',
  'marketing-v7.tab-push': { sl: 'Potisna obvestila', en: 'Push Notifications' }[lang] || 'Potisna obvestila',
  'marketing-v7.tab-scoring': { sl: 'Zvestoba', en: 'Loyalty Scoring' }[lang] || 'Zvestoba',
  'marketing-v7.tab-ab': { sl: 'A/B testiranje', en: 'A/B Testing' }[lang] || 'A/B testiranje',
  'marketing-v7.tab-funnel': { sl: 'Sprememba', en: 'Conversion Funnel' }[lang] || 'Sprememba',
};

function t(key: string): string { return translations[key] || key; }

const MarketingV7Page: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<string>('influencer');
  const [influencerData, setInfluencerData] = useState<any>(null);
  const [geofencingData, setGeofencingData] = useState<any>(null);
  const [pushData, setPushData] = useState<any>(null);
  const [scoringData, setScoringData] = useState<any>(null);
  const [abData, setAbData] = useState<any>(null);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inf, geo, push, score, ab, funnel] = await Promise.all([
        fetch('/api/v1/marketing-v7/influencer-campaigns').then(r => r.json()),
        fetch('/api/v1/marketing-v7/geofencing').then(r => r.json()),
        fetch('/api/v1/marketing-v7/push-notifications').then(r => r.json()),
        fetch('/api/v1/marketing-v7/loyalty-scoring').then(r => r.json()),
        fetch('/api/v1/marketing-v7/ab-test-advanced').then(r => r.json()),
        fetch('/api/v1/marketing-v7/conversion-funnel').then(r => r.json()),
      ]);
      setInfluencerData(inf); setGeofencingData(geo); setPushData(push);
      setScoringData(score); setAbData(ab); setFunnelData(funnel);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const tabs = [
    { key: 'influencer', label: t('marketing-v7.tab-influencer') },
    { key: 'geofencing', label: t('marketing-v7.tab-geofencing') },
    { key: 'push', label: t('marketing-v7.tab-push') },
    { key: 'scoring', label: t('marketing-v7.tab-scoring') },
    { key: 'ab', label: t('marketing-v7.tab-ab') },
    { key: 'funnel', label: t('marketing-v7.tab-funnel') },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('marketing-v7.title')}</h1>
        <button onClick={loadData} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">{loading ? '...' : 'Osveži'}</button>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-orange-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'influencer' && influencerData && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200"><p className="text-sm text-pink-600">Skupni doseg</p><p className="text-2xl font-bold">{influencerData.total_reach?.toLocaleString()}</p></div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200"><p className="text-sm text-purple-600">Skupne konverzije</p><p className="text-2xl font-bold">{influencerData.total_conversions}</p></div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Povprečni ROI</p><p className="text-2xl font-bold">{influencerData.avg_roi}%</p></div>
          </div>
          <div className="space-y-3">
            {influencerData.campaigns?.map((c: any) => (
              <div key={c.id} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div><p className="font-medium">{c.influencer}</p><p className="text-sm text-gray-500">{c.platform} • {c.followers?.toLocaleString()} sledilcev • {c.content_type}</p></div>
                  <span className={`px-2 py-1 rounded text-xs ${c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div><p className="text-xs text-gray-500">Doseg</p><p className="font-medium">{c.reach?.toLocaleString()}</p></div>
                  <div><p className="text-xs text-gray-500">Udeležba</p><p className="font-medium">{c.engagement}%</p></div>
                  <div><p className="text-xs text-gray-500">Konverzije</p><p className="font-medium">{c.conversions}</p></div>
                  <div><p className="text-xs text-gray-500">ROI</p><p className="font-medium text-green-600">{c.roi}%</p></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">Kampanja: {c.campaign} • Strošek: €{c.cost}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'geofencing' && geofencingData && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200"><p className="text-sm text-indigo-600">Vpisi</p><p className="text-2xl font-bold">{geofencingData.geofencing?.total_impressions?.toLocaleString()}</p></div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><p className="text-sm text-blue-600">Kliki</p><p className="text-2xl font-bold">{geofencingData.geofencing?.total_clicks}</p></div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Konverzije</p><p className="text-2xl font-bold">{geofencingData.geofencing?.total_conversions}</p></div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200"><p className="text-sm text-orange-600">Strošek/konverzijo</p><p className="text-2xl font-bold">€{geofencingData.geofencing?.cost_per_conversion}</p></div>
          </div>
          <div className="space-y-3">
            {geofencingData.geofencing?.active_zones?.map((z: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <p className="font-medium">{z.name}</p>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{z.radius_m}m polmer</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div><p className="text-xs text-gray-500">Obiskovalci danes</p><p className="font-medium">{z.visitors_today}</p></div>
                  <div><p className="text-xs text-gray-500">Konverzije</p><p className="font-medium">{z.conversions}</p></div>
                  <div><p className="text-xs text-gray-500">Stopnja konverzije</p><p className="font-medium text-green-600">{z.conversion_rate}%</p></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">Strošek: €{z.spend}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'push' && pushData && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200"><p className="text-sm text-cyan-600">Skupno poslano</p><p className="text-2xl font-bold">{pushData.total_sent}</p></div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200"><p className="text-sm text-green-600">Povprečna odprtost</p><p className="text-2xl font-bold">{pushData.avg_open_rate}%</p></div>
          </div>
          <div className="space-y-3">
            {pushData.notifications?.map((n: any) => (
              <div key={n.id} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div><p className="font-medium">{n.title}</p><p className="text-sm text-gray-500">{n.body}</p></div>
                  <span className="text-xs text-gray-400">{n.scheduled}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div><p className="text-xs text-gray-500">Poslano</p><p className="font-medium">{n.sent}</p></div>
                  <div><p className="text-xs text-gray-500">Odprto</p><p className="font-medium">{n.opened} ({n.open_rate}%)</p></div>
                  <div><p className="text-xs text-gray-500">Kliknjeno</p><p className="font-medium">{n.clicked}</p></div>
                  <div><p className="text-xs text-gray-500">Konverzija</p><p className="font-medium text-green-600">{n.conversion}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'scoring' && scoringData && (
        <div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-6">
            <p className="text-sm text-purple-600">Model</p>
            <p className="text-2xl font-bold">{scoringData.scoring?.model}</p>
            <p className="text-sm text-gray-500">Natančnost: {scoringData.scoring?.accuracy}%</p>
          </div>
          <div className="space-y-3">
            {scoringData.scoring?.segments?.map((s: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div><p className="font-medium">{s.segment}</p><p className="text-sm text-gray-500">{s.count} strank • Točke: {s.score_range}</p></div>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">{s.characteristics}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Marketinška strategija: {s.marketing}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ab' && abData && (
        <div className="space-y-3">
          {abData.tests?.map((test: any) => (
            <div key={test.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <p className="font-medium">{test.name}</p>
                <span className={`px-2 py-1 rounded text-xs ${test.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{test.status}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                {test.variants?.map((v: any, i: number) => (
                  <div key={i} className={`p-2 rounded border ${test.winner === v.name ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <p className="text-sm font-medium">{v.name} {test.winner === v.name && '✓'}</p>
                    <p className="text-xs text-gray-500">{v.conversions || v.open_rate || v.conversion}%</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Zaupanje: {test.confidence}%</span>
                <span>Dvig: {test.lift ? `${test.lift}%` : '...'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'funnel' && funnelData && (
        <div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
            <p className="text-sm text-blue-600">Skupna konverzija</p>
            <p className="text-2xl font-bold">{funnelData.overall_conversion}%</p>
            <p className="text-sm text-orange-600">Največji padec: {funnelData.biggest_drop}</p>
          </div>
          <div className="space-y-2">
            {funnelData.funnel?.map((stage: any, i: number) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-bold">{i + 1}</div>
                    <p className="font-medium">{stage.stage}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{stage.count.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{stage.percentage}%</p>
                  </div>
                </div>
                <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${stage.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingV7Page;
