import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, X, CalendarDays, Sparkles, ArrowRight } from "lucide-react";
import type { ContentItem } from "@shared/schema";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameMonth, isToday, addMonths, subMonths, isSameDay
} from "date-fns";

const CONTENT_TYPE_COLORS: Record<string, string> = {
  "Instagram Post": "bg-pink-500",
  "Facebook Post": "bg-blue-500",
  "TikTok/Reel Script": "bg-purple-500",
};

const CONTENT_TYPE_PILL: Record<string, string> = {
  "Instagram Post": "bg-pink-500/10 text-pink-400 border border-pink-500/20",
  "Facebook Post": "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  "TikTok/Reel Script": "bg-purple-500/10 text-purple-400 border border-purple-500/20",
};

export default function CalendarView() {
  const [, navigate] = useHashLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Click-to-schedule state
  const [scheduleDay, setScheduleDay] = useState<Date | null>(null);
  const [dayDetailDay, setDayDetailDay] = useState<Date | null>(null);

  const { data: items = [] } = useQuery<ContentItem[]>({ queryKey: ["/api/content"] });

  const scheduledItems = items.filter((i) => i.scheduledDate);
  const unscheduledItems = items.filter((i) => !i.scheduledDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);
  const paddedDays = [...Array(startPad).fill(null), ...days];

  function getItemsForDay(day: Date): ContentItem[] {
    return scheduledItems.filter((item) => {
      if (!item.scheduledDate) return false;
      const [y, m, d] = item.scheduledDate.split("-").map(Number);
      return isSameDay(day, new Date(y, m - 1, d));
    });
  }

  const scheduleMutation = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string }) =>
      apiRequest("PATCH", `/api/content/${id}`, { scheduledDate: date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Scheduled", description: "Post added to the calendar." });
      setScheduleDay(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeDateMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/content/${id}`, { scheduledDate: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Removed from calendar" });
    },
  });

  return (
    <AppShell>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {scheduledItems.length} scheduled · click any day to schedule a post
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft size={15} />
            </Button>
            <span className="text-sm font-semibold w-32 text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3">
          {Object.entries(CONTENT_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-xs text-muted-foreground">{type}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-muted/30">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-3 py-2 text-xs font-medium text-muted-foreground text-center border-b border-border">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="grid grid-cols-7">
            {paddedDays.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`pad-${idx}`}
                    className={`min-h-[90px] p-2 bg-muted/10 ${idx % 7 !== 6 ? "border-r" : ""} ${idx < paddedDays.length - 7 ? "border-b" : ""} border-border`}
                  />
                );
              }

              const dayItems = getItemsForDay(day);
              const today = isToday(day);
              const col = idx % 7;
              const isLast = idx >= paddedDays.length - 7;
              const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[90px] p-2 ${col !== 6 ? "border-r" : ""} ${!isLast ? "border-b" : ""} border-border group cursor-pointer transition-colors hover:bg-primary/[0.04] ${isPast && !today ? "opacity-60" : ""}`}
                  onClick={() => {
                    if (dayItems.length > 0) {
                      setDayDetailDay(day);
                    } else {
                      setScheduleDay(day);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        today ? "bg-primary text-primary-foreground font-semibold" : "text-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    {/* + badge on hover for empty days */}
                    {dayItems.length === 0 && !isPast && (
                      <span className="text-[10px] text-muted-foreground/0 group-hover:text-muted-foreground transition-colors font-medium">+ Add</span>
                    )}
                  </div>

                  {dayItems.slice(0, 2).map((item) => (
                    <button
                      key={item.id}
                      onClick={(e) => { e.stopPropagation(); navigate(`/app/content/${item.id}`); }}
                      className="w-full text-left mb-1 group/item"
                      data-testid={`cal-item-${item.id}`}
                    >
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CONTENT_TYPE_COLORS[item.contentType] ?? "bg-muted"}`} />
                        <span className="text-[11px] truncate text-foreground/80 group-hover/item:text-primary transition-colors leading-tight">
                          {item.title}
                        </span>
                      </div>
                    </button>
                  ))}

                  {dayItems.length > 2 && (
                    <p className="text-[10px] text-muted-foreground">+{dayItems.length - 2} more</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Unscheduled notice */}
        {unscheduledItems.length > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles size={14} className="text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{unscheduledItems.length}</span>{" "}
                unscheduled post{unscheduledItems.length !== 1 ? "s" : ""} — click a day to schedule one.
              </p>
            </div>
            <button
              onClick={() => setScheduleDay(new Date())}
              className="text-xs text-primary hover:text-primary/80 font-medium flex-shrink-0 transition-colors whitespace-nowrap"
            >
              Schedule now →
            </button>
          </div>
        )}
      </div>

      {/* ── Schedule picker dialog ── */}
      <Dialog open={!!scheduleDay} onOpenChange={() => setScheduleDay(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays size={16} className="text-primary" />
              Schedule for {scheduleDay ? format(scheduleDay, "MMMM d, yyyy") : ""}
            </DialogTitle>
          </DialogHeader>
          {unscheduledItems.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">All posts are already scheduled.</p>
              <Button size="sm" className="mt-4" onClick={() => { setScheduleDay(null); navigate("/app/create"); }}>
                Create new content
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto mt-1">
              <p className="text-xs text-muted-foreground mb-3">Pick a post to schedule on this date:</p>
              {unscheduledItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    scheduleMutation.mutate({
                      id: item.id,
                      date: format(scheduleDay!, "yyyy-MM-dd"),
                    })
                  }
                  disabled={scheduleMutation.isPending}
                  className="w-full text-left p-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03] transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.caption.slice(0, 60)}...</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${CONTENT_TYPE_PILL[item.contentType] ?? "bg-muted/40 text-muted-foreground"}`}>
                      {item.contentType}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Day detail dialog (day has posts) ── */}
      <Dialog open={!!dayDetailDay} onOpenChange={() => setDayDetailDay(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays size={16} className="text-primary" />
              {dayDetailDay ? format(dayDetailDay, "MMMM d, yyyy") : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-1">
            {dayDetailDay && getItemsForDay(dayDetailDay).map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${CONTENT_TYPE_COLORS[item.contentType] ?? "bg-muted"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.contentType}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setDayDetailDay(null); navigate(`/app/content/${item.id}`); }}
                    className="text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeDateMutation.mutate(item.id)}
                    className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded transition-colors"
                    title="Remove from calendar"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            ))}
            {/* Add another post to this day */}
            {unscheduledItems.length > 0 && dayDetailDay && (
              <button
                onClick={() => { setDayDetailDay(null); setScheduleDay(dayDetailDay); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/60 rounded-lg py-2.5 transition-colors"
              >
                + Schedule another post on this day
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
