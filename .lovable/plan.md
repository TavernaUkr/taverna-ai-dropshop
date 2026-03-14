

## Plan: Language Selector & Region/Country Selector in Header

### What to build

Two new icon buttons in the Header, positioned **between the logo/brand text and the existing right action icons** (before Wallet). They follow the same visual style as existing header icons.

1. **Language selector** (`Globe` icon from lucide-react) — opens a small modal/popover to pick UI language. Currently only Ukrainian (UA) is active. Future languages: English, Polish, German, Italian, etc.

2. **Region/Country selector** (`Flag` icon from lucide-react) — opens a modal showing available regions. Ukraine is active (default). Other countries (Poland, Germany, Italy, USA, etc.) show a "Скоро" badge, disabled.

### Layout in Header

```text
[Logo + Taverna Group] [🌐 Lang] [🚩 Region] ... [Wallet] [Trophy] [Gift] [Search] [Heart] [Cart]
```

The two new buttons sit right after the brand text, visually grouped with the left side but using the same `w-8 h-8` icon button style as the right-side actions.

### Implementation Details

**New files:**
- `src/components/LanguageSelectorModal.tsx` — Bottom sheet / dialog with language list. UA selected by default, others available but functional (stored in localStorage for now, no i18n library yet — just saves preference).
- `src/components/RegionSelectorModal.tsx` — Bottom sheet / dialog with country list. Ukraine active, others show "Скоро" / "В проєкті" badge and are disabled.

**Modified files:**
- `src/components/Header.tsx` — Add `Globe` and `Flag` icons between logo and right actions. Each opens its respective modal. Language button shows current language code (e.g., tiny "UA" badge). Region button shows a small flag emoji or country code.

### Language Modal
- List of languages: Українська (active), English, Polski, Deutsch, Italiano
- Radio-style selection, saves to `localStorage('app-language')`
- No actual i18n translation yet — just the preference storage and UI. Shows toast "Мову змінено" on selection.

### Region Modal  
- Ukraine 🇺🇦 — active, selectable
- Poland 🇵🇱, Germany 🇩🇪, Italy 🇮🇹, USA 🇺🇸 — each with a "Скоро" / "В проєкті" badge, grayed out, not selectable
- Clean card-based list with flag emojis

### Visual style
Both buttons use the same pattern as existing header icons: `w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all`. The Globe icon gets a subtle blue tint (`text-blue-500`), the Flag icon gets a yellow-blue tint for Ukraine (`text-yellow-500`).

