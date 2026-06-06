# Power Play Invoicing System

## About the Project

This project is a full-stack Invoice Management Dashboard built as part of the Power Play assignment. The application ingests a dataset of 2,000 invoice records and provides an interface to manage invoices, explore customer information, and view business analytics.

The goal was not only to implement CRUD operations but also to design a scalable data model, build efficient APIs, and create an intuitive dashboard for exploring invoice data.

### Key Features

* Invoice listing with pagination
* Search across invoices, customers, and companies
* Filtering by status, tax rate, and date ranges
* Invoice creation, update, and deletion
* Dashboard analytics and summary statistics
* Top customer insights
* Customer profile pages
* MongoDB aggregation-based reporting
* Responsive React frontend

---

## Design Decisions

While the dataset contains customer and company names directly in each invoice record, I chose to normalize the data into three collections:

* Companies
* Customers
* Invoices

This approach reduces duplication, improves data consistency, and better represents real-world business relationships where multiple invoices belong to a customer and each customer belongs to a company.

To preserve historical accuracy, invoice records also store snapshots of customer and company information at the time the invoice was created.

---

## Assumptions

* Each customer belongs to exactly one company.

* Tax values are calculated using:

  tax = amount × taxRate / 100

* Invoice totals are stored for faster querying and analytics.

* The application is designed for datasets larger than the provided 2,000 records, so indexing was added on frequently queried fields.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Backend Setup & Run](#backend-setup--run)
- [Frontend Setup & Run](#frontend-setup--run)
- [Data Modeling Rationale](#data-modeling-rationale)
- [API Reference](#api-reference)
- [Assumptions & Gotchas](#assumptions--gotchas)

---

## Project Overview

The **Backend** (`/Backend`) exposes a RESTful JSON API under the `/api` namespace.  It stores data in **MongoDB Atlas** using three collections:

- `companies`
- `customers`
- `invoices`

The **Frontend** (`/Frontend`) is a Vite‑powered React app that consumes those endpoints via a thin **axios** service (`src/services/api.js`).  Environment variables are injected at build time (`VITE_API_BASE_URL`).

---

## Prerequisites

- **Node.js** ≥ 22 (the version you have installed will work).
- **npm** (shipped with Node) – used for package management.
- **MongoDB Atlas** cluster or a local MongoDB instance.
- **Git** – for cloning the repo.

---

## Backend Setup & Run

1. **Clone the repository** (if you haven’t already):
   ```bash
   git clone https://github.com/Darrkkk09/powerplay-assingment.git
   cd powerplay-assingment/Backend
   ```
2. **Create a `.env` file** in the `Backend` folder with the following keys (replace placeholders with your own values):
   ```dotenv
   MONGO_URL=[IN THE REPLY MAIL ID]
   ```
3. **Install dependencies** (exact lockfile versions are enforced):
   ```bash
   npm install
   ```
4. **Seed the database** (optional but useful for demo data):
   ```bash
   node seed.js
   ```
   This will populate the three collections with ~2 000 mock invoices and related customers/companies.
5. **Run the server** (development mode with live‑restart):
   ```bash
   npx nodemon server.js
   ```
   The API will be available at `http://localhost:5000/api/…`.

---

## Frontend Setup & Run

1. **Navigate to the frontend folder**:
   ```bash
   cd ../Frontend
   ```
2. **Create a `.env` file** (Vite reads only variables prefixed with `VITE_`):
   ```dotenv
   VITE_API_BASE_URL=https://ranjit-powerplay.onrender.com/api
   # When developing locally you can also point to the local backend:
   # VITE_API_BASE_URL=http://localhost:5000/api
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in a browser – Vite will proxy `/api` requests to the backend if you use the local URL.

---

## Data Modeling Rationale

### Companies (`models/company.js`)
- **Fields**: `name`, `address`, `phone`, `email`.
- **Purpose**: A top‑level entity that groups customers.  Storing a separate collection keeps the data normalized and makes it easy to add company‑wide analytics later.

### Customers (`models/customer.js`)
- **Fields**: `companyId` (ObjectId → Company), `firstName`, `lastName`, `email`, `phone`.
- **Design**: Holds a reference (`companyId`) rather than embedding the company document.  This avoids duplication and lets us query customers by company efficiently.

### Invoices (`models/invoice.js`)
- **Fields**: `customerId` (ObjectId → Customer), `items` (array of `{ description, qty, price }`), `total`, `status`, `issueDate`, `dueDate`, `taxRate`.
- **Rationale**:
  - **Reference to Customer** – keeps invoices lightweight, enables population of customer details only when needed.
  - **Embedded `items`** – invoice line items are tightly coupled to the invoice; they rarely need independent queries, so embedding simplifies data retrieval.
  - **Computed `total`** – stored for quick sorting/filtering; recalculated on write.

### Why MongoDB?
- Schema flexibility for evolving business rules.
- Built‑in support for ObjectId references and population (via Mongoose), which mirrors relational foreign‑keys without rigid joins.

---

## API Reference

All routes are mounted under `/api`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/companies` | List all companies |
| `GET` | `/api/companies/:id` | Single company details |
| `GET` | `/api/customers` | Paginated list of customers (supports `page`, `limit`, `search` params) |
| `GET` | `/api/customers/:id` | Customer profile with linked company |
| `GET` | `/api/customers/top-five` | Top‑5 customers by total invoiced amount |
| `GET` | `/api/invoices` | Paginated invoices; supports filtering by status, date range, tax rate, etc. |
| `GET` | `/api/invoices/:id` | Invoice detail |
| `GET` | `/api/invoices/summary` | Aggregated summary (total revenue, overdue, etc.) |
| `POST`| `/api/invoices` | Create a new invoice |
| `PUT` | `/api/invoices/:id` | Update an invoice |
| `DELETE`| `/api/invoices/:id` | Delete an invoice |

> **Note** – The frontend service (`src/services/api.js`) uses the base URL from `VITE_API_BASE_URL`.  Ensure the env variable contains the trailing `/api` if your backend is mounted at that path.

---

## Assumptions & Gotchas

- The backend runs on **port 5000** locally.  The frontend dev server proxies `/api` to that port when `VITE_API_BASE_URL` points to `http://localhost:5000/api`.
- In production the backend is hosted at `https://ranjit-powerplay.onrender.com/api`.  The `/api` prefix is mandatory; omitting it will result in 404 errors (the most common bug encountered during testing).
- The seed script (`seed.js`) creates **2000 invoices** and associated customers/companies.  Adjust the script if you need a smaller or larger dataset.


---
