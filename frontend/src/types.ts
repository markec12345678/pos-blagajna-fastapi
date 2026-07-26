export interface User {
  id: number
  username: string
  full_name: string
  role: 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen' | 'staff'
  pin_code?: string
}

export interface Category {
  id: number
  name: string
  sort_order?: number
  branch_id?: number
  items: MenuItem[]
}

export interface MenuItem {
  id: number
  name: string
  description?: string
  price: number
  combo_price?: number | null
  category_id: number
  image_url?: string
  is_available: boolean
  is_active?: boolean
  is_out_of_stock?: boolean
  is_combo?: boolean
  tax_rate?: number
  allergens?: string
  tags?: string
  calories?: number
  protein?: number
  fat?: number
  carbs?: number
  course_id?: number
  plu_code?: string
  is_favorite?: boolean
}

export interface Table {
  id: number
  name: string
  capacity: number
  status?: string
  branch_id?: number
  pos_x?: number
  pos_y?: number
  shape?: string
  occupied_minutes?: number
}

export type TableData = Table

export interface ModifierOption {
  id: number
  name: string
  price_impact: number
}

export interface ModifierGroup {
  id: number
  name: string
  is_required: boolean
  min_select: number
  max_select: number
  options: ModifierOption[]
}

export interface SelectedModifier {
  group_id: number
  group_name: string
  option_id: number
  option_name: string
  price_impact: number
}

export interface CartItem {
  menu_item_id: number
  name: string
  price: number
  quantity: number
  modifiers?: SelectedModifier[]
  notes?: string
}

export interface Course {
  id: number
  name: string
  sort_order: number
}

export interface Dashboard {
  today_revenue: number
  today_orders: number
  avg_order_value: number
  open_orders: number
  top_items: { name: string; count: number; revenue: number }[]
  hourly_sales: { hour: number; total: number }[]
  recent_orders: Order[]
}

export interface OrderItem {
  id: number
  menu_item_id: number
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  status: string
  notes?: string
  modifiers?: string
}

export interface Order {
  id: number
  invoice_number?: number
  order_type: string
  table_id: number
  cashier_id: number
  customer_name?: string
  customer_id?: number
  status: string
  total: number
  discount_type?: string
  discount_value: number
  discount_amount: number
  cancel_reason?: string
  created_at: string
  closed_at?: string
  scheduled_at?: string
  notes?: string
  tags?: string
  items: OrderItem[]
}

export interface Customer {
  id: number
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  loyalty_points?: number
  total_spent?: number
  visit_count?: number
  tags?: string
  created_at?: string
  is_member?: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
}

export interface AuthResponse {
  access_token: string
  user: {
    id: number
    username: string
    full_name: string
    role: string
  }
}

export interface Ingredient {
  id: number
  name: string
  unit: string
  current_stock: number
  cost_per_unit: number
  supplier_id?: number
  barcode?: string
  min_stock?: number
}

export interface Supplier {
  id: number
  name: string
  phone?: string
  email?: string
  address?: string
  contact_person?: string
}

export interface Shift {
  id: number
  user_id: number
  user_name?: string
  clock_in: string
  clock_out?: string
  hours: number
  status: string
  notes?: string
}

export interface Expense {
  id: number
  category: string
  description: string
  amount: number
  date: string
  branch_id?: number
}

export interface Branch {
  id: number
  name: string
  address?: string
  phone?: string
  email?: string
  is_active: boolean
}

export interface Promotion {
  id: number
  name: string
  type: string
  value: number
  start_date?: string
  end_date?: string
  is_active: boolean
}

export interface GiftCard {
  id: number
  code: string
  balance: number
  initial_value: number
  status: string
  created_at?: string
}

export interface DashboardData {
  today_revenue: number
  today_orders: number
  avg_order_value: number
  top_items: { name: string; count: number; revenue: number }[]
  hourly_sales: { hour: number; total: number }[]
  recent_orders: Order[]
}

export interface Settings {
  [key: string]: string
}
