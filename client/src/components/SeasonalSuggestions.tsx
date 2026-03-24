import { useHashLocation } from "wouter/use-hash-location";
import { Sparkles, ChevronRight, Calendar } from "lucide-react";

// Returns seasonal/holiday suggestions based on current month
function getSuggestions(specialty: string | undefined) {
  const month = new Date().getMonth(); // 0-indexed

  const seasonal: Record<number, { theme: string; color: string; bg: string; dot: string; ideas: string[] }> = {
    0: { // January
      theme: "New Year, New Smile",
      color: "text-blue-400", bg: "bg-blue-400/8", dot: "bg-blue-400",
      ideas: [
        "New Year resolution: fix your smile — book a free consult",
        "January is National Orthodontics Month — share a milestone",
        "Start the year fresh: skincare reset routine tips",
        "Winter skin hydration guide for your patients",
      ],
    },
    1: { // February
      theme: "Valentine's Day & Heart Health",
      color: "text-rose-400", bg: "bg-rose-400/8", dot: "bg-rose-400",
      ideas: [
        "Gift the smile they've always wanted this Valentine's Day",
        "Love your skin: February self-care glow-up tips",
        "His & hers Invisalign — couples promotion",
        "Heart health & oral health connection — educational post",
      ],
    },
    2: { // March
      theme: "Spring Into a New Look",
      color: "text-emerald-400", bg: "bg-emerald-400/8", dot: "bg-emerald-400",
      ideas: [
        "Spring special: $500 off Invisalign this month only",
        "Spring into clear skin — laser treatment promo",
        "Before spring break — get your smile camera-ready",
        "Spring skincare switch: swap out your heavy winter routine",
      ],
    },
    3: { // April
      theme: "Spring & Easter",
      color: "text-pink-400", bg: "bg-pink-400/8", dot: "bg-pink-400",
      ideas: [
        "Easter basket idea: gift a dental consultation",
        "Spring glow — dermal filler refresh special",
        "Earth Day: our eco-friendly practice commitment post",
        "April patient spotlight — share a transformation story",
      ],
    },
    4: { // May
      theme: "Mother's Day & Mental Health Month",
      color: "text-purple-400", bg: "bg-purple-400/8", dot: "bg-purple-400",
      ideas: [
        "Mother's Day gift: treat mom to a smile makeover",
        "Mental Health Month: confidence and how your smile affects it",
        "Mom-approved Invisalign — before & after feature",
        "Graduation season: get smile-ready before the big day",
      ],
    },
    5: { // June
      theme: "Summer & Wedding Season",
      color: "text-amber-400", bg: "bg-amber-400/8", dot: "bg-amber-400",
      ideas: [
        "Wedding season: be photo-ready with teeth whitening",
        "Summer skin protection — SPF education post",
        "Graduation smile — congrats & consultation promo",
        "Father's Day: gift dad a confidence boost",
      ],
    },
    6: { // July
      theme: "Summer Glow",
      color: "text-orange-400", bg: "bg-orange-400/8", dot: "bg-orange-400",
      ideas: [
        "4th of July: red, white, and bright smiles",
        "Summer body confidence — body contouring spotlight",
        "Beat the heat: summer skincare do's and don'ts",
        "Invisible aligners — perfect for summer photos",
      ],
    },
    7: { // August
      theme: "Back to School",
      color: "text-cyan-400", bg: "bg-cyan-400/8", dot: "bg-cyan-400",
      ideas: [
        "Back to school: the perfect time to start braces",
        "School year kickoff — why age 7 is the ideal ortho eval age",
        "Teens & clear aligners — lifestyle-friendly treatment",
        "Get camera-ready before school photos",
      ],
    },
    8: { // September
      theme: "Fall Reset",
      color: "text-orange-300", bg: "bg-orange-300/8", dot: "bg-orange-300",
      ideas: [
        "Fall into a new smile — seasonal promotion",
        "Back-to-routine skincare after summer",
        "September is Childhood Obesity & Dental Health Month",
        "Fall refresh: Botox before the holiday season",
      ],
    },
    9: { // October
      theme: "Halloween & Breast Cancer Awareness",
      color: "text-rose-300", bg: "bg-rose-300/8", dot: "bg-rose-300",
      ideas: [
        "Pink October: our practice supports breast cancer awareness",
        "Scary good smile transformations — Halloween B&A post",
        "Candy season: remind patients about oral health habits",
        "Countdown to the holidays — start Invisalign now",
      ],
    },
    10: { // November
      theme: "Thanksgiving & Holiday Prep",
      color: "text-amber-300", bg: "bg-amber-300/8", dot: "bg-amber-300",
      ideas: [
        "Thankful for our patients — share a gratitude post",
        "Holiday party season: get your smile photo-ready",
        "Black Friday: special offer on treatment consultations",
        "Year-end insurance reminder — use your benefits before Dec 31",
      ],
    },
    11: { // December
      theme: "Holiday Season & Year End",
      color: "text-violet-400", bg: "bg-violet-400/8", dot: "bg-violet-400",
      ideas: [
        "Holiday gift idea: gift card for a consultation",
        "End of year: use your dental/insurance benefits now",
        "New Year's Eve — countdown to a new smile in January",
        "Holiday party glow: last-minute treatment spotlight",
      ],
    },
  };

  const s = seasonal[month];

  // Filter by specialty if provided
  const allIdeas = s.ideas;
  return { ...s, ideas: allIdeas.slice(0, 4) };
}

interface Props {
  specialty?: string;
}

export default function SeasonalSuggestions({ specialty }: Props) {
  const [, navigate] = useHashLocation();
  const suggestion = getSuggestions(specialty);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const currentMonth = monthNames[new Date().getMonth()];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg ${suggestion.bg} flex items-center justify-center`}>
            <Calendar size={13} className={suggestion.color} />
          </div>
          <div>
            <p className="text-sm font-semibold">{suggestion.theme}</p>
            <p className="text-xs text-muted-foreground">{currentMonth} content ideas for your practice</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${suggestion.color} border-current/20 ${suggestion.bg}`}>
          {currentMonth}
        </span>
      </div>

      {/* Ideas grid */}
      <div className="divide-y divide-border/50">
        {suggestion.ideas.map((idea, i) => (
          <button
            key={i}
            onClick={() => {
              // Navigate to create with idea pre-filled via URL param
              navigate(`/app/create?idea=${encodeURIComponent(idea)}`);
            }}
            className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-white/[0.025] transition-colors group"
            data-testid={`seasonal-idea-${i}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${suggestion.dot}`} />
            <p className="text-sm text-foreground/80 group-hover:text-foreground flex-1 transition-colors leading-snug">
              {idea}
            </p>
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <Sparkles size={11} className={suggestion.color} />
              <span className={`text-[10px] font-medium ${suggestion.color}`}>Generate</span>
              <ChevronRight size={11} className={suggestion.color} />
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/50 bg-muted/20">
        <p className="text-[10px] text-muted-foreground">
          Click any idea to open the AI generator with it pre-filled. Suggestions update each month.
        </p>
      </div>
    </div>
  );
}
