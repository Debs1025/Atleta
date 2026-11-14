import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "/home/gerard/Desktop/School/Atleta-dev_test_branch/sample_scoresheets/coach_test_sheets"
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

title_font = get_bold_font(28)
header_font = get_bold_font(19)
col_font = get_bold_font(15)
cell_font = get_font(15)
bold_cell_font = get_bold_font(15)
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
        if len(row) > 0 and str(row[0]) in ["#1", "1", "01"]:
            row_bg = (254, 252, 232)
        elif len(row) > 0 and str(row[0]) in ["#2", "2", "02"]:
            row_bg = (241, 245, 249)
        elif len(row) > 0 and str(row[0]) in ["#3", "3", "03"]:
            row_bg = (255, 247, 237)

        draw.rectangle([start_x, y, start_x + table_w, y + 44], fill=row_bg, outline=(203, 213, 225), width=1)
        for c_idx, (_, x1, x2) in enumerate(cols):
            draw.line([(x1, y), (x1, y + 44)], fill=(203, 213, 225), width=1)
            val = str(row[c_idx]) if c_idx < len(row) else ""
            f = bold_cell_font if c_idx in [0, 1, 2, 4] else cell_font
            color = (15, 23, 42)
            if c_idx == 0 and str(row[0]) in ["#1", "1"]:
                color = (180, 83, 9)
            draw.text((x1 + 8, y + 12), val, fill=color, font=f)
        draw.line([(start_x + table_w, y), (start_x + table_w, y + 44)], fill=(203, 213, 225), width=1)
        y += 44

    # Footer signature / notes
    y += 25
    draw.rectangle([45, y, 750, y + 80], fill=(248, 250, 252), outline=(148, 163, 184), width=1)
    draw.text((55, y + 12), f"OFFICIAL SIGNED VERIFICATION: {note or 'CERTIFIED ACCREDITED MATCH'}", fill=(15, 23, 42), font=bold_cell_font)
    draw.text((55, y + 42), "HEAD OFFICIAL: RAMON DEL ROSARIO | TIMEKEEPING: ELECTRONIC TOUCHPAD / TIMING GATE", fill=(71, 85, 105), font=small_font)

    img.save(out_path)
    print(f"Generated: {out_path}")

# ==============================================================================
# 1. COACH ARCHIE LIM (SWIMMING) - ATENEO BLUE FAST
# Rule: Only coach's athletes (no other athletes).
# Only record performance if top 3; if rank > 3, just add the place!
# ==============================================================================
swim_cols = [
    ("RANK", 45, 120),
    ("LANE", 120, 190),
    ("ATHLETE NAME", 190, 520),
    ("TEAM / AFFILIATION", 520, 860),
    ("FINISH TIME", 860, 1040),
    ("50M SPLIT", 1040, 1200),
    ("STROKE RATE", 1200, 1370),
    ("STATUS", 1370, 1555),
]

swim_athletes = [
    ("1", "4", "Kayla Sanchez", "Ateneo Blue Fast", "00:52.45", "00:25.10", "48", "GOLD - 1ST PLACE"),
    ("2", "5", "Luke Gebbie", "Ateneo Blue Fast", "00:52.95", "00:25.40", "47", "SILVER - 2ND PLACE"),
    ("3", "3", "Remedy Rule", "Ateneo Blue Fast", "00:55.20", "00:26.40", "44", "BRONZE - 3RD PLACE"),
    ("4", "2", "vball vball", "Ateneo Blue Fast", "-", "-", "-", "4TH PLACE"),
]

draw_sheet(
    f"{OUT_DIR}/coach_archie_swimming_ateneo_blue_fast.png",
    "OFFICIAL SWIMMING RESULTS - MEN & WOMEN 100M FREESTYLE FINAL",
    "EVENT: 100M FREESTYLE CHAMPIONSHIP",
    "MEET: PASA NATIONAL SWIMMING CHAMPIONSHIPS 2026",
    "DATE: NOVEMBER 14, 2026 | VENUE: NEW CLERK CITY AQUATICS CENTER",
    "TOP TIME: KAYLA SANCHEZ (00:52.45) | ATENEO BLUE FAST",
    swim_cols,
    swim_athletes,
    "OFFICIAL ELECTRONIC TOUCHPAD CERTIFICATION"
)

# ==============================================================================
# 2. COACH ARCHIE LIM (TRACK & FIELD) - ATENEO TRACK & FIELD
# Rule: Only coach's athletes (no other athletes).
# Only record performance if top 3; if rank > 3, just add the place!
# ==============================================================================
track_cols = [
    ("RANK", 45, 120),
    ("BIB", 120, 190),
    ("ATHLETE NAME", 190, 500),
    ("TEAM / DELEGATION", 500, 840),
    ("EVENT / DISCIPLINE", 840, 1100),
    ("MARK / TIME", 1100, 1290),
    ("WIND / NOTE", 1290, 1555),
]

track_athletes = [
    ("1", "#88", "EJ Obiena", "Ateneo Track & Field", "Pole Vault", "6.02m", "GOLD - 1ST PLACE"),
    ("2", "#11", "Robyn Brown", "Ateneo Track & Field", "400m Hurdles", "55.80s", "SILVER - 2ND PLACE"),
    ("3", "#4", "Kayla Sanchez", "Ateneo Track & Field", "100m Dash", "11.20s", "BRONZE - 3RD PLACE"),
    ("4", "#5", "Luke Gebbie", "Ateneo Track & Field", "100m Dash", "-", "4TH PLACE"),
]

draw_sheet(
    f"{OUT_DIR}/coach_archie_track_and_field.png",
    "OFFICIAL TRACK & FIELD RESULTS - NATIONAL OPEN CHAMPIONSHIPS",
    "EVENT: ATENEO TRACK & FIELD CHAMPIONSHIP MEET",
    "MEET: PHILIPPINE NATIONAL ATHLETICS OPEN 2026",
    "DATE: NOVEMBER 14, 2026 | VENUE: PHILSORTS TRACK STADIUM",
    "OUTSTANDING ATHLETE: EJ OBIENA (6.02m POLE VAULT)",
    track_cols,
    track_athletes,
    "IAAF / PATAFA CERTIFIED ELECTRONIC FAT RESULTS"
)

# Also generate the combined sheet for backward compatibility
draw_sheet(
    f"{OUT_DIR}/coach_archie_elma_track_and_field.png",
    "OFFICIAL TRACK & FIELD RESULTS - NATIONAL OPEN CHAMPIONSHIPS",
    "EVENT: ATENEO TRACK & FIELD CHAMPIONSHIP MEET",
    "MEET: PHILIPPINE NATIONAL ATHLETICS OPEN 2026",
    "DATE: NOVEMBER 14, 2026 | VENUE: PHILSORTS TRACK STADIUM",
    "OUTSTANDING ATHLETE: EJ OBIENA (6.02m POLE VAULT)",
    track_cols,
    track_athletes,
    "IAAF / PATAFA CERTIFIED ELECTRONIC FAT RESULTS"
)

# ==============================================================================
# 3. COACH NORMAN BLACK (BASKETBALL) - ATENEO BLUE EAGLES VS UP FIGHTING MAROONS
# ==============================================================================
bball_cols = [
    ("#", 45, 105),
    ("PLAYER NAME", 105, 380),
    ("POS", 380, 450),
    ("TEAM", 450, 710),
    ("PTS", 710, 790),
    ("REB", 790, 860),
    ("AST", 860, 930),
    ("STL", 930, 1000),
    ("BLK", 1000, 1070),
    ("TO", 1070, 1140),
    ("MIN", 1140, 1220),
    ("FGM", 1220, 1300),
    ("FGA", 1300, 1380),
    ("FG%", 1380, 1555),
]

bball_players = [
    ("15", "Kevin Quiambao", "PF", "Ateneo Blue Eagles", "26", "12", "5", "2", "2", "2", "34", "10", "18", "55.6%"),
    ("1", "Thirdy Ravena", "SF", "Ateneo Blue Eagles", "24", "7", "6", "3", "1", "1", "33", "9", "16", "56.3%"),
    ("24", "Dwight Ramos", "SG", "Ateneo Blue Eagles", "22", "6", "4", "2", "0", "1", "31", "8", "15", "53.3%"),
    ("28", "Carl Tamayo", "PF", "UP Fighting Maroons", "25", "10", "3", "1", "1", "2", "35", "9", "17", "52.9%"),
    ("3", "RJ Abarrientos", "PG", "UP Fighting Maroons", "20", "4", "8", "2", "0", "3", "32", "7", "16", "43.8%"),
    ("12", "TEST USER 1025", "C", "Ateneo Blue Eagles", "8", "9", "2", "1", "3", "1", "20", "3", "6", "50.0%"),
    ("15", "Marck Espejo", "SG", "UP Fighting Maroons", "14", "5", "3", "1", "0", "1", "25", "5", "11", "45.5%"),
]

draw_sheet(
    f"{OUT_DIR}/coach_norman_basketball_ateneo_vs_up.png",
    "OFFICIAL BASKETBALL BOX SCORE - UAAP FINALS",
    "MATCH: ATENEO BLUE EAGLES vs UP FIGHTING MAROONS",
    "TOURNAMENT: UAAP SEASON 87 MEN'S BASKETBALL FINALS",
    "DATE: NOVEMBER 14, 2026 | VENUE: MOA ARENA | OFFICIAL FULL-GAME REPORT",
    "FINAL SCORE: ATENEO BLUE EAGLES 80 - 74 UP FIGHTING MAROONS",
    bball_cols,
    bball_players,
    "GAME COMPLETE - AUDITED SBP BOXSCORE"
)

# ==============================================================================
# 4. COACH TAI BUNDIT & RAMIL DE JESUS (VOLLEYBALL) - CREAMLINE VS DLSU
# ==============================================================================
volley_cols = [
    ("#", 45, 105),
    ("PLAYER NAME", 105, 380),
    ("POS", 380, 520),
    ("TEAM", 520, 830),
    ("KILLS", 830, 930),
    ("BLOCKS", 930, 1030),
    ("ACES", 1030, 1130),
    ("DIGS", 1130, 1230),
    ("AST", 1230, 1330),
    ("ERR", 1330, 1420),
    ("TOTAL PTS", 1420, 1555),
]

volley_players = [
    ("2", "Alyssa Valdez", "Outside Hitter", "Creamline Cool Smashers", "24", "3", "2", "16", "4", "2", "29"),
    ("18", "Tots Carlos", "Opposite Hitter", "Creamline Cool Smashers", "21", "4", "1", "12", "2", "3", "26"),
    ("12", "Jia Morado", "Setter", "Creamline Cool Smashers", "3", "2", "3", "14", "36", "1", "8"),
    ("3", "Mika Reyes", "Middle Blocker", "DLSU Lady Spikers", "16", "7", "2", "9", "1", "2", "25"),
    ("9", "Bryan Bagunas", "Outside Hitter", "DLSU Lady Spikers", "22", "3", "3", "10", "3", "3", "28"),
]

draw_sheet(
    f"{OUT_DIR}/coach_tai_ramil_volleyball_creamline_vs_dlsu.png",
    "OFFICIAL VOLLEYBALL MATCH BOX SCORE",
    "MATCH: CREAMLINE COOL SMASHERS vs DLSU LADY SPIKERS",
    "TOURNAMENT: PVL ALL-FILIPINO CONFERENCE FINALS",
    "DATE: NOVEMBER 14, 2026 | VENUE: SMART ARANETA COLISEUM",
    "FINAL SCORE: CREAMLINE 3 - 2 DLSU (25-23, 22-25, 25-21, 20-25, 15-12)",
    volley_cols,
    volley_players,
    "OFFICIAL PVL / PNVF MATCH REPORT"
)

# ==============================================================================
# 5. COACH PINKY BROSAS (SWIMMING) - PHILIPPINE AQUATICS CLUB
# ==============================================================================
pac_cols = [
    ("RANK", 45, 120),
    ("LANE", 120, 190),
    ("ATHLETE NAME", 190, 500),
    ("TEAM / AFFILIATION", 500, 840),
    ("EVENT / DISCIPLINE", 840, 1100),
    ("FINISH TIME", 1100, 1290),
    ("STATUS", 1290, 1555),
]

pac_athletes = [
    ("1", "4", "Jarod Hatch", "Philippine Aquatics Club", "100m Butterfly", "00:51.95", "GOLD - 1ST PLACE"),
    ("2", "5", "Jasmine Alkhaldi", "Philippine Aquatics Club", "100m Freestyle", "00:54.12", "SILVER - 2ND PLACE"),
    ("3", "3", "Xiandi Chua", "Philippine Aquatics Club", "200m IM", "02:11.45", "BRONZE - 3RD PLACE"),
]

draw_sheet(
    f"{OUT_DIR}/coach_pinky_swimming_pac.png",
    "OFFICIAL SWIMMING INVITATIONAL RESULTS",
    "EVENT: NATIONAL AQUATICS GRAND PRIX FINALS",
    "MEET: PHILIPPINE AQUATICS INVITATIONAL 2026",
    "DATE: NOVEMBER 14, 2026 | VENUE: RIZAL MEMORIAL SWIMMING POOL",
    "TOP PERFORMER: JAROD HATCH (00:51.95 100M FLY)",
    pac_cols,
    pac_athletes,
    "PHILIPPINE AQUATICS INC. OFFICIAL TOUCHPAD VERIFICATION"
)

print("\nALL COACH SCORESHEETS GENERATED SUCCESSFULLY!")
