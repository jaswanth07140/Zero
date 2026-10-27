# Zero Plugins — Pack 2 (25 features)

File: `zero-plugins-pack2.js` — load after `zero-plugins.js` and `zero-plugins-builtin.js`.
All 25 work fully on-device: no network calls, no storage, no tracking. Each is a toggleable
plugin in the plugin browser; type the trigger in the Zero search box to get an instant answer card.

| # | Plugin (id) | What it does | Exact trigger example |
|---|---|---|---|
| 1 | Percentage (`percentage`) | Percent of a number | `15% of 240` → 36 |
| 2 | Tip Calculator (`tipcalc`) | Tip amount + total | `tip 18% on 64` → tip $11.52, total $75.52 |
| 3 | Age Calculator (`agecalc`) | Age in years from a birth date | `age 2010-05-04` |
| 4 | Date Difference (`datediff`) | Days between two dates | `days between 2026-01-01 and 2026-12-31` → 364 days |
| 5 | Days Until (`daysuntil`) | Days from today to a date | `days until 2027-01-01` |
| 6 | BMI Calculator (`bmi`) | BMI value + category (general info only) | `bmi 70kg 175cm` → 22.9 · Normal |
| 7 | Loan Payment (`loan`) | Monthly payment (amount, annual %, months) | `loan 10000 5% 36` → $299.71 / month |
| 8 | Compound Interest (`compound`) | Final amount after compounding | `compound 1000 5% 10` → $1628.89 |
| 9 | Discount (`discount`) | Sale price + amount saved | `25% off 80` → $60.00, save $20.00 |
| 10 | Sales Tax (`salestax`) | Tax amount + total | `tax 8% on 120` → tax $9.60, total $129.60 |
| 11 | Binary Converter (`binary`) | Decimal → binary | `binary 42` → 101010 · also `42 in binary` |
| 12 | Hex Converter (`hex`) | Decimal → hexadecimal | `hex 255` → FF |
| 13 | Roman Numerals (`roman`) | Number ↔ Roman, both ways | `roman 1994` → MCMXCIV · `roman MCMXCIV` → 1994 |
| 14 | Random Number (`random`) | Random integer in a range | `random between 1 and 100` |
| 15 | Dice & Coin (`dice`) | Coin flip and dice rolls | `flip a coin` · `roll a dice` · `roll 2d6` |
| 16 | Password Generator (`passwordgen`) | Password generated on-device, never stored | `password 16` |
| 17 | Case Converter (`caseconv`) | Upper / lower / title case | `uppercase hello world` · `lowercase HELLO` · `titlecase hello world` |
| 18 | Reverse Text (`reverse`) | Text backwards | `reverse hello` → olleh |
| 19 | Reading Time (`readingtime`) | Word count + minutes at 200 wpm | `reading time: <text>` |
| 20 | Time Zone Converter (`tzconv`) | Convert a time between zones (fixed offsets, standard approximations) | `3pm est to pst` → 12:00 PST · `15:00 utc to est` → 10:00 EST |
| 21 | Data Size Converter (`datasize`) | B/KB/MB/GB/TB, 1000-based | `500 mb to gb` → 0.5 GB · `2 gb to mb` → 2000 MB |
| 22 | Speed Converter (`speed`) | mph ↔ km/h ↔ m/s | `60 mph to kmh` → 96.56 km/h · `100 kmh to mph` → 62.14 mph |
| 23 | Cooking Measures (`cooking`) | Cups/tbsp/tsp → ml (and back) | `2 cups to ml` → 473.18 ml · `3 tbsp to ml` · `1 tsp to ml` |
| 24 | Fraction Helper (`fraction`) | Decimal + percent + simplified form | `fraction 3/4` → 0.75 · 75% · simplified 3/4 |
| 25 | Base64 (`base64`) | Encode / decode, UTF-8 safe | `base64 hello` → aGVsbG8= · `base64 decode aGVsbG8=` → hello |

Notes:
- Time zone offsets are a fixed standard map (est/edt/cst/cdt/mst/mdt/pst/pdt/utc/gmt/bst/ist) — standard approximations, no daylight-saving lookup.
- Data sizes use 1000-based units (1 KB = 1000 B), as noted on the result card.
- Cooking factors: 1 cup = 236.588 ml, 1 tbsp = 14.7868 ml, 1 tsp = 4.92892 ml.
- The password generator uses `crypto.getRandomValues` when available and says on the card that the password was generated on-device and is not stored anywhere.
