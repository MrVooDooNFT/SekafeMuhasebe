# Sekafe Muhasebe

Sekafe Muhasebe is a simple accounting application developed for small businesses that need to manage their daily financial operations without unnecessary complexity.

The application focuses on the essential needs of a business, including customer accounts, income, expenses, payments, cash tracking, reporting, and data backup. It is designed to be easy to learn, fast to use, and practical for everyday office work.

---

## Features

- User authentication
- Customer account management
- Income tracking
- Expense tracking
- Partial payment management
- Cash register overview
- Financial reports
- User administration
- Activity logs
- Backup and restore
- Responsive interface

---

## Built With

- React
- Vite
- Supabase
- React Router

---

## Backup

The application allows users to create a complete backup of their business data in a single `.skf` file and restore it whenever necessary.

---

## Activity Logging

Administrative operations are automatically recorded to provide a basic audit history.

---

## Installation

```bash
git clone https://github.com/MrVooDooNFT/SekafeMuhasebe.git
cd SekafeMuhasebe
npm install
```

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the development server:

```bash
npm run dev
```

---

## Project Structure

```
src/
├── components/
├── pages/
├── utils/
├── App.jsx
├── main.jsx
└── supabase.js
```

---

## License

Private project.
