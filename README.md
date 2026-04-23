# 💂‍♂️ GuardScan Pro

**GuardScan Pro** is a modern, real-time security guard attendance and site management system. Built with **React 19**, **TanStack Start**, and **Supabase**, it provides a seamless mobile-first experience for guards and a powerful management interface for administrators.

---

## 🚀 Key Features

- **📱 Mobile-First Attendance**: Guards can mark their attendance instantly by scanning site-specific QR codes.
- **📍 Geolocation Verification**: Ensures guards are physically present at the site when scanning.
- **🕒 Real-time Tracking**: Attendance logs are updated instantly in the Supabase database.
- **📊 Admin Dashboard**: Manage guards, sites, and track attendance history effortlessly.
- **💰 Payroll Management**: Automatically calculate salaries based on attendance records.
- **📧 Automated Notifications**: Instant alerts for absences or late arrivals using Resend API.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TanStack Start](https://tanstack.com/start)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **State Management**: [TanStack Query v5](https://tanstack.com/query)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Resend](https://resend.com/)

---

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/harsha091-ai/chowkidars2.git
   cd guardscan-pro
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory and add your credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   RESEND_API_KEY=your_resend_api_key
   NOTIFICATION_EMAIL=your_admin_email
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## 🌐 Deployment

### Netlify / Vercel (SPA Mode)
The project is configured for easy SPA deployment.
- **Build Command**: `npm run build`
- **Publish Directory**: `dist/client`
- **Environment Variables**: Add the same variables from your `.env` to the deployment dashboard.

---

## 🗄️ Database Schema

The system uses a robust PostgreSQL schema in Supabase:
- `guards`: Stores guard profiles and salary details.
- `sites`: Manages physical site locations and QR codes.
- `attendance`: Logs every scan with timestamps and coordinates.
- `salary_payments`: Tracks monthly payroll history.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue for any bugs or feature requests.

---

## 📄 License

MIT License - Copyright (c) 2026 GuardScan Pro.
