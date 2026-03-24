import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHashLocation } from "wouter/use-hash-location";
import { useAuth } from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Plus, CheckCircle2, Lock, ChevronRight,
  Palette, MapPin, Sparkles, Crown
} from "lucide-react";
import { SPECIALTIES } from "@shared/schema";
import type { Practice } from "@shared/schema";

// ─── Mock multi-practice data (Stage 1 — in-memory simulation) ───────────────
// In Stage 1, we store extra practices in a simple in-memory array per session.
// The "active" practice is always the real one from /api/practice.
// Pro users can create up to 5 practices; Starter users are limited to 1.

interface MockPractice {
  id: string;
  name: string;
  specialty: string;
  city?: string;
  brandColor1?: string;
  brandColor2?: string;
  isActive: boolean;
  isReal: boolean; // true = loaded from /api/practice, false = mock additional
}

export default function ManagePractices() {
  const [, navigate] = useHashLocation();
  const { isPro, user } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSpecialty, setNewSpecialty] = useState<string>("");
  const [newCity, setNewCity] = useState("");
  const [newColor1, setNewColor1] = useState("#6B5CE7");
  const [newColor2, setNewColor2] = useState("#9B8AF0");
  const [activePracticeId, setActivePracticeId] = useState<string>("real");

  // Load real practice from API
  const { data: realPractice } = useQuery<Practice | null>({
    queryKey: ["/api/practice"],
  });

  // Extra practices stored in component state (session-only for Stage 1)
  const [extraPractices, setExtraPractices] = useState<MockPractice[]>([]);

  const allPractices: MockPractice[] = [
    ...(realPractice ? [{
      id: "real",
      name: realPractice.name,
      specialty: realPractice.specialty,
      city: realPractice.city ?? undefined,
      brandColor1: realPractice.brandColor1 ?? undefined,
      brandColor2: realPractice.brandColor2 ?? undefined,
      isActive: activePracticeId === "real",
      isReal: true,
    }] : []),
    ...extraPractices,
  ];

  function handleAddPractice() {
    if (!newName.trim() || !newSpecialty) return;
    const id = `mock_${Date.now()}`;
    setExtraPractices(prev => [...prev, {
      id,
      name: newName.trim(),
      specialty: newSpecialty,
      city: newCity.trim() || undefined,
      brandColor1: newColor1,
      brandColor2: newColor2,
      isActive: false,
      isReal: false,
    }]);
    setNewName("");
    setNewSpecialty("");
    setNewCity("");
    setNewColor1("#6B5CE7");
    setNewColor2("#9B8AF0");
    setShowAddDialog(false);
  }

  function handleRemovePractice(id: string) {
    setExtraPractices(prev => prev.filter(p => p.id !== id));
    if (activePracticeId === id) setActivePracticeId("real");
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold">Manage Practices</h1>
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1 text-[10px]">
                <Crown size={9} /> Pro
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Switch between practice profiles — each with its own brand identity and content.
            </p>
          </div>

          {isPro ? (
            <Button
              onClick={() => setShowAddDialog(true)}
              disabled={allPractices.length >= 5}
              data-testid="btn-add-practice"
              className="gap-2 shrink-0"
            >
              <Plus size={15} />
              Add Practice
            </Button>
          ) : (
            <Button disabled variant="outline" className="gap-2 shrink-0 opacity-60">
              <Lock size={13} />
              Pro Only
            </Button>
          )}
        </div>

        {/* Tier banner for non-Pro */}
        {!isPro && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Crown size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-300">Pro Feature</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Upgrade to Pro to manage up to 5 practice profiles, each with their own brand identity, content library, and AI settings.
              </p>
              <Button size="sm" className="mt-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-1">
                <Crown size={12} />
                Upgrade to Pro — $149/mo
              </Button>
            </div>
          </div>
        )}

        {/* Practice list */}
        <div className="space-y-3">
          {allPractices.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border p-4 flex items-center gap-4 transition-all duration-150 ${
                p.isActive
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              {/* Color swatch */}
              <div
                className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
                style={{ background: p.brandColor1 ?? "#6B5CE7" }}
              >
                <Building2 size={18} className="text-white/80" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  {p.isActive && (
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1">
                      <CheckCircle2 size={9} /> Active
                    </Badge>
                  )}
                  {p.isReal && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Primary
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles size={10} /> {p.specialty}
                  </span>
                  {p.city && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin size={10} /> {p.city}
                    </span>
                  )}
                  {p.brandColor1 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Palette size={10} />
                      <span
                        className="w-3 h-3 rounded-sm inline-block border border-white/10"
                        style={{ background: p.brandColor1 }}
                      />
                      {p.brandColor1}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {!p.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActivePracticeId(p.id)}
                    data-testid={`btn-switch-practice-${p.id}`}
                    className="text-xs h-8"
                  >
                    Switch To
                  </Button>
                )}
                {p.isReal && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/app/setup")}
                    data-testid={`btn-edit-practice-${p.id}`}
                    className="text-xs h-8 gap-1"
                  >
                    Edit <ChevronRight size={12} />
                  </Button>
                )}
                {!p.isReal && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemovePractice(p.id)}
                    data-testid={`btn-remove-practice-${p.id}`}
                    className="text-xs h-8 text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}

          {allPractices.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/50 p-10 text-center">
              <Building2 size={28} className="text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No practices yet. Complete onboarding first.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => navigate("/app/setup")}
              >
                Go to Setup
              </Button>
            </div>
          )}
        </div>

        {/* Info card */}
        {isPro && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">About Multi-Practice</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1.5">
              <p>• Each practice has its own brand identity, colors, and AI voice settings.</p>
              <p>• Switch the active practice to generate content for that specific brand.</p>
              <p>• Up to <strong className="text-foreground">5 practice profiles</strong> on the Pro plan ({allPractices.length}/5 used).</p>
              <p>• Use the Design Editor to customize each practice's visual style separately.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Practice Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={16} /> Add Practice Profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Practice Name</Label>
              <Input
                placeholder="e.g. Bright Smiles Orthodontics"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-testid="input-new-practice-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Specialty</Label>
              <Select value={newSpecialty} onValueChange={setNewSpecialty}>
                <SelectTrigger data-testid="select-new-specialty">
                  <SelectValue placeholder="Select specialty..." />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>City <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                placeholder="e.g. Dallas, TX"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                data-testid="input-new-practice-city"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor1}
                    onChange={(e) => setNewColor1(e.target.value)}
                    className="w-10 h-9 rounded border border-border cursor-pointer bg-transparent"
                    data-testid="input-new-color1"
                  />
                  <Input
                    value={newColor1}
                    onChange={(e) => setNewColor1(e.target.value)}
                    className="font-mono text-xs"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor2}
                    onChange={(e) => setNewColor2(e.target.value)}
                    className="w-10 h-9 rounded border border-border cursor-pointer bg-transparent"
                    data-testid="input-new-color2"
                  />
                  <Input
                    value={newColor2}
                    onChange={(e) => setNewColor2(e.target.value)}
                    className="font-mono text-xs"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={handleAddPractice}
              disabled={!newName.trim() || !newSpecialty}
              data-testid="btn-confirm-add-practice"
            >
              Add Practice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
