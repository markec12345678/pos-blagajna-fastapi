"""
URY Restaurant OS - Core Modules Implementation
This implements the essential modules that form the core of the system:
- POS (Point of Sale)
- KDS (Kitchen Display System)
- Recipe Engine
- Inventory Management
- Analytics
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, field
from decimal import Decimal
import asyncpg
import redis.asyncio as redis
from pydantic import BaseModel, validator
import logging


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    WAITER = "waiter"
    COOK = "cook"


class OrderStatus(str, Enum):
    PENDING = "pending"
    IN_PREPARATION = "in_preparation"
    READY = "ready"
    SERVED = "served"
    PAID = "paid"
    CANCELLED = "cancelled"


class OrderItemStatus(str, Enum):
    ORDERED = "ordered"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"


class TransactionType(str, Enum):
    PURCHASE = "purchase"
    CONSUMPTION = "consumption"
    WASTE = "waste"
    ADJUSTMENT = "adjustment"


class TableStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"


# Data Models
@dataclass
class User:
    id: int
    username: str
    email: str
    role: UserRole
    created_at: datetime
    updated_at: datetime


@dataclass
class Category:
    id: int
    name: str
    description: Optional[str]
    position: int


@dataclass
class MenuItem:
    id: int
    name: str
    description: Optional[str]
    price: Decimal
    category_id: int
    is_active: bool
    created_at: datetime


@dataclass
class Ingredient:
    id: int
    name: str
    unit: str  # kg, g, ml, pcs, etc.
    cost_per_unit: Decimal
    stock_quantity: Decimal
    min_stock_level: Decimal
    supplier_info: Optional[str]


@dataclass
class RecipeItem:
    menu_item_id: int
    ingredient_id: int
    quantity_needed: Decimal  # quantity of ingredient needed per menu item


@dataclass
class Table:
    id: int
    table_number: int
    capacity: int
    status: TableStatus


@dataclass
class OrderItem:
    id: int
    order_id: int
    menu_item_id: int
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    status: OrderItemStatus


@dataclass
class Order:
    id: int
    table_id: int
    customer_name: Optional[str]
    employee_id: int
    status: OrderStatus
    created_at: datetime
    items: List[OrderItem]
    total_amount: Decimal


@dataclass
class InventoryTransaction:
    id: int
    ingredient_id: int
    transaction_type: TransactionType
    quantity: Decimal
    unit_cost: Decimal
    total_cost: Decimal
    transaction_date: datetime
    reference_id: Optional[int]  # could reference order_id, purchase_order_id, etc.


# Core Module: Database Manager
class DatabaseManager:
    """Handles database connections and operations"""
    
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.pool = None
    
    async def initialize(self):
        """Initialize database connection pool"""
        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
        await self._create_tables()
    
    async def _create_tables(self):
        """Create all necessary tables"""
        async with self.pool.acquire() as conn:
            # Users table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    role VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Categories table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    position INTEGER DEFAULT 0
                )
            """)
            
            # Menu items table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS menu_items (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    price DECIMAL(10,2) NOT NULL,
                    category_id INTEGER REFERENCES categories(id),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Ingredients table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS ingredients (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    unit VARCHAR(20) NOT NULL,
                    cost_per_unit DECIMAL(10,4) NOT NULL,
                    stock_quantity DECIMAL(10,2) DEFAULT 0,
                    min_stock_level DECIMAL(10,2) DEFAULT 0,
                    supplier_info TEXT
                )
            """)
            
            # Recipes table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS recipes (
                    id SERIAL PRIMARY KEY,
                    menu_item_id INTEGER REFERENCES menu_items(id),
                    ingredient_id INTEGER REFERENCES ingredients(id),
                    quantity_needed DECIMAL(10,2) NOT NULL
                )
            """)
            
            # Tables table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS tables (
                    id SERIAL PRIMARY KEY,
                    table_number INTEGER UNIQUE NOT NULL,
                    capacity INTEGER NOT NULL,
                    status VARCHAR(20) DEFAULT 'available'
                )
            """)
            
            # Orders table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY,
                    table_id INTEGER REFERENCES tables(id),
                    customer_name VARCHAR(100),
                    employee_id INTEGER REFERENCES users(id),
                    status VARCHAR(20) DEFAULT 'pending',
                    total_amount DECIMAL(10,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Order items table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS order_items (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER REFERENCES orders(id),
                    menu_item_id INTEGER REFERENCES menu_items(id),
                    quantity INTEGER NOT NULL,
                    unit_price DECIMAL(10,2) NOT NULL,
                    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
                    status VARCHAR(20) DEFAULT 'ordered'
                )
            """)
            
            # Inventory transactions table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS inventory_transactions (
                    id SERIAL PRIMARY KEY,
                    ingredient_id INTEGER REFERENCES ingredients(id),
                    transaction_type VARCHAR(20) NOT NULL,
                    quantity DECIMAL(10,2) NOT NULL,
                    unit_cost DECIMAL(10,4),
                    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
                    transaction_date TIMESTAMP DEFAULT NOW(),
                    reference_id INTEGER
                )
            """)
            
            # Inventory logs table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS inventory_logs (
                    id SERIAL PRIMARY KEY,
                    ingredient_id INTEGER REFERENCES ingredients(id),
                    event_type VARCHAR(50) NOT NULL,
                    message TEXT,
                    timestamp TIMESTAMP DEFAULT NOW()
                )
            """)
    
    async def execute_query(self, query: str, *args):
        """Execute a query and return results"""
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)
    
    async def execute_one(self, query: str, *args):
        """Execute a query and return one result"""
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)
    
    async def execute_many(self, query: str, args_list: List[tuple]):
        """Execute a query multiple times with different arguments"""
        async with self.pool.acquire() as conn:
            return await conn.executemany(query, args_list)


# Core Module: Recipe Engine
class RecipeEngine:
    """Manages recipes and calculates ingredient requirements"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    async def get_recipe_requirements(self, menu_item_id: int, quantity: int) -> List[Tuple[int, Decimal]]:
        """
        Get the ingredients required for a menu item multiplied by quantity
        
        Returns list of (ingredient_id, required_quantity) tuples
        """
        query = """
            SELECT ingredient_id, (quantity_needed * $2) as total_required
            FROM recipes
            WHERE menu_item_id = $1
        """
        results = await self.db_manager.execute_query(query, menu_item_id, quantity)
        
        return [(row['ingredient_id'], row['total_required']) for row in results]
    
    async def calculate_food_costs(self, menu_item_id: int) -> Decimal:
        """
        Calculate the total cost of ingredients for a menu item
        """
        query = """
            SELECT SUM(r.quantity_needed * i.cost_per_unit) as total_cost
            FROM recipes r
            JOIN ingredients i ON r.ingredient_id = i.id
            WHERE r.menu_item_id = $1
        """
        result = await self.db_manager.execute_one(query, menu_item_id)
        return result['total_cost'] if result['total_cost'] else Decimal('0.00')
    
    async def check_sufficient_ingredients(self, menu_item_id: int, quantity: int) -> Tuple[bool, List[str]]:
        """
        Check if sufficient ingredients are available for a menu item
        Returns (is_sufficient, list_of_missing_ingredients)
        """
        requirements = await self.get_recipe_requirements(menu_item_id, quantity)
        missing_ingredients = []
        
        for ingredient_id, required_qty in requirements:
            # Get current stock
            stock_query = "SELECT name, stock_quantity FROM ingredients WHERE id = $1"
            ingredient = await self.db_manager.execute_one(stock_query, ingredient_id)
            
            if not ingredient or ingredient['stock_quantity'] < required_qty:
                if ingredient:
                    missing_ingredients.append(
                        f"{ingredient['name']}: need {required_qty}, have {ingredient['stock_quantity']}"
                    )
                else:
                    missing_ingredients.append(f"Ingredient ID {ingredient_id}: not found")
        
        return len(missing_ingredients) == 0, missing_ingredients
    
    async def update_inventory_for_order(self, order_id: int):
        """
        Update inventory when an order is confirmed
        """
        # Get order items
        order_items_query = """
            SELECT oi.menu_item_id, oi.quantity
            FROM order_items oi
            WHERE oi.order_id = $1
        """
        order_items = await self.db_manager.execute_query(order_items_query, order_id)
        
        # Process each item to update inventory
        for item in order_items:
            menu_item_id = item['menu_item_id']
            quantity = item['quantity']
            
            requirements = await self.get_recipe_requirements(menu_item_id, quantity)
            
            for ingredient_id, required_qty in requirements:
                # Update ingredient stock
                update_query = """
                    UPDATE ingredients 
                    SET stock_quantity = stock_quantity - $1
                    WHERE id = $2
                """
                await self.db_manager.execute_query(update_query, required_qty, ingredient_id)
                
                # Log the transaction
                transaction_query = """
                    INSERT INTO inventory_transactions 
                    (ingredient_id, transaction_type, quantity, unit_cost, reference_id)
                    VALUES ($1, 'consumption', $2, 
                        (SELECT cost_per_unit FROM ingredients WHERE id = $1), $3)
                """
                await self.db_manager.execute_query(transaction_query, ingredient_id, required_qty, order_id)
                
                # Check for low stock
                check_query = "SELECT name, stock_quantity, min_stock_level FROM ingredients WHERE id = $1"
                ingredient = await self.db_manager.execute_one(check_query, ingredient_id)
                
                if ingredient and ingredient['stock_quantity'] <= ingredient['min_stock_level']:
                    # Log low stock alert
                    log_query = """
                        INSERT INTO inventory_logs (ingredient_id, event_type, message)
                        VALUES ($1, 'LOW_STOCK_ALERT', $2)
                    """
                    message = f"Low stock: {ingredient['stock_quantity']} {ingredient['name']} remaining"
                    await self.db_manager.execute_query(log_query, ingredient_id, message)


# Core Module: Inventory Manager
class InventoryManager:
    """Manages ingredient inventory and tracks stock levels"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.recipe_engine = RecipeEngine(db_manager)
    
    async def get_ingredient(self, ingredient_id: int) -> Optional[Ingredient]:
        """Get ingredient by ID"""
        query = "SELECT * FROM ingredients WHERE id = $1"
        result = await self.db_manager.execute_one(query, ingredient_id)
        
        if result:
            return Ingredient(
                id=result['id'],
                name=result['name'],
                unit=result['unit'],
                cost_per_unit=result['cost_per_unit'],
                stock_quantity=result['stock_quantity'],
                min_stock_level=result['min_stock_level'],
                supplier_info=result['supplier_info']
            )
        return None
    
    async def get_all_ingredients(self, low_stock_only: bool = False) -> List[Ingredient]:
        """Get all ingredients, optionally only those with low stock"""
        query = "SELECT * FROM ingredients"
        params = []
        
        if low_stock_only:
            query += " WHERE stock_quantity <= min_stock_level"
        
        query += " ORDER BY name"
        
        results = await self.db_manager.execute_query(query, *params)
        
        return [
            Ingredient(
                id=row['id'],
                name=row['name'],
                unit=row['unit'],
                cost_per_unit=row['cost_per_unit'],
                stock_quantity=row['stock_quantity'],
                min_stock_level=row['min_stock_level'],
                supplier_info=row['supplier_info']
            ) for row in results
        ]
    
    async def add_stock(self, ingredient_id: int, quantity: Decimal, unit_cost: Decimal, 
                       reference_id: Optional[int] = None) -> bool:
        """Add stock to an ingredient"""
        try:
            async with self.db_manager.pool.acquire() as conn:
                async with conn.transaction():
                    # Update ingredient stock
                    update_query = """
                        UPDATE ingredients 
                        SET stock_quantity = stock_quantity + $1 
                        WHERE id = $2
                        RETURNING stock_quantity
                    """
                    result = await conn.fetchrow(update_query, quantity, ingredient_id)
                    
                    if not result:
                        return False
                    
                    # Record transaction
                    transaction_query = """
                        INSERT INTO inventory_transactions 
                        (ingredient_id, transaction_type, quantity, unit_cost, total_cost, reference_id)
                        VALUES ($1, 'purchase', $2, $3, $4, $5)
                        RETURNING id
                    """
                    total_cost = quantity * unit_cost
                    transaction_result = await conn.fetchrow(
                        transaction_query, ingredient_id, quantity, unit_cost, total_cost, reference_id
                    )
                    
                    return True
        except Exception as e:
            logger.error(f"Error adding stock: {e}")
            return False
    
    async def consume_stock(self, ingredient_id: int, quantity: Decimal, 
                           reference_id: Optional[int] = None) -> bool:
        """Consume stock from an ingredient"""
        try:
            async with self.db_manager.pool.acquire() as conn:
                async with conn.transaction():
                    # Check if sufficient stock exists
                    check_query = "SELECT stock_quantity FROM ingredients WHERE id = $1"
                    current_stock = await conn.fetchrow(check_query, ingredient_id)
                    
                    if not current_stock or current_stock['stock_quantity'] < quantity:
                        return False
                    
                    # Update ingredient stock
                    update_query = """
                        UPDATE ingredients 
                        SET stock_quantity = stock_quantity - $1 
                        WHERE id = $2
                    """
                    await conn.execute(update_query, quantity, ingredient_id)
                    
                    # Record transaction
                    cost_per_unit_query = "SELECT cost_per_unit FROM ingredients WHERE id = $1"
                    cost_result = await conn.fetchrow(cost_per_unit_query, ingredient_id)
                    
                    transaction_query = """
                        INSERT INTO inventory_transactions 
                        (ingredient_id, transaction_type, quantity, unit_cost, total_cost, reference_id)
                        VALUES ($1, 'consumption', $2, $3, $4, $5)
                    """
                    total_cost = quantity * cost_result['cost_per_unit']
                    await conn.execute(
                        transaction_query, ingredient_id, quantity, 
                        cost_result['cost_per_unit'], total_cost, reference_id
                    )
                    
                    return True
        except Exception as e:
            logger.error(f"Error consuming stock: {e}")
            return False
    
    async def get_low_stock_alerts(self) -> List[Dict]:
        """Get list of ingredients with low stock"""
        query = """
            SELECT i.id, i.name, i.stock_quantity, i.min_stock_level
            FROM ingredients i
            WHERE i.stock_quantity <= i.min_stock_level
            ORDER BY i.stock_quantity
        """
        results = await self.db_manager.execute_query(query)
        
        return [
            {
                "id": row['id'],
                "name": row['name'],
                "current_stock": row['stock_quantity'],
                "min_stock_level": row['min_stock_level']
            }
            for row in results
        ]


# Core Module: POS (Point of Sale)
class POSManager:
    """Manages Point of Sale operations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.inventory_manager = InventoryManager(db_manager)
        self.recipe_engine = RecipeEngine(db_manager)
    
    async def get_menu(self) -> List[Dict]:
        """Get complete menu with categories and items"""
        # Get categories
        categories_query = "SELECT * FROM categories ORDER BY position, name"
        categories = await self.db_manager.execute_query(categories_query)
        
        menu = []
        for cat in categories:
            category = {
                "id": cat['id'],
                "name": cat['name'],
                "description": cat['description'],
                "position": cat['position'],
                "items": []
            }
            
            # Get items for this category
            items_query = """
                SELECT id, name, description, price 
                FROM menu_items 
                WHERE category_id = $1 AND is_active = TRUE
                ORDER BY name
            """
            items = await self.db_manager.execute_query(items_query, cat['id'])
            
            for item in items:
                # Add food cost calculation
                food_cost = await self.recipe_engine.calculate_food_costs(item['id'])
                category["items"].append({
                    "id": item['id'],
                    "name": item['name'],
                    "description": item['description'],
                    "price": item['price'],
                    "food_cost": food_cost,
                    "profit_margin": item['price'] - food_cost
                })
            
            menu.append(category)
        
        return menu
    
    async def get_tables(self) -> List[Table]:
        """Get all tables with their status"""
        query = "SELECT * FROM tables ORDER BY table_number"
        results = await self.db_manager.execute_query(query)
        
        return [
            Table(
                id=row['id'],
                table_number=row['table_number'],
                capacity=row['capacity'],
                status=TableStatus(row['status'])
            )
            for row in results
        ]
    
    async def create_order(self, table_id: int, customer_name: Optional[str], 
                          employee_id: int, items: List[Dict]) -> Optional[Order]:
        """Create a new order with items"""
        try:
            async with self.db_manager.pool.acquire() as conn:
                async with conn.transaction():
                    # Check if table is available
                    table_query = "SELECT status FROM tables WHERE id = $1"
                    table_result = await conn.fetchrow(table_query, table_id)
                    
                    if not table_result or table_result['status'] != 'available':
                        raise ValueError("Table is not available")
                    
                    # Update table status
                    await conn.execute("UPDATE tables SET status = 'occupied' WHERE id = $1", table_id)
                    
                    # Insert order
                    order_query = """
                        INSERT INTO orders (table_id, customer_name, employee_id, status, total_amount)
                        VALUES ($1, $2, $3, 'pending', 0.00)
                        RETURNING id, table_id, customer_name, employee_id, status, created_at, total_amount
                    """
                    order_result = await conn.fetchrow(
                        order_query, table_id, customer_name, employee_id
                    )
                    
                    order_id = order_result['id']
                    total_amount = Decimal('0.00')
                    order_items = []
                    
                    # Process each item
                    for item_data in items:
                        menu_item_id = item_data['menu_item_id']
                        quantity = item_data['quantity']
                        
                        # Verify ingredient availability
                        is_available, missing = await self.recipe_engine.check_sufficient_ingredients(
                            menu_item_id, quantity
                        )
                        if not is_available:
                            raise ValueError(f"Insufficient ingredients: {', '.join(missing)}")
                        
                        # Get menu item price
                        price_query = "SELECT price FROM menu_items WHERE id = $1"
                        price_result = await conn.fetchrow(price_query, menu_item_id)
                        
                        if not price_result:
                            raise ValueError(f"Menu item {menu_item_id} not found")
                        
                        unit_price = price_result['price']
                        total_price = unit_price * quantity
                        
                        # Insert order item
                        item_query = """
                            INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, status)
                            VALUES ($1, $2, $3, $4, $5, 'ordered')
                            RETURNING id, order_id, menu_item_id, quantity, unit_price, total_price, status
                        """
                        item_result = await conn.fetchrow(
                            item_query, order_id, menu_item_id, quantity, unit_price, total_price
                        )
                        
                        order_items.append(OrderItem(
                            id=item_result['id'],
                            order_id=item_result['order_id'],
                            menu_item_id=item_result['menu_item_id'],
                            quantity=item_result['quantity'],
                            unit_price=item_result['unit_price'],
                            total_price=item_result['total_price'],
                            status=OrderItemStatus(item_result['status'])
                        ))
                        
                        total_amount += total_price
                    
                    # Update order total
                    update_total_query = "UPDATE orders SET total_amount = $1 WHERE id = $2"
                    await conn.execute(update_total_query, total_amount, order_id)
                    
                    # Update inventory
                    await self.recipe_engine.update_inventory_for_order(order_id)
                    
                    # Create complete order object
                    return Order(
                        id=order_result['id'],
                        table_id=order_result['table_id'],
                        customer_name=order_result['customer_name'],
                        employee_id=order_result['employee_id'],
                        status=OrderStatus(order_result['status']),
                        created_at=order_result['created_at'],
                        items=order_items,
                        total_amount=total_amount
                    )
        except Exception as e:
            logger.error(f"Error creating order: {e}")
            return None
    
    async def update_order_status(self, order_id: int, status: OrderStatus) -> bool:
        """Update order status"""
        try:
            query = "UPDATE orders SET status = $1 WHERE id = $2"
            result = await self.db_manager.execute_query(query, status.value, order_id)
            return True
        except Exception as e:
            logger.error(f"Error updating order status: {e}")
            return False


# Core Module: KDS (Kitchen Display System)
class KDSManager:
    """Manages Kitchen Display System operations"""
    
    def __init__(self, db_manager: DatabaseManager, redis_client):
        self.db_manager = db_manager
        self.redis_client = redis_client
    
    async def get_orders_for_kitchen(self, status_filter: Optional[OrderItemStatus] = None) -> List[Dict]:
        """Get orders for kitchen display, optionally filtered by status"""
        query = """
            SELECT o.id as order_id, o.table_id, o.customer_name, o.status as order_status,
                   oi.id as item_id, oi.menu_item_id, oi.quantity, oi.status as item_status,
                   mi.name as item_name, mi.description as item_description,
                   o.created_at as order_created_at
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE oi.status IN ('ordered', 'preparing', 'ready')
        """
        
        params = []
        param_index = 1
        
        if status_filter:
            query += f" AND oi.status = ${param_index}"
            params.append(status_filter.value)
            param_index += 1
        
        query += " ORDER BY oi.status, o.created_at"
        
        results = await self.db_manager.execute_query(query, *params)
        
        # Group by order
        orders_map = {}
        for result in results:
            order_id = result['order_id']
            
            if order_id not in orders_map:
                orders_map[order_id] = {
                    "order_id": result['order_id'],
                    "table_id": result['table_id'],
                    "customer_name": result['customer_name'],
                    "order_status": result['order_status'],
                    "order_created_at": result['order_created_at'],
                    "items": []
                }
            
            orders_map[order_id]["items"].append({
                "id": result['item_id'],
                "menu_item_id": result['menu_item_id'],
                "name": result['item_name'],
                "description": result['item_description'],
                "quantity": result['quantity'],
                "status": result['item_status']
            })
        
        return list(orders_map.values())
    
    async def update_order_item_status(self, order_item_id: int, status: OrderItemStatus) -> bool:
        """Update status of an order item"""
        try:
            # Update item status
            query = "UPDATE order_items SET status = $1 WHERE id = $2 RETURNING order_id"
            result = await self.db_manager.execute_one(query, status.value, order_item_id)
            
            if not result:
                return False
            
            order_id = result['order_id']
            
            # Check if all items in order are ready/served to update order status
            check_query = """
                SELECT COUNT(*) as pending_items 
                FROM order_items 
                WHERE order_id = $1 AND status NOT IN ('ready', 'served')
            """
            pending_result = await self.db_manager.execute_one(check_query, order_id)
            
            if pending_result['pending_items'] == 0:
                # All items are ready or served, update order status
                await self.db_manager.execute_query("UPDATE orders SET status = 'ready' WHERE id = $1", order_id)
            
            # Publish update to Redis for real-time notifications
            await self.redis_client.publish("kds_updates", json.dumps({
                "type": "item_status_update",
                "order_item_id": order_item_id,
                "new_status": status.value,
                "order_id": order_id
            }))
            
            return True
        except Exception as e:
            logger.error(f"Error updating order item status: {e}")
            return False
    
    async def notify_kitchen_new_order(self, order_id: int):
        """Notify kitchen about a new order"""
        await self.redis_client.publish("kds_updates", json.dumps({
            "type": "new_order",
            "order_id": order_id
        }))


# Core Module: Analytics
class AnalyticsManager:
    """Provides analytical reports and insights"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    async def get_sales_report(self, start_date: Optional[datetime] = None, 
                              end_date: Optional[datetime] = None) -> Dict:
        """Get sales report with key metrics"""
        query = """
            SELECT 
                SUM(total_amount) as total_revenue,
                COUNT(*) as total_orders,
                AVG(total_amount) as average_order_value,
                SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue
            FROM orders
        """
        
        params = []
        if start_date:
            query += " WHERE created_at >= $1"
            params.append(start_date)
            if end_date:
                query += " AND created_at <= $" + str(len(params) + 1)
                params.append(end_date)
        elif end_date:
            query += " WHERE created_at <= $1"
            params.append(end_date)
        
        result = await self.db_manager.execute_one(query, *params)
        
        return {
            "total_revenue": result['total_revenue'] or Decimal('0.00'),
            "total_orders": result['total_orders'] or 0,
            "average_order_value": result['average_order_value'] or Decimal('0.00'),
            "paid_revenue": result['paid_revenue'] or Decimal('0.00')
        }
    
    async def get_top_selling_items(self, limit: int = 10, 
                                   start_date: Optional[datetime] = None,
                                   end_date: Optional[datetime] = None) -> List[Dict]:
        """Get top selling menu items"""
        query = """
            SELECT 
                mi.name,
                mi.description,
                mi.price,
                SUM(oi.quantity) as total_sold,
                SUM(oi.total_price) as total_revenue,
                r.total_cost,
                (SUM(oi.total_price) - r.total_cost) as profit
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            JOIN orders o ON oi.order_id = o.id
            LEFT JOIN (
                SELECT 
                    oi2.menu_item_id,
                    SUM(oi2.quantity * r2.quantity_needed * i.cost_per_unit) as total_cost
                FROM order_items oi2
                JOIN recipes r2 ON oi2.menu_item_id = r2.menu_item_id
                JOIN ingredients i ON r2.ingredient_id = i.id
                JOIN orders o2 ON oi2.order_id = o2.id
                WHERE o2.status = 'paid'
        """
        
        params = [limit]
        param_index = 1
        
        if start_date:
            query += f" AND o2.created_at >= ${param_index + 1}"
            params.append(start_date)
            param_index += 1
        if end_date:
            query += f" AND o2.created_at <= ${param_index + 1}"
            params.append(end_date)
            param_index += 1
        
        query += """
            GROUP BY oi2.menu_item_id
            ) r ON mi.id = r.menu_item_id
            WHERE o.status = 'paid'
        """
        
        if start_date:
            query += f" AND o.created_at >= ${param_index + 1}"
            params.append(start_date)
            param_index += 1
        if end_date:
            query += f" AND o.created_at <= ${param_index + 1}"
            params.append(end_date)
            param_index += 1
        
        query += """
            GROUP BY mi.id, mi.name, mi.description, mi.price, r.total_cost
            ORDER BY total_sold DESC
            LIMIT $1
        """
        
        results = await self.db_manager.execute_query(query, *params)
        
        return [
            {
                "name": row['name'],
                "description": row['description'],
                "price": row['price'],
                "total_sold": row['total_sold'],
                "total_revenue": row['total_revenue'] or Decimal('0.00'),
                "total_cost": row['total_cost'] or Decimal('0.00'),
                "profit": row['profit'] or Decimal('0.00')
            }
            for row in results
        ]
    
    async def get_inventory_turnover(self) -> List[Dict]:
        """Get inventory turnover rates"""
        query = """
            SELECT 
                i.name,
                i.stock_quantity,
                SUM(oi.quantity * r.quantity_needed) as consumed_last_month,
                CASE 
                    WHEN SUM(oi.quantity * r.quantity_needed) > 0 
                    THEN i.stock_quantity / SUM(oi.quantity * r.quantity_needed)
                    ELSE i.stock_quantity
                END as turnover_days
            FROM ingredients i
            LEFT JOIN recipes r ON i.id = r.ingredient_id
            LEFT JOIN order_items oi ON r.menu_item_id = oi.menu_item_id
            LEFT JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'paid' AND o.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY i.id, i.name, i.stock_quantity
            ORDER BY turnover_days ASC
        """
        results = await self.db_manager.execute_query(query)
        
        return [
            {
                "name": row['name'],
                "current_stock": row['stock_quantity'],
                "consumed_last_month": row['consumed_last_month'] or 0,
                "turnover_days": float(row['turnover_days'])
            }
            for row in results
        ]


# Main Application Class
class URYRestaurantOS:
    """Main application class that combines all core modules"""
    
    def __init__(self, db_dsn: str, redis_url: str = "redis://localhost:6379"):
        self.db_manager = DatabaseManager(db_dsn)
        self.redis_client = None
        self.redis_url = redis_url
        
        # Initialize core modules
        self.pos_manager = None
        self.kds_manager = None
        self.inventory_manager = None
        self.analytics_manager = None
        self.recipe_engine = None
    
    async def initialize(self):
        """Initialize all components"""
        # Initialize database
        await self.db_manager.initialize()
        
        # Initialize Redis
        self.redis_client = await redis.from_url(self.redis_url, decode_responses=True)
        
        # Initialize core modules with dependencies
        self.recipe_engine = RecipeEngine(self.db_manager)
        self.inventory_manager = InventoryManager(self.db_manager)
        self.pos_manager = POSManager(self.db_manager)
        self.kds_manager = KDSManager(self.db_manager, self.redis_client)
        self.analytics_manager = AnalyticsManager(self.db_manager)
        
        logger.info("URY Restaurant OS initialized successfully")
    
    async def shutdown(self):
        """Shutdown all components"""
        if self.redis_client:
            await self.redis_client.close()
        if self.db_manager.pool:
            await self.db_manager.pool.close()
    
    async def process_sample_order(self):
        """Process a sample order to demonstrate the system"""
        # First, let's add some sample data
        # Add a category
        await self.db_manager.execute_query(
            "INSERT INTO categories (name, description) VALUES ('Pizza', 'Delicious pizzas') ON CONFLICT DO NOTHING"
        )
        
        # Add an ingredient
        await self.db_manager.execute_query(
            "INSERT INTO ingredients (name, unit, cost_per_unit, stock_quantity, min_stock_level) "
            "VALUES ('Flour', 'kg', 1.50, 50.00, 10.00) ON CONFLICT DO NOTHING"
        )
        
        # Add a menu item
        await self.db_manager.execute_query(
            "INSERT INTO menu_items (name, description, price, category_id) "
            "SELECT 'Margherita Pizza', 'Classic pizza with tomato sauce and mozzarella', 12.99, id "
            "FROM categories WHERE name = 'Pizza' ON CONFLICT DO NOTHING"
        )
        
        # Add a recipe link
        await self.db_manager.execute_query(
            "INSERT INTO recipes (menu_item_id, ingredient_id, quantity_needed) "
            "SELECT mi.id, i.id, 0.2 "
            "FROM menu_items mi, ingredients i "
            "WHERE mi.name = 'Margherita Pizza' AND i.name = 'Flour' ON CONFLICT DO NOTHING"
        )
        
        # Add a table
        await self.db_manager.execute_query(
            "INSERT INTO tables (table_number, capacity) VALUES (1, 4) ON CONFLICT DO NOTHING"
        )
        
        # Add a user
        await self.db_manager.execute_query(
            "INSERT INTO users (username, email, hashed_password, role) "
            "VALUES ('waiter1', 'waiter@example.com', 'hashed_password', 'waiter') ON CONFLICT DO NOTHING"
        )
        
        # Now create an order
        sample_items = [{"menu_item_id": 1, "quantity": 2}]  # 2 Margherita pizzas
        order = await self.pos_manager.create_order(
            table_id=1, 
            customer_name="John Doe", 
            employee_id=1, 
            items=sample_items
        )
        
        if order:
            logger.info(f"Successfully created order #{order.id} for table 1")
            
            # Get kitchen orders
            kitchen_orders = await self.kds_manager.get_orders_for_kitchen()
            logger.info(f"Kitchen has {len(kitchen_orders)} orders to prepare")
            
            # Update an item status to preparing
            if order.items:
                success = await self.kds_manager.update_order_item_status(
                    order.items[0].id, OrderItemStatus.PREPARING
                )
                if success:
                    logger.info(f"Updated order item {order.items[0].id} to preparing")
            
            # Get analytics
            sales_report = await self.analytics_manager.get_sales_report()
            logger.info(f"Sales report: Total revenue = {sales_report['total_revenue']}")
            
            # Get inventory alerts
            low_stock = await self.inventory_manager.get_low_stock_alerts()
            logger.info(f"Low stock alerts: {len(low_stock)} items")
            
            return order
        else:
            logger.error("Failed to create order")
            return None


# Example usage
async def main():
    """Example usage of the URY Restaurant OS"""
    # Initialize the system
    # Note: You would need to have PostgreSQL and Redis running
    # For this example, we'll use placeholder connection strings
    app = URYRestaurantOS("postgresql://user:password@localhost/ury_restaurant_db")
    
    try:
        await app.initialize()
        
        # Process a sample order to demonstrate functionality
        order = await app.process_sample_order()
        
        if order:
            print(f"Successfully processed order #{order.id}")
            print(f"Total amount: {order.total_amount}")
            print(f"Items: {len(order.items)}")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")
    finally:
        await app.shutdown()


if __name__ == "__main__":
    asyncio.run(main())