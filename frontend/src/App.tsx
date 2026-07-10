import { useState, useEffect } from 'react'
import * as api from './api'
import POS from './POS'
import KDS from './KDS'
import Dashboard from './Dashboard'
import Inventory from './Inventory'
import CustomerMenu from './CustomerMenu'
import WaitlistPage from './WaitlistPage'
import RecipeOptimizerPage from './RecipeOptimizerPage'
import ComboPage from './ComboPage'
import TablePayPage from './TablePayPage'
import Analytics from './Analytics'
import MenuEditor from './MenuEditor'
import SettingsPage from './Settings'
import ZReport from './ZReport'
import UsersPage from './UsersPage'
import BackupPage from './BackupPage'
import TablesPage from './TablesPage'
import AuditLogPage from './AuditLogPage'
import CashRegisterPage from './CashRegisterPage'
import SuppliersPage from './SuppliersPage'
import ReservationsPage from './ReservationsPage'
import ShiftsPage from './ShiftsPage'
import VariancePage from './VariancePage'
import GiftCardsPage from './GiftCardsPage'
import BranchesPage from './BranchesPage'
import QRCodePage from './QRCodePage'
import MenuVersionsPage from './MenuVersionsPage'
import BranchComparison from './BranchComparison'
import OfflineIndicator from './OfflineIndicator'
import ScheduledOrdersPage from './ScheduledOrdersPage'
import CustomerOrderDisplay from './CustomerOrderDisplay'
import MenuBoard from './MenuBoard'
import TimeClockPage from './TimeClockPage'
import CustomerFeedback from './CustomerFeedback'
import ReviewWall from './ReviewWall'
import NotificationsBell from './NotificationsBell'
import ReceiptsPage from './ReceiptsPage'
import CustomersPage from './CustomersPage'
import ModifiersPage from './ModifiersPage'
import CoursesPage from './CoursesPage'
import OrderHistoryPage from './OrderHistoryPage'
import StocktakingPage from './StocktakingPage'
import PromotionsPage from './PromotionsPage'
import PopularityPage from './PopularityPage'
import RatingsPage from './RatingsPage'
import LoyaltyPage from './LoyaltyPage'
import MarketingPage from './MarketingPage'
import CateringPage from './CateringPage'
import InvoicesPage from './InvoicesPage'
import KdsAnalyticsPage from './KdsAnalyticsPage'
import EmployeePerformance from './EmployeePerformance'
import FoodCostPage from './FoodCostPage'
import MenuEngineeringPage from './MenuEngineeringPage'
import LaborCostPage from './LaborCostPage'
import ProfitLossPage from './ProfitLossPage'
import WastePage from './WastePage'
import ExportPage from './ExportPage'
import SalesForecastPage from './SalesForecastPage'
import YoYComparisonPage from './YoYComparisonPage'
import ExpensesPage from './ExpensesPage'
import RFMPage from './RFMPage'
import InventoryForecastPage from './InventoryForecastPage'
import BudgetPage from './BudgetPage'
import SchedulePage from './SchedulePage'
import PriceRulesPage from './PriceRulesPage'
import LoyaltyTiersPage from './LoyaltyTiersPage'
import OrderTemplatesPage from './OrderTemplatesPage'
import OrderMergePage from './OrderMergePage'
import ImportPage from './ImportPage'
import SystemHealthPage from './SystemHealthPage'
import MediaLibraryPage from './MediaLibraryPage'
import PrepListPage from './PrepListPage'
import RecipeScalePage from './RecipeScalePage'
import InstallPrompt from './InstallPrompt'
import DeliveryPage from './DeliveryPage'
import KioskPage from './KioskPage'
import OnlineOrdering from './OnlineOrdering'
import OrderTracking from './OrderTracking'
import ReservationBooking from './ReservationBooking'
import SalesTargetPage from './SalesTargetPage'
import PurchaseOrderPage from './PurchaseOrderPage'
import FloorPlanPage from './FloorPlanPage'
import ManagerDashboard from './ManagerDashboard'
import ClosingProcedurePage from './ClosingProcedurePage'
import CrossSellManagerPage from './CrossSellManagerPage'
import ServiceRequestsPage from './ServiceRequestsPage'
import { LangContext, useTranslation, type Lang } from './i18n'
import BulkPriceEditor from './BulkPriceEditor'
import TipPoolPage from './TipPoolPage'
import HouseAccountsPage from './HouseAccountsPage'
import './App.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

type Page =
  | 'pos'
  | 'kds'
  | 'dashboard'
  | 'manager-dashboard'
  | 'closing'
  | 'cross-sell'
  | 'service-requests'
  | 'inventory'
  | 'analytics'
  | 'menu-editor'
  | 'combos'
  | 'media-library'
  | 'prep-list'
  | 'recipe-scale'
  | 'sales-targets'
  | 'purchase-orders'
  | 'floor-plan'
  | 'settings'
  | 'zreport'
  | 'users'
  | 'backup'
  | 'tables'
  | 'audit'
  | 'cash'
  | 'suppliers'
  | 'reservations'
  | 'shifts'
  | 'variance'
  | 'gift-cards'
  | 'branches'
  | 'qr-codes'
  | 'branch-compare'
  | 'menu-versions'
  | 'scheduled'
  | 'receipts'
  | 'customers'
  | 'modifiers'
  | 'courses'
  | 'order-history'
  | 'stocktaking'
  | 'promotions'
  | 'popularity'
  | 'ratings'
  | 'loyalty'
  | 'loyalty-tiers'
  | 'order-templates'
  | 'order-merge'
  | 'import-data'
  | 'system-health'
  | 'marketing'
  | 'catering'
  | 'invoices'
  | 'kds-analytics'
  | 'employees'
  | 'delivery'
  | 'food-costs'
  | 'menu-eng'
  | 'labor-costs'
  | 'profit-loss'
  | 'waste'
  | 'export'
  | 'sales-forecast'
  | 'yoy'
  | 'expenses'
  | 'rfm'
  | 'inv-forecast'
  | 'budgets'
  | 'schedule'
  | 'price-rules'
  | 'recipe-optimizer'
  | 'waitlist'
  | 'bulk-prices'
  | 'tip-pool'
  | 'house-accounts'

export default function App() {
  const [isCustomer, setIsCustomer] = useState(false)
  useEffect(() => {
    const p = window.location.pathname
    setIsCustomer(p.startsWith('/menu/') || p.startsWith('/order/') || p.startsWith('/display/') || p.startsWith('/menu-board') || p.startsWith('/time-clock') || p.startsWith('/kiosk') || p.startsWith('/online-order') || p.startsWith('/order-tracking') || p.startsWith('/reservations') || p.startsWith('/book') || p.startsWith('/review-wall') || p.startsWith('/reviews') || p.startsWith('/feedback'))
  }, [])
  const [logged, setLogged] = useState(api.loggedIn())
  const [user, setUser] = useState<any>(null)
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('')
  const [pinDialog, setPinDialog] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [page, setPage] = useState<Page>('pos')
  const [notif, setNotif] = useState('')
  const [dark, setDark] = useState(localStorage.getItem('pos-dark') === 'true')
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  let searchTimer: any
  const [lang, setLang] = useState<Lang>((localStorage.getItem('pos-lang') as Lang) || 'sl')
  const [branches, setBranches] = useState<any[]>([])
  const [curBranch, setCurBranch] = useState<number | null>(parseInt(localStorage.getItem('pos-branch') || '') || null)
  useEffect(() => { document.body.classList.toggle('dark', dark); localStorage.setItem('pos-dark', String(dark)) }, [dark])
  useEffect(() => { localStorage.setItem('pos-lang', lang) }, [lang])
  useEffect(() => { if (curBranch) localStorage.setItem('pos-branch', String(curBranch)) }, [curBranch])
  useEffect(() => {
    fetch('/api/v1/branches', { headers: api.authHeader() }).then(r => r.json()).then(b => {
      setBranches(b)
      if (!curBranch && b.length > 0) setCurBranch(b[0].id)
    }).catch(() => {})
  }, [logged])

  const notify = (m: string) => { setNotif(m); setTimeout(() => setNotif(''), 3000) }
  const { t } = useTranslation()

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    try { const d = await api.login(u, p); setUser(d.user); setLogged(true) } catch (ex: any) { setErr(ex.message) }
  }

  const pinLogin = async () => {
    setPinErr('')
    try { const d = await api.pinLogin(pinInput); setUser(d.user); setLogged(true); setPinDialog(false); setPinInput('') }
    catch (ex: any) { setPinErr(ex.message) }
  }

  // Quick access nav items
  const quickNavItems: { key: Page; icon: string }[] = [
    { key: 'pos', icon: '💳' },
    { key: 'kds', icon: '🍳' },
    { key: 'dashboard', icon: '📊' },
  ];
  
  // Grouped pages for sidebar/dropdown
  const pageGroups: { label: string; pages: { key: Page; icon: string }[] }[] = [
    {
      label: 'Operacije',
      pages: [
        { key: 'waitlist', icon: '📋' },
        { key: 'reservations', icon: '📅' },
        { key: 'tables', icon: '🪑' },
      ]
    },
    {
      label: 'Meniji',
      pages: [
        { key: 'menu-editor', icon: '📝' },
        { key: 'combos', icon: '📦' },
        { key: 'courses', icon: '📋' },
        { key: 'menu-versions', icon: '📅' },
        { key: 'price-rules', icon: '💰' },
        { key: 'modifiers', icon: '⚙️' },
      ]
    },
    {
      label: 'Inventura',
      pages: [
        { key: 'inventory', icon: '📦' },
        { key: 'inv-forecast', icon: '📦' },
        { key: 'purchase-orders', icon: '📦' },
        { key: 'suppliers', icon: '🏭' },
        { key: 'waste', icon: '🗑️' },
      ]
    },
    {
      label: 'Stranke',
      pages: [
        { key: 'customers', icon: '👤' },
        { key: 'loyalty', icon: '🎁' },
        { key: 'loyalty-tiers', icon: '🏆' },
        { key: 'gift-cards', icon: '🎁' },
      ]
    },
    {
      label: 'Promocije',
      pages: [
        { key: 'promotions', icon: '🏷️' },
        { key: 'marketing', icon: '📧' },
        { key: 'popularity', icon: '📊' },
      ]
    },
    {
      label: 'Osebje',
      pages: [
        { key: 'users', icon: '👥' },
        { key: 'employees', icon: '👥' },
        { key: 'schedule', icon: '📅' },
        { key: 'shifts', icon: '⏰' },
        { key: 'tip-pool', icon: '💵' },
      ]
    },
    {
      label: 'Poročila',
      pages: [
        { key: 'analytics', icon: '📈' },
        { key: 'profit-loss', icon: '📊' },
        { key: 'food-costs', icon: '💰' },
        { key: 'labor-costs', icon: '👥' },
      ]
    },
    {
      label: 'Ostalo',
      pages: [
        { key: 'settings', icon: '⚙️' },
        { key: 'cash', icon: '💰' },
        { key: 'backup', icon: '💾' },
      ]
    },
  ];

  if (isCustomer) {
    const path = window.location.pathname
    const orderMatch = path.match(/^\/order\/(\d+)/)
    const displayMatch = path.match(/^\/display\/(\d+)/)
    if (orderMatch || displayMatch) return <CustomerOrderDisplay />
    if (path.startsWith('/menu-board')) return <MenuBoard />
    if (path.startsWith('/time-clock')) return <TimeClockPage />
    if (path.startsWith('/feedback')) return <CustomerFeedback />
    if (path.startsWith('/kiosk')) return <KioskPage />
    if (path.startsWith('/online-order')) return <OnlineOrdering />
    if (path.startsWith('/order-tracking')) return <OrderTracking />
    if (path.startsWith('/table-pay')) return <TablePayPage />
    if (path.startsWith('/reservations')) return <ReservationBooking />
    if (path.startsWith('/book')) return <ReservationBooking />
    if (path.startsWith('/review-wall') || path.startsWith('/reviews')) return <ReviewWall />
    return <CustomerMenu />
  }

  if (!logged) return (
    <LangContext.Provider value={lang}>
    <div className="login-container">
      {pinDialog && (
        <div className="overlay" onClick={() => setPinDialog(false)}>
          <div className="modal modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
            <h3>🔑 {t('pos.pin_login')}</h3>
            <input className="input" type="password" inputMode="numeric" placeholder={t('pos.enter_pin')} value={pinInput} onChange={e => setPinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && pinLogin()} autoFocus maxLength={4} style={{ fontSize: 24, textAlign: 'center', letterSpacing: 8 }} />
            {pinErr && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{pinErr}</p>}
            <div className="modal-btns">
              <button onClick={pinLogin} className="btn btn-primary" disabled={pinInput.length < 3}>{t('common.confirm')}</button>
              <button onClick={() => { setPinDialog(false); setPinInput(''); setPinErr('') }} className="btn btn-ghost">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
      <div className="login-box">
        <div className="login-icon">🍽️</div>
        <h1 className="login-title">{t('app.title')}</h1>
        <p className="login-subtitle">{t('login.title')}</p>
        <form onSubmit={login} className="login-form">
          <input className="input" placeholder={t('login.username')} value={u} onChange={e => setU(e.target.value)} />
          <input className="input" type="password" placeholder={t('login.password')} value={p} onChange={e => setP(e.target.value)} />
          <div className="login-lang-row">
            <button type="button" onClick={() => setLang(lang === 'sl' ? 'en' : 'sl')} className="btn btn-sm btn-ghost">{lang === 'sl' ? '🇬🇧 EN' : '🇸🇮 SL'}</button>
            <button type="button" onClick={() => setPinDialog(true)} className="btn btn-sm btn-blue">🔑 PIN</button>
          </div>
          {err && <p className="login-error">{err}</p>}
          <button className="btn btn-primary login-submit" type="submit">{t('login.submit')}</button>
        </form>
        <p className="login-demo">{t('login.demo')}</p>
      </div>
    </div>
    </LangContext.Provider>
  )

  return (
    <LangContext.Provider value={lang}>
    <div className="app-root">
      <header className="header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={() => setShowSidebar(!showSidebar)}>
            ☰
          </button>
          <h1 onClick={() => setPage('pos')}>🍽️ {t('app.title')}</h1>
        </div>
        
        <div className="header-center">
          <nav className="nav-quick">
            {quickNavItems.map(pp => (
              <button key={pp.key} onClick={() => setPage(pp.key)}
                className={`nav-btn ${page === pp.key ? 'active' : ''}`}>
                {pp.icon}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="header-controls">
          <div className="search-wrap" style={{ position: 'relative' }}>
            <input className="input" placeholder={`🔍 ${t('common.search')}...`} value={searchQ}
              onChange={e => {
                setSearchQ(e.target.value)
                clearTimeout(searchTimer)
                if (!e.target.value) { setSearchRes([]); setSearching(false); return }
                searchTimer = setTimeout(async () => {
                  setSearching(true)
                  try {
                    const r = await fetch(`/api/v1/search?q=${encodeURIComponent(e.target.value)}`, { headers: api.authHeader() })
                    const d = await r.json()
                    setSearchRes(d.results || [])
                  } catch { setSearchRes([]) }
                  setSearching(false)
                }, 300)
              }}
              onKeyDown={e => e.key === 'Escape' && (setSearchQ(''), setSearchRes([]))}
              style={{ width: 180, fontSize: 12, padding: '6px 12px', borderRadius: 20 }} />
            {searchRes.length > 0 && (
              <div className="search-dropdown" style={{
                position: 'absolute', top: '100%', right: 0, minWidth: 320,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 1000,
                maxHeight: 400, overflowY: 'auto', marginTop: 4
              }}>
                {searchRes.map((r, i) => (
                  <button key={`${r.type}-${r.id}-${i}`} onClick={() => {
                    setPage(r.page as Page)
                    setSearchQ(''); setSearchRes([])
                  }} className="search-item">
                    <span className="search-item-icon">
                      {r.type === 'order' ? '📋' : r.type === 'menu' ? '🍽️' : r.type === 'customer' ? '👤' :
                       r.type === 'invoice' ? '🧾' : r.type === 'reservation' ? '📅' : r.type === 'user' ? '👥' :
                       r.type === 'promotion' ? '🏷️' : r.type === 'catering' ? '🎉' : r.type === 'supplier' ? '🏭' :
                       r.type === 'gift_card' ? '🎁' : '📌'}
                    </span>
                    <div className="search-item-info">
                      <div className="search-item-name">{r.label}</div>
                      <div className="search-item-type">{r.type}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <NotificationsBell />
          <button onClick={() => setLang(lang === 'sl' ? 'en' : 'sl')} className="nav-btn" title={t('common.lang')}>{lang === 'sl' ? '🇬🇧' : '🇸🇮'}</button>
          <button onClick={() => setDark(!dark)} className="nav-btn" title="Temni način">{dark ? '☀️' : '🌙'}</button>
          {branches.length > 1 && (
            <select className="input" value={curBranch || ''} onChange={e => setCurBranch(parseInt(e.target.value) || null)}
              style={{ width: 140, fontSize: 12, padding: '4px 8px', borderRadius: 8 }}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button onClick={() => setPinDialog(true)} className="btn btn-xs btn-ghost" title="PIN preklop">🔑</button>
          <span className="header-user">{user?.full_name}</span>
        </div>
      </header>

      {showSidebar && (
        <div className="sidebar-overlay" onClick={() => setShowSidebar(false)}></div>
      )}
      
      <aside className={`app-sidebar ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Povezave</h3>
          <button onClick={() => setShowSidebar(false)} className="sidebar-close">✕</button>
        </div>
        <div className="sidebar-content">
          {pageGroups.map((group, gi) => (
            <div key={gi} className="sidebar-group">
              <div className="sidebar-group-label">{group.label}</div>
              {group.pages.map(pp => (
                <button key={pp.key} onClick={() => { setPage(pp.key); setShowSidebar(false); }}
                  className={`sidebar-item ${page === pp.key ? 'active' : ''}`}>
                  <span className="sidebar-item-icon">{pp.icon}</span>
                  <span className="sidebar-item-text">{t(`nav.${pp.key}`)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {notif && <div className="toast">{notif}</div>}
      <OfflineIndicator />

      <div className="app-body">
        {page === 'pos' && <POS onNotify={notify} />}
        {page === 'kds' && <KDS onNotify={notify} />}
        {page === 'dashboard' && <Dashboard onNotify={notify} />}
        {page === 'analytics' && <Analytics onNotify={notify} />}
        {page === 'menu-editor' && <MenuEditor onNotify={notify} />}
        {page === 'combos' && <ComboPage onNotify={notify} />}
        {page === 'inventory' && <Inventory onNotify={notify} />}
        {page === 'tables' && <TablesPage onNotify={notify} />}
        {page === 'cash' && <CashRegisterPage onNotify={notify} />}
        {page === 'customers' && <CustomersPage onNotify={notify} />}
        {page === 'suppliers' && <SuppliersPage onNotify={notify} />}
        {page === 'reservations' && <ReservationsPage onNotify={notify} />}
        {page === 'waitlist' && <WaitlistPage onNotify={notify} />}
        {page === 'settings' && <SettingsPage onNotify={notify} />}
        {page === 'users' && <UsersPage onNotify={notify} />}
        {page === 'backup' && <BackupPage onNotify={notify} />}
        {page === 'audit' && <AuditLogPage onNotify={notify} />}
        {page === 'gift-cards' && <GiftCardsPage onNotify={notify} />}
        {page === 'modifiers' && <ModifiersPage onNotify={notify} />}
        {page === 'courses' && <CoursesPage onNotify={notify} />}
        {page === 'promotions' && <PromotionsPage onNotify={notify} />}
        {page === 'loyalty' && <LoyaltyPage onNotify={notify} />}
        {page === 'loyalty-tiers' && <LoyaltyTiersPage onNotify={notify} />}
        {page === 'shifts' && <ShiftsPage onNotify={notify} />}
        {page === 'schedule' && <SchedulePage onNotify={notify} />}
        {page === 'menu-versions' && <MenuVersionsPage onNotify={notify} />}
        {page === 'price-rules' && <PriceRulesPage onNotify={notify} />}
        {page === 'media-library' && <MediaLibraryPage onNotify={notify} />}
        {page === 'prep-list' && <PrepListPage onNotify={notify} />}
        {page === 'recipe-scale' && <RecipeScalePage onNotify={notify} />}
        {page === 'sales-targets' && <SalesTargetPage onNotify={notify} />}
        {page === 'purchase-orders' && <PurchaseOrderPage onNotify={notify} />}
        {page === 'floor-plan' && <FloorPlanPage onNotify={notify} />}
        {page === 'manager-dashboard' && <ManagerDashboard onNotify={notify} />}
        {page === 'closing' && <ClosingProcedurePage onNotify={notify} />}
        {page === 'cross-sell' && <CrossSellManagerPage onNotify={notify} />}
        {page === 'service-requests' && <ServiceRequestsPage onNotify={notify} />}
        {page === 'zreport' && <ZReport onNotify={notify} />}
        {page === 'branches' && <BranchesPage onNotify={notify} />}
        {page === 'qr-codes' && <QRCodePage onNotify={notify} />}
        {page === 'branch-compare' && <BranchComparison onNotify={notify} />}
        {page === 'scheduled' && <ScheduledOrdersPage onNotify={notify} />}
        {page === 'receipts' && <ReceiptsPage onNotify={notify} />}
        {page === 'order-history' && <OrderHistoryPage onNotify={notify} />}
        {page === 'stocktaking' && <StocktakingPage onNotify={notify} />}
        {page === 'popularity' && <PopularityPage onNotify={notify} />}
        {page === 'ratings' && <RatingsPage onNotify={notify} />}
        {page === 'order-templates' && <OrderTemplatesPage onNotify={notify} />}
        {page === 'order-merge' && <OrderMergePage onNotify={notify} />}
        {page === 'import-data' && <ImportPage onNotify={notify} />}
        {page === 'system-health' && <SystemHealthPage />}
        {page === 'marketing' && <MarketingPage onNotify={notify} />}
        {page === 'catering' && <CateringPage onNotify={notify} />}
        {page === 'invoices' && <InvoicesPage onNotify={notify} />}
        {page === 'kds-analytics' && <KdsAnalyticsPage onNotify={notify} />}
        {page === 'employees' && <EmployeePerformance onNotify={notify} />}
        {page === 'delivery' && <DeliveryPage onNotify={notify} />}
        {page === 'food-costs' && <FoodCostPage onNotify={notify} />}
        {page === 'menu-eng' && <MenuEngineeringPage onNotify={notify} />}
        {page === 'labor-costs' && <LaborCostPage onNotify={notify} />}
        {page === 'profit-loss' && <ProfitLossPage onNotify={notify} />}
        {page === 'waste' && <WastePage onNotify={notify} />}
        {page === 'export' && <ExportPage onNotify={notify} />}
        {page === 'sales-forecast' && <SalesForecastPage onNotify={notify} />}
        {page === 'yoy' && <YoYComparisonPage onNotify={notify} />}
        {page === 'expenses' && <ExpensesPage onNotify={notify} />}
        {page === 'rfm' && <RFMPage onNotify={notify} />}
        {page === 'inv-forecast' && <InventoryForecastPage onNotify={notify} />}
        {page === 'budgets' && <BudgetPage onNotify={notify} />}
        {page === 'recipe-optimizer' && <RecipeOptimizerPage onNotify={notify} />}
        {page === 'bulk-prices' && <BulkPriceEditor onNotify={notify} />}
        {page === 'tip-pool' && <TipPoolPage onNotify={notify} />}
        {page === 'house-accounts' && <HouseAccountsPage onNotify={notify} />}
      </div>
      <InstallPrompt />
    </div>
    </LangContext.Provider>
  )
}
