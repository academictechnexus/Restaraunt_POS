export type UserRole = 'admin' | 'manager' | 'cashier'
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'
export type FoodType = 'veg' | 'non_veg' | 'egg'
export type OrderStatus = 'open' | 'kot_printed' | 'served' | 'billed' | 'paid' | 'cancelled'
export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export type ItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'split'
export type BillStatus = 'draft' | 'paid' | 'cancelled' | 'refunded'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface Restaurant {
  id: string
  name: string
  address: string | null
  phone: string | null
  gstin: string | null
  fssai: string | null
  logo_url: string | null
  cgst_rate: number
  sgst_rate: number
  currency: string
  created_at: string
}

export interface DiningTable {
  id: string
  name: string
  capacity: number
  section: string
  status: TableStatus
  position_x: number
  position_y: number
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  food_type: FoodType
  image_url: string | null
  is_available: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  // joined
  category?: Category
}

export interface Order {
  id: string
  order_number: number
  table_id: string | null
  order_type: OrderType
  status: OrderStatus
  customer_name: string | null
  customer_phone: string | null
  guests: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // joined
  table?: DiningTable
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  item_id: string
  item_name: string
  item_price: number
  quantity: number
  notes: string | null
  status: ItemStatus
  created_at: string
}

export interface Bill {
  id: string
  bill_number: number
  order_id: string
  subtotal: number
  discount_type: string | null
  discount_value: number
  discount_amount: number
  cgst_rate: number
  sgst_rate: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  payment_method: PaymentMethod
  cash_given: number | null
  change_amount: number | null
  status: BillStatus
  created_by: string | null
  created_at: string
}

export interface KOT {
  id: string
  order_id: string
  kot_number: number
  items: { name: string; quantity: number; notes?: string }[]
  printed_at: string
  printed_by: string | null
}

export interface InventoryItem {
  id: string
  name: string
  unit: string
  current_stock: number
  min_stock: number
  cost_per_unit: number | null
  is_active: boolean
  created_at: string
}

// Supabase Database type (minimal - expand as needed)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile }
      restaurant: { Row: Restaurant }
      dining_tables: { Row: DiningTable }
      categories: { Row: Category }
      menu_items: { Row: MenuItem }
      orders: { Row: Order }
      order_items: { Row: OrderItem }
      bills: { Row: Bill }
      kot: { Row: KOT }
      inventory_items: { Row: InventoryItem }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
