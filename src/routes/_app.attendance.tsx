import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  isFuture,
  addMonths,
  subMonths,
  isSameMonth,
  getDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({ meta: [{ title: "My Attendance — GuardCheck" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => new Date());

  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", user?.id, format(month, "yyyy-MM")],
    enabled: !!user,
    queryFn: async () => {
      const { data: guard } = await supabase
        .from("guards")
        .select("id, created_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!guard) return { presentDates: new Set<string>(), guardCreated: null as Date | null };

      const { data: rows } = await supabase
        .from("attendance")
        .select("date")
        .eq("guard_id", guard.id)
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"));

      return {
        presentDates: new Set((rows ?? []).map((r) => r.date)),
        guardCreated: new Date(guard.created_at),
      };
    },
  });

  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end]);
  const leadingBlanks = getDay(start); // 0 Sun .. 6 Sat
  const presentDates = data?.presentDates ?? new Set<string>();

  // Use start of month for display if no join date found
  const displayJoinDate = data?.guardCreated ? new Date(format(data.guardCreated, "yyyy-MM-dd")) : start;
  // We'll count from the start of the month manually or from join date? 
  // User wants it to "update accordingly", let's show the whole month's status.
  const activeStart = start; 

  let presentCount = 0;
  let absentCount = 0;
  for (const d of days) {
    if (isFuture(d)) continue;
    if (d < activeStart) continue;
    if (presentDates.has(format(d, "yyyy-MM-dd"))) presentCount++;
    else absentCount++;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Attendance</h1>
        <p className="text-sm text-muted-foreground">Tap to switch months.</p>
      </div>

      <Card className="p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <p className="text-base font-semibold">{format(month, "MMMM yyyy")}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            disabled={isSameMonth(month, new Date())}
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`b-${i}`} />
          ))}
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const isPresent = presentDates.has(key);
            const future = isFuture(d);
            const beforeJoin = d < activeStart;
            
            return (
              <div
                key={key}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-bold transition-all shadow-sm ${
                  future || beforeJoin
                    ? "bg-muted/30 text-muted-foreground/30"
                    : isPresent
                      ? "bg-[#22c55e] text-white" // Bright Green
                      : "bg-[#ef4444] text-white" // Bright Red
                } ${isToday(d) ? "ring-2 ring-primary ring-offset-2 z-10 scale-105" : ""}`}
              >
                <span className={isPresent || (!future && !beforeJoin) ? "opacity-100" : "opacity-40"}>
                  {format(d, "d")}
                </span>
                {!future && !beforeJoin && (
                  <span className="mt-0.5">
                    {isPresent ? <Check className="h-4 w-4 stroke-[4]" /> : <X className="h-4 w-4 stroke-[4]" />}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Present</p>
          <p className="mt-1 text-2xl font-bold text-success">
            {isLoading ? "—" : presentCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Absent</p>
          <p className="mt-1 text-2xl font-bold text-destructive">
            {isLoading ? "—" : absentCount}
          </p>
        </Card>
      </div>
    </div>
  );
}
