# URY Restaurant OS - Napredna Arhitektura

## Pregled

Ury Restaurant OS bo celostno rešitev za upravljanje restavracij, ki zajema vse vidike delovanja restavracije, od naročanja do kuhinjskega prikaza, inventure in analitike.

## Tehnološki sklad

### Backend
- **FastAPI** - za REST/GraphQL API
- **PostgreSQL** - glavna baza podatkov
- **Redis** - za seje, predpomnilnik in WebSocket sporazumevanje
- **Celery** - za ozadnja opravila (npr. generiranje računov, obvestila)

### Frontend
- **Next.js 14** - z App Routerjem za večplatformsko uporabniško izkušnjo
- **React** - za interaktivne komponente
- **TypeScript** - za varnost tipov
- **TailwindCSS** - za stilizacijo

### Mobilne aplikacije
- **React Native** - za iOS in Android

### Infrastruktura
- **Docker** - za kontejnerizacijo
- **Docker Compose** - za lokalni razvoj
- **Kubernetes** - za produkcijo
- **Nginx** - za obrnjeno proxy in statične datoteke

## Struktura projekta

```
ury-restaurant-os/
├── backend/                 # FastAPI backend
│   ├── api/                 # API definicije
│   ├── models/              # ORM modeli
│   ├── schemas/             # Pydantic sheme
│   ├── database/            # Konfiguracija DB
│   ├── auth/                # Avtentikacija
│   └── utils/               # Pomožne funkcije
├── frontend/                # Next.js frontend
│   ├── pages/               # Strani
│   ├── components/          # React komponente
│   ├── lib/                 # Utils
│   └── public/              # Statične datoteke
├── mobile/                  # React Native mobilne aplikacije
├── shared/                  # Deljeni modeli in utils
├── docker/                  # Docker konfiguracije
└── docs/                    # Dokumentacija
```

## Baza podatkov - PostgreSQL

### Glavne tabele

#### Uporabniki in dovoljenja
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL, -- admin, manager, waiter, cook
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL -- create, read, update, delete
);
```

#### Meni in recepti
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0
);

CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- kg, g, ml, pcs, ...
    cost_per_unit DECIMAL(10,4) NOT NULL,
    stock_quantity DECIMAL(10,2) DEFAULT 0,
    min_stock_level DECIMAL(10,2) DEFAULT 0,
    supplier_info TEXT
);

CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity_needed DECIMAL(10,2) NOT NULL -- količina sestavine na enoto jedi
);
```

#### Naročila in blagajna
```sql
CREATE TABLE tables (
    id SERIAL PRIMARY KEY,
    table_number INTEGER UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'available' -- available, occupied, reserved
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id),
    customer_name VARCHAR(100),
    employee_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' -- pending, in_preparation, ready, served, paid, cancelled
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    menu_item_id INTEGER REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    status VARCHAR(20) DEFAULT 'ordered' -- ordered, preparing, ready, served
);
```

#### Inventura
```sql
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_info TEXT,
    address TEXT
);

CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    ingredient_id INTEGER REFERENCES ingredients(id),
    transaction_type VARCHAR(20) NOT NULL, -- purchase, consumption, waste, adjustment
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,4),
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    transaction_date TIMESTAMP DEFAULT NOW(),
    reference_id INTEGER -- lahko se nanaša na order_id, purchase_order_id ipd.
);

CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status VARCHAR(20) DEFAULT 'pending' -- pending, delivered, paid
);
```

## API Endpoints

### Auth
- `POST /auth/login` - Prijava uporabnika
- `POST /auth/logout` - Odjava uporabnika
- `GET /auth/me` - Podatki o trenutnem uporabniku

### POS (Za natakarje)
- `GET /pos/tables` - Seznam miz in njihovo stanje
- `GET /pos/menu` - Meni z kategorijami
- `POST /pos/orders` - Ustvari novo naročilo
- `PUT /pos/orders/{order_id}` - Posodobi naročilo
- `POST /pos/orders/{order_id}/items` - Dodaj artikle k naročilu
- `PUT /pos/orders/{order_id}/status` - Spremeni status naročila

### Kitchen Display System (Za kuharje)
- `GET /kds/orders` - Vsa naročila glede na status
- `GET /kds/orders/{order_id}` - Podrobnosti naročila
- `PUT /kds/orders/{order_id}/status` - Spremeni status kuhanja

### Inventory (Za upravitelje)
- `GET /inventory/ingredients` - Stanje sestavin
- `POST /inventory/purchases` - Vnos nabave
- `POST /inventory/consumptions` - Vnos porabe
- `GET /inventory/reports/low-stock` - Poročilo o nizki zalogi

### Analytics (Za lastnike)
- `GET /analytics/sales` - Poročila o prodaji
- `GET /analytics/profit` - Analiza dobičkonosnosti
- `GET /analytics/popular-items` - Popularni artikli

## Uporabniške vloge

### Admin
- Poln dostop do vseh funkcij
- Upravljanje uporabnikov in dovoljenj

### Manager
- Dostop do analitike
- Upravljanje menija
- Upravljanje zaposlenih

### Waiter
- Dostop do POS sistema
- Ustvarjanje naročil
- Spreminjanje statusa naročil do "served"

### Cook
- Dostop do KDS
- Spreminjanje statusa kuhanja naročil

## Moduli sistema

### 1. POS (Point of Sale)
- Interaktivna navigacija po meniju
- Hitro dodajanje artiklov k naročilom
- Delo z več aktivnimi naročili hkrati
- Podpora za različne metode plačila
- Fiskalna integracija (v Sloveniji FURS)

### 2. Kitchen Display System
- Realnočasovni prikaz naročil
- Statusi kuhanja za vsako jed
- Prioritizacija glede na vrsto jedi in čas naročila
- Obvestila za kuhe

### 3. Inventory Management
- Sledenje zalogam sestavin
- Avtomatsko zmanjševanje zalog ob prodaji
- Opozorila o nizki zalogi
- Nadzor rok uporabnosti

### 4. Recipe Management
- Definicija receptov za vsako jed
- Izračun stroškov sestavin
- Analiza dobičkonosnosti jeder

### 5. Employee Management
- Sistemske vloge in dovoljenja
- Delovni urniki
- Evidenca ur in produktivnosti

### 6. Reporting & Analytics
- Poročila o prodaji po danih, tednih, mesecih
- Analiza popularnosti jeder
- Analiza dobičkonosnosti
- Poročila o zaposlenih

### 7. Multi-location Support
- Podpora za več lokacij
- Centralizirano upravljanje
- Lokacijsko specifična nastavitve

## Primer API klica za ustvarjanje naročila

```python
# POST /pos/orders
{
  "table_id": 5,
  "customer_name": "Janez Novak",
  "employee_id": 12,
  "items": [
    {
      "menu_item_id": 1,
      "quantity": 2
    },
    {
      "menu_item_id": 3,
      "quantity": 1
    }
  ]
}
```

## Primer API odziva

```json
{
  "id": 123,
  "table_id": 5,
  "customer_name": "Janez Novak",
  "employee_id": 12,
  "status": "pending",
  "created_at": "2023-06-24T09:00:00Z",
  "items": [
    {
      "id": 456,
      "menu_item_id": 1,
      "quantity": 2,
      "unit_price": 12.99,
      "total_price": 25.98,
      "status": "ordered"
    },
    {
      "id": 457,
      "menu_item_id": 3,
      "quantity": 1,
      "unit_price": 8.99,
      "total_price": 8.99,
      "status": "ordered"
    }
  ],
  "total_amount": 34.97
}
```

## Integracija z drugimi sistemi

### Fiskalna blagajna (v Sloveniji FURS)
- Integracija preko FURS e-računi API
- Generiranje QR kode za vsak račun
- Sledenje transakcijam

### Računovodski sistemi
- Eksport podatkov v format, ki ga sprejema MiroCrm, FinLive, ipd.
- Sinhronizacija s podatki v realnem času

### Dostava (foodpanda, Wolt, itd.)
- Sinhronizacija naročil iz zunanjih platform
- Samodejno dodajanje v sistem

## Deploy strategija

### Lokalni razvoj
- Docker compose za lokalni razvoj
- Hot-reload za frontend in backend

### Produkcija
- Kubernetes cluster
- Horizontalno skaliranje
- CI/CD pipeline
- Backup strategija

## Varnost

- JWT avtentikacija
- HTTPS za vse API klice
- SQL injection zaščita
- Input validation
- Dovoljenjski sistem

## Skalabilnost

- Microservice arhitektura
- Asinhrono obdelovanje za težja opravila
- Caching za pogosto uporabljene podatke
- Load balancing

Ta arhitektura predstavlja pravi osnovi za razvoj produkcijskega restavracijskega sistema, ki se lahko primerja z URY in drugimi profesionalnimi sistemi.