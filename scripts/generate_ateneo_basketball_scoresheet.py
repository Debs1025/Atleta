import os
import sys
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "/home/gerard/Desktop/School/Atleta-dev_test_branch/sample_scoresheets"
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "ateneo_blue_eagles_game_scoresheet.png")

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

title_font = get_bold_font(32)
header_font = get_bold_font(21)
col_font = get_bold_font(16)
cell_font = get_font(16)
bold_cell_font = get_bold_font(16)
small_font = get_font(14)
bold_small_font = get_bold_font(14)

def generate_scoresheet():
    w, h = 1800, 1180
    img = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # 1. Outer Border
    draw.rectangle([20, 20, w - 20, h - 20], outline=(15, 23, 42), width=3)

    # 2. Header Box
    draw.rectangle([35, 35, w - 35, 175], fill=(248, 250, 252), outline=(30, 41, 59), width=2)
    draw.text((55, 48), "OFFICIAL BASKETBALL BOX SCORE", fill=(15, 23, 42), font=title_font)
    draw.text((55, 96), "MATCH: ATENEO BLUE EAGLES vs DLSU GREEN ARCHERS", fill=(30, 41, 59), font=header_font)
    draw.text((950, 96), "UAAP MEN'S BASKETBALL - GAME 3 FINALS", fill=(15, 23, 42), font=header_font)
    draw.text((55, 134), "DATE: NOVEMBER 8, 2026 | VENUE: MALL OF ASIA ARENA | OFFICIAL FULL-GAME REPORT", fill=(71, 85, 105), font=small_font)
    draw.text((950, 134), "FINAL SCORE: ATENEO BLUE EAGLES 85 - 80 DLSU GREEN ARCHERS", fill=(5, 150, 105), font=bold_cell_font)

    # 3. Quarter Score Summary
    draw.rectangle([35, 190, w - 35, 238], fill=(241, 245, 249), outline=(148, 163, 184), width=1)
    draw.text((55, 203), "SCORE BY PERIOD:", fill=(15, 23, 42), font=bold_small_font)
    draw.text((230, 203), "Q1: 22 - 19", fill=(51, 65, 85), font=small_font)
    draw.text((360, 203), "Q2: 20 - 21", fill=(51, 65, 85), font=small_font)
    draw.text((490, 203), "Q3: 21 - 18", fill=(51, 65, 85), font=small_font)
    draw.text((620, 203), "Q4: 22 - 22", fill=(51, 65, 85), font=small_font)
    draw.text((760, 203), "TOTAL: ATENEO 85 (WIN)  |  DLSU 80 (LOSS)", fill=(15, 23, 42), font=bold_small_font)
    draw.text((1280, 203), "STATUS: OFFICIAL - ACCREDITED UAAP REFEREES", fill=(5, 150, 105), font=bold_small_font)

    # 4. Table Columns Layout
    cols = [
        ("#", 40, 105),
        ("PLAYER NAME", 105, 410),
        ("POS", 410, 480),
        ("TEAM", 480, 770),
        ("PTS", 770, 845),
        ("REB", 845, 920),
        ("AST", 920, 995),
        ("STL", 995, 1065),
        ("BLK", 1065, 1135),
        ("TO", 1135, 1205),
        ("MIN", 1205, 1275),
        ("FGM", 1275, 1350),
        ("FGA", 1350, 1430),
        ("FG%", 1430, 1520),
        ("3PM", 1520, 1600),
        ("FTM", 1600, 1680),
        ("FTA", 1680, 1760),
    ]

    table_x = 40
    table_w = 1720
    y = 255

    # 5. Header Row
    draw.rectangle([table_x, y, table_x + table_w, y + 44], fill=(226, 232, 240), outline=(30, 41, 59), width=2)
    for name, x1, x2 in cols:
        draw.line([(x1, y), (x1, y + 44)], fill=(30, 41, 59), width=1)
        draw.text((x1 + 8, y + 12), name, fill=(15, 23, 42), font=col_font)
    draw.line([(table_x + table_w, y), (table_x + table_w, y + 44)], fill=(30, 41, 59), width=1)
    y += 44

    # 6. Player Data Rows
    # Note: Exactly matching user's players on Norman's Ateneo Blue Eagles:
    # 1. Kevin Quiambao (#10, PG)
    # 2. THIRDY RAVENA (#7, SG)
    # 3. Dwight Ramos (#23, SF)
    players = [
        # --- ATENEO BLUE EAGLES (HOME) ---
        ("10", "Kevin Quiambao", "PG", "ATENEO BLUE EAGLES", "24", "7", "8", "2", "1", "3", "34", "9", "18", "50.0%", "3", "3", "4"),
        ("07", "THIRDY RAVENA", "SG", "ATENEO BLUE EAGLES", "22", "6", "4", "3", "1", "2", "32", "8", "16", "50.0%", "2", "4", "5"),
        ("23", "Dwight Ramos", "SF", "ATENEO BLUE EAGLES", "18", "8", "5", "1", "2", "1", "30", "7", "14", "50.0%", "2", "2", "2"),
        ("01", "Geo Chiu", "C", "ATENEO BLUE EAGLES", "12", "11", "1", "0", "3", "2", "26", "5", "9", "55.6%", "0", "2", "3"),
        ("11", "Chris Koon", "PF", "ATENEO BLUE EAGLES", "9", "5", "2", "1", "0", "1", "20", "3", "7", "42.9%", "1", "2", "2"),

        # --- DLSU GREEN ARCHERS (AWAY) ---
        ("17", "Mike Phillips", "C", "DLSU GREEN ARCHERS", "19", "14", "2", "2", "2", "2", "32", "8", "15", "53.3%", "0", "3", "5"),
        ("08", "Evan Nelle", "PG", "DLSU GREEN ARCHERS", "18", "4", "7", "3", "0", "3", "33", "6", "14", "42.9%", "3", "3", "4"),
        ("09", "CJ Austria", "SF", "DLSU GREEN ARCHERS", "16", "5", "2", "1", "1", "1", "27", "6", "12", "50.0%", "2", "2", "2"),
        ("05", "EJ Gollena", "SG", "DLSU GREEN ARCHERS", "15", "3", "3", "1", "0", "2", "28", "5", "11", "45.5%", "2", "3", "3"),
        ("21", "Jonnel Policarpio", "PF", "DLSU GREEN ARCHERS", "12", "6", "1", "0", "1", "2", "22", "5", "10", "50.0%", "0", "2", "3"),
    ]

    for r_idx, row in enumerate(players):
        # Distinct slight tint for home vs away team
        if r_idx < 5:
            row_bg = (255, 255, 255) if r_idx % 2 == 0 else (240, 249, 255) # Ateneo light blue tint
        else:
            row_bg = (255, 255, 255) if r_idx % 2 == 0 else (240, 253, 244) # DLSU light green tint

        draw.rectangle([table_x, y, table_x + table_w, y + 42], fill=row_bg, outline=(203, 213, 225), width=1)
        for c_idx, (_, x1, x2) in enumerate(cols):
            draw.line([(x1, y), (x1, y + 42)], fill=(203, 213, 225), width=1)
            val = str(row[c_idx]) if c_idx < len(row) else ""
            f = bold_cell_font if c_idx in [0, 1, 3, 4] else cell_font
            color = (15, 23, 42)
            if c_idx == 1 and r_idx < 3: # Highlight our 3 Ateneo stars
                color = (3, 105, 161)
            elif c_idx == 4: # Highlight Points
                color = (225, 29, 72)
            draw.text((x1 + 8, y + 11), val, fill=color, font=f)
        draw.line([(table_x + table_w, y), (table_x + table_w, y + 42)], fill=(203, 213, 225), width=1)
        y += 42

    # 7. Team Totals Row
    y += 10
    draw.rectangle([table_x, y, table_x + table_w, y + 38], fill=(226, 232, 240), outline=(30, 41, 59), width=1)
    draw.text((table_x + 15, y + 10), "TEAM TOTALS: ATENEO BLUE EAGLES (85 PTS, 37 REB, 20 AST)  |  DLSU GREEN ARCHERS (80 PTS, 32 REB, 15 AST)", fill=(15, 23, 42), font=bold_cell_font)
    y += 48

    # 8. Certification & Signatures Box
    draw.rectangle([table_x, y, table_x + 900, y + 90], fill=(248, 250, 252), outline=(148, 163, 184), width=1)
    draw.text((table_x + 15, y + 14), "OFFICIAL SIGNED VERIFICATION: CERTIFIED ACCREDITED MATCH", fill=(15, 23, 42), font=bold_cell_font)
    draw.text((table_x + 15, y + 40), "HEAD OFFICIAL: RAMON DEL ROSARIO | OFFICIAL SCORER: MARIA SANTOS", fill=(71, 85, 105), font=small_font)
    draw.text((table_x + 15, y + 62), "COMMISSIONER: ATTY. RECHIE REYES | VENUE: MALL OF ASIA ARENA", fill=(71, 85, 105), font=small_font)

    # 9. Technical Stamp
    draw.rectangle([table_x + 920, y, table_x + table_w, y + 90], fill=(240, 253, 244), outline=(34, 197, 94), width=1)
    draw.text((table_x + 940, y + 14), "[VERIFIED OFFICIAL UAAP BOX SCORE]", fill=(21, 128, 61), font=bold_cell_font)
    draw.text((table_x + 940, y + 40), "Optical Recognition Validation: PASS | High-Precision Digital Roster Sync", fill=(21, 128, 61), font=small_font)
    draw.text((table_x + 940, y + 62), "Atleta Automated Match & Athlete Performance Engine v2.0", fill=(71, 85, 105), font=small_font)

    img.save(OUT_PATH, "PNG", quality=95)
    print(f"Generated successfully: {OUT_PATH}")

if __name__ == "__main__":
    generate_scoresheet()
