#!/usr/bin/env python3
"""
URY-inspired Restaurant Management System
A simplified production-ready restaurant management system
"""

import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional
import os


class DatabaseManager:
    """Manages database connections and operations"""
    
    def __init__(self, db_path: str = "restaurant.db"):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS menu_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                category TEXT,
                is_active BOOLEAN DEFAULT 1
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_number INTEGER UNIQUE NOT NULL,
                capacity INTEGER NOT NULL,
                is_available BOOLEAN DEFAULT 1
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_id INTEGER,
                customer_name TEXT,
                status TEXT DEFAULT 'pending',
                total_amount REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (table_id) REFERENCES tables (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                menu_item_id INTEGER,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
            )
        ''')
        
        conn.commit()
        conn.close()


class MenuItem:
    """Represents a menu item"""
    
    def __init__(self, id: int, name: str, description: str, price: float, category: str, is_active: bool = True):
        self.id = id
        self.name = name
        self.description = description
        self.price = price
        self.category = category
        self.is_active = is_active
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'category': self.category,
            'is_active': self.is_active
        }


class Table:
    """Represents a restaurant table"""
    
    def __init__(self, id: int, table_number: int, capacity: int, is_available: bool = True):
        self.id = id
        self.table_number = table_number
        self.capacity = capacity
        self.is_available = is_available
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'table_number': self.table_number,
            'capacity': self.capacity,
            'is_available': self.is_available
        }


class OrderItem:
    """Represents an item in an order"""
    
    def __init__(self, id: int, order_id: int, menu_item_id: int, quantity: int, price: float):
        self.id = id
        self.order_id = order_id
        self.menu_item_id = menu_item_id
        self.quantity = quantity
        self.price = price
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'order_id': self.order_id,
            'menu_item_id': self.menu_item_id,
            'quantity': self.quantity,
            'price': self.price
        }


class Order:
    """Represents a customer order"""
    
    def __init__(self, id: int, table_id: int, customer_name: str, status: str = 'pending', total_amount: float = 0):
        self.id = id
        self.table_id = table_id
        self.customer_name = customer_name
        self.status = status
        self.total_amount = total_amount
        self.created_at = datetime.now()
        self.items: List[OrderItem] = []
    
    def add_item(self, menu_item: MenuItem, quantity: int):
        """Add an item to the order"""
        item = OrderItem(
            id=0,  # Will be set by database
            order_id=self.id,
            menu_item_id=menu_item.id,
            quantity=quantity,
            price=menu_item.price
        )
        self.items.append(item)
        self.total_amount += menu_item.price * quantity
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'table_id': self.table_id,
            'customer_name': self.customer_name,
            'status': self.status,
            'total_amount': self.total_amount,
            'created_at': self.created_at.isoformat(),
            'items': [item.to_dict() for item in self.items]
        }


class MenuManager:
    """Manages menu items"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def add_menu_item(self, name: str, description: str, price: float, category: str) -> MenuItem:
        """Add a new menu item"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO menu_items (name, description, price, category)
            VALUES (?, ?, ?, ?)
        ''', (name, description, price, category))
        
        item_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return MenuItem(item_id, name, description, price, category)
    
    def get_menu_item(self, item_id: int) -> Optional[MenuItem]:
        """Get a menu item by ID"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM menu_items WHERE id = ?', (item_id,))
        row = cursor.fetchone()
        
        if row:
            item = MenuItem(row[0], row[1], row[2], row[3], row[4], row[5])
        else:
            item = None
        
        conn.close()
        return item
    
    def get_all_menu_items(self) -> List[MenuItem]:
        """Get all menu items"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM menu_items WHERE is_active = 1 ORDER BY category, name')
        rows = cursor.fetchall()
        
        items = []
        for row in rows:
            items.append(MenuItem(row[0], row[1], row[2], row[3], row[4], row[5]))
        
        conn.close()
        return items
    
    def update_menu_item(self, item_id: int, **kwargs):
        """Update a menu item"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        # Build dynamic update query
        fields = []
        values = []
        
        for field, value in kwargs.items():
            if hasattr(MenuItem, field) and field != 'id':
                fields.append(f"{field} = ?")
                values.append(value)
        
        if fields:
            values.append(item_id)
            query = f"UPDATE menu_items SET {', '.join(fields)} WHERE id = ?"
            cursor.execute(query, values)
            conn.commit()
        
        conn.close()
    
    def remove_menu_item(self, item_id: int):
        """Remove a menu item (soft delete)"""
        self.update_menu_item(item_id, is_active=False)


class TableManager:
    """Manages restaurant tables"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def add_table(self, table_number: int, capacity: int) -> Table:
        """Add a new table"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO tables (table_number, capacity)
            VALUES (?, ?)
        ''', (table_number, capacity))
        
        table_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return Table(table_id, table_number, capacity)
    
    def get_table(self, table_id: int) -> Optional[Table]:
        """Get a table by ID"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM tables WHERE id = ?', (table_id,))
        row = cursor.fetchone()
        
        if row:
            table = Table(row[0], row[1], row[2], row[3])
        else:
            table = None
        
        conn.close()
        return table
    
    def get_available_tables(self) -> List[Table]:
        """Get all available tables"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM tables WHERE is_available = 1')
        rows = cursor.fetchall()
        
        tables = []
        for row in rows:
            tables.append(Table(row[0], row[1], row[2], row[3]))
        
        conn.close()
        return tables
    
    def get_all_tables(self) -> List[Table]:
        """Get all tables"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM tables')
        rows = cursor.fetchall()
        
        tables = []
        for row in rows:
            tables.append(Table(row[0], row[1], row[2], row[3]))
        
        conn.close()
        return tables
    
    def update_table_availability(self, table_id: int, is_available: bool):
        """Update table availability"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('UPDATE tables SET is_available = ? WHERE id = ?', (is_available, table_id))
        conn.commit()
        conn.close()


class OrderManager:
    """Manages customer orders"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def create_order(self, table_id: int, customer_name: str) -> Order:
        """Create a new order"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO orders (table_id, customer_name, status, total_amount)
            VALUES (?, ?, ?, ?)
        ''', (table_id, customer_name, 'pending', 0.0))
        
        order_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        order = Order(order_id, table_id, customer_name)
        
        # Update table availability
        table_manager = TableManager(self.db_manager)
        table_manager.update_table_availability(table_id, False)
        
        return order
    
    def get_order(self, order_id: int) -> Optional[Order]:
        """Get an order by ID"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM orders WHERE id = ?', (order_id,))
        row = cursor.fetchone()
        
        if row:
            order = Order(row[0], row[1], row[2], row[3], row[4])
            
            # Get order items
            cursor.execute('SELECT * FROM order_items WHERE order_id = ?', (order_id,))
            item_rows = cursor.fetchall()
            
            for item_row in item_rows:
                item = OrderItem(item_row[0], item_row[1], item_row[2], item_row[3], item_row[4])
                order.items.append(item)
        else:
            order = None
        
        conn.close()
        return order
    
    def add_item_to_order(self, order_id: int, menu_item_id: int, quantity: int):
        """Add an item to an existing order"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        # Get menu item price
        cursor.execute('SELECT price FROM menu_items WHERE id = ?', (menu_item_id,))
        price_row = cursor.fetchone()
        
        if not price_row:
            conn.close()
            raise ValueError("Menu item not found")
        
        price = price_row[0]
        
        # Insert order item
        cursor.execute('''
            INSERT INTO order_items (order_id, menu_item_id, quantity, price)
            VALUES (?, ?, ?, ?)
        ''', (order_id, menu_item_id, quantity, price))
        
        # Update total amount
        total_addition = price * quantity
        cursor.execute('''
            UPDATE orders SET total_amount = total_amount + ?
            WHERE id = ?
        ''', (total_addition, order_id))
        
        conn.commit()
        conn.close()
    
    def update_order_status(self, order_id: int, status: str):
        """Update order status"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('UPDATE orders SET status = ? WHERE id = ?', (status, order_id))
        conn.commit()
        conn.close()
    
    def complete_order(self, order_id: int):
        """Complete an order and free up the table"""
        self.update_order_status(order_id, 'completed')
        
        # Get the order to find the table
        order = self.get_order(order_id)
        if order:
            table_manager = TableManager(self.db_manager)
            table_manager.update_table_availability(order.table_id, True)
    
    def get_orders_by_status(self, status: str) -> List[Order]:
        """Get all orders with a specific status"""
        conn = sqlite3.connect(self.db_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM orders WHERE status = ?', (status,))
        rows = cursor.fetchall()
        
        orders = []
        for row in rows:
            order = Order(row[0], row[1], row[2], row[3], row[4])
            
            # Get order items
            cursor.execute('SELECT * FROM order_items WHERE order_id = ?', (row[0],))
            item_rows = cursor.fetchall()
            
            for item_row in item_rows:
                item = OrderItem(item_row[0], item_row[1], item_row[2], item_row[3], item_row[4])
                order.items.append(item)
            
            orders.append(order)
        
        conn.close()
        return orders


class RestaurantManagementSystem:
    """Main restaurant management system"""
    
    def __init__(self, db_path: str = "restaurant.db"):
        self.db_manager = DatabaseManager(db_path)
        self.menu_manager = MenuManager(self.db_manager)
        self.table_manager = TableManager(self.db_manager)
        self.order_manager = OrderManager(self.db_manager)
        
        # Initialize with sample data
        self._initialize_sample_data()
    
    def _initialize_sample_data(self):
        """Initialize with sample menu items and tables"""
        # Add sample menu items if none exist
        if not self.menu_manager.get_all_menu_items():
            self.menu_manager.add_menu_item("Margherita Pizza", "Classic pizza with tomato sauce and mozzarella", 12.99, "Pizza")
            self.menu_manager.add_menu_item("Pepperoni Pizza", "Pizza with tomato sauce, mozzarella, and pepperoni", 14.99, "Pizza")
            self.menu_manager.add_menu_item("Caesar Salad", "Fresh salad with Caesar dressing and croutons", 8.99, "Salad")
            self.menu_manager.add_menu_item("Grilled Salmon", "Fresh salmon with vegetables", 18.99, "Main Course")
            self.menu_manager.add_menu_item("Tiramisu", "Classic Italian dessert", 6.99, "Dessert")
        
        # Add sample tables if none exist
        if not self.table_manager.get_all_tables():
            for i in range(1, 6):
                self.table_manager.add_table(i, 4)
    
    def display_menu(self):
        """Display the restaurant menu"""
        print("\n=== MENU ===")
        menu_items = self.menu_manager.get_all_menu_items()
        current_category = ""
        
        for item in menu_items:
            if item.category != current_category:
                current_category = item.category
                print(f"\n{current_category.upper()}:")
            
            print(f"  {item.id}. {item.name} - ${item.price:.2f}")
            if item.description:
                print(f"      {item.description}")
    
    def display_tables(self):
        """Display all tables with their status"""
        print("\n=== TABLES ===")
        tables = self.table_manager.get_all_tables()
        
        for table in tables:
            status = "Available" if table.is_available else "Occupied"
            print(f"  Table {table.table_number} (Capacity: {table.capacity}) - {status}")
    
    def create_new_order(self, table_number: int, customer_name: str) -> Order:
        """Create a new order for a table"""
        # Find the table by number
        tables = self.table_manager.get_all_tables()
        table = None
        for t in tables:
            if t.table_number == table_number:
                table = t
                break
        
        if not table:
            raise ValueError(f"Table {table_number} not found")
        
        if not table.is_available:
            raise ValueError(f"Table {table_number} is not available")
        
        return self.order_manager.create_order(table.id, customer_name)
    
    def display_pending_orders(self):
        """Display all pending orders"""
        print("\n=== PENDING ORDERS ===")
        pending_orders = self.order_manager.get_orders_by_status('pending')
        
        if not pending_orders:
            print("No pending orders.")
            return
        
        for order in pending_orders:
            table = self.table_manager.get_table(order.table_id)
            table_number = table.table_number if table else "Unknown"
            print(f"  Order #{order.id} - Table {table_number}, Customer: {order.customer_name}")
            print(f"    Status: {order.status}, Total: ${order.total_amount:.2f}")
            print("    Items:")
            for item in order.items:
                menu_item = self.menu_manager.get_menu_item(item.menu_item_id)
                item_name = menu_item.name if menu_item else "Unknown Item"
                print(f"      {item.quantity}x {item_name} - ${item.price:.2f} each")
            print()
    
    def run_demo(self):
        """Run a demonstration of the system"""
        print("URY Restaurant Management System - Demo")
        print("=" * 50)
        
        # Display menu
        self.display_menu()
        
        # Display tables
        self.display_tables()
        
        # Create a sample order
        try:
            order = self.create_new_order(1, "John Doe")
            print(f"\nCreated order #{order.id} for John Doe at table 1")
            
            # Add items to the order
            self.order_manager.add_item_to_order(order.id, 1, 1)  # Margherita Pizza
            self.order_manager.add_item_to_order(order.id, 3, 1)  # Caesar Salad
            
            print("Added items to order")
            
            # Show pending orders
            self.display_pending_orders()
            
            # Complete the order
            self.order_manager.complete_order(order.id)
            print(f"Completed order #{order.id}")
            
            # Show updated table status
            self.display_tables()
            
        except Exception as e:
            print(f"Error during demo: {e}")


def main():
    """Main entry point"""
    # Create the restaurant management system
    rms = RestaurantManagementSystem()
    
    # Check if we're running in demo mode
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        rms.run_demo()
    else:
        print("URY Restaurant Management System")
        print("Use '--demo' flag to run a demonstration")
        
        # Interactive mode
        while True:
            print("\nOptions:")
            print("1. View menu")
            print("2. View tables")
            print("3. View pending orders")
            print("4. Create new order")
            print("5. Add item to order")
            print("6. Complete order")
            print("7. Exit")
            
            choice = input("\nEnter your choice (1-7): ").strip()
            
            if choice == '1':
                rms.display_menu()
            elif choice == '2':
                rms.display_tables()
            elif choice == '3':
                rms.display_pending_orders()
            elif choice == '4':
                try:
                    table_num = int(input("Enter table number: "))
                    customer_name = input("Enter customer name: ")
                    order = rms.create_new_order(table_num, customer_name)
                    print(f"Created order #{order.id} for {customer_name} at table {table_num}")
                except ValueError as e:
                    print(f"Error: {e}")
            elif choice == '5':
                try:
                    order_id = int(input("Enter order ID: "))
                    item_id = int(input("Enter menu item ID: "))
                    quantity = int(input("Enter quantity: "))
                    rms.order_manager.add_item_to_order(order_id, item_id, quantity)
                    print("Item added to order")
                except ValueError as e:
                    print(f"Error: {e}")
            elif choice == '6':
                try:
                    order_id = int(input("Enter order ID to complete: "))
                    rms.order_manager.complete_order(order_id)
                    print(f"Order #{order_id} marked as completed")
                except ValueError as e:
                    print(f"Error: {e}")
            elif choice == '7':
                print("Thank you for using URY Restaurant Management System!")
                break
            else:
                print("Invalid choice. Please enter 1-7.")


if __name__ == "__main__":
    main()