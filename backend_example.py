"""
URY Restaurant OS - Backend Example Implementation
This demonstrates a FastAPI backend implementation with key components
"""
from datetime import datetime, timedelta
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncpg
import redis.asyncio as redis
import jwt
import hashlib
import uuid
from decimal import Decimal


# Security constants
SECRET_KEY = "ury_restaurant_secret_key_change_in_production"
ALGORITHM = "HS256"


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


# Pydantic models
class UserBase(BaseModel):
    username: str
    email: str
    role: UserRole


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    position: int = 0


class Category(CategoryBase):
    id: int


class MenuItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    category_id: int
    is_active: bool = True


class MenuItem(MenuItemBase):
    id: int
    created_at: datetime


class IngredientBase(BaseModel):
    name: str
    unit: str
    cost_per_unit: Decimal
    stock_quantity: Decimal = 0
    min_stock_level: Decimal = 0
    supplier_info: Optional[str] = None


class Ingredient(IngredientBase):
    id: int


class RecipeItem(BaseModel):
    menu_item_id: int
    ingredient_id: int
    quantity_needed: Decimal


class TableBase(BaseModel):
    table_number: int
    capacity: int
    status: str = "available"


class Table(TableBase):
    id: int


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int


class OrderCreate(BaseModel):
    table_id: int
    customer_name: Optional[str] = None
    employee_id: int
    items: List[OrderItemCreate]


class OrderItem(BaseModel):
    id: int
    order_id: int
    menu_item_id: int
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    status: OrderItemStatus = OrderItemStatus.ORDERED


class Order(BaseModel):
    id: int
    table_id: int
    customer_name: Optional[str] = None
    employee_id: int
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime
    items: List[OrderItem]
    total_amount: Decimal


class InventoryTransactionBase(BaseModel):
    ingredient_id: int
    transaction_type: TransactionType
    quantity: Decimal
    unit_cost: Decimal
    reference_id: Optional[int] = None


class InventoryTransaction(InventoryTransactionBase):
    id: int
    transaction_date: datetime
    total_cost: Decimal


# Authentication helpers
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """
    Verify JWT token and return current user
    """
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        # In a real implementation, fetch user from database
        # For demo purposes, return a mock user
        return User(
            id=user_id,
            username="demo_user",
            email="demo@example.com",
            role=UserRole.WAITER,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


def verify_permissions(user: User, required_role: UserRole) -> bool:
    """
    Check if user has required permissions
    """
    role_hierarchy = {
        UserRole.ADMIN: 4,
        UserRole.MANAGER: 3,
        UserRole.WAITER: 2,
        UserRole.COOK: 1
    }
    
    return role_hierarchy[user.role] >= role_hierarchy[required_role]


# Database connection pool
class DatabaseConnection:
    def __init__(self):
        self.pool = None
    
    async def init_pool(self):
        self.pool = await asyncpg.create_pool(
            host="localhost",
            port=5432,
            user="ury_user",
            password="ury_password",
            database="ury_restaurant_db",
            min_size=5,
            max_size=20
        )
    
    async def get_connection(self):
        if self.pool is None:
            await self.init_pool()
        return await self.pool.acquire()
    
    async def release_connection(self, conn):
        await self.pool.release(conn)


db_conn = DatabaseConnection()


# Redis connection
redis_client = None


async def get_redis():
    global redis_client
    if redis_client is None:
        redis_client = await redis.from_url("redis://localhost:6379", decode_responses=True)
    return redis_client


# Background tasks
async def send_notification(notification_data: dict):
    """
    Send notification to relevant parties
    """
    r = await get_redis()
    await r.publish("notifications", str(notification_data))


async def update_inventory_after_order(order_id: int):
    """
    Background task to update inventory after order is confirmed
    """
    # Get order details
    conn = await db_conn.get_connection()
    try:
        # Fetch order and items
        order_query = "SELECT * FROM orders WHERE id = $1"
        order_record = await conn.fetchrow(order_query, order_id)
        
        if not order_record:
            return
        
        items_query = "SELECT * FROM order_items WHERE order_id = $1"
        items_records = await conn.fetch(items_query, order_id)
        
        # Process each item to update inventory
        for item_record in items_records:
            menu_item_id = item_record['menu_item_id']
            
            # Get recipe for this menu item
            recipe_query = """
                SELECT ingredient_id, quantity_needed 
                FROM recipes 
                WHERE menu_item_id = $1
            """
            recipes = await conn.fetch(recipe_query, menu_item_id)
            
            for recipe in recipes:
                ingredient_id = recipe['ingredient_id']
                quantity_needed = recipe['quantity_needed']
                item_quantity = item_record['quantity']
                
                # Update ingredient stock
                total_consumed = quantity_needed * item_quantity
                update_query = """
                    UPDATE ingredients 
                    SET stock_quantity = stock_quantity - $1
                    WHERE id = $2 AND stock_quantity >= $1
                    RETURNING stock_quantity
                """
                result = await conn.fetchrow(update_query, total_consumed, ingredient_id)
                
                if result:
                    # Check if low stock alert is needed
                    current_stock = result['stock_quantity']
                    min_level_query = "SELECT min_stock_level FROM ingredients WHERE id = $1"
                    min_level_record = await conn.fetchrow(min_level_query, ingredient_id)
                    
                    if min_level_record and current_stock <= min_level_record['min_stock_level']:
                        # Send low stock notification
                        await send_notification({
                            "type": "low_stock",
                            "ingredient_id": ingredient_id,
                            "current_stock": current_stock,
                            "min_level": min_level_record['min_stock_level']
                        })
                        
                        # Log low stock event
                        log_query = """
                            INSERT INTO inventory_logs (ingredient_id, event_type, message, timestamp)
                            VALUES ($1, 'LOW_STOCK_ALERT', $2, NOW())
                        """
                        await conn.execute(log_query, ingredient_id, f"Low stock alert: {current_stock}")
    finally:
        await db_conn.release_connection(conn)


# FastAPI app
app = FastAPI(title="URY Restaurant OS API", version="1.0.0")


@app.on_event("startup")
async def startup():
    await db_conn.init_pool()


# Authentication endpoints
@app.post("/auth/login", response_model=dict)
async def login(username: str, password: str):
    """
    Authenticate user and return JWT token
    """
    conn = await db_conn.get_connection()
    try:
        # Hash password for comparison
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        # Query user from database
        query = """
            SELECT id, username, email, role, hashed_password
            FROM users
            WHERE username = $1 AND hashed_password = $2
        """
        user_record = await conn.fetchrow(query, username, hashed_password)
        
        if not user_record:
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        
        # Generate JWT token
        token_data = {
            "sub": str(user_record['id']),
            "username": user_record['username'],
            "role": user_record['role'],
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user_record['id'],
                "username": user_record['username'],
                "email": user_record['email'],
                "role": user_record['role']
            }
        }
    finally:
        await db_conn.release_connection(conn)


# POS endpoints
@app.get("/pos/tables", response_model=List[Table])
async def get_tables(current_user: User = Depends(get_current_user)):
    """
    Get all tables and their status
    """
    if not verify_permissions(current_user, UserRole.WAITER):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = await db_conn.get_connection()
    try:
        query = "SELECT * FROM tables ORDER BY table_number"
        records = await conn.fetch(query)
        
        return [Table(
            id=record['id'],
            table_number=record['table_number'],
            capacity=record['capacity'],
            status=record['status']
        ) for record in records]
    finally:
        await db_conn.release_connection(conn)


@app.get("/pos/menu", response_model=List[dict])
async def get_menu(current_user: User = Depends(get_current_user)):
    """
    Get menu with categories and items
    """
    conn = await db_conn.get_connection()
    try:
        # Get categories
        categories_query = "SELECT * FROM categories ORDER BY position, name"
        categories_records = await conn.fetch(categories_query)
        
        menu = []
        for cat_record in categories_records:
            category = {
                "id": cat_record['id'],
                "name": cat_record['name'],
                "description": cat_record['description'],
                "position": cat_record['position'],
                "items": []
            }
            
            # Get items for this category
            items_query = """
                SELECT id, name, description, price 
                FROM menu_items 
                WHERE category_id = $1 AND is_active = TRUE
                ORDER BY name
            """
            items_records = await conn.fetch(items_query, cat_record['id'])
            
            for item_record in items_records:
                category["items"].append({
                    "id": item_record['id'],
                    "name": item_record['name'],
                    "description": item_record['description'],
                    "price": item_record['price']
                })
            
            menu.append(category)
        
        return menu
    finally:
        await db_conn.release_connection(conn)


@app.post("/pos/orders", response_model=Order)
async def create_order(
    order_data: OrderCreate, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new order
    """
    if not verify_permissions(current_user, UserRole.WAITER):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = await db_conn.get_connection()
    try:
        # Begin transaction
        async with conn.transaction():
            # Check if table is available
            table_query = "SELECT status FROM tables WHERE id = $1"
            table_record = await conn.fetchrow(table_query, order_data.table_id)
            
            if not table_record or table_record['status'] != 'available':
                raise HTTPException(status_code=400, detail="Table is not available")
            
            # Update table status
            await conn.execute("UPDATE tables SET status = 'occupied' WHERE id = $1", order_data.table_id)
            
            # Insert order
            order_query = """
                INSERT INTO orders (table_id, customer_name, employee_id, status, created_at)
                VALUES ($1, $2, $3, $4, NOW())
                RETURNING id, table_id, customer_name, employee_id, status, created_at
            """
            order_record = await conn.fetchrow(
                order_query,
                order_data.table_id,
                order_data.customer_name,
                order_data.employee_id,
                'pending'
            )
            
            # Calculate total amount and insert order items
            total_amount = Decimal('0.00')
            order_items = []
            
            for item_data in order_data.items:
                # Get menu item price
                price_query = "SELECT price FROM menu_items WHERE id = $1"
                price_record = await conn.fetchrow(price_query, item_data.menu_item_id)
                
                if not price_record:
                    raise HTTPException(status_code=400, detail=f"Menu item {item_data.menu_item_id} not found")
                
                unit_price = price_record['price']
                total_price = unit_price * item_data.quantity
                
                # Insert order item
                item_query = """
                    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id, order_id, menu_item_id, quantity, unit_price, total_price, status
                """
                item_record = await conn.fetchrow(
                    item_query,
                    order_record['id'],
                    item_data.menu_item_id,
                    item_data.quantity,
                    unit_price,
                    total_price,
                    'ordered'
                )
                
                order_items.append(OrderItem(**dict(item_record)))
                total_amount += total_price
            
            # Update order total
            update_total_query = "UPDATE orders SET total_amount = $1 WHERE id = $2"
            await conn.execute(update_total_query, total_amount, order_record['id'])
            
            # Create complete order object
            order = Order(
                id=order_record['id'],
                table_id=order_record['table_id'],
                customer_name=order_record['customer_name'],
                employee_id=order_record['employee_id'],
                status=OrderStatus(order_record['status']),
                created_at=order_record['created_at'],
                items=order_items,
                total_amount=total_amount
            )
            
            # Trigger background task to update inventory
            background_tasks.add_task(update_inventory_after_order, order.id)
            
            # Send notification about new order
            background_tasks.add_task(send_notification, {
                "type": "new_order",
                "order_id": order.id,
                "table_number": order_record['table_id'],
                "items_count": len(order_data.items)
            })
            
            return order
    finally:
        await db_conn.release_connection(conn)


# Kitchen Display System endpoints
@app.get("/kds/orders", response_model=List[dict])
async def get_kitchen_orders(
    status: Optional[OrderItemStatus] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get orders for kitchen display system
    """
    if current_user.role not in [UserRole.COOK, UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = await db_conn.get_connection()
    try:
        # Base query to get orders with items that need preparation
        query = """
            SELECT o.id as order_id, o.table_id, o.customer_name, o.status as order_status,
                   oi.id as item_id, oi.menu_item_id, oi.quantity, oi.status as item_status,
                   mi.name as item_name, mi.description as item_description
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE oi.status IN ('ordered', 'preparing', 'ready')
        """
        
        params = []
        param_index = 1
        
        if status:
            query += f" AND oi.status = ${param_index}"
            params.append(status.value)
            param_index += 1
        
        query += " ORDER BY oi.status, o.created_at"
        
        records = await conn.fetch(query, *params)
        
        # Group by order
        orders_map = {}
        for record in records:
            order_id = record['order_id']
            
            if order_id not in orders_map:
                orders_map[order_id] = {
                    "order_id": order_id,
                    "table_id": record['table_id'],
                    "customer_name": record['customer_name'],
                    "order_status": record['order_status'],
                    "items": []
                }
            
            orders_map[order_id]["items"].append({
                "id": record['item_id'],
                "menu_item_id": record['menu_item_id'],
                "name": record['item_name'],
                "description": record['item_description'],
                "quantity": record['quantity'],
                "status": record['item_status']
            })
        
        return list(orders_map.values())
    finally:
        await db_conn.release_connection(conn)


@app.put("/kds/orders/{order_item_id}/status", response_model=dict)
async def update_order_item_status(
    order_item_id: int,
    status: OrderItemStatus,
    current_user: User = Depends(get_current_user)
):
    """
    Update status of an order item (for kitchen staff)
    """
    if current_user.role not in [UserRole.COOK, UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = await db_conn.get_connection()
    try:
        # Update item status
        query = """
            UPDATE order_items 
            SET status = $1 
            WHERE id = $2
            RETURNING order_id, menu_item_id, quantity, status
        """
        record = await conn.fetchrow(query, status.value, order_item_id)
        
        if not record:
            raise HTTPException(status_code=404, detail="Order item not found")
        
        # Check if all items in order are ready/served to update order status
        order_id = record['order_id']
        check_query = """
            SELECT COUNT(*) as pending_items 
            FROM order_items 
            WHERE order_id = $1 AND status NOT IN ('ready', 'served')
        """
        pending_result = await conn.fetchrow(check_query, order_id)
        
        if pending_result['pending_items'] == 0:
            # All items are ready or served, update order status
            await conn.execute("UPDATE orders SET status = 'ready' WHERE id = $1", order_id)
        
        # Send notification
        await send_notification({
            "type": "order_item_status_update",
            "order_item_id": order_item_id,
            "new_status": status.value,
            "order_id": order_id
        })
        
        return {"message": "Status updated successfully", "order_item_id": order_item_id, "new_status": status.value}
    finally:
        await db_conn.release_connection(conn)


# Inventory endpoints
@app.get("/inventory/ingredients", response_model=List[Ingredient])
async def get_ingredients(
    low_stock_only: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    Get all ingredients with stock levels
    """
    if not verify_permissions(current_user, UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = await db_conn.get_connection()
    try:
        query = "SELECT * FROM ingredients"
        params = []
        
        if low_stock_only:
            query += " WHERE stock_quantity <= min_stock_level"
        
        query += " ORDER BY name"
        
        records = await conn.fetch(query, *params)
        
        return [Ingredient(
            id=record['id'],
            name=record['name'],
            unit=record['unit'],
            cost_per_unit=record['cost_per_unit'],
            stock_quantity=record['stock_quantity'],
            min_stock_level=record['min_stock_level'],
            supplier_info=record['supplier_info']
        ) for record in records]
    finally:
        await db_conn.release_connection(conn)


@app.post("/inventory/transactions", response_model=InventoryTransaction)
async def create_inventory_transaction(
    transaction: InventoryTransactionBase,
    current_user: User = Depends(get_current_user)
):
    """
    Create an inventory transaction (purchase, consumption, etc.)
    """
    if not verify_permissions(current_user, UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = await db_conn.get_connection()
    try:
        total_cost = transaction.quantity * transaction.unit_cost
        
        query = """
            INSERT INTO inventory_transactions 
            (ingredient_id, transaction_type, quantity, unit_cost, total_cost, reference_id, transaction_date)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id, ingredient_id, transaction_type, quantity, unit_cost, total_cost, reference_id, transaction_date
        """
        record = await conn.fetchrow(
            query,
            transaction.ingredient_id,
            transaction.transaction_type.value,
            transaction.quantity,
            transaction.unit_cost,
            transaction.reference_id
        )
        
        # Update ingredient stock based on transaction type
        if transaction.transaction_type == TransactionType.PURCHASE:
            # Add to stock
            update_query = """
                UPDATE ingredients 
                SET stock_quantity = stock_quantity + $1 
                WHERE id = $2
            """
        elif transaction.transaction_type in [TransactionType.CONSUMPTION, TransactionType.WASTE]:
            # Subtract from stock
            update_query = """
                UPDATE ingredients 
                SET stock_quantity = stock_quantity - $1 
                WHERE id = $2 AND stock_quantity >= $1
            """
        else:
            # Adjustment - can be positive or negative
            update_query = """
                UPDATE ingredients 
                SET stock_quantity = stock_quantity + $1 
                WHERE id = $2
            """
        
        result = await conn.execute(update_query, transaction.quantity, transaction.ingredient_id)
        
        if transaction.transaction_type in [TransactionType.CONSUMPTION, TransactionType.WASTE]:
            # Check if update affected any rows (sufficient stock existed)
            if result.split()[1] == '0':  # Assuming the result format includes row count
                raise HTTPException(status_code=400, detail="Insufficient stock for this transaction")
        
        return InventoryTransaction(
            id=record['id'],
            ingredient_id=record['ingredient_id'],
            transaction_type=TransactionType(record['transaction_type']),
            quantity=record['quantity'],
            unit_cost=record['unit_cost'],
            total_cost=record['total_cost'],
            reference_id=record['reference_id'],
            transaction_date=record['transaction_date']
        )
    finally:
        await db_conn.release_connection(conn)


# Analytics endpoints
@app.get("/analytics/sales", response_model=dict)
async def get_sales_analytics(
    start_date: str = None,
    end_date: str = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get sales analytics
    """
    if not verify_permissions(current_user, UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = await db_conn.get_connection()
    try:
        # Get total sales
        query = """
            SELECT 
                SUM(total_amount) as total_revenue,
                COUNT(*) as total_orders,
                AVG(total_amount) as average_order_value
            FROM orders
            WHERE status = 'paid'
        """
        
        if start_date:
            query += " AND created_at >= $1"
        if end_date:
            query += " AND created_at <= $2" if not start_date else " AND created_at <= $1"
        
        params = []
        if start_date:
            params.append(start_date)
        if end_date:
            params.append(end_date)
        
        record = await conn.fetchrow(query, *params)
        
        return {
            "total_revenue": record['total_revenue'] or 0,
            "total_orders": record['total_orders'] or 0,
            "average_order_value": record['average_order_value'] or 0
        }
    finally:
        await db_conn.release_connection(conn)


@app.get("/analytics/popular-items", response_model=List[dict])
async def get_popular_items(
    limit: int = 10,
    start_date: str = None,
    end_date: str = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get popular menu items based on sales
    """
    if not verify_permissions(current_user, UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = await db_conn.get_connection()
    try:
        query = """
            SELECT 
                mi.name,
                mi.description,
                mi.price,
                SUM(oi.quantity) as total_sold,
                SUM(oi.total_price) as total_revenue
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'paid'
        """
        
        params = [limit]
        param_index = 1
        
        if start_date:
            query += f" AND o.created_at >= ${param_index + 1}"
            params.append(start_date)
            param_index += 1
        if end_date:
            query += f" AND o.created_at <= ${param_index + 1}"
            params.append(end_date)
            param_index += 1
        
        query += """
            GROUP BY mi.id, mi.name, mi.description, mi.price
            ORDER BY total_sold DESC
            LIMIT $1
        """
        
        records = await conn.fetch(query, *params)
        
        return [{
            "name": record['name'],
            "description": record['description'],
            "price": record['price'],
            "total_sold": record['total_sold'],
            "total_revenue": record['total_revenue']
        } for record in records]
    finally:
        await db_conn.release_connection(conn)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)