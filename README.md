# 💰 ExpenseFlow — Expense Tracker

> A modern full-stack expense management application for tracking personal expenses, analyzing spending, and splitting shared expenses with households or flatmates.

## ✨ Features

### 🔐 User Authentication

* 📝 User signup and login
* 🔒 Secure password hashing with bcrypt
* 🎫 JWT-based authentication
* 🛡️ Protected API routes
* 💾 Persistent login using browser local storage

### 💸 Personal Expense Management

Users can:

* ➕ Add new expenses
* ✏️ Edit existing expenses
* 🗑️ Delete expenses
* 📋 View complete expense history
* 🏷️ Add categories
* 💰 Record expense amounts
* 📝 Add optional comments
* 💳 Select payment methods
* 🔎 Search and filter transactions
* 📅 Sort transactions by date

### 📊 Expense Analytics

The dashboard provides useful spending insights:

* 💰 Total spending
* 🧾 Number of transactions
* 📈 Average expense
* 🔝 Highest expense
* 🏷️ Category-wise spending
* 📅 Monthly expense trends
* 🍩 Category distribution chart
* 📊 Monthly expense bar chart

### 💳 Payment Methods

Each expense can optionally include a payment method:

* 💵 Cash
* 📱 UPI
* 💳 Card
* 🏦 Bank Transfer

Payment methods are stored in MongoDB, displayed in the expense history, and can also be used for filtering expenses.

### 🏠 Household Expense Splitting

ExpenseFlow makes it easy to manage shared expenses with flatmates, roommates, or household members.

Users can:

* 🏠 Create a household
* 👥 Add registered users using their email
* 👤 View household members
* 🚪 Leave a household
* ➕ Create shared expenses
* 💰 Select who paid
* 👥 Select participating members
* ⚖️ Split expenses equally
* 🧮 Create custom splits
* 📊 View balances
* 🤝 Settle debts
* 📜 View settlement history

### ⚖️ Expense Splitting

Shared expenses support two split types:

**Equal Split**

The backend automatically divides the total expense equally among the selected members.

**Custom Split**

Users can specify an individual amount for each participant.

The backend validates that:

* ✅ All participants belong to the household
* ✅ Split amounts are valid
* ✅ Split amounts are not negative
* ✅ Individual amounts equal the total expense

### 📊 Household Dashboard

The household dashboard displays:

* 💰 Total Shared Spend
* 💳 You Paid
* 📥 You Are Owed
* 📤 You Owe
* 👥 Household Members
* 🔄 Who Owes Whom
* 🧾 Recent Shared Expenses
* 🤝 Settle Up
* 📜 Settlement History

### 🧮 Balance Calculation

Shared expense balances are calculated on the server.

For every shared expense:

1. 💰 The expense payer is identified.
2. 👥 Each participant's share is calculated.
3. 📤 A participant's unpaid share becomes a debt to the payer.
4. 🤝 Settlements reduce outstanding debts.
5. 🔄 Two-way debts are netted to calculate the final amount owed.

---

## 🛠️ Technology Stack

### 🎨 Frontend

* ⚛️ React 18
* ⚡ Vite
* 🧭 React Router
* 🌐 Axios
* 📊 Chart.js
* 📈 react-chartjs-2
* 🎨 CSS

### ⚙️ Backend

* 🟢 Node.js
* 🚂 Express.js
* 🍃 Mongoose
* 🔑 JWT
* 🔐 bcryptjs
* 🔗 CORS
* ⚙️ dotenv

### 🗄️ Database

* 🍃 MongoDB
* ☁️ MongoDB Atlas or Local MongoDB

---

## 📁 Project Structure

```text
expense-tracker/
│
├── backend/
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Expense.js
│   │   ├── Household.js
│   │   ├── Settlement.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── expenses.js
│   │   └── households.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── Household.jsx
    │   ├── api.js
    │   ├── main.jsx
    │   └── styles.css
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## 📋 Requirements

Before running the project, make sure you have:

* 🟢 Node.js 18 or higher
* 📦 npm
* 🗄️ MongoDB Local or MongoDB Atlas

---

## 🚀 Installation

### 1️⃣ Clone the Repository

```bash
git clone <your-repository-url>
cd expense-tracker
```

### 2️⃣ Backend Setup

Open a terminal and navigate to the backend:

```bash
cd backend
npm install
```

Create the environment file.

**Windows:**

```bash
copy .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Update the `.env` file if required.

Start the backend:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

### 3️⃣ Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server will display the frontend URL.

Usually:

```text
http://localhost:5173
```

---

## 🗄️ MongoDB Configuration

ExpenseFlow supports both **local MongoDB** and **MongoDB Atlas**.

For local MongoDB:

```text
mongodb://127.0.0.1:27017/expense_tracker
```

Make sure MongoDB is running before starting the backend.

For MongoDB Atlas, replace the MongoDB connection string in `.env` with your Atlas connection string.

---

## 🔑 Environment Variables

Example backend configuration:

```env
MONGO_URI=mongodb://127.0.0.1:27017/expense_tracker
JWT_SECRET=your_secret_key
PORT=5000
```

Use the project's `.env.example` file as the reference for the required configuration.

> ⚠️ Never commit your `.env` file or expose your JWT secret.

---

## ▶️ Running the Application

Start MongoDB first if you are using a local database.

### Backend

```bash
cd backend
npm run dev
```

### Frontend

Open a second terminal:

```bash
cd frontend
npm run dev
```

Then open the Vite URL in your browser and create an account to start using ExpenseFlow.

---

## 🔌 API Overview

### 🔐 Authentication

```text
POST /api/auth/signup
POST /api/auth/login
```

### 💸 Expenses

```text
GET    /api/expenses
POST   /api/expenses
PUT    /api/expenses/:id
DELETE /api/expenses/:id
```

### 🏠 Households

```text
GET    /api/households
POST   /api/households
GET    /api/households/:id
POST   /api/households/:id/members
DELETE /api/households/:id/members/me
GET    /api/households/:id/expenses
GET    /api/households/:id/balances
POST   /api/households/:id/settle
GET    /api/households/:id/settlements
```

All protected household routes require JWT authentication and verify household membership.

---

## 🛡️ Security

ExpenseFlow includes server-side security and access control:

* 🔐 Passwords are securely hashed before storage
* 🎫 JWT tokens authenticate protected requests
* 🛡️ Protected routes require authentication
* 👥 Household operations verify membership
* 🚫 Non-members cannot participate in household expense splits
* ✅ Expense and split values are validated by the backend
* ⛔ Unauthorized household access returns `403 Forbidden`

---

## 🔄 Application Flow

```text
👤 User
 │
 ├── 🔐 Sign Up / Login
 │
 ▼
📊 Dashboard
 │
 ├── ➕ Add Expense
 │    ├── 🏷️ Category
 │    ├── 💰 Amount
 │    ├── 📝 Comments
 │    ├── 💳 Payment Method
 │    └── 🏠 Optional Shared Expense
 │
 ├── 🧾 Expense History
 │    ├── 🔎 Search
 │    ├── 🏷️ Filter
 │    └── 📅 Sort
 │
 └── 📊 Analytics
      ├── 🍩 Category Distribution
      └── 📈 Monthly Expense Trend

🏠 Household
 │
 ├── ➕ Create Household
 ├── 👥 Add Members
 ├── 💸 Create Shared Expense
 │    ├── ⚖️ Equal Split
 │    └── 🧮 Custom Split
 │
 ├── 📊 View Balances
 ├── 🤝 Settle Up
 └── 📜 Settlement History
```

---

## 🧑‍💻 Development Commands

### Backend

```bash
npm run dev
```

Runs the backend using Nodemon.

```bash
npm start
```

Runs the backend using Node.js.

### Frontend

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run preview
```

Previews the production build locally.

---

## 📝 Notes

* 💳 Payment method is optional.
* 🔄 Existing expenses without a payment method remain compatible.
* 🏠 Shared expenses are managed through the Household section.
* 🧮 Shared-expense validation is performed on the backend.
* 🗄️ The application supports both local MongoDB and MongoDB Atlas.

---

## 📄 License

This project is developed for educational purposes.

---

<div align="center">

### 💰 ExpenseFlow

**Track • Analyze • Split • Settle**

</div>
