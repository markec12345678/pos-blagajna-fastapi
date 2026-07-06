export interface Category {
  id: number
  name: string
  sort_order: number
  items: MenuItem[]
}

export interface MenuItem {
  id: number
  name: string
  description: string | null
  price: number
  combo_price: number | null
  category_id: number
  course_id: number | null
  is_active: boolean
  is_favorite: boolean
  is_combo: boolean
  is_out_of_stock: boolean
  image_url?: string | null
  allergens?: string | null
  tags?: string | null
}

export interface TableData {
  id: number
  number: number
  name: string
  capacity: number
  status: string
  pos_x: number
  pos_y: number
  shape: string
  occupied_minutes?: number
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
  order_type: string
  table_id: number
  cashier_id: number
  customer_name: string | null
  customer_id: number | null
  status: string
  total: number
  discount_type: string | null
  discount_value: number
  discount_amount: number
  created_at: string
  closed_at: string | null
  notes?: string
  tags?: string
  items: OrderItem[]
}

export interface Dashboard {
  today_sales: number
  today_tips: number
  today_orders: number
  today_reservations: number
  open_orders: number
  free_tables: number
  total_tables: number
  top_items: { name: string; quantity: number; total: number }[]
}

export interface CartItem {
  menu_item_id: number
  name: string
  price: number
  quantity: number
  modifiers?: SelectedModifier[]
}

export interface SelectedModifier {
  group_id: number
  group_name: string
  option_id: number
  option_name: string
  price_impact: number
}

export interface ModifierGroup {
  id: number
  name: string
  min_select: number
  max_select: number
  is_required: boolean
  options: ModifierOption[]
}

export interface ModifierOption {
  id: number
  name: string
  price_impact: number
  ingredient_id: number | null
  ingredient_quantity: number
}

export interface Course {
  id: number
  name: string
  sort_order: number
}

export interface Customer {
  id: number
  name: string
  phone: string
  address: string
  email: string
  notes: string
  tags: string
  created_at: string
  loyalty_points?: number
  total_spent?: number
  is_member?: boolean
  branch_id?: number
}

export interface GiftCard {
  id: number
  code: string
  balance: number
  active: boolean
  expires_at: string | null
  created_at: string
  notes: string
}
