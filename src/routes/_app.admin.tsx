import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import { calculateSalary, formatINR } from "@/lib/salary";
import QRCode from "qrcode";
import { Plus, QrCode, Users, MapPin, Loader2, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Admin — GuardCheck" }] }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Manage sites and guards.</p>
      </div>
      <Tabs defaultValue="sites">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="guards">Guards</TabsTrigger>
          <TabsTrigger value="salaries">Salaries</TabsTrigger>
        </TabsList>
        <TabsContent value="sites" className="mt-4">
          <SitesTab />
        </TabsContent>
        <TabsContent value="guards" className="mt-4">
          <GuardsTab />
        </TabsContent>
        <TabsContent value="salaries" className="mt-4">
          <SalariesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SitesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [location, setLocation] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [qrPreview, setQrPreview] = useState<{ id: string; img: string; value: string } | null>(
    null,
  );

  const { data: sites } = useQuery({
    queryKey: ["admin-sites"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sites")
        .select("id, site_name, location, qr_code_value")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = async () => {
    if (!siteName || !location || !qrValue) return toast.error("All fields required");
    setSaving(true);
    const { error } = await supabase.from("sites").insert({
      site_name: siteName.trim(),
      location: location.trim(),
      qr_code_value: qrValue.trim(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Site created");
    setSiteName("");
    setLocation("");
    setQrValue("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-sites"] });
  };

  const showQr = async (s: { id: string; qr_code_value: string }) => {
    const img = await QRCode.toDataURL(s.qr_code_value, { width: 320, margin: 2 });
    setQrPreview({ id: s.id, img, value: s.qr_code_value });
  };

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add site
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New site</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Site name</Label>
              <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <Label>QR code value (unique)</Label>
              <Input
                value={qrValue}
                onChange={(e) => setQrValue(e.target.value)}
                placeholder="SITE-XYZ-001"
              />
            </div>
            <Button className="w-full" onClick={create} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {sites?.map((s) => (
        <Card key={s.id} className="flex items-center gap-3 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{s.site_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {s.location} · {s.qr_code_value}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => showQr(s)}>
            <QrCode className="mr-1 h-4 w-4" /> QR
          </Button>
        </Card>
      ))}
      {sites?.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">No sites yet.</p>
      )}

      <Dialog open={!!qrPreview} onOpenChange={(o) => !o && setQrPreview(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Site QR Code</DialogTitle>
          </DialogHeader>
          {qrPreview && (
            <div className="flex flex-col items-center gap-3">
              <img src={qrPreview.img} alt="QR" className="rounded-lg border" />
              <p className="text-center text-xs text-muted-foreground">
                Print this and place at the site entrance.
              </p>
              <code className="rounded bg-muted px-2 py-1 text-xs">{qrPreview.value}</code>
              <a
                href={qrPreview.img}
                download={`qr-${qrPreview.value}.png`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Download PNG
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GuardsTab() {
  const qc = useQueryClient();
  const { data: guards } = useQuery({
    queryKey: ["admin-guards"],
    queryFn: async () => {
      const { data } = await supabase
        .from("guards")
        .select(`
          id, 
          name, 
          email, 
          phone, 
          base_salary, 
          work_start_time, 
          site_id, 
          site:sites(site_name),
          attendance(date)
        `)
        .order("created_at", { ascending: false });
      
      // Filter attendance to just today for the status badge
      const today = new Date().toISOString().split('T')[0];
      return (data ?? []).map(g => ({
        ...g,
        presentToday: (g.attendance as any[])?.some(a => a.date === today)
      }));
    },
  });
  const { data: sites } = useQuery({
    queryKey: ["admin-sites-list"],
    queryFn: async () => {
      const { data } = await supabase.from("sites").select("id, site_name").order("site_name");
      return data ?? [];
    },
  });

  const updateGuard = async (id: string, fields: { site_id?: string | null; base_salary?: number; work_start_time?: string }) => {
    const { error } = await supabase.from("guards").update(fields).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-guards"] });
    }
  };

  return (
    <div className="space-y-3">
      {guards?.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No guards yet. They'll appear after they sign up.
        </p>
      )}
      {guards?.map((g) => (
        <Card key={g.id} className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{g.name}</p>
                {g.presentToday ? (
                  <span className="inline-flex items-center rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold text-green-600 ring-1 ring-inset ring-green-500/20">
                    ● SCANNED
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600 ring-1 ring-inset ring-red-500/20">
                    ○ ABSENT
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">{g.email}</p>
              {g.phone && <p className="mt-0.5 text-[10px] font-medium text-muted-foreground/80 flex items-center gap-1">
                <Phone className="h-2.5 w-2.5" /> {g.phone}
              </p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Assigned site</Label>
              <Select
                value={g.site_id ?? "none"}
                onValueChange={(v) => updateGuard(g.id, { site_id: v === "none" ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassigned —</SelectItem>
                  {sites?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.site_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Duty Start</Label>
              <Input
                type="time"
                className="h-8 text-xs"
                defaultValue={g.work_start_time?.substring(0, 5)}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v && v !== g.work_start_time?.substring(0, 5)) updateGuard(g.id, { work_start_time: v });
                }}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] uppercase text-muted-foreground">Base salary (₹)</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                defaultValue={Number(g.base_salary)}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v && v !== Number(g.base_salary)) updateGuard(g.id, { base_salary: v });
                }}
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SalariesTab() {
  const month = new Date();
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const monthDays = getDaysInMonth(month);

  const { data: salaryData, isLoading } = useQuery({
    queryKey: ["admin-salaries", format(month, "yyyy-MM")],
    queryFn: async () => {
      const { data: guards } = await supabase
        .from("guards")
        .select("id, name, base_salary")
        .order("name");
      
      if (!guards) return [];

      const { data: attendance } = await supabase
        .from("attendance")
        .select("guard_id, date")
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"));

      return guards.map(g => {
        const presentDays = (attendance ?? []).filter(a => a.guard_id === g.id).length;
        const breakdown = calculateSalary(Number(g.base_salary), presentDays, monthDays);
        return {
          id: g.id,
          name: g.name,
          presentDays,
          absentDays: breakdown.absentDays,
          net: breakdown.net,
          base: Number(g.base_salary)
        };
      });
    },
  });

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="py-10 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        salaryData?.map((s) => (
          <Card key={s.id} className="flex flex-col p-4 shadow-sm border-l-4 border-l-green-500">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-lg">{s.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Net Payable (This Month)</p>
              </div>
              <p className="text-xl font-black text-green-600">{formatINR(s.net)}</p>
            </div>
            <div className="mt-3 flex gap-4 text-[11px] font-medium text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {s.presentDays} Present
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                {s.absentDays} Absent
              </div>
              <div className="ml-auto">
                Base: {formatINR(s.base)}
              </div>
            </div>
          </Card>
        ))
      )}
      {salaryData?.length === 0 && !isLoading && (
        <p className="py-6 text-center text-sm text-muted-foreground">No guards found.</p>
      )}
    </div>
  );
}
