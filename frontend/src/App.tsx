import React, { useState, useEffect, useRef, Suspense } from 'react'
import * as api from './api'
import POS from './POS'
import KDS from './KDS'
import Dashboard from './Dashboard'
import ErrorBoundary from './ErrorBoundary'
import OfflineIndicator from './OfflineIndicator'
import InstallPrompt from './InstallPrompt'
import { LangContext, useTranslation, type Lang } from './i18n'
import { useToast, ToastContainer } from './Toast'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import './App.css'
import LoadingSpinner from './LoadingSpinner'

const Inventory = React.lazy(() => import('./Inventory'))
const CustomerMenu = React.lazy(() => import('./CustomerMenu'))
const WaitlistPage = React.lazy(() => import('./WaitlistPage'))
const RecipeOptimizerPage = React.lazy(() => import('./RecipeOptimizerPage'))
const ComboPage = React.lazy(() => import('./ComboPage'))
const TablePayPage = React.lazy(() => import('./TablePayPage'))
const Analytics = React.lazy(() => import('./Analytics'))
const MenuEditor = React.lazy(() => import('./MenuEditor'))
const SettingsPage = React.lazy(() => import('./Settings'))
const ZReport = React.lazy(() => import('./ZReport'))
const UsersPage = React.lazy(() => import('./UsersPage'))
const BackupPage = React.lazy(() => import('./BackupPage'))
const TablesPage = React.lazy(() => import('./TablesPage'))
const AuditLogPage = React.lazy(() => import('./AuditLogPage'))
const CashRegisterPage = React.lazy(() => import('./CashRegisterPage'))
const SuppliersPage = React.lazy(() => import('./SuppliersPage'))
const ReservationsPage = React.lazy(() => import('./ReservationsPage'))
const ShiftsPage = React.lazy(() => import('./ShiftsPage'))
const VariancePage = React.lazy(() => import('./VariancePage'))
const GiftCardsPage = React.lazy(() => import('./GiftCardsPage'))
const BranchesPage = React.lazy(() => import('./BranchesPage'))
const QRCodePage = React.lazy(() => import('./QRCodePage'))
const MenuVersionsPage = React.lazy(() => import('./MenuVersionsPage'))
const BranchComparison = React.lazy(() => import('./BranchComparison'))
const ScheduledOrdersPage = React.lazy(() => import('./ScheduledOrdersPage'))
const CustomerOrderDisplay = React.lazy(() => import('./CustomerOrderDisplay'))
const MenuBoard = React.lazy(() => import('./MenuBoard'))
const TimeClockPage = React.lazy(() => import('./TimeClockPage'))
const CustomerFeedback = React.lazy(() => import('./CustomerFeedback'))
const ReviewWall = React.lazy(() => import('./ReviewWall'))
const NotificationsBell = React.lazy(() => import('./NotificationsBell'))
const ReceiptsPage = React.lazy(() => import('./ReceiptsPage'))
const CustomersPage = React.lazy(() => import('./CustomersPage'))
const ModifiersPage = React.lazy(() => import('./ModifiersPage'))
const CoursesPage = React.lazy(() => import('./CoursesPage'))
const OrderHistoryPage = React.lazy(() => import('./OrderHistoryPage'))
const StocktakingPage = React.lazy(() => import('./StocktakingPage'))
const PromotionsPage = React.lazy(() => import('./PromotionsPage'))
const PopularityPage = React.lazy(() => import('./PopularityPage'))
const RatingsPage = React.lazy(() => import('./RatingsPage'))
const LoyaltyPage = React.lazy(() => import('./LoyaltyPage'))
const MarketingPage = React.lazy(() => import('./MarketingPage'))
const CateringPage = React.lazy(() => import('./CateringPage'))
const InvoicesPage = React.lazy(() => import('./InvoicesPage'))
const EInvoicesPage = React.lazy(() => import('./EInvoicesPage'))
const KdsAnalyticsPage = React.lazy(() => import('./KdsAnalyticsPage'))
const EmployeePerformance = React.lazy(() => import('./EmployeePerformance'))
const FoodCostPage = React.lazy(() => import('./FoodCostPage'))
const MenuEngineeringPage = React.lazy(() => import('./MenuEngineeringPage'))
const LaborCostPage = React.lazy(() => import('./LaborCostPage'))
const ProfitLossPage = React.lazy(() => import('./ProfitLossPage'))
const WastePage = React.lazy(() => import('./WastePage'))
const ExportPage = React.lazy(() => import('./ExportPage'))
const SalesForecastPage = React.lazy(() => import('./SalesForecastPage'))
const YoYComparisonPage = React.lazy(() => import('./YoYComparisonPage'))
const ExpensesPage = React.lazy(() => import('./ExpensesPage'))
const RFMPage = React.lazy(() => import('./RFMPage'))
const InventoryForecastPage = React.lazy(() => import('./InventoryForecastPage'))
const BudgetPage = React.lazy(() => import('./BudgetPage'))
const SchedulePage = React.lazy(() => import('./SchedulePage'))
const PriceRulesPage = React.lazy(() => import('./PriceRulesPage'))
const LoyaltyTiersPage = React.lazy(() => import('./LoyaltyTiersPage'))
const OrderTemplatesPage = React.lazy(() => import('./OrderTemplatesPage'))
const OrderMergePage = React.lazy(() => import('./OrderMergePage'))
const ImportPage = React.lazy(() => import('./ImportPage'))
const SystemHealthPage = React.lazy(() => import('./SystemHealthPage'))
const MediaLibraryPage = React.lazy(() => import('./MediaLibraryPage'))
const PrepListPage = React.lazy(() => import('./PrepListPage'))
const RecipeScalePage = React.lazy(() => import('./RecipeScalePage'))
const DeliveryPage = React.lazy(() => import('./DeliveryPage'))
const KioskPage = React.lazy(() => import('./KioskPage'))
const OnlineOrdering = React.lazy(() => import('./OnlineOrdering'))
const OrderTracking = React.lazy(() => import('./OrderTracking'))
const ReservationBooking = React.lazy(() => import('./ReservationBooking'))
const SalesTargetPage = React.lazy(() => import('./SalesTargetPage'))
const PurchaseOrderPage = React.lazy(() => import('./PurchaseOrderPage'))
const FloorPlanPage = React.lazy(() => import('./FloorPlanPage'))
const ManagerDashboard = React.lazy(() => import('./ManagerDashboard'))
const ClosingProcedurePage = React.lazy(() => import('./ClosingProcedurePage'))
const CrossSellManagerPage = React.lazy(() => import('./CrossSellManagerPage'))
const ServiceRequestsPage = React.lazy(() => import('./ServiceRequestsPage'))
const BulkPriceEditor = React.lazy(() => import('./BulkPriceEditor'))
const TipPoolPage = React.lazy(() => import('./TipPoolPage'))
const HouseAccountsPage = React.lazy(() => import('./HouseAccountsPage'))
const GamificationPage = React.lazy(() => import('./GamificationPage'))
const DynamicMenuPage = React.lazy(() => import('./DynamicMenuPage'))
const MessagingPage = React.lazy(() => import('./MessagingPage'))
const PredictiveAnalyticsPage = React.lazy(() => import('./PredictiveAnalyticsPage'))
const FeedbackAnalyticsPage = React.lazy(() => import('./FeedbackAnalyticsPage'))
const VoiceOrdering = React.lazy(() => import('./VoiceOrdering'))
const ReportsPage = React.lazy(() => import('./ReportsPage'))
const TableQRPage = React.lazy(() => import('./TableQRPage'))
const TableOrdering = React.lazy(() => import('./TableOrdering'))
const ScheduleCalendarPage = React.lazy(() => import('./ScheduleCalendarPage'))
const BarcodeInventory = React.lazy(() => import('./BarcodeInventory'))
const LoyaltyRewardsPage = React.lazy(() => import('./LoyaltyRewardsPage'))
const MultiPaymentPage = React.lazy(() => import('./MultiPaymentPage'))
const EmployeeDashboard = React.lazy(() => import('./EmployeeDashboard'))
const InventoryAnalyticsPage = React.lazy(() => import('./InventoryAnalyticsPage'))
const InventoryV2Page = React.lazy(() => import('./InventoryV2Page'))
const ScheduleV2Page = React.lazy(() => import('./ScheduleV2Page'))
const CrmV2Page = React.lazy(() => import('./CrmV2Page'))
const FinanceV2Page = React.lazy(() => import('./FinanceV2Page'))
const MenuV2Page = React.lazy(() => import('./MenuV2Page'))
const OrdersV2Page = React.lazy(() => import('./OrdersV2Page'))
const KDSV2Page = React.lazy(() => import('./KDSV2Page'))
const CustomersV2Page = React.lazy(() => import('./CustomersV2Page'))
const ExpensesV2Page = React.lazy(() => import('./ExpensesV2Page'))
const PromotionsV2Page = React.lazy(() => import('./PromotionsV2Page'))
const DeliveryV2Page = React.lazy(() => import('./DeliveryV2Page'))
const WarehouseV2Page = React.lazy(() => import('./WarehouseV2Page'))
const ReportsV2Page = React.lazy(() => import('./ReportsV2Page'))
const SuppliersV2Page = React.lazy(() => import('./SuppliersV2Page'))
const QualityV2Page = React.lazy(() => import('./QualityV2Page'))
const EmployeesV3Page = React.lazy(() => import('./EmployeesV3Page'))
const LoyaltyV2Page = React.lazy(() => import('./LoyaltyV2Page'))
const AnalyticsV2Page = React.lazy(() => import('./AnalyticsV2Page'))
const MarketingV2Page = React.lazy(() => import('./MarketingV2Page'))
const ReservationsV2Page = React.lazy(() => import('./ReservationsV2Page'))
const PaymentsV2Page = React.lazy(() => import('./PaymentsV2Page'))
const CashV2Page = React.lazy(() => import('./CashV2Page'))
const ShiftsV2Page = React.lazy(() => import('./ShiftsV2Page'))
const ReportsV4Page = React.lazy(() => import('./ReportsV4Page'))
const PromotionsV3Page = React.lazy(() => import('./PromotionsV3Page'))
const MenuV3Page = React.lazy(() => import('./MenuV3Page'))
const AuditV2Page = React.lazy(() => import('./AuditV2Page'))
const UsersV2Page = React.lazy(() => import('./UsersV2Page'))
const TablesV2Page = React.lazy(() => import('./TablesV2Page'))
const GiftCardsV2Page = React.lazy(() => import('./GiftCardsV2Page'))
const CateringV2Page = React.lazy(() => import('./CateringV2Page'))
const InvoicesV2Page = React.lazy(() => import('./InvoicesV2Page'))
const RatingsV2Page = React.lazy(() => import('./RatingsV2Page'))
const BackupV2Page = React.lazy(() => import('./BackupV2Page'))
const SystemV2Page = React.lazy(() => import('./SystemV2Page'))
const BarcodeV2Page = React.lazy(() => import('./BarcodeV2Page'))
const FeedbackV2Page = React.lazy(() => import('./FeedbackV2Page'))
const BranchesV2Page = React.lazy(() => import('./BranchesV2Page'))
const ExportsV2Page = React.lazy(() => import('./ExportsV2Page'))
const MediaV2Page = React.lazy(() => import('./MediaV2Page'))
const PriceRulesV2Page = React.lazy(() => import('./PriceRulesV2Page'))
const WaitlistV2Page = React.lazy(() => import('./WaitlistV2Page'))
const KitchenV2Page = React.lazy(() => import('./KitchenV2Page'))
const RevenueV2Page = React.lazy(() => import('./RevenueV2Page'))
const ReservationsV3Page = React.lazy(() => import('./ReservationsV3Page'))
const InventoryV3Page = React.lazy(() => import('./InventoryV3Page'))
const AnalyticsV3Page = React.lazy(() => import('./AnalyticsV3Page'))
const MarketingV4Page = React.lazy(() => import('./MarketingV4Page'))
const CustomersV3Page = React.lazy(() => import('./CustomersV3Page'))
const ReportsV5Page = React.lazy(() => import('./ReportsV5Page'))
const FinanceV3Page = React.lazy(() => import('./FinanceV3Page'))
const MenuV4Page = React.lazy(() => import('./MenuV4Page'))
const QualityV3Page = React.lazy(() => import('./QualityV3Page'))
const StaffV4Page = React.lazy(() => import('./StaffV4Page'))
const DeliveryV3Page = React.lazy(() => import('./DeliveryV3Page'))
const InventoryV4Page = React.lazy(() => import('./InventoryV4Page'))
const MarketingV5Page = React.lazy(() => import('./MarketingV5Page'))
const AnalyticsV4Page = React.lazy(() => import('./AnalyticsV4Page'))
const CrmV3Page = React.lazy(() => import('./CrmV3Page'))
const FinanceV4Page = React.lazy(() => import('./FinanceV4Page'))
const MenuV5Page = React.lazy(() => import('./MenuV5Page'))
const ReportsV6Page = React.lazy(() => import('./ReportsV6Page'))
const CustomersV4Page = React.lazy(() => import('./CustomersV4Page'))
const InventoryV5Page = React.lazy(() => import('./InventoryV5Page'))
const StaffV5Page = React.lazy(() => import('./StaffV5Page'))
const OrdersV3Page = React.lazy(() => import('./OrdersV3Page'))
const CrmV4Page = React.lazy(() => import('./CrmV4Page'))
const FinanceV5Page = React.lazy(() => import('./FinanceV5Page'))
const MenuV6Page = React.lazy(() => import('./MenuV6Page'))
const ReportsV7Page = React.lazy(() => import('./ReportsV7Page'))
const DeliveryV4Page = React.lazy(() => import('./DeliveryV4Page'))
const LoyaltyV3Page = React.lazy(() => import('./LoyaltyV3Page'))
const ScheduleV3Page = React.lazy(() => import('./ScheduleV3Page'))
const AnalyticsV5Page = React.lazy(() => import('./AnalyticsV5Page'))
const MarketingV6Page = React.lazy(() => import('./MarketingV6Page'))
const QualityV4Page = React.lazy(() => import('./QualityV4Page'))
const ExpensesV3Page = React.lazy(() => import('./ExpensesV3Page'))
const PromotionsV4Page = React.lazy(() => import('./PromotionsV4Page'))
const OrdersV4Page = React.lazy(() => import('./OrdersV4Page'))
const PaymentsV3Page = React.lazy(() => import('./PaymentsV3Page'))
const CustomersV5Page = React.lazy(() => import('./CustomersV5Page'))
const ScheduleV4Page = React.lazy(() => import('./ScheduleV4Page'))
const StaffV6Page = React.lazy(() => import('./StaffV6Page'))
const InventoryV6Page = React.lazy(() => import('./InventoryV6Page'))
const CrmV5Page = React.lazy(() => import('./CrmV5Page'))
const ReportsV8Page = React.lazy(() => import('./ReportsV8Page'))
const MarketingV7Page = React.lazy(() => import('./MarketingV7Page'))
const AnalyticsV6Page = React.lazy(() => import('./AnalyticsV6Page'))
const MenuV7Page = React.lazy(() => import('./MenuV7Page'))
const FinanceV6Page = React.lazy(() => import('./FinanceV6Page'))
const MarketingV3Page = React.lazy(() => import('./MarketingV3Page'))
const ReportsV3Page = React.lazy(() => import('./ReportsV3Page'))
const EmployeesV2Page = React.lazy(() => import('./EmployeesV2Page'))
const FursZaposPage = React.lazy(() => import('./FursZaposPage'))
const CroatianFiscalPage = React.lazy(() => import('./CroatianFiscalPage'))


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
  | 'e-invoices'
  | 'gamification'
  | 'dynamic-menu'
  | 'messaging'
  | 'predictive'
  | 'feedback-analytics'
  | 'reports'
  | 'table-qr'
  | 'schedule-calendar'
  | 'barcode-inventory'
  | 'loyalty-rewards'
  | 'multi-payment'
  | 'employee-dashboard'
  | 'inventory-analytics'
  | 'inventory-v2'
  | 'schedule-v2'
  | 'crm-v2'
  | 'finance-v2'
  | 'menu-v2'
  | 'orders-v2'
  | 'kds-v2'
  | 'customers-v2'
  | 'expenses-v2'
  | 'promotions-v2'
  | 'delivery-v2'
  | 'warehouse-v2'
  | 'reports-v2'
  | 'suppliers-v2'
  | 'quality-v2'
  | 'employees-v3'
  | 'loyalty-v2'
  | 'analytics-v2'
  | 'marketing-v2'
  | 'reservations-v2'
  | 'payments-v2'
  | 'cash-v2'
  | 'shifts-v2'
  | 'reports-v4'
  | 'promotions-v3'
  | 'menu-v3'
  | 'audit-v2'
  | 'users-v2'
  | 'tables-v2'
  | 'gift-cards-v2'
  | 'catering-v2'
  | 'invoices-v2'
  | 'ratings-v2'
  | 'backup-v2'
  | 'system-v2'
  | 'barcode-v2'
  | 'feedback-v2'
  | 'branches-v2'
  | 'exports-v2'
  | 'media-v2'
  | 'price-rules-v2'
  | 'waitlist-v2'
  | 'kitchen-v2'
  | 'revenue-v2'
  | 'reservations-v3'
  | 'inventory-v3'
  | 'analytics-v3'
  | 'marketing-v4'
  | 'customers-v3'
  | 'reports-v5'
  | 'finance-v3'
  | 'menu-v4'
  | 'quality-v3'
  | 'staff-v4'
  | 'delivery-v3'
  | 'inventory-v4'
  | 'marketing-v5'
  | 'analytics-v4'
  | 'crm-v3'
  | 'finance-v4'
  | 'menu-v5'
  | 'reports-v6'
  | 'customers-v4'
  | 'inventory-v5'
  | 'staff-v5'
  | 'orders-v3'
  | 'crm-v4'
  | 'finance-v5'
  | 'menu-v6'
  | 'reports-v7'
  | 'delivery-v4'
  | 'loyalty-v3'
  | 'schedule-v3'
  | 'analytics-v5'
  | 'marketing-v6'
  | 'quality-v4'
  | 'expenses-v3'
  | 'promotions-v4'
  | 'orders-v4'
  | 'payments-v3'
  | 'customers-v5'
  | 'schedule-v4'
  | 'staff-v6'
  | 'inventory-v6'
  | 'crm-v5'
  | 'reports-v8'
  | 'marketing-v7'
  | 'analytics-v6'
  | 'menu-v7'
  | 'finance-v6'
  | 'marketing-v3'
  | 'reports-v3'
  | 'employees-v2'
  | 'furs-zapos'
  | 'croatian-fiscal'

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
  const [page, setPage] = useState<Page>(() => {
    const path = window.location.pathname.replace(/^\//, '')
    const validPages: string[] = ['pos','kds','dashboard','manager-dashboard','closing','cross-sell','service-requests','inventory','analytics','menu-editor','combos','media-library','prep-list','recipe-scale','sales-targets','purchase-orders','floor-plan','settings','zreport','users','backup','tables','audit','cash','suppliers','reservations','shifts','variance','gift-cards','branches','qr-codes','branch-compare','menu-versions','scheduled','receipts','customers','modifiers','courses','order-history','stocktaking','promotions','popularity','ratings','loyalty','loyalty-tiers','order-templates','order-merge','import-data','system-health','marketing','catering','invoices','kds-analytics','employees','delivery','food-costs','menu-eng','labor-costs','profit-loss','waste','export','sales-forecast','yoy','expenses','rfm','inv-forecast','budgets','schedule','price-rules','recipe-optimizer','waitlist','bulk-prices','tip-pool','house-accounts','gamification','dynamic-menu','messaging','predictive','feedback-analytics','reports','table-qr','schedule-calendar','barcode-inventory','loyalty-rewards','multi-payment','employee-dashboard','inventory-analytics','inventory-v2','schedule-v2','crm-v2','finance-v2','menu-v2','orders-v2','kds-v2','customers-v2','expenses-v2','promotions-v2','delivery-v2','warehouse-v2','reports-v2','suppliers-v2','quality-v2','employees-v3','loyalty-v2','analytics-v2','marketing-v2','reservations-v2','payments-v2','cash-v2','shifts-v2','reports-v4','promotions-v3','menu-v3','audit-v2','users-v2','tables-v2','gift-cards-v2','catering-v2','invoices-v2','ratings-v2','backup-v2','system-v2','barcode-v2','feedback-v2','branches-v2','exports-v2','media-v2','price-rules-v2','waitlist-v2','kitchen-v2','revenue-v2','reservations-v3','inventory-v3','analytics-v3','marketing-v4','customers-v3','reports-v5','finance-v3','menu-v4','quality-v3','staff-v4','delivery-v3','inventory-v4','marketing-v5','analytics-v4','crm-v3','finance-v4','menu-v5','reports-v6','customers-v4','inventory-v5','staff-v5','orders-v3','crm-v4','finance-v5','menu-v6','reports-v7','delivery-v4','loyalty-v3','schedule-v3','analytics-v5','marketing-v6','quality-v4','expenses-v3','promotions-v4','orders-v4','payments-v3','customers-v5','schedule-v4','staff-v6','inventory-v6','crm-v5','reports-v8','marketing-v7','analytics-v6','menu-v7','finance-v6','e-invoices','marketing-v3','reports-v3','employees-v2','furs-zapos','croatian-fiscal']
    return validPages.includes(path) ? path as Page : 'pos'
  })
  const [notif, setNotif] = useState('')
  const { toasts, notify, remove: removeToast } = useToast()
  const [dark, setDark] = useState(localStorage.getItem('pos-dark') === 'true')
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const notifyOld = (m: string) => { setNotif(m); setTimeout(() => setNotif(''), 3000) }
  const { t } = useTranslation()

  const navigateTo = (p: Page) => { setPage(p); if (window.location.pathname !== '/' + p) window.history.pushState({}, '', '/' + p) }
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const path = window.location.pathname.replace(/^\//, '')
    const validPages: string[] = ['pos','kds','dashboard','manager-dashboard','closing','cross-sell','service-requests','inventory','analytics','menu-editor','combos','media-library','prep-list','recipe-scale','sales-targets','purchase-orders','floor-plan','settings','zreport','users','backup','tables','audit','cash','suppliers','reservations','shifts','variance','gift-cards','branches','qr-codes','branch-compare','menu-versions','scheduled','receipts','customers','modifiers','courses','order-history','stocktaking','promotions','popularity','ratings','loyalty','loyalty-tiers','order-templates','order-merge','import-data','system-health','marketing','catering','invoices','kds-analytics','employees','delivery','food-costs','menu-eng','labor-costs','profit-loss','waste','export','sales-forecast','yoy','expenses','rfm','inv-forecast','budgets','schedule','price-rules','recipe-optimizer','waitlist','bulk-prices','tip-pool','house-accounts','gamification','dynamic-menu','messaging','predictive','feedback-analytics','reports','table-qr','schedule-calendar','barcode-inventory','loyalty-rewards','multi-payment','employee-dashboard','inventory-analytics','inventory-v2','schedule-v2','crm-v2','finance-v2','menu-v2','orders-v2','kds-v2','customers-v2','expenses-v2','promotions-v2','delivery-v2','warehouse-v2','reports-v2','suppliers-v2','quality-v2','employees-v3','loyalty-v2','analytics-v2','marketing-v2','reservations-v2','payments-v2','cash-v2','shifts-v2','reports-v4','promotions-v3','menu-v3','audit-v2','users-v2','tables-v2','gift-cards-v2','catering-v2','invoices-v2','ratings-v2','backup-v2','system-v2','barcode-v2','feedback-v2','branches-v2','exports-v2','media-v2','price-rules-v2','waitlist-v2','kitchen-v2','revenue-v2','reservations-v3','inventory-v3','analytics-v3','marketing-v4','customers-v3','reports-v5','finance-v3','menu-v4','quality-v3','staff-v4','delivery-v3','inventory-v4','marketing-v5','analytics-v4','crm-v3','finance-v4','menu-v5','reports-v6','customers-v4','inventory-v5','staff-v5','orders-v3','crm-v4','finance-v5','menu-v6','reports-v7','delivery-v4','loyalty-v3','schedule-v3','analytics-v5','marketing-v6','quality-v4','expenses-v3','promotions-v4','orders-v4','payments-v3','customers-v5','schedule-v4','staff-v6','inventory-v6','crm-v5','reports-v8','marketing-v7','analytics-v6','menu-v7','finance-v6','e-invoices','marketing-v3','reports-v3','employees-v2','furs-zapos','croatian-fiscal']
      if (validPages.includes(path)) setPage(path as Page)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  useKeyboardShortcuts({
    'Ctrl+1': () => { if (logged) navigateTo('pos') },
    'Ctrl+2': () => { if (logged) navigateTo('kds') },
    'Ctrl+3': () => { if (logged) navigateTo('manager-dashboard') },
    'Ctrl+k': () => { const el = document.querySelector<HTMLInputElement>('.search-wrap input'); if (el) { el.focus(); el.select() } },
    '?': () => { if (logged) setShowShortcuts(s => !s) },
    'Escape': () => { if (showShortcuts) setShowShortcuts(false) },
  }, logged && !pinDialog)

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
        { key: 'floor-plan', icon: '🗺️' },
        { key: 'service-requests', icon: '🔔' },
        { key: 'closing', icon: '🔒' },
        { key: 'scheduled', icon: '📅' },
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
        { key: 'media-library', icon: '🖼️' },
        { key: 'recipe-optimizer', icon: '🔧' },
        { key: 'recipe-scale', icon: '⚖️' },
        { key: 'menu-eng', icon: '🌐' },
        { key: 'dynamic-menu', icon: '🧠' },
      ]
    },
    {
      label: 'Inventura',
      pages: [
        { key: 'inventory', icon: '📦' },
        { key: 'barcode-inventory', icon: '📱' },
        { key: 'inventory-analytics', icon: '📊' },
        { key: 'inv-forecast', icon: '📦' },
        { key: 'purchase-orders', icon: '📦' },
        { key: 'suppliers', icon: '🏭' },
        { key: 'waste', icon: '🗑️' },
        { key: 'reports', icon: '📊' },
        { key: 'multi-payment', icon: '💳' },
        { key: 'stocktaking', icon: '📊' },
        { key: 'prep-list', icon: '📝' },
        { key: 'bulk-prices', icon: '💰' },
      ]
    },
    {
      label: 'Stranke',
      pages: [
        { key: 'customers', icon: '👤' },
        { key: 'loyalty', icon: '🎁' },
        { key: 'loyalty-tiers', icon: '🏆' },
        { key: 'gamification', icon: '🎯' },
        { key: 'gift-cards', icon: '🎁' },
        { key: 'house-accounts', icon: '🏠' },
        { key: 'messaging', icon: '📱' },
        { key: 'ratings', icon: '⭐' },
        { key: 'feedback-analytics', icon: '💬' },
        { key: 'loyalty-rewards', icon: '🎁' },
      ]
    },
    {
      label: 'Naročila',
      pages: [
        { key: 'order-history', icon: '📜' },
        { key: 'order-templates', icon: '📋' },
        { key: 'order-merge', icon: '🔗' },
        { key: 'cross-sell', icon: '🛒' },
        { key: 'delivery', icon: '🚗' },
        { key: 'catering', icon: '🍽️' },
        { key: 'invoices', icon: '🧾' },
        { key: 'e-invoices', icon: '📨' },
        { key: 'furs-zapos', icon: '🇸🇮' },
        { key: 'croatian-fiscal', icon: '🇭🇷' },
      ]
    },
    {
      label: 'Promocije',
      pages: [
        { key: 'promotions', icon: '🏷️' },
        { key: 'marketing', icon: '📧' },
        { key: 'popularity', icon: '📊' },
        { key: 'sales-targets', icon: '🎯' },
      ]
    },
    {
      label: 'Osebje',
      pages: [
        { key: 'users', icon: '👥' },
        { key: 'employees', icon: '👥' },
        { key: 'schedule', icon: '📅' },
        { key: 'schedule-calendar', icon: '📆' },
        { key: 'employee-dashboard', icon: '📊' },
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
        { key: 'kds-analytics', icon: '📊' },
        { key: 'sales-forecast', icon: '📈' },
        { key: 'yoy', icon: '📈' },
        { key: 'expenses', icon: '💸' },
        { key: 'rfm', icon: '📊' },
        { key: 'budgets', icon: '💰' },
        { key: 'predictive', icon: '🔮' },
      ]
    },
    {
      label: 'Več vej',
      pages: [
        { key: 'branches', icon: '🏢' },
        { key: 'branch-compare', icon: '📊' },
        { key: 'qr-codes', icon: '📱' },
      ]
    },
    {
      label: 'Sistem',
      pages: [
        { key: 'dashboard', icon: '📊' },
        { key: 'manager-dashboard', icon: '👔' },
        { key: 'settings', icon: '⚙️' },
        { key: 'table-qr', icon: '📱' },
        { key: 'cash', icon: '💰' },
        { key: 'backup', icon: '💾' },
        { key: 'audit', icon: '📋' },
        { key: 'system-health', icon: '🏥' },
        { key: 'import-data', icon: '📥' },
        { key: 'export', icon: '📤' },
        { key: 'zreport', icon: '📊' },
        { key: 'variance', icon: '📊' },
        { key: 'receipts', icon: '🧾' },
      ]
    },
    {
      label: 'Napredno',
      pages: [
        { key: 'inventory-v2', icon: '📦' },
        { key: 'schedule-v2', icon: '📅' },
        { key: 'crm-v2', icon: '👤' },
        { key: 'finance-v2', icon: '💰' },
        { key: 'menu-v2', icon: '🍽️' },
        { key: 'orders-v2', icon: '📋' },
        { key: 'kds-v2', icon: '🍳' },
        { key: 'customers-v2', icon: '👥' },
        { key: 'expenses-v2', icon: '💸' },
        { key: 'promotions-v2', icon: '🏷️' },
        { key: 'delivery-v2', icon: '🚗' },
        { key: 'warehouse-v2', icon: '📦' },
        { key: 'reports-v2', icon: '📊' },
        { key: 'suppliers-v2', icon: '🏭' },
        { key: 'quality-v2', icon: '🛡️' },
        { key: 'employees-v3', icon: '👥' },
        { key: 'loyalty-v2', icon: '🏆' },
        { key: 'analytics-v2', icon: '📈' },
        { key: 'marketing-v2', icon: '📢' },
        { key: 'reservations-v2', icon: '📅' },
        { key: 'payments-v2', icon: '💳' },
        { key: 'cash-v2', icon: '💰' },
        { key: 'shifts-v2', icon: '⏰' },
        { key: 'reports-v4', icon: '📊' },
        { key: 'promotions-v3', icon: '🏷️' },
        { key: 'menu-v3', icon: '🍽️' },
        { key: 'audit-v2', icon: '📋' },
        { key: 'users-v2', icon: '👥' },
        { key: 'tables-v2', icon: '🪑' },
        { key: 'gift-cards-v2', icon: '🎁' },
        { key: 'catering-v2', icon: '🎉' },
        { key: 'invoices-v2', icon: '🧾' },
        { key: 'ratings-v2', icon: '⭐' },
        { key: 'backup-v2', icon: '💾' },
        { key: 'system-v2', icon: '🏥' },
        { key: 'barcode-v2', icon: '📱' },
        { key: 'feedback-v2', icon: '💬' },
        { key: 'branches-v2', icon: '🏢' },
        { key: 'exports-v2', icon: '📤' },
        { key: 'media-v2', icon: '🖼️' },
        { key: 'price-rules-v2', icon: '💲' },
        { key: 'waitlist-v2', icon: '⏳' },
        { key: 'kitchen-v2', icon: '🍳' },
        { key: 'revenue-v2', icon: '💰' },
        { key: 'reservations-v3', icon: '📅' },
        { key: 'inventory-v3', icon: '📦' },
        { key: 'analytics-v3', icon: '📈' },
        { key: 'marketing-v4', icon: '📢' },
        { key: 'customers-v3', icon: '👥' },
        { key: 'reports-v5', icon: '📊' },
        { key: 'finance-v3', icon: '💰' },
        { key: 'menu-v4', icon: '🍽️' },
        { key: 'quality-v3', icon: '🛡️' },
        { key: 'staff-v4', icon: '👥' },
        { key: 'delivery-v3', icon: '🚗' },
        { key: 'inventory-v4', icon: '📦' },
        { key: 'marketing-v5', icon: '📢' },
        { key: 'analytics-v4', icon: '📈' },
        { key: 'crm-v3', icon: '👤' },
        { key: 'finance-v4', icon: '💰' },
        { key: 'menu-v5', icon: '🍽️' },
        { key: 'reports-v6', icon: '📊' },
        { key: 'customers-v4', icon: '👥' },
        { key: 'inventory-v5', icon: '📦' },
        { key: 'staff-v5', icon: '👥' },
        { key: 'orders-v3', icon: '📋' },
        { key: 'crm-v4', icon: '👤' },
        { key: 'finance-v5', icon: '💰' },
        { key: 'menu-v6', icon: '🍽️' },
        { key: 'reports-v7', icon: '📊' },
        { key: 'delivery-v4', icon: '🚗' },
        { key: 'loyalty-v3', icon: '🏆' },
        { key: 'schedule-v3', icon: '📅' },
        { key: 'analytics-v5', icon: '📈' },
        { key: 'marketing-v6', icon: '📢' },
        { key: 'quality-v4', icon: '🍽️' },
        { key: 'expenses-v3', icon: '💰' },
        { key: 'promotions-v4', icon: '🎯' },
        { key: 'orders-v4', icon: '📦' },
        { key: 'payments-v3', icon: '💳' },
        { key: 'customers-v5', icon: '👥' },
        { key: 'schedule-v4', icon: '📅' },
        { key: 'staff-v6', icon: '👥' },
        { key: 'inventory-v6', icon: '📦' },
        { key: 'crm-v5', icon: '🤝' },
        { key: 'reports-v8', icon: '📊' },
        { key: 'marketing-v7', icon: '📢' },
        { key: 'analytics-v6', icon: '📈' },
        { key: 'menu-v7', icon: '🍽️' },
        { key: 'finance-v6', icon: '💰' },
        { key: 'marketing-v3', icon: '📢' },
        { key: 'reports-v3', icon: '📊' },
        { key: 'employees-v2', icon: '👥' },
      ]
    },
  ];

  const roleAccess: Record<string, string[]> = {
    admin: ['*'],
    manager: ['*'],
    waiter: ['pos', 'waitlist', 'tables', 'floor-plan', 'reservations', 'customers', 'loyalty', 'loyalty-tiers', 'gamification', 'order-history', 'service-requests', 'time-clock', 'kds', 'scheduled'],
    chef: ['kds', 'menu-editor', 'inventory', 'waste', 'stocktaking', 'prep-list'],
    cashier: ['pos', 'customers', 'loyalty', 'gamification', 'gift-cards', 'house-accounts', 'order-history', 'cash', 'zreport', 'variance', 'receipts'],
  }

  const canAccess = (pageKey: string) => {
    const role = user?.role
    if (!role || !roleAccess[role]) return true
    const allowed = roleAccess[role]
    if (allowed.includes('*')) return true
    return allowed.includes(pageKey)
  }

  const filteredGroups = pageGroups.map(g => ({
    ...g, pages: g.pages.filter(p => canAccess(p.key))
  })).filter(g => g.pages.length > 0)

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
    if (path.startsWith('/table-order')) return <TableOrdering />
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
              onKeyDown={e => e.key === 'Enter' && pinLogin()} autoFocus maxLength={4} aria-label={t('pos.enter_pin')} style={{ fontSize: 24, textAlign: 'center', letterSpacing: 8 }} />
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
          <input className="input" placeholder={t('login.username')} value={u} onChange={e => setU(e.target.value)} aria-label={t('login.username')} />
          <input className="input" type="password" placeholder={t('login.password')} value={p} onChange={e => setP(e.target.value)} aria-label={t('login.password')} />
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
          <button className="hamburger-btn" onClick={() => setShowSidebar(!showSidebar)}
            aria-label={showSidebar ? 'Zapri stransko vrstico' : 'Odprej stransko vrstico'}
            aria-expanded={showSidebar}>
            ☰
          </button>
          <h1 onClick={() => navigateTo('pos')}>🍽️ {t('app.title')}</h1>
        </div>
        
        <div className="header-center">
          <nav className="nav-quick" aria-label="Hitra navigacija">
            {quickNavItems.map(pp => (
              <button key={pp.key} onClick={() => navigateTo(pp.key)}
                className={`nav-btn ${page === pp.key ? 'active' : ''}`}
                aria-label={pp.key === 'pos' ? 'Blagajna' : pp.key === 'kds' ? 'Kuhinja' : 'Nadzorna plošča'}>
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
                if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
                if (!e.target.value) { setSearchRes([]); setSearching(false); return }
                searchTimerRef.current = setTimeout(async () => {
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
              aria-label="Iskanje po aplikaciji" style={{ width: 180, fontSize: 12, padding: '6px 12px', borderRadius: 20 }} />
            {searchRes.length > 0 && (
              <div className="search-dropdown" style={{
                position: 'absolute', top: '100%', right: 0, minWidth: 320,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 1000,
                maxHeight: 400, overflowY: 'auto', marginTop: 4
              }}>
                {searchRes.map((r, i) => (
                  <button key={`${r.type}-${r.id}-${i}`} onClick={() => {
                    navigateTo(r.page as Page)
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
          <button onClick={() => setLang(lang === 'sl' ? 'en' : 'sl')} className="nav-btn" title={t('common.lang')} aria-label={lang === 'sl' ? 'Preklopi na angleščino' : 'Preklopi na slovenščino'}>{lang === 'sl' ? '🇬🇧' : '🇸🇮'}</button>
          <button onClick={() => setDark(!dark)} className="nav-btn" title="Temni način" aria-label={dark ? 'Svetli način' : 'Temni način'}>{dark ? '☀️' : '🌙'}</button>
          {branches.length > 1 && (
            <select className="input" value={curBranch || ''} onChange={e => setCurBranch(parseInt(e.target.value) || null)}
              style={{ width: 140, fontSize: 12, padding: '4px 8px', borderRadius: 8 }}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button onClick={() => setPinDialog(true)} className="btn btn-xs btn-ghost" title="PIN preklop" aria-label="PIN preklop">🔑</button>
          <span className="header-user">{user?.full_name}</span>
        </div>
      </header>

      {showSidebar && (
        <div className="sidebar-overlay" onClick={() => setShowSidebar(false)}></div>
      )}
      
      <aside className={`app-sidebar ${showSidebar ? 'open' : ''}`} role="navigation" aria-label="Glavna navigacija">
        <div className="sidebar-header">
          <h3>Povezave</h3>
          <button onClick={() => setShowSidebar(false)} className="sidebar-close" aria-label="Zapri stransko vrstico">✕</button>
        </div>
        <div className="sidebar-search" style={{ padding: '8px 16px' }}>
          <input className="input" placeholder={`🔍 ${t('common.search')}...`} value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
            style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 8, boxSizing: 'border-box' }}
            aria-label="Iskanje po stranski vrstici" />
        </div>
        <div className="sidebar-content">
          {(sidebarSearch ? filteredGroups.map(g => ({
            ...g,
            pages: g.pages.filter(p => t(`nav.${p.key}`).toLowerCase().includes(sidebarSearch.toLowerCase()))
          })).filter(g => g.pages.length > 0) : filteredGroups).map((group, gi) => (
            <div key={gi} className="sidebar-group">
              <div className="sidebar-group-label">{group.label}</div>
              {group.pages.map(pp => (
                <button key={pp.key} onClick={() => { navigateTo(pp.key); setShowSidebar(false); }}
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <OfflineIndicator />

      <div className="app-body" role="main" aria-label="Glavna vsebina">
        <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
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
          {page === 'invoices' && <InvoicesPage onNotify={notify} onNavigate={navigateTo} />}
          {page === 'e-invoices' && <EInvoicesPage onBack={() => navigateTo('invoices')} />}
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
          {page === 'gamification' && <GamificationPage onNotify={notify} />}
          {page === 'dynamic-menu' && <DynamicMenuPage onNotify={notify} />}
          {page === 'messaging' && <MessagingPage onNotify={notify} />}
          {page === 'predictive' && <PredictiveAnalyticsPage onNotify={notify} />}
          {page === 'feedback-analytics' && <FeedbackAnalyticsPage onNotify={notify} />}
          {page === 'reports' && <ReportsPage onNotify={notify} />}
          {page === 'table-qr' && <TableQRPage onNotify={notify} />}
          {page === 'schedule-calendar' && <ScheduleCalendarPage onNotify={notify} />}
          {page === 'barcode-inventory' && <BarcodeInventory onNotify={notify} />}
          {page === 'loyalty-rewards' && <LoyaltyRewardsPage onNotify={notify} />}
          {page === 'multi-payment' && <MultiPaymentPage onNotify={notify} />}
          {page === 'employee-dashboard' && <EmployeeDashboard onNotify={notify} />}
          {page === 'inventory-analytics' && <InventoryAnalyticsPage onNotify={notify} />}
          {page === 'inventory-v2' && <InventoryV2Page onNotify={notify} />}
          {page === 'schedule-v2' && <ScheduleV2Page onNotify={notify} />}
          {page === 'crm-v2' && <CrmV2Page onNotify={notify} />}
          {page === 'finance-v2' && <FinanceV2Page onNotify={notify} />}
          {page === 'menu-v2' && <MenuV2Page onNotify={notify} />}
          {page === 'orders-v2' && <OrdersV2Page onNotify={notify} />}
          {page === 'kds-v2' && <KDSV2Page onNotify={notify} />}
          {page === 'customers-v2' && <CustomersV2Page onNotify={notify} />}
          {page === 'expenses-v2' && <ExpensesV2Page onNotify={notify} />}
          {page === 'promotions-v2' && <PromotionsV2Page onNotify={notify} />}
          {page === 'delivery-v2' && <DeliveryV2Page onNotify={notify} />}
          {page === 'warehouse-v2' && <WarehouseV2Page onNotify={notify} />}
          {page === 'reports-v2' && <ReportsV2Page onNotify={notify} />}
          {page === 'suppliers-v2' && <SuppliersV2Page onNotify={notify} />}
          {page === 'quality-v2' && <QualityV2Page onNotify={notify} />}
          {page === 'employees-v3' && <EmployeesV3Page onNotify={notify} />}
          {page === 'loyalty-v2' && <LoyaltyV2Page onNotify={notify} />}
          {page === 'analytics-v2' && <AnalyticsV2Page onNotify={notify} />}
          {page === 'marketing-v2' && <MarketingV2Page onNotify={notify} />}
          {page === 'reservations-v2' && <ReservationsV2Page onNotify={notify} />}
          {page === 'payments-v2' && <PaymentsV2Page onNotify={notify} />}
          {page === 'cash-v2' && <CashV2Page onNotify={notify} />}
          {page === 'shifts-v2' && <ShiftsV2Page onNotify={notify} />}
          {page === 'reports-v4' && <ReportsV4Page onNotify={notify} />}
          {page === 'promotions-v3' && <PromotionsV3Page onNotify={notify} />}
          {page === 'menu-v3' && <MenuV3Page onNotify={notify} />}
          {page === 'audit-v2' && <AuditV2Page onNotify={notify} />}
          {page === 'users-v2' && <UsersV2Page onNotify={notify} />}
          {page === 'tables-v2' && <TablesV2Page onNotify={notify} />}
          {page === 'gift-cards-v2' && <GiftCardsV2Page onNotify={notify} />}
          {page === 'catering-v2' && <CateringV2Page onNotify={notify} />}
          {page === 'invoices-v2' && <InvoicesV2Page onNotify={notify} />}
          {page === 'ratings-v2' && <RatingsV2Page onNotify={notify} />}
          {page === 'backup-v2' && <BackupV2Page onNotify={notify} />}
          {page === 'system-v2' && <SystemV2Page onNotify={notify} />}
          {page === 'barcode-v2' && <BarcodeV2Page onNotify={notify} />}
          {page === 'feedback-v2' && <FeedbackV2Page onNotify={notify} />}
          {page === 'branches-v2' && <BranchesV2Page onNotify={notify} />}
          {page === 'exports-v2' && <ExportsV2Page onNotify={notify} />}
          {page === 'media-v2' && <MediaV2Page onNotify={notify} />}
          {page === 'price-rules-v2' && <PriceRulesV2Page onNotify={notify} />}
          {page === 'waitlist-v2' && <WaitlistV2Page onNotify={notify} />}
          {page === 'kitchen-v2' && <KitchenV2Page onNotify={notify} />}
          {page === 'revenue-v2' && <RevenueV2Page onNotify={notify} />}
          {page === 'reservations-v3' && <ReservationsV3Page onNotify={notify} />}
          {page === 'inventory-v3' && <InventoryV3Page onNotify={notify} />}
          {page === 'analytics-v3' && <AnalyticsV3Page onNotify={notify} />}
          {page === 'marketing-v4' && <MarketingV4Page onNotify={notify} />}
          {page === 'customers-v3' && <CustomersV3Page onNotify={notify} />}
          {page === 'reports-v5' && <ReportsV5Page onNotify={notify} />}
          {page === 'finance-v3' && <FinanceV3Page onNotify={notify} />}
          {page === 'menu-v4' && <MenuV4Page onNotify={notify} />}
          {page === 'quality-v3' && <QualityV3Page onNotify={notify} />}
          {page === 'staff-v4' && <StaffV4Page onNotify={notify} />}
          {page === 'delivery-v3' && <DeliveryV3Page onNotify={notify} />}
          {page === 'inventory-v4' && <InventoryV4Page onNotify={notify} />}
          {page === 'marketing-v5' && <MarketingV5Page onNotify={notify} />}
          {page === 'analytics-v4' && <AnalyticsV4Page onNotify={notify} />}
          {page === 'crm-v3' && <CrmV3Page onNotify={notify} />}
          {page === 'finance-v4' && <FinanceV4Page onNotify={notify} />}
          {page === 'menu-v5' && <MenuV5Page onNotify={notify} />}
          {page === 'reports-v6' && <ReportsV6Page onNotify={notify} />}
          {page === 'customers-v4' && <CustomersV4Page onNotify={notify} />}
          {page === 'inventory-v5' && <InventoryV5Page onNotify={notify} />}
          {page === 'staff-v5' && <StaffV5Page onNotify={notify} />}
          {page === 'orders-v3' && <OrdersV3Page onNotify={notify} />}
          {page === 'crm-v4' && <CrmV4Page onNotify={notify} />}
          {page === 'finance-v5' && <FinanceV5Page onNotify={notify} />}
          {page === 'menu-v6' && <MenuV6Page onNotify={notify} />}
          {page === 'reports-v7' && <ReportsV7Page onNotify={notify} />}
          {page === 'delivery-v4' && <DeliveryV4Page onNotify={notify} />}
          {page === 'loyalty-v3' && <LoyaltyV3Page onNotify={notify} />}
          {page === 'schedule-v3' && <ScheduleV3Page onNotify={notify} />}
          {page === 'analytics-v5' && <AnalyticsV5Page onNotify={notify} />}
          {page === 'marketing-v6' && <MarketingV6Page onNotify={notify} />}
          {page === 'quality-v4' && <QualityV4Page onNotify={notify} />}
          {page === 'expenses-v3' && <ExpensesV3Page onNotify={notify} />}
          {page === 'promotions-v4' && <PromotionsV4Page onNotify={notify} />}
          {page === 'orders-v4' && <OrdersV4Page onNotify={notify} />}
          {page === 'payments-v3' && <PaymentsV3Page onNotify={notify} />}
          {page === 'customers-v5' && <CustomersV5Page onNotify={notify} />}
          {page === 'schedule-v4' && <ScheduleV4Page onNotify={notify} />}
          {page === 'staff-v6' && <StaffV6Page onNotify={notify} />}
          {page === 'inventory-v6' && <InventoryV6Page onNotify={notify} />}
          {page === 'crm-v5' && <CrmV5Page onNotify={notify} />}
          {page === 'reports-v8' && <ReportsV8Page onNotify={notify} />}
          {page === 'marketing-v7' && <MarketingV7Page onNotify={notify} />}
          {page === 'analytics-v6' && <AnalyticsV6Page onNotify={notify} />}
          {page === 'menu-v7' && <MenuV7Page onNotify={notify} />}
          {page === 'finance-v6' && <FinanceV6Page onNotify={notify} />}
          {page === 'variance' && <VariancePage onNotify={notify} />}
          {page === 'marketing-v3' && <MarketingV3Page onNotify={notify} />}
          {page === 'reports-v3' && <ReportsV3Page onNotify={notify} />}
          {page === 'employees-v2' && <EmployeesV2Page onNotify={notify} />}
          {page === 'furs-zapos' && <FursZaposPage onNotify={notify} />}
          {page === 'croatian-fiscal' && <CroatianFiscalPage onNotify={notify} />}
        </Suspense>
        </ErrorBoundary>
      </div>
      <InstallPrompt />

      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)} style={{ zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>⌨️ Tipkovne bližnjice</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 20px', fontSize: 13 }}>
              {[
                ['Ctrl+1', 'Blagajna (POS)'],
                ['Ctrl+2', 'Kuhinja (KDS)'],
                ['Ctrl+3', 'Nadzorna plošča'],
                ['Ctrl+K', 'Iskanje po aplikaciji'],
                ['?', 'To okno'],
                ['←→', 'Navigacija po seznamu'],
                ['Enter', 'Potrdi / Izberi'],
                ['Esc', 'Zapri / Prekliči'],
                ['F1–F12', 'Funkcije v POS načinu'],
              ].map(([key, desc]) => (
                <React.Fragment key={key}>
                  <kbd style={{ fontFamily: 'monospace', background: 'var(--bg, #f1f5f9)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border, #e2e8f0)', textAlign: 'right', fontWeight: 600 }}>{key}</kbd>
                  <span>{desc}</span>
                </React.Fragment>
              ))}
            </div>
            <button onClick={() => setShowShortcuts(false)} className="btn btn-ghost" style={{ marginTop: 20, width: '100%' }}>Zapri (Esc)</button>
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav" aria-label="Mobilna navigacija">
        {[
          { key: 'pos' as Page, icon: '💳', label: 'Blagajna' },
          { key: 'kds' as Page, icon: '🍳', label: 'Kuhinja' },
          { key: 'dashboard' as Page, icon: '📊', label: 'Pregled' },
          { key: 'settings' as Page, icon: '⚙️', label: 'Nastavitve' },
        ].map(item => (
          <button key={item.key} onClick={() => navigateTo(item.key)} className={page === item.key ? 'active' : ''}>
            <span className="mbn-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
    </LangContext.Provider>
  )
}
