# URY-inspired Restaurant Management System

This is a production-ready restaurant management system inspired by the URY ERP system described in the Slovenian text file. It provides core functionality for managing a restaurant's operations including menu management, table management, and order processing.

## Features

- **Menu Management**: Add, view, and manage menu items with categories and pricing
- **Table Management**: Track table availability and capacity
- **Order Processing**: Create orders, add items, and manage order status
- **SQLite Database**: Persistent storage using SQLite
- **Interactive Interface**: Command-line interface for easy operation

## Requirements

- Python 3.7+
- SQLite (usually comes with Python)

## Installation

1. Clone this repository or download the `restaurant_management_system.py` file
2. No additional installation required - just run the script!

## Usage

### Running the Interactive System

```bash
python restaurant_management_system.py
```

This will start the interactive restaurant management system where you can:
- View the menu
- See table availability
- View pending orders
- Create new orders
- Add items to orders
- Complete orders

### Running the Demo

To see a quick demonstration of the system's capabilities:

```bash
python restaurant_management_system.py --demo
```

## Architecture

The system is organized into several modules:

- `DatabaseManager`: Handles SQLite database initialization and connections
- `MenuManager`: Manages menu items and categories
- `TableManager`: Tracks restaurant tables and their availability
- `OrderManager`: Processes customer orders and their status
- `RestaurantManagementSystem`: Main class that ties everything together

## Data Model

The system uses SQLite with the following tables:
- `menu_items`: Stores menu items with name, description, price, and category
- `tables`: Tracks restaurant tables with number, capacity, and availability
- `orders`: Contains customer orders with status and total amount
- `order_items`: Links orders to menu items with quantities and prices

## Production Readiness

This system includes:
- Proper error handling
- Data persistence
- Modular design
- Sample data initialization
- Comprehensive CRUD operations for all entities
- Transaction safety for database operations

## License

This software is provided as-is for educational purposes.