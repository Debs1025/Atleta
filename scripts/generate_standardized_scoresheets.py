import os
import json
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "/home/gerard/Desktop/School/Atleta-dev_test_branch/sample_scoresheets/standardized"
os.makedirs(OUT_DIR, exist_ok=True)

def get_bold_font(size):
    for p in ["/usr/share/fonts/TTF/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def get_font(size):
    for p in ["/usr/share/fonts/TTF/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

title_font = get_bold_font(30)
header_font = get_bold_font(20)
col_font = get_bold_font(16)
cell_font = get_font(16)
bold_cell_font = get_bold_font(16)
small_font = get_font(13)

def draw_sheet(out_path, title, subtitle_left, subtitle_right, meta_left, meta_right, cols, rows, note=""):
    w, h = 1600, 1050
    img = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Outer border
    draw.rectangle([25, 25, w - 25, h - 25], outline=(15, 23, 42), width=3)

    # Header container
    draw.rectangle([40, 40, w - 40, 165], fill=(248, 250, 252), outline=(30, 41, 59), width=2)
    draw.text((60, 52), title, fill=(15, 23, 42), font=title_font)
    draw.text((60, 96), subtitle_left, fill=(30, 41, 59), font=header_font)
    draw.text((850, 96), subtitle_right, fill=(15, 23, 42), font=header_font)
    draw.text((60, 130), meta_left, fill=(71, 85, 105), font=small_font)
    draw.text((850, 130), meta_right, fill=(5, 150, 105), font=bold_cell_font)

    # Table calculation
    start_x = 45
    table_w = w - 90
    y = 190

    # Header Row
    draw.rectangle([start_x, y, start_x + table_w, y + 42], fill=(226, 232, 240), outline=(30, 41, 59), width=2)
    for name, x1, x2 in cols:
        draw.line([(x1, y), (x1, y + 42)], fill=(30, 41, 59), width=1)
        draw.text((x1 + 8, y + 11), name, fill=(15, 23, 42), font=col_font)
    draw.line([(start_x + table_w, y), (start_x + table_w, y + 42)], fill=(30, 41, 59), width=1)
    y += 42

    # Data Rows
    for r_idx, row in enumerate(rows):
        row_bg = (255, 255, 255) if r_idx % 2 == 0 else (248, 250, 252)
        # Highlight top 3 for race rows if first col is a rank
        if row[0] in ["#1", "1", "01"]:
            row_bg = (254, 252, 232) # Gold tint
        elif row[0] in ["#2", "2", "02"]:
            row_bg = (241, 245, 249) # Silver tint
        elif row[0] in ["#3", "3", "03"]:
            row_bg = (255, 247, 237) # Bronze tint

        draw.rectangle([start_x, y, start_x + table_w, y + 40], fill=row_bg, outline=(203, 213, 225), width=1)
        for c_idx, (_, x1, x2) in enumerate(cols):
            draw.line([(x1, y), (x1, y + 40)], fill=(203, 213, 225), width=1)
            val = str(row[c_idx]) if c_idx < len(row) else ""
            f = bold_cell_font if c_idx in [0, 1, 4] else cell_font
            color = (15, 23, 42)
            if c_idx == 0 and row[0] in ["#1", "1"]:
                color = (180, 83, 9)
            draw.text((x1 + 8, y + 11), val, fill=color, font=f)
        draw.line([(start_x + table_w, y), (start_x + table_w, y + 40)], fill=(203, 213, 225), width=1)
        y += 40

    # Footer signature / notes
    y += 25
    draw.rectangle([45, y, 650, y + 80], fill=(248, 250, 252), outline=(148, 163, 184), width=1)
    draw.text((55, y + 12), f"OFFICIAL SIGNED VERIFICATION: {note or 'CERTIFIED ACCREDITED MATCH'}", fill=(15, 23, 42), font=bold_cell_font)
    draw.text((55, y + 42), "HEAD OFFICIAL: RAMON DEL ROSARIO | TIMEKEEPING: ELECTRONIC TOUCHPAD / TIMING GATE", fill=(71, 85, 105), font=small_font)

    img.save(out_path)
    print(f"Generated: {out_path}")

# ==========================================
# 1. BASKETBALL
# ==========================================
bball_cols = [
    ("#", 45, 105),
    ("PLAYER NAME", 105, 390),
    ("POS", 390, 460),
    ("TEAM", 460, 700),
    ("PTS", 700, 780),
    ("REB", 780, 850),
    ("AST", 850, 920),
    ("STL", 920, 985),
    ("BLK", 985, 1050),
    ("TO", 1050, 1115),
    ("MIN", 1115, 1185),
    ("FGM", 1185, 1260),
    ("FGA", 1260, 1340),
    ("FG%", 1340, 1555),
]

bball_players_single = [
    ("11", "D. RAVENA", "G", "ADNU KNIGHTS", "26", "6", "8", "3", "0", "2", "34", "10", "21", "47.6%"),
    ("07", "J. TENG", "F", "ADNU KNIGHTS", "22", "9", "4", "1", "2", "1", "32", "9", "17", "52.9%"),
    ("15", "K. MAMBULAC", "C", "ADNU KNIGHTS", "14", "13", "1", "0", "4", "2", "28", "7", "14", "50.0%"),
    ("03", "M. NIETO", "G", "ADNU KNIGHTS", "10", "3", "5", "2", "0", "1", "24", "4", "10", "40.0%"),
    ("09", "A. WONG", "G", "ADNU KNIGHTS", "8", "4", "3", "1", "0", "0", "20", "4", "9", "44.4%"),
    ("10", "K. QUIAMBAO", "F", "DLSU ARCHERS", "24", "10", "6", "2", "2", "3", "35", "10", "20", "50.0%"),
    ("01", "E. NWANKWO", "C", "DLSU ARCHERS", "16", "14", "2", "1", "3", "2", "30", "7", "13", "53.8%"),
    ("05", "J. MACALALAG", "G", "DLSU ARCHERS", "12", "4", "4", "1", "0", "1", "26", "5", "12", "41.7%"),
    ("08", "J. CORTEZ", "G", "DLSU ARCHERS", "9", "3", "3", "2", "0", "1", "22", "3", "8", "37.5%"),
    ("17", "M. PHILLIPS", "F", "DLSU ARCHERS", "7", "7", "1", "1", "1", "0", "18", "3", "7", "42.9%"),
]

# Split across page 1 and page 2 (halves)
bball_players_p1 = [
    ("11", "D. RAVENA", "G", "ADNU KNIGHTS", "14", "3", "4", "2", "0", "1", "17", "5", "11", "45.5%"),
    ("07", "J. TENG", "F", "ADNU KNIGHTS", "10", "5", "2", "1", "1", "1", "16", "4", "8", "50.0%"),
    ("15", "K. MAMBULAC", "C", "ADNU KNIGHTS", "8", "7", "1", "0", "2", "1", "14", "4", "8", "50.0%"),
    ("03", "M. NIETO", "G", "ADNU KNIGHTS", "6", "2", "3", "1", "0", "0", "12", "2", "5", "40.0%"),
    ("09", "A. WONG", "G", "ADNU KNIGHTS", "4", "2", "1", "0", "0", "0", "10", "2", "5", "40.0%"),
    ("10", "K. QUIAMBAO", "F", "DLSU ARCHERS", "11", "5", "3", "1", "1", "2", "18", "4", "9", "44.4%"),
    ("01", "E. NWANKWO", "C", "DLSU ARCHERS", "8", "7", "1", "0", "1", "1", "15", "4", "7", "57.1%"),
    ("05", "J. MACALALAG", "G", "DLSU ARCHERS", "7", "2", "2", "1", "0", "0", "13", "3", "6", "50.0%"),
    ("08", "J. CORTEZ", "G", "DLSU ARCHERS", "4", "1", "2", "1", "0", "1", "11", "1", "4", "25.0%"),
    ("17", "M. PHILLIPS", "F", "DLSU ARCHERS", "3", "4", "0", "1", "0", "0", "9", "1", "3", "33.3%"),
]

bball_players_p2 = [
    ("11", "D. RAVENA", "G", "ADNU KNIGHTS", "12", "3", "4", "1", "0", "1", "17", "5", "10", "50.0%"),
    ("07", "J. TENG", "F", "ADNU KNIGHTS", "12", "4", "2", "0", "1", "0", "16", "5", "9", "55.6%"),
    ("15", "K. MAMBULAC", "C", "ADNU KNIGHTS", "6", "6", "0", "0", "2", "1", "14", "3", "6", "50.0%"),
    ("03", "M. NIETO", "G", "ADNU KNIGHTS", "4", "1", "2", "1", "0", "1", "12", "2", "5", "40.0%"),
    ("09", "A. WONG", "G", "ADNU KNIGHTS", "4", "2", "2", "1", "0", "0", "10", "2", "4", "50.0%"),
    ("10", "K. QUIAMBAO", "F", "DLSU ARCHERS", "13", "5", "3", "1", "1", "1", "17", "6", "11", "54.5%"),
    ("01", "E. NWANKWO", "C", "DLSU ARCHERS", "8", "7", "1", "1", "2", "1", "15", "3", "6", "50.0%"),
    ("05", "J. MACALALAG", "G", "DLSU ARCHERS", "5", "2", "2", "0", "0", "1", "13", "2", "6", "33.3%"),
    ("08", "J. CORTEZ", "G", "DLSU ARCHERS", "5", "2", "1", "1", "0", "0", "11", "2", "4", "50.0%"),
    ("17", "M. PHILLIPS", "F", "DLSU ARCHERS", "4", "3", "1", "0", "1", "0", "9", "2", "4", "50.0%"),
]

draw_sheet(
    f"{OUT_DIR}/bball_single.png",
    "OFFICIAL BASKETBALL BOX SCORE",
    "MATCH: ADNU KNIGHTS vs DLSU GREEN ARCHERS",
    "UAAP MEN'S BASKETBALL FINALS",
    "DATE: OCTOBER 16, 2026 | VENUE: MOA ARENA | OFFICIAL FULL-GAME REPORT",
    "FINAL SCORE: ADNU KNIGHTS 80 - 68 DLSU ARCHERS",
    bball_cols,
    bball_players_single,
    "GAME COMPLETE - VERIFIED"
)

draw_sheet(
    f"{OUT_DIR}/bball_page1.png",
    "OFFICIAL BASKETBALL BOX SCORE [PAGE 1 - 1ST HALF]",
    "MATCH: ADNU KNIGHTS vs DLSU GREEN ARCHERS",
    "UAAP MEN'S BASKETBALL FINALS - PART 1",
    "DATE: OCTOBER 16, 2026 | VENUE: MOA ARENA | PERIODS 1 & 2",
    "HALFTIME SCORE: ADNU KNIGHTS 42 - 33 DLSU ARCHERS",
    bball_cols,
    bball_players_p1,
    "HALFTIME COMPLETE - PART 1 OF 2"
)

draw_sheet(
    f"{OUT_DIR}/bball_page2.png",
    "OFFICIAL BASKETBALL BOX SCORE [PAGE 2 - 2ND HALF / CONTINUATION]",
    "MATCH: ADNU KNIGHTS vs DLSU GREEN ARCHERS",
    "UAAP MEN'S BASKETBALL FINALS - PART 2",
    "DATE: OCTOBER 16, 2026 | VENUE: MOA ARENA | PERIODS 3 & 4",
    "2ND HALF SCORE: ADNU KNIGHTS 38 - 35 DLSU ARCHERS",
    bball_cols,
    bball_players_p2,
    "FULL GAME AUDITED - PART 2 OF 2"
)

# ==========================================
# 2. SWIMMING (RACING SPORT - TIME SORTING)
# ==========================================
swim_cols = [
    ("RANK", 45, 120),
    ("LANE", 120, 200),
    ("ATHLETE NAME", 200, 520),
    ("TEAM / AFFILIATION", 520, 840),
    ("FINISH TIME", 840, 1020),
    ("LAP TIME", 1020, 1180),
    ("STROKE RATE", 1180, 1360),
    ("EFFICIENCY", 1360, 1555),
]

# Deliberately unordered in raw scan to test automatic ascending time sort
swim_athletes_single = [
    ("#1", "4", "C. HATCH", "ADNU DOLPHINS", "00:50.85", "24.12", "48", "99.2%"),
    ("#2", "5", "M. DEL ROSARIO", "DLSU AQUATICS", "00:51.62", "24.58", "46", "98.5%"),
    ("#3", "3", "J. RULE", "UST TIGERSHARKS", "00:52.40", "24.95", "45", "97.8%"),
    ("#4", "6", "R. JACINTO", "ADMU BLUE SWIMMERS", "00:53.18", "25.30", "44", "96.5%"),
    ("#5", "2", "A. GABRIEL", "FEU TAMARAWS", "00:54.05", "25.75", "43", "95.2%"),
    ("#6", "7", "K. TAN", "UP FIGHTING MAROONS", "00:55.22", "26.10", "42", "94.0%"),
]

swim_athletes_p1 = [
    ("#1", "4", "C. HATCH", "ADNU DOLPHINS", "00:50.85", "24.12", "48", "99.2%"),
    ("#2", "5", "M. DEL ROSARIO", "DLSU AQUATICS", "00:51.62", "24.58", "46", "98.5%"),
    ("#3", "3", "J. RULE", "UST TIGERSHARKS", "00:52.40", "24.95", "45", "97.8%"),
]

swim_athletes_p2 = [
    ("#4", "6", "R. JACINTO", "ADMU BLUE SWIMMERS", "00:53.18", "25.30", "44", "96.5%"),
    ("#5", "2", "A. GABRIEL", "FEU TAMARAWS", "00:54.05", "25.75", "43", "95.2%"),
    ("#6", "7", "K. TAN", "UP FIGHTING MAROONS", "00:55.22", "26.10", "42", "94.0%"),
]

draw_sheet(
    f"{OUT_DIR}/swimming_single.png",
    "OFFICIAL SWIMMING EVENT RESULTS - MEN'S 100M FREESTYLE FINAL",
    "EVENT: 100M FREESTYLE CHAMPIONSHIP",
    "UAAP SEASON 87 SWIMMING TOURNAMENT",
    "DATE: OCTOBER 16, 2026 | POOL: RIZAL MEMORIAL AQUATIC CENTER | ELECTRONIC TIMING",
    "PODIUM: 1ST C. HATCH (50.85s) | 2ND M. DEL ROSARIO (51.62s) | 3RD J. RULE (52.40s)",
    swim_cols,
    swim_athletes_single,
    "OFFICIAL TOUCHPAD RESULTS - CERTIFIED"
)

draw_sheet(
    f"{OUT_DIR}/swimming_page1.png",
    "OFFICIAL SWIMMING EVENT RESULTS [PAGE 1 - LANES 3-5 TOP PODIUM]",
    "EVENT: 100M FREESTYLE CHAMPIONSHIP - HEAT A",
    "UAAP SEASON 87 SWIMMING TOURNAMENT - PART 1",
    "DATE: OCTOBER 16, 2026 | POOL: RIZAL MEMORIAL AQUATIC CENTER",
    "HEAT LEADER: C. HATCH (00:50.85)",
    swim_cols,
    swim_athletes_p1,
    "PART 1 OF 2 - LANES 3 TO 5"
)

draw_sheet(
    f"{OUT_DIR}/swimming_page2.png",
    "OFFICIAL SWIMMING EVENT RESULTS [PAGE 2 - LANES 2, 6, 7 / CONTINUATION]",
    "EVENT: 100M FREESTYLE CHAMPIONSHIP - HEAT B",
    "UAAP SEASON 87 SWIMMING TOURNAMENT - PART 2",
    "DATE: OCTOBER 16, 2026 | POOL: RIZAL MEMORIAL AQUATIC CENTER",
    "HEAT LEADER: R. JACINTO (00:53.18)",
    swim_cols,
    swim_athletes_p2,
    "PART 2 OF 2 - LANES 2, 6, 7"
)

# ==========================================
# 3. TRACK & FIELD (RACING SPORT - TIME SORTING)
# ==========================================
track_cols = [
    ("RANK", 45, 120),
    ("LANE", 120, 200),
    ("ATHLETE NAME", 200, 520),
    ("TEAM / DELEGATION", 520, 840),
    ("FINISH TIME", 840, 1020),
    ("SPLIT TIMES", 1020, 1200),
    ("REACTION", 1200, 1360),
    ("EFFICIENCY", 1360, 1555),
]

track_athletes_single = [
    ("#1", "4", "E. CRAY", "ADNU TRACK CLUB", "00:10.12", "05.42 / 04.70", "0.142s", "99.5%"),
    ("#2", "5", "T. CARTER", "DLSU RUNNERS", "00:10.28", "05.50 / 04.78", "0.150s", "98.9%"),
    ("#3", "3", "A. DE MESA", "UST ATHLETICS", "00:10.45", "05.58 / 04.87", "0.158s", "97.6%"),
    ("#4", "6", "P. BAUTISTA", "FEU TRACK TEAM", "00:10.72", "05.70 / 05.02", "0.165s", "96.0%"),
    ("#5", "2", "M. ALBA", "ADMU BLUE TRACK", "00:10.98", "05.82 / 05.16", "0.172s", "95.1%"),
    ("#6", "7", "S. MENDOZA", "UP FIGHTING TRACK", "00:11.25", "05.95 / 05.30", "0.180s", "93.8%"),
]

track_athletes_p1 = [
    ("#1", "4", "E. CRAY", "ADNU TRACK CLUB", "00:10.12", "05.42 / 04.70", "0.142s", "99.5%"),
    ("#2", "5", "T. CARTER", "DLSU RUNNERS", "00:10.28", "05.50 / 04.78", "0.150s", "98.9%"),
    ("#3", "3", "A. DE MESA", "UST ATHLETICS", "00:10.45", "05.58 / 04.87", "0.158s", "97.6%"),
]

track_athletes_p2 = [
    ("#4", "6", "P. BAUTISTA", "FEU TRACK TEAM", "00:10.72", "05.70 / 05.02", "0.165s", "96.0%"),
    ("#5", "2", "M. ALBA", "ADMU BLUE TRACK", "00:10.98", "05.82 / 05.16", "0.172s", "95.1%"),
    ("#6", "7", "S. MENDOZA", "UP FIGHTING TRACK", "00:11.25", "05.95 / 05.30", "0.180s", "93.8%"),
]

draw_sheet(
    f"{OUT_DIR}/track_single.png",
    "OFFICIAL TRACK & FIELD RESULTS - MEN'S 100M SPRINT FINAL",
    "EVENT: 100M DASH CHAMPIONSHIP",
    "UAAP ATHLETICS CHAMPIONSHIP 2026",
    "DATE: OCTOBER 16, 2026 | VENUE: PHILSORTS ARENA TRACK | WIND: +0.8 M/S",
    "PODIUM: 1ST E. CRAY (10.12s) | 2ND T. CARTER (10.28s) | 3RD A. DE MESA (10.45s)",
    track_cols,
    track_athletes_single,
    "PHOTO FINISH / FAT VERIFIED"
)

draw_sheet(
    f"{OUT_DIR}/track_page1.png",
    "OFFICIAL TRACK & FIELD RESULTS [PAGE 1 - PODIUM FINISHERS]",
    "EVENT: 100M DASH CHAMPIONSHIP - SECTION 1",
    "UAAP ATHLETICS CHAMPIONSHIP 2026 - PART 1",
    "DATE: OCTOBER 16, 2026 | VENUE: PHILSORTS ARENA TRACK",
    "SECTION LEADER: E. CRAY (00:10.12)",
    track_cols,
    track_athletes_p1,
    "PART 1 OF 2 - POSITIONS 1 TO 3"
)

draw_sheet(
    f"{OUT_DIR}/track_page2.png",
    "OFFICIAL TRACK & FIELD RESULTS [PAGE 2 - CONTINUATION SECTION 2]",
    "EVENT: 100M DASH CHAMPIONSHIP - SECTION 2",
    "UAAP ATHLETICS CHAMPIONSHIP 2026 - PART 2",
    "DATE: OCTOBER 16, 2026 | VENUE: PHILSORTS ARENA TRACK",
    "SECTION LEADER: P. BAUTISTA (00:10.72)",
    track_cols,
    track_athletes_p2,
    "PART 2 OF 2 - POSITIONS 4 TO 6"
)

# ==========================================
# 4. VOLLEYBALL (CUSTOM SPORT 1 - DYNAMIC SCHEMA)
# ==========================================
volley_cols = [
    ("#", 45, 105),
    ("PLAYER NAME", 105, 400),
    ("POS", 400, 470),
    ("TEAM", 470, 710),
    ("KILLS", 710, 800),
    ("ATK ERR", 800, 890),
    ("ATTEMPTS", 890, 990),
    ("HIT %", 990, 1080),
    ("ACES", 1080, 1160),
    ("DIGS", 1160, 1240),
    ("BLK PTS", 1240, 1340),
    ("PTS", 1340, 1555),
]

volley_players_single = [
    ("02", "A. VALDEZ", "OH", "ADNU SPIKERS", "23", "4", "45", ".422", "4", "14", "3", "30"),
    ("13", "M. DE GUZMAN", "MB", "ADNU SPIKERS", "12", "2", "22", ".455", "1", "5", "5", "18"),
    ("05", "R. DE LEON", "OH", "ADNU SPIKERS", "11", "3", "26", ".308", "2", "8", "1", "14"),
    ("07", "J. MARAGUINOT", "S", "ADNU SPIKERS", "3", "1", "8", ".250", "3", "11", "1", "7"),
    ("18", "B. DE JESUS", "L", "ADNU SPIKERS", "0", "0", "0", ".000", "0", "24", "0", "0"),
    ("08", "A. GALAURAN", "OH", "DLSU LADY SPIKERS", "19", "5", "42", ".333", "2", "12", "2", "23"),
    ("15", "S. CANINO", "OH", "DLSU LADY SPIKERS", "14", "4", "31", ".323", "1", "9", "1", "16"),
    ("03", "T. SHARMA", "MB", "DLSU LADY SPIKERS", "10", "2", "18", ".444", "1", "4", "4", "15"),
    ("11", "M. CORONEL", "S", "DLSU LADY SPIKERS", "2", "0", "5", ".400", "2", "8", "1", "5"),
    ("01", "J. CORONA", "L", "DLSU LADY SPIKERS", "0", "0", "0", ".000", "0", "20", "0", "0"),
]

volley_players_p1 = [
    ("02", "A. VALDEZ", "OH", "ADNU SPIKERS", "12", "2", "23", ".435", "2", "7", "1", "15"),
    ("13", "M. DE GUZMAN", "MB", "ADNU SPIKERS", "6", "1", "11", ".455", "0", "3", "3", "9"),
    ("05", "R. DE LEON", "OH", "ADNU SPIKERS", "6", "2", "14", ".286", "1", "4", "0", "7"),
    ("07", "J. MARAGUINOT", "S", "ADNU SPIKERS", "2", "0", "4", ".500", "1", "6", "1", "4"),
    ("18", "B. DE JESUS", "L", "ADNU SPIKERS", "0", "0", "0", ".000", "0", "12", "0", "0"),
    ("08", "A. GALAURAN", "OH", "DLSU LADY SPIKERS", "10", "3", "22", ".318", "1", "6", "1", "12"),
    ("15", "S. CANINO", "OH", "DLSU LADY SPIKERS", "7", "2", "16", ".313", "0", "5", "1", "8"),
    ("03", "T. SHARMA", "MB", "DLSU LADY SPIKERS", "5", "1", "9", ".444", "0", "2", "2", "7"),
    ("11", "M. CORONEL", "S", "DLSU LADY SPIKERS", "1", "0", "3", ".333", "1", "4", "1", "3"),
    ("01", "J. CORONA", "L", "DLSU LADY SPIKERS", "0", "0", "0", ".000", "0", "10", "0", "0"),
]

volley_players_p2 = [
    ("02", "A. VALDEZ", "OH", "ADNU SPIKERS", "11", "2", "22", ".409", "2", "7", "2", "15"),
    ("13", "M. DE GUZMAN", "MB", "ADNU SPIKERS", "6", "1", "11", ".455", "1", "2", "2", "9"),
    ("05", "R. DE LEON", "OH", "ADNU SPIKERS", "5", "1", "12", ".333", "1", "4", "1", "7"),
    ("07", "J. MARAGUINOT", "S", "ADNU SPIKERS", "1", "1", "4", ".000", "2", "5", "0", "3"),
    ("18", "B. DE JESUS", "L", "ADNU SPIKERS", "0", "0", "0", ".000", "0", "12", "0", "0"),
    ("08", "A. GALAURAN", "OH", "DLSU LADY SPIKERS", "9", "2", "20", ".350", "1", "6", "1", "11"),
    ("15", "S. CANINO", "OH", "DLSU LADY SPIKERS", "7", "2", "15", ".333", "1", "4", "0", "8"),
    ("03", "T. SHARMA", "MB", "DLSU LADY SPIKERS", "5", "1", "9", ".444", "1", "2", "2", "8"),
    ("11", "M. CORONEL", "S", "DLSU LADY SPIKERS", "1", "0", "2", ".500", "1", "4", "0", "2"),
    ("01", "J. CORONA", "L", "DLSU LADY SPIKERS", "0", "0", "0", ".000", "0", "10", "0", "0"),
]

draw_sheet(
    f"{OUT_DIR}/volleyball_single.png",
    "OFFICIAL VOLLEYBALL MATCH REPORT",
    "MATCH: ADNU SPIKERS vs DLSU LADY SPIKERS",
    "UAAP WOMEN'S VOLLEYBALL TOURNAMENT",
    "DATE: OCTOBER 16, 2026 | VENUE: FILOIL ECOOIL CENTRE | FULL MATCH",
    "FINAL SETS: ADNU SPIKERS 3 - 1 DLSU LADY SPIKERS (25-22, 23-25, 25-20, 25-18)",
    volley_cols,
    volley_players_single,
    "OFFICIAL VOLLEYBALL FEDERATION CERTIFIED"
)

draw_sheet(
    f"{OUT_DIR}/volleyball_page1.png",
    "OFFICIAL VOLLEYBALL MATCH REPORT [PAGE 1 - SETS 1 & 2]",
    "MATCH: ADNU SPIKERS vs DLSU LADY SPIKERS",
    "UAAP WOMEN'S VOLLEYBALL TOURNAMENT - PART 1",
    "DATE: OCTOBER 16, 2026 | VENUE: FILOIL ECOOIL CENTRE",
    "SETS SCORE AFTER SET 2: TIED 1 - 1 (25-22, 23-25)",
    volley_cols,
    volley_players_p1,
    "SETS 1 & 2 RECORDED - PART 1 OF 2"
)

draw_sheet(
    f"{OUT_DIR}/volleyball_page2.png",
    "OFFICIAL VOLLEYBALL MATCH REPORT [PAGE 2 - SETS 3 & 4 / CONTINUATION]",
    "MATCH: ADNU SPIKERS vs DLSU LADY SPIKERS",
    "UAAP WOMEN'S VOLLEYBALL TOURNAMENT - PART 2",
    "DATE: OCTOBER 16, 2026 | VENUE: FILOIL ECOOIL CENTRE",
    "SETS 3 & 4 SCORE: ADNU 2 - 0 DLSU (25-20, 25-18)",
    volley_cols,
    volley_players_p2,
    "MATCH FINALIZED - PART 2 OF 2"
)

# ==========================================
# 5. PICKLEBALL (CUSTOM SPORT 2 - DYNAMIC SCHEMA)
# ==========================================
pickle_cols = [
    ("#", 45, 110),
    ("PLAYER NAME", 110, 420),
    ("POS", 420, 520),
    ("TEAM", 520, 780),
    ("POINTS", 780, 890),
    ("WINNERS", 890, 1000),
    ("UNFORCED ERR", 1000, 1140),
    ("ACES", 1140, 1240),
    ("KITCHEN FLT", 1240, 1370),
    ("3RD SHOT %", 1370, 1555),
]

pickle_players_single = [
    ("01", "B. JOHNS", "DOUBLES RIGHT", "ADNU SMASHERS", "28", "16", "3", "6", "1", "88.5%"),
    ("02", "C. ALSHON", "DOUBLES LEFT", "ADNU SMASHERS", "22", "12", "4", "4", "2", "82.0%"),
    ("03", "T. MCGUFFIN", "DOUBLES RIGHT", "DLSU PADDLERS", "24", "14", "5", "4", "2", "84.2%"),
    ("04", "F. STAKS", "DOUBLES LEFT", "DLSU PADDLERS", "18", "9", "6", "3", "3", "76.5%"),
]

pickle_players_p1 = [
    ("01", "B. JOHNS", "DOUBLES RIGHT", "ADNU SMASHERS", "15", "9", "1", "3", "0", "90.0%"),
    ("02", "C. ALSHON", "DOUBLES LEFT", "ADNU SMASHERS", "11", "6", "2", "2", "1", "81.8%"),
    ("03", "T. MCGUFFIN", "DOUBLES RIGHT", "DLSU PADDLERS", "12", "7", "2", "2", "1", "85.7%"),
    ("04", "F. STAKS", "DOUBLES LEFT", "DLSU PADDLERS", "9", "4", "3", "1", "1", "77.8%"),
]

pickle_players_p2 = [
    ("01", "B. JOHNS", "DOUBLES RIGHT", "ADNU SMASHERS", "13", "7", "2", "3", "1", "86.7%"),
    ("02", "C. ALSHON", "DOUBLES LEFT", "ADNU SMASHERS", "11", "6", "2", "2", "1", "82.2%"),
    ("03", "T. MCGUFFIN", "DOUBLES RIGHT", "DLSU PADDLERS", "12", "7", "3", "2", "1", "82.5%"),
    ("04", "F. STAKS", "DOUBLES LEFT", "DLSU PADDLERS", "9", "5", "3", "2", "2", "75.0%"),
]

draw_sheet(
    f"{OUT_DIR}/pickleball_single.png",
    "OFFICIAL PICKLEBALL MATCH REPORT - MEN'S DOUBLES FINAL",
    "MATCH: ADNU SMASHERS vs DLSU PADDLERS",
    "NATIONAL PICKLEBALL CHAMPIONSHIP 2026",
    "DATE: OCTOBER 16, 2026 | COURT: COURT 1 | BEST OF 3 GAMES",
    "FINAL SCORE: ADNU SMASHERS 2 - 0 DLSU PADDLERS (11-9, 11-8)",
    pickle_cols,
    pickle_players_single,
    "OFFICIAL PPA / ATLETA CERTIFIED"
)

draw_sheet(
    f"{OUT_DIR}/pickleball_page1.png",
    "OFFICIAL PICKLEBALL MATCH REPORT [PAGE 1 - GAME 1]",
    "MATCH: ADNU SMASHERS vs DLSU PADDLERS",
    "NATIONAL PICKLEBALL CHAMPIONSHIP 2026 - PART 1",
    "DATE: OCTOBER 16, 2026 | COURT: COURT 1",
    "GAME 1 SCORE: ADNU SMASHERS 11 - 9 DLSU PADDLERS",
    pickle_cols,
    pickle_players_p1,
    "GAME 1 COMPLETE - PART 1 OF 2"
)

draw_sheet(
    f"{OUT_DIR}/pickleball_page2.png",
    "OFFICIAL PICKLEBALL MATCH REPORT [PAGE 2 - GAME 2 / CONTINUATION]",
    "MATCH: ADNU SMASHERS vs DLSU PADDLERS",
    "NATIONAL PICKLEBALL CHAMPIONSHIP 2026 - PART 2",
    "DATE: OCTOBER 16, 2026 | COURT: COURT 1",
    "GAME 2 SCORE: ADNU SMASHERS 11 - 8 DLSU PADDLERS",
    pickle_cols,
    pickle_players_p2,
    "MATCH FINISHED - PART 2 OF 2"
)

# Export Control Ground Truth JSON
control_data = {
    "generated_at": "2026-10-16T23:45:00Z",
    "total_sports": 5,
    "sports": {
        "Basketball": {
            "category": "Team",
            "primary_metric": "pts",
            "sort_order": "descending",
            "single_file": "bball_single.png",
            "multi_files": ["bball_page1.png", "bball_page2.png"],
            "teams": {"home": "ADNU KNIGHTS", "away": "DLSU ARCHERS"},
            "final_score": {"home": 80, "away": 68},
            "top_scorer": {"name": "D. RAVENA", "pts": 26},
            "expected_top_order": ["D. RAVENA", "K. QUIAMBAO", "J. TENG", "E. NWANKWO", "K. MAMBULAC"],
            "tallies": {
                "D. RAVENA": {"p1_pts": 14, "p2_pts": 12, "total_pts": 26},
                "J. TENG": {"p1_pts": 10, "p2_pts": 12, "total_pts": 22},
                "K. QUIAMBAO": {"p1_pts": 11, "p2_pts": 13, "total_pts": 24}
            }
        },
        "Swimming": {
            "category": "Individual",
            "primary_metric": "finish_time",
            "sort_order": "ascending",
            "single_file": "swimming_single.png",
            "multi_files": ["swimming_page1.png", "swimming_page2.png"],
            "event": "MEN'S 100M FREESTYLE",
            "podium": [
                {"rank": 1, "medal": "Gold", "athlete": "C. HATCH", "time": "00:50.85", "team": "ADNU DOLPHINS"},
                {"rank": 2, "medal": "Silver", "athlete": "M. DEL ROSARIO", "time": "00:51.62", "team": "DLSU AQUATICS"},
                {"rank": 3, "medal": "Bronze", "athlete": "J. RULE", "time": "00:52.40", "team": "UST TIGERSHARKS"}
            ],
            "expected_top_order": ["C. HATCH", "M. DEL ROSARIO", "J. RULE", "R. JACINTO", "A. GABRIEL", "K. TAN"]
        },
        "Track & Field": {
            "category": "Individual",
            "primary_metric": "finish_time",
            "sort_order": "ascending",
            "single_file": "track_single.png",
            "multi_files": ["track_page1.png", "track_page2.png"],
            "event": "MEN'S 100M SPRINT",
            "podium": [
                {"rank": 1, "medal": "Gold", "athlete": "E. CRAY", "time": "00:10.12", "team": "ADNU TRACK CLUB"},
                {"rank": 2, "medal": "Silver", "athlete": "T. CARTER", "time": "00:10.28", "team": "DLSU RUNNERS"},
                {"rank": 3, "medal": "Bronze", "athlete": "A. DE MESA", "time": "00:10.45", "team": "UST ATHLETICS"}
            ],
            "expected_top_order": ["E. CRAY", "T. CARTER", "A. DE MESA", "P. BAUTISTA", "M. ALBA", "S. MENDOZA"]
        },
        "Volleyball": {
            "category": "Team",
            "primary_metric": "kills",
            "sort_order": "descending",
            "single_file": "volleyball_single.png",
            "multi_files": ["volleyball_page1.png", "volleyball_page2.png"],
            "teams": {"home": "ADNU SPIKERS", "away": "DLSU LADY SPIKERS"},
            "final_sets": {"home": 3, "away": 1},
            "top_attacker": {"name": "A. VALDEZ", "kills": 23, "pts": 30},
            "expected_top_order": ["A. VALDEZ", "A. GALAURAN", "S. CANINO", "M. DE GUZMAN", "R. DE LEON"],
            "tallies": {
                "A. VALDEZ": {"p1_kills": 12, "p2_kills": 11, "total_kills": 23, "total_pts": 30},
                "A. GALAURAN": {"p1_kills": 10, "p2_kills": 9, "total_kills": 19, "total_pts": 23}
            }
        },
        "Pickleball": {
            "category": "Team",
            "primary_metric": "points",
            "sort_order": "descending",
            "single_file": "pickleball_single.png",
            "multi_files": ["pickleball_page1.png", "pickleball_page2.png"],
            "teams": {"home": "ADNU SMASHERS", "away": "DLSU PADDLERS"},
            "final_score": {"home": 2, "away": 0},
            "top_player": {"name": "B. JOHNS", "points": 28},
            "expected_top_order": ["B. JOHNS", "T. MCGUFFIN", "C. ALSHON", "F. STAKS"],
            "tallies": {
                "B. JOHNS": {"p1_pts": 15, "p2_pts": 13, "total_pts": 28},
                "T. MCGUFFIN": {"p1_pts": 12, "p2_pts": 12, "total_pts": 24}
            }
        }
    }
}

with open(f"{OUT_DIR}/control_test_data.json", "w") as f:
    json.dump(control_data, f, indent=2)

print("\nAll 15 standardized scoresheet assets and control JSON successfully generated in:", OUT_DIR)
