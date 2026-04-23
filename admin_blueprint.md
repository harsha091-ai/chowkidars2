# GuardScan Pro: Admin Development Blueprint

Use this document as your primary reference when building a separate Admin Dashboard. Both the Guard App and the Admin App will share the same Supabase instance.

## 🏗️ 1. Project Infrastructure
- **Provider**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Project Reference**: `tgcdkfutvjiatcfjxhrg`
- **Region**: Likely Mumbai (ap-south-1) based on IST preference.

---

## 🗄️ 2. Complete SQL Schema

### Core Tables
```sql
-- Track the guards
CREATE TABLE public.guards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    base_salary DECIMAL(10, 2) DEFAULT 12000.00,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    work_start_time TIME DEFAULT '09:00:00',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Track the sites
CREATE TABLE public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_name TEXT NOT NULL,
    location TEXT,
    qr_code_value TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Track daily attendance
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guard_id UUID REFERENCES public.guards(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    scanned_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'present',
    UNIQUE(guard_id, date)
);

-- Track sent absence alerts
CREATE TABLE public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guard_id UUID REFERENCES public.guards(id) ON DELETE CASCADE,
    admin_phone TEXT, -- used for the email/whatsapp recipient
    status TEXT,      -- 'sent' or 'failed'
    date_checked DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(guard_id, date_checked)
);

-- Assign roles (Admin vs Guard)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'guard')),
    UNIQUE(user_id, role)
);
```

### Advanced Logic (Functions & Triggers)
```sql
-- 1. Automated Guard creation on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.guards (user_id, name, email, phone, work_start_time)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.phone,
    COALESCE((NEW.raw_user_meta_data ->> 'work_start_time')::TIME, '09:00:00'::TIME)
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'guard');
  RETURN NEW;
END;
$$;

-- 2. Late Guard Detection (2-hour grace period)
CREATE OR REPLACE FUNCTION public.get_absent_guards_after_grace_period(grace_hours INT, timezone TEXT DEFAULT 'Asia/Kolkata')
RETURNS TABLE (id UUID, name TEXT, email TEXT, phone TEXT, work_start_time TIME) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT g.id, g.name, g.email, g.phone, g.work_start_time
    FROM public.guards g
    WHERE NOT EXISTS (
        SELECT 1 FROM public.attendance a 
        WHERE a.guard_id = g.id AND a.date = (CURRENT_TIMESTAMP AT TIME ZONE timezone)::DATE
    )
    AND (CURRENT_TIMESTAMP AT TIME ZONE timezone)::TIME > (g.work_start_time + (grace_hours || ' hours')::INTERVAL);
END;
$$;
```

---

## 💰 3. Salary Calculation Formula (Business Logic)

In your new Admin App, you should implement this logic to calculate monthly pay:

- **Constants**:
  - `WORKING_DAYS = 26`
  - `EPF_RATE = 0.25` (25%)
  - `ESI_RATE = 0.25` (25%)
- **Formula**:
  1. `Per Day Rate` = `Base Salary` ÷ `26`
  2. `Deductions`:
     - `EPF` = `Base Salary` * `0.25`
     - `ESI` = `Base Salary` * `0.25`
     - `Absence Penalty` = (`26` - `Days Present`) * `Per Day Rate`
  3. `Net Payable` = `Base Salary` - `EPF` - `ESI` - `Absence Penalty`

---

## 🛠️ 4. Integration Details for Admin Website

### Environment Variables
```env
SUPABASE_URL=https://tgcdkfutvjiatcfjxhrg.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
RESEND_API_KEY=re_HR9Gj8WK_7cK4GK8KvD189fQhHYq3pWTT
FUNCTION_SECRET=my_safe_token_123
```

### Key API Endpoints
- **Manual Alert Trigger**:
  `POST https://tgcdkfutvjiatcfjxhrg.supabase.co/functions/v1/check-absent-guards`
  (Header: `Authorization: Bearer my_safe_token_123`)

---

## 💡 5. Pro-Tips for the New App
1. **QR Generation**: Use the `qrcode` npm package to generate images from the `qr_code_value` in the `sites` table.
2. **Security**: Ensure only users with the `admin` role in `user_roles` can log in to your new site.
3. **Dashboard Idea**: Use a summary card showing "Total Guards Present Today" vs "Total Guards Absent" using a simple `COUNT` query on the `attendance` table filtered for today's date.
