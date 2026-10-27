import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "/home/gerard/Desktop/School/Atleta-dev_test_branch/sample_scoresheets"
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

title_font = get_bold_font(26)
section_font = get_bold_font(16)
header_font = get_bold_font(14)
col_font = get_bold_font(11)
cell_font = get_font(11)
bold_cell_font = get_bold_font(11)
small_font = get_font(10)

def create_scoresheet(filename, title, league_info, match_meta, team1_info, team1_cols, team1_rows, team2_info, team2_cols, team2_rows, summary_box=None):
    w = 1720
    h = 1380
    img = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Document border
    draw.rectangle([20, 20, w - 20, h - 20], outline=(15, 23, 42), width=3)

    # Header Card
    draw.rectangle([35, 35, w - 35, 140], fill=(248, 250, 252), outline=(30, 41, 59), width=2)
    draw.text((55, 46), title, fill=(15, 23, 42), font=title_font)
    draw.text((55, 84), league_info, fill=(30, 41, 59), font=header_font)
    draw.text((55, 110), match_meta, fill=(71, 85, 105), font=small_font)

    # Top right certified stamp
    draw.rectangle([w - 410, 48, w - 55, 128], fill=(240, 253, 244), outline=(22, 163, 74), width=2)
    draw.text((w - 395, 60), "OFFICIAL CERTIFIED STATS", fill=(22, 163, 74), font=header_font)
    draw.text((w - 395, 86), "VERIFIED BY TOURNAMENT ACCREDITATION", fill=(21, 128, 61), font=small_font)
    draw.text((w - 395, 104), "ALL STATISTICAL CATEGORIES FULLY AUDITED", fill=(71, 85, 105), font=small_font)

    current_y = 155

    def draw_team_table(team_header, cols, rows, y_pos):
        draw.rectangle([35, y_pos, w - 35, y_pos + 36], fill=(30, 41, 59), outline=(15, 23, 42), width=1)
        draw.text((50, y_pos + 8), team_header, fill=(255, 255, 255), font=section_font)
        y_pos += 36

        # Table header row
        draw.rectangle([35, y_pos, w - 35, y_pos + 32], fill=(226, 232, 240), outline=(51, 65, 85), width=1)
        for col_name, x1, x2 in cols:
            draw.line([(x1, y_pos), (x1, y_pos + 32)], fill=(148, 163, 184), width=1)
            draw.text((x1 + 4, y_pos + 9), col_name, fill=(15, 23, 42), font=col_font)
        draw.line([(w - 35, y_pos), (w - 35, y_pos + 32)], fill=(148, 163, 184), width=1)
        y_pos += 32

        # Data rows
        for idx, row in enumerate(rows):
            is_total = (idx == len(rows) - 1) and (str(row[0]).upper() in ["TOTALS", "TOT", "TEAM TOTALS", "TEAM"])
            bg = (241, 245, 249) if is_total else ((255, 255, 255) if idx % 2 == 0 else (248, 250, 252))
            draw.rectangle([35, y_pos, w - 35, y_pos + 30], fill=bg, outline=(203, 213, 225), width=1)
            for c_idx, (_, x1, x2) in enumerate(cols):
                draw.line([(x1, y_pos), (x1, y_pos + 30)], fill=(203, 213, 225), width=1)
                val = str(row[c_idx]) if c_idx < len(row) else ""
                f = bold_cell_font if (is_total or c_idx in [0, 1, 4]) else cell_font
                color = (15, 23, 42) if not is_total else (30, 58, 138)
                draw.text((x1 + 4, y_pos + 7), val, fill=color, font=f)
            draw.line([(w - 35, y_pos), (w - 35, y_pos + 30)], fill=(203, 213, 225), width=1)
            y_pos += 30

        return y_pos + 20

    # Draw Team 1
    current_y = draw_team_table(team1_info, team1_cols, team1_rows, current_y)

    # Draw Team 2
    current_y = draw_team_table(team2_info, team2_cols, team2_rows, current_y)

    # Bottom Summary Box
    if summary_box:
        draw.rectangle([35, current_y, w - 35, current_y + 115], fill=(248, 250, 252), outline=(30, 41, 59), width=2)
        draw.text((55, current_y + 14), summary_box.get("title", "MATCH SUMMARY"), fill=(15, 23, 42), font=header_font)
        draw.text((55, current_y + 42), summary_box.get("score_breakdown", ""), fill=(30, 41, 59), font=bold_cell_font)
        draw.text((55, current_y + 72), summary_box.get("final_score", ""), fill=(180, 83, 9), font=section_font)

        # Scorer Signature Line
        draw.text((w - 550, current_y + 18), "OFFICIAL HEAD SCORER:", fill=(71, 85, 105), font=small_font)
        draw.text((w - 550, current_y + 40), summary_box.get("scorer", "RAMON C. DEL ROSARIO (FIBA / UAAP ACCREDITED)"), fill=(15, 23, 42), font=bold_cell_font)
        draw.line([(w - 550, current_y + 68), (w - 60, current_y + 68)], fill=(15, 23, 42), width=2)
        draw.text((w - 550, current_y + 76), "SIGNATURE VERIFIED / AUDIT LOGGED TO ATLETA CENTRAL REGISTRY", fill=(100, 116, 139), font=small_font)

    out_file = os.path.join(OUT_DIR, filename)
    img.save(out_file, "PNG")
    print(f"Generated: {out_file}")


# ==============================================================================
# 1. BASKETBALL: FULL COMPLETE BOXSCORE (PTS, REB, AST, STL, BLK, TO, PF, FG, 3PT, FT, MIN, +/-)
# ==============================================================================
bball_cols = [
    ("#", 35, 95),
    ("PLAYER NAME", 95, 335),
    ("POS", 335, 385),
    ("MIN", 385, 435),
    ("PTS", 435, 495),
    ("FGM-A", 495, 575),
    ("FG%", 575, 640),
    ("3PM-A", 640, 720),
    ("3P%", 720, 785),
    ("FTM-A", 785, 865),
    ("FT%", 865, 925),
    ("OREB", 925, 985),
    ("DREB", 985, 1050),
    ("REB", 1050, 1120),
    ("AST", 1120, 1185),
    ("STL", 1185, 1250),
    ("BLK", 1250, 1315),
    ("TO", 1315, 1375),
    ("PF", 1375, 1435),
    ("+/-", 1435, 1685),
]

adnu_bball_rows = [
    ["#11", "D. RAVENA", "PG", "34", "26", "9-18", "50.0%", "4-8", "50.0%", "4-5", "80.0%", "2", "4", "6", "8", "3", "0", "2", "2", "+14"],
    ["#07", "J. TENG", "SF", "32", "22", "8-15", "53.3%", "2-4", "50.0%", "4-4", "100%", "3", "6", "9", "4", "1", "2", "1", "3", "+12"],
    ["#15", "K. MAMBULAC", "C", "28", "14", "6-11", "54.5%", "0-0", "0.0%", "2-3", "66.7%", "5", "8", "13", "1", "0", "4", "2", "3", "+8"],
    ["#03", "M. NIETO", "SG", "25", "11", "4-9", "44.4%", "2-5", "40.0%", "1-2", "50.0%", "1", "2", "3", "5", "2", "0", "1", "1", "+10"],
    ["#09", "A. WONG", "PG", "20", "8", "3-7", "42.9%", "1-3", "33.3%", "1-1", "100%", "0", "4", "4", "3", "1", "0", "0", "1", "+6"],
    ["#21", "T. VERANO", "PF", "18", "4", "2-5", "40.0%", "0-1", "0.0%", "0-0", "0.0%", "2", "3", "5", "1", "0", "1", "1", "2", "+4"],
    ["#04", "I. GO", "C", "15", "3", "1-4", "25.0%", "1-2", "50.0%", "0-0", "0.0%", "1", "2", "3", "0", "0", "1", "0", "2", "+2"],
    ["TOTALS", "ADNU KNIGHTS", "--", "200", "88", "33-69", "47.8%", "10-23", "43.5%", "12-15", "80.0%", "14", "29", "43", "22", "7", "8", "7", "14", "+12"]
]

dlsu_bball_rows = [
    ["#10", "K. QUIAMBAO", "PF", "35", "24", "9-19", "47.4%", "3-7", "42.9%", "3-4", "75.0%", "3", "7", "10", "6", "2", "2", "3", "2", "-10"],
    ["#01", "E. NWANKWO", "C", "30", "16", "7-13", "53.8%", "0-0", "0.0%", "2-4", "50.0%", "5", "9", "14", "2", "1", "3", "2", "3", "-8"],
    ["#05", "J. MACALALAG", "SG", "26", "13", "5-11", "45.5%", "2-5", "40.0%", "1-2", "50.0%", "1", "3", "4", "4", "1", "0", "1", "2", "-6"],
    ["#08", "J. CORTEZ", "PG", "24", "10", "4-9", "44.4%", "1-3", "33.3%", "1-2", "50.0%", "0", "3", "3", "3", "2", "0", "2", "2", "-8"],
    ["#17", "M. PHILLIPS", "SF", "22", "8", "3-8", "37.5%", "0-1", "0.0%", "2-3", "66.7%", "4", "4", "8", "1", "1", "1", "1", "1", "-12"],
    ["#23", "R. POLICARPIO", "PF", "16", "3", "1-4", "25.0%", "1-2", "50.0%", "0-0", "0.0%", "1", "2", "3", "0", "0", "0", "1", "1", "-6"],
    ["#12", "C. AUSTRIA", "SG", "14", "2", "1-3", "33.3%", "0-1", "0.0%", "0-0", "0.0%", "0", "1", "1", "1", "0", "0", "0", "1", "-4"],
    ["TOTALS", "DLSU ARCHERS", "--", "200", "76", "30-67", "44.8%", "7-19", "36.8%", "9-15", "60.0%", "14", "29", "43", "17", "7", "6", "10", "12", "-12"]
]

create_scoresheet(
    "complete_basketball_boxscore.png",
    "OFFICIAL BASKETBALL COMPREHENSIVE BOX SCORE",
    "UAAP MEN'S BASKETBALL TOURNAMENT | CHAMPIONSHIP SERIES GAME 1",
    "DATE: OCTOBER 17, 2026 | VENUE: MALL OF ASIA ARENA | ATTENDANCE: 18,520 | DURATION: 1h 55m",
    "ADNU KNIGHTS (HOME TEAM) - FULL STATISTICAL LOG",
    bball_cols,
    adnu_bball_rows,
    "DLSU GREEN ARCHERS (VISITOR TEAM) - FULL STATISTICAL LOG",
    bball_cols,
    dlsu_bball_rows,
    {
        "title": "OFFICIAL GAME RESULTS & QUARTER BREAKDOWN",
        "score_breakdown": "QUARTERS:  ADNU KNIGHTS: [Q1: 22 | Q2: 24 | Q3: 20 | Q4: 22 = 88]   vs   DLSU ARCHERS: [Q1: 18 | Q2: 21 | Q3: 19 | Q4: 18 = 76]",
        "final_score": "FINAL SCORE: ADNU KNIGHTS 88 — 76 DLSU GREEN ARCHERS   (WINNER: ADNU KNIGHTS)",
        "scorer": "RAMON C. DEL ROSARIO (FIBA / SBP LICENSED STATISTICIAN #4928)"
    }
)


# ==============================================================================
# 2. VOLLEYBALL: COMPLETE FIVB / NCAA BOX SCORE (K, E, TA, HIT%, A, SA, SE, D, BS, BA, TB, PTS)
# ==============================================================================
volley_cols = [
    ("#", 35, 95),
    ("PLAYER NAME", 95, 335),
    ("POS", 335, 395),
    ("SP", 395, 455),
    ("KILLS", 455, 535),
    ("ERR", 535, 610),
    ("ATT", 610, 695),
    ("HIT %", 695, 785),
    ("AST", 785, 865),
    ("ACES", 865, 945),
    ("SE", 945, 1020),
    ("DIGS", 1020, 1105),
    ("BS", 1105, 1180),
    ("BA", 1180, 1255),
    ("TB", 1255, 1335),
    ("PTS", 1335, 1685),
]

adnu_volley_rows = [
    ["#02", "A. VALDEZ", "OH", "4", "23", "4", "45", ".422", "1", "4", "2", "14", "1", "2", "2.0", "29.0"],
    ["#13", "M. DE GUZMAN", "MB", "4", "12", "2", "22", ".455", "0", "1", "1", "5", "3", "4", "5.0", "16.0"],
    ["#05", "R. DE LEON", "OH", "4", "11", "3", "26", ".308", "2", "2", "2", "8", "0", "2", "1.0", "14.0"],
    ["#07", "J. MARAGUINOT", "S", "4", "3", "1", "8", ".250", "44", "3", "1", "11", "0", "2", "1.0", "7.0"],
    ["#11", "K. TOLENTINO", "OPP", "4", "8", "2", "18", ".333", "1", "1", "1", "6", "1", "3", "2.5", "10.5"],
    ["#09", "B. GASTON", "MB", "4", "6", "1", "14", ".357", "0", "1", "2", "3", "2", "3", "3.5", "9.5"],
    ["#18", "D. WONG", "L", "4", "0", "0", "0", ".000", "5", "0", "0", "26", "0", "0", "0.0", "0.0"],
    ["TOTALS", "ADNU SPIKERS", "--", "4", "63", "13", "133", ".376", "53", "12", "9", "73", "7", "16", "15.0", "86.0"]
]

dlsu_volley_rows = [
    ["#03", "A. SHARMA", "MB", "4", "14", "2", "24", ".500", "1", "2", "1", "4", "4", "3", "5.5", "19.5"],
    ["#08", "J. CORONEL", "S", "4", "2", "0", "5", ".400", "41", "1", "2", "9", "0", "2", "1.0", "4.0"],
    ["#10", "A. CANINO", "OH", "4", "18", "5", "42", ".310", "2", "2", "2", "12", "1", "1", "1.5", "21.5"],
    ["#15", "J. MALALUAN", "OH", "4", "10", "4", "28", ".214", "1", "1", "1", "8", "0", "2", "1.0", "12.0"],
    ["#04", "L. SORENO", "OPP", "4", "7", "3", "19", ".211", "0", "1", "1", "5", "1", "2", "2.0", "9.5"],
    ["#12", "T. PROVIDENCE", "MB", "4", "5", "1", "12", ".333", "0", "0", "2", "3", "2", "2", "3.0", "7.0"],
    ["#01", "J. MACANDILI", "L", "4", "0", "0", "0", ".000", "4", "0", "0", "28", "0", "0", "0.0", "0.0"],
    ["TOTALS", "DLSU LADY SPIKERS", "--", "4", "56", "15", "130", ".315", "49", "7", "9", "69", "8", "12", "14.0", "73.5"]
]

create_scoresheet(
    "complete_volleyball_boxscore.png",
    "OFFICIAL VOLLEYBALL TOURNAMENT BOX SCORE",
    "UAAP WOMEN'S VOLLEYBALL CHAMPIONSHIP | SEMIFINALS MATCH 2",
    "DATE: OCTOBER 17, 2026 | VENUE: SMART ARANETA COLISEUM | SETS: 4 | TIME: 2h 08m",
    "ADNU LADY SPIKERS (HOME TEAM) - COMPLETE PERFORMANCE LOG",
    volley_cols,
    adnu_volley_rows,
    "DLSU LADY SPIKERS (VISITOR TEAM) - COMPLETE PERFORMANCE LOG",
    volley_cols,
    dlsu_volley_rows,
    {
        "title": "SET BY SET RESULTS & SCORE SUMMARY",
        "score_breakdown": "SETS:  SET 1: ADNU 25-22 DLSU  |  SET 2: ADNU 23-25 DLSU  |  SET 3: ADNU 25-20 DLSU  |  SET 4: ADNU 25-23 DLSU",
        "final_score": "MATCH RESULT: ADNU SPIKERS 3 — 1 DLSU LADY SPIKERS   (SETS WON: 3 - 1)",
        "scorer": "EMILY S. BAUTISTA (PVL / FIVB ACCREDITED TECHNICAL OFFICIAL #1104)"
    }
)


# ==============================================================================
# 3. SOCCER / FOOTBALL: COMPLETE MATCH REPORT (G, A, SH, SOG, PASS%, TKL, INT, FC, YC, RC, SV, PTS)
# ==============================================================================
soccer_cols = [
    ("#", 35, 95),
    ("PLAYER NAME", 95, 335),
    ("POS", 335, 395),
    ("MIN", 395, 455),
    ("GOALS", 455, 535),
    ("AST", 535, 610),
    ("SHOTS", 610, 695),
    ("SOG", 695, 775),
    ("PASS%", 775, 865),
    ("TKL", 865, 945),
    ("INT", 945, 1020),
    ("FC", 1020, 1095),
    ("YC", 1095, 1165),
    ("RC", 1165, 1235),
    ("SAVES", 1235, 1325),
    ("PTS", 1325, 1685),
]

adnu_soccer_rows = [
    ["#10", "M. ALICANTE", "FWD", "90", "2", "1", "6", "4", "82.4%", "2", "1", "1", "0", "0", "0", "2"],
    ["#07", "J. BEDIC", "FWD", "84", "1", "1", "4", "3", "78.9%", "1", "0", "2", "1", "0", "0", "1"],
    ["#08", "M. OTT", "MID", "90", "0", "1", "2", "1", "88.6%", "4", "3", "2", "0", "0", "0", "0"],
    ["#06", "S. SCHROCK", "MID", "88", "0", "1", "3", "1", "85.2%", "5", "4", "3", "1", "0", "0", "0"],
    ["#04", "D. SATO", "DEF", "90", "0", "0", "0", "0", "91.3%", "6", "5", "1", "0", "0", "0", "0"],
    ["#12", "A. AGUINALDO", "DEF", "90", "0", "0", "1", "0", "89.5%", "7", "6", "2", "0", "0", "0", "0"],
    ["#01", "N. ETHERIDGE", "GK", "90", "0", "0", "0", "0", "74.1%", "0", "1", "0", "0", "0", "6", "0"],
    ["TOTALS", "ADNU FC", "--", "90", "3", "4", "16", "9", "84.7%", "25", "20", "11", "2", "0", "6", "3"]
]

dlsu_soccer_rows = [
    ["#09", "P. REICHELT", "FWD", "90", "1", "0", "4", "3", "75.0%", "1", "1", "2", "0", "0", "0", "1"],
    ["#11", "K. INGRESO", "MID", "90", "0", "1", "3", "1", "84.2%", "4", "3", "3", "1", "0", "0", "0"],
    ["#14", "C. DE MURGA", "DEF", "90", "0", "0", "1", "0", "87.0%", "5", "4", "2", "1", "0", "0", "0"],
    ["#05", "J. TAFALLA", "DEF", "90", "0", "0", "0", "0", "88.5%", "6", "5", "1", "0", "0", "0", "0"],
    ["#08", "G. ANGELES", "MID", "78", "0", "0", "2", "1", "81.2%", "3", "2", "2", "0", "0", "0", "0"],
    ["#17", "C. VILLANUEVA", "FWD", "72", "0", "0", "2", "1", "72.4%", "1", "0", "1", "0", "0", "0", "0"],
    ["#01", "M. FALKESGAARD", "GK", "90", "0", "0", "0", "0", "70.0%", "0", "0", "0", "0", "0", "5", "0"],
    ["TOTALS", "DLSU BOOTERS", "--", "90", "1", "1", "12", "6", "81.1%", "20", "15", "11", "2", "0", "5", "1"]
]

create_scoresheet(
    "complete_soccer_match_report.png",
    "OFFICIAL FOOTBALL / SOCCER MATCH REPORT",
    "PFL UNIVERSITY DIVISION CHAMPIONSHIP | ROUND 14",
    "DATE: OCTOBER 17, 2026 | VENUE: RIZAL MEMORIAL FOOTBALL STADIUM | ATTENDANCE: 7,420",
    "ADNU FC (HOME SQUAD) - COMPLETE PLAYER STATS & MATCH EVENTS",
    soccer_cols,
    adnu_soccer_rows,
    "DLSU BOOTERS (AWAY SQUAD) - COMPLETE PLAYER STATS & MATCH EVENTS",
    soccer_cols,
    dlsu_soccer_rows,
    {
        "title": "MATCH INCIDENTS, FOULS & DISCIPLINARY LOG",
        "score_breakdown": "GOALS: ADNU: M. Alicante (24', 68'), J. Bedic (52')   vs   DLSU: P. Reichelt (39')",
        "final_score": "FINAL SCORE: ADNU FC 3 — 1 DLSU BOOTERS   (WINNER: ADNU FC)",
        "scorer": "FERNANDO M. KABIGTING (FIFA / PFF REFEREE ASSESSOR #082)"
    }
)


# ==============================================================================
# 4. BADMINTON: COMPLETE RACKET SPORTS SCORESHEET (G1, G2, G3, SMASHES, NET KILLS, ACES, ERRORS, FAULTS, PTS)
# ==============================================================================
badminton_cols = [
    ("MATCH / EVENT", 35, 180),
    ("PLAYER NAME", 180, 420),
    ("TEAM", 420, 640),
    ("G1 PTS", 640, 730),
    ("G2 PTS", 730, 820),
    ("G3 PTS", 820, 910),
    ("SMASHES", 910, 1020),
    ("NET KILLS", 1020, 1130),
    ("ACES", 1130, 1220),
    ("UNF ERR", 1220, 1330),
    ("FAULTS", 1330, 1430),
    ("TOTAL PTS", 1430, 1685),
]

badminton_t1_rows = [
    ["MS 1", "MARK ALCALA", "ADNU SMASHERS", "21", "19", "21", "14", "9", "4", "3", "1", "61"],
    ["WS 1", "AIRAH ALBO", "ADNU SMASHERS", "21", "21", "--", "11", "8", "5", "2", "0", "42"],
    ["MD 1", "J. MAGADA / K. MORADA", "ADNU SMASHERS", "18", "21", "21", "18", "12", "3", "4", "2", "60"],
    ["WD 1", "P. BERNARDO / A. LEONARDO", "ADNU SMASHERS", "21", "17", "21", "12", "10", "4", "3", "1", "59"],
    ["TOTALS", "ADNU SMASHERS", "--", "81", "78", "63", "55", "39", "16", "12", "4", "222"]
]

badminton_t2_rows = [
    ["MS 1", "L. PEDROSA", "DLSU SHUTTLERS", "17", "21", "18", "12", "7", "3", "5", "2", "56"],
    ["WS 1", "M. SEVILLENO", "DLSU SHUTTLERS", "15", "16", "--", "7", "6", "2", "6", "1", "31"],
    ["MD 1", "A. GADI / R. ESTANISLAO", "DLSU SHUTTLERS", "21", "19", "17", "15", "9", "2", "5", "2", "57"],
    ["WD 1", "I. CASTILLO / C. POMAR", "DLSU SHUTTLERS", "19", "21", "19", "10", "8", "3", "4", "2", "59"],
    ["TOTALS", "DLSU SHUTTLERS", "--", "72", "77", "54", "44", "30", "10", "20", "7", "203"]
]

create_scoresheet(
    "complete_badminton_match_sheet.png",
    "OFFICIAL BADMINTON DUAL MEET SCORESHEET",
    "UAAP BADMINTON CHAMPIONSHIP | TEAM TIE FINALS",
    "DATE: OCTOBER 17, 2026 | VENUE: RIZAL MEMORIAL BADMINTON HALL | MATCH FORMAT: BEST OF 3 GAMES",
    "ADNU SHUTTLERS (HOME DELEGATION) - COMPLETE TIE MATCH LOG",
    badminton_cols,
    badminton_t1_rows,
    "DLSU SHUTTLERS (VISITOR DELEGATION) - COMPLETE TIE MATCH LOG",
    badminton_cols,
    badminton_t2_rows,
    {
        "title": "TEAM TIE RESULT & RUBBER BREAKDOWN",
        "score_breakdown": "INDIVIDUAL TIES: MS1: ADNU 2-1 DLSU | WS1: ADNU 2-0 DLSU | MD1: ADNU 2-1 DLSU | WD1: ADNU 2-1 DLSU",
        "final_score": "FINAL TIE SCORE: ADNU SMASHERS 4 — 0 DLSU SHUTTLERS   (MATCH POINTS: 222 - 203)",
        "scorer": "JOSEPHINE T. VELASCO (BWF / PBAD UMPIRE CHAIR #551)"
    }
)


# ==============================================================================
# 5. SWIMMING: COMPLETE AQUATICS MEET RESULTS (HEAT, LANE, EVENT, SPLIT, FINISH, STROKES, PTS)
# ==============================================================================
swimming_cols = [
    ("LANE", 35, 95),
    ("ATHLETE NAME", 95, 340),
    ("TEAM", 340, 520),
    ("EVENT", 520, 680),
    ("REACT", 680, 760),
    ("50M SPLIT", 760, 870),
    ("FINISH TIME", 870, 990),
    ("STROKES", 990, 1090),
    ("RATE (SPM)", 1090, 1200),
    ("POINTS", 1200, 1310),
    ("RANK", 1310, 1420),
    ("REMARKS", 1420, 1685),
]

swim_h1_rows = [
    ["L4", "K. DELA CRUZ", "ADNU AQUATICS", "100M FREESTYLE", "0.64s", "24.12s", "50.48s", "34", "38.2", "9", "1ST", "GOLD / MEET RECORD"],
    ["L5", "J. ALCANTARA", "DLSU TANKERS", "100M FREESTYLE", "0.68s", "24.85s", "51.20s", "36", "37.5", "7", "2ND", "SILVER MEDAL"],
    ["L3", "M. BAUTISTA", "UST TIGERSHARS", "100M FREESTYLE", "0.65s", "25.04s", "52.15s", "37", "36.8", "6", "3RD", "BRONZE MEDAL"],
    ["L6", "C. VILLANUEVA", "UP FIGHTING MAROONS", "100M FREESTYLE", "0.71s", "25.55s", "52.88s", "38", "36.0", "5", "4TH", "QUALIFIED"],
    ["L2", "R. SANTOS", "FEU TAMARAWS", "100M FREESTYLE", "0.69s", "25.90s", "53.40s", "39", "35.4", "4", "5TH", "FINALIST"],
    ["L7", "A. TAN", "ADU FALCONS", "100M FREESTYLE", "0.73s", "26.30s", "54.12s", "41", "34.8", "3", "6TH", "FINALIST"],
]

swim_h2_rows = [
    ["L4", "G. CASTRO", "ADNU AQUATICS", "200M BACKSTROKE", "0.58s", "28.15s", "1:59.42", "68", "34.2", "9", "1ST", "GOLD MEDAL"],
    ["L5", "S. TIU", "DLSU TANKERS", "200M BACKSTROKE", "0.61s", "28.90s", "2:01.18", "71", "33.8", "7", "2ND", "SILVER MEDAL"],
    ["L3", "P. HERNANDEZ", "UST TIGERSHARS", "200M BACKSTROKE", "0.63s", "29.40s", "2:03.05", "73", "33.1", "6", "3RD", "BRONZE MEDAL"],
    ["L6", "D. MENDOZA", "UP FIGHTING MAROONS", "200M BACKSTROKE", "0.66s", "29.95s", "2:04.80", "74", "32.5", "5", "4TH", "FINALIST"],
    ["L2", "E. LIM", "DLSU TANKERS", "200M BACKSTROKE", "0.62s", "30.40s", "2:06.10", "76", "32.0", "4", "5TH", "FINALIST"],
]

create_scoresheet(
    "complete_swimming_meet_results.png",
    "OFFICIAL SWIMMING CHAMPIONSHIP MEET RESULTS",
    "PSI / UAAP AQUATICS CHAMPIONSHIPS | DAY 2 FINALS SESSION",
    "DATE: OCTOBER 17, 2026 | VENUE: NEW CLINTON AQUATIC CENTER (50M OLYMPIC POOL) | ELEC TIMING: OMEGA QUANTUM",
    "EVENT 14: MEN'S 100M FREESTYLE FINAL - HEAT 1",
    swimming_cols,
    swim_h1_rows,
    "EVENT 15: MEN'S 200M BACKSTROKE FINAL - HEAT 2",
    swimming_cols,
    swim_h2_rows,
    {
        "title": "AQUATICS MEET AUDIT & OVERALL STANDINGS",
        "score_breakdown": "SESSION TEAM SCORES:  ADNU AQUATICS: 84 PTS  |  DLSU TANKERS: 76 PTS  |  UST TIGERS: 62 PTS  |  UP MAROONS: 48 PTS",
        "final_score": "SESSION LEADER: ATENEO DE NAGA AQUATICS (+8 PTS MARGIN)",
        "scorer": "BENJAMIN R. AQUINO (WORLD AQUATICS / PSI CHIEF REFEREE #019)"
    }
)


# ==============================================================================
# 6. TRACK & FIELD: COMPLETE ATHLETICS RESULTS (LANE, BIB, ATHLETE, SCHOOL, SPLIT, TIME, PTS, RANK)
# ==============================================================================
track_cols = [
    ("LANE", 35, 95),
    ("BIB", 95, 165),
    ("ATHLETE NAME", 165, 420),
    ("AFFILIATION", 420, 620),
    ("EVENT", 620, 760),
    ("REACT", 760, 850),
    ("SPLIT", 850, 960),
    ("TIME / MARK", 960, 1090),
    ("WIND", 1090, 1190),
    ("POINTS", 1190, 1290),
    ("RANK", 1290, 1390),
    ("REMARKS", 1390, 1685),
]

track_t1_rows = [
    ["L4", "#204", "E. CRAY", "ADNU ATHLETICS", "100M SPRINT", "0.142s", "6.22s", "10.24s", "+0.8 m/s", "10", "1ST", "GOLD / UAAP RECORD"],
    ["L5", "#108", "A. BERAM", "DLSU GREEN TRACK", "100M SPRINT", "0.155s", "6.34s", "10.41s", "+0.8 m/s", "8", "2ND", "SILVER MEDAL"],
    ["L3", "#312", "M. MEDINA", "UST GOLDEN TRACK", "100M SPRINT", "0.148s", "6.40s", "10.55s", "+0.8 m/s", "6", "3RD", "BRONZE MEDAL"],
    ["L6", "#405", "J. SALCEDO", "UP FIGHTING MAROONS", "100M SPRINT", "0.160s", "6.49s", "10.68s", "+0.8 m/s", "5", "4TH", "QUALIFIED"],
    ["L2", "#112", "R. CASAS", "FEU TAMARAWS", "100M SPRINT", "0.152s", "6.55s", "10.74s", "+0.8 m/s", "4", "5TH", "FINALIST"],
    ["L7", "#218", "D. VALLE", "ADU SOARING TRACK", "100M SPRINT", "0.168s", "6.61s", "10.88s", "+0.8 m/s", "3", "6TH", "FINALIST"],
]

track_t2_rows = [
    ["L4", "#201", "C. BAGUIO", "ADNU ATHLETICS", "400M HURDLES", "0.175s", "24.10s", "50.88s", "--", "10", "1ST", "GOLD MEDAL"],
    ["L5", "#105", "F. GUANSO", "DLSU GREEN TRACK", "400M HURDLES", "0.180s", "24.45s", "51.42s", "--", "8", "2ND", "SILVER MEDAL"],
    ["L3", "#310", "V. NAVARRO", "UST GOLDEN TRACK", "400M HURDLES", "0.169s", "24.80s", "52.10s", "--", "6", "3RD", "BRONZE MEDAL"],
    ["L6", "#402", "P. DELA TORRE", "UP FIGHTING MAROONS", "400M HURDLES", "0.188s", "25.10s", "52.85s", "--", "5", "4TH", "FINALIST"],
    ["L2", "#115", "K. BULAON", "FEU TAMARAWS", "400M HURDLES", "0.192s", "25.60s", "53.60s", "--", "4", "5TH", "FINALIST"],
]

create_scoresheet(
    "complete_track_field_results.png",
    "OFFICIAL TRACK & FIELD CHAMPIONSHIP RESULTS",
    "PATAFA / UAAP ATHLETICS CHAMPIONSHIPS | FINALS DAY 1",
    "DATE: OCTOBER 17, 2026 | VENUE: PHILSORTS ULTRA TRACK OVAL | TIMING: FINISHLYNX FULLY AUTOMATIC",
    "EVENT 08: MEN'S 100M DASH FINAL - HEAT 1",
    track_cols,
    track_t1_rows,
    "EVENT 12: MEN'S 400M HURDLES FINAL - HEAT 1",
    track_cols,
    track_t2_rows,
    {
        "title": "TRACK & FIELD TEAM STANDINGS & RECORDS",
        "score_breakdown": "POINTS SUMMARY:  ADNU ATHLETICS: 72 PTS  |  DLSU GREEN TRACK: 64 PTS  |  UST TRACK: 55 PTS  |  UP MAROONS: 42 PTS",
        "final_score": "SESSION LEADER: ATENEO DE NAGA ATHLETICS (+8 PTS)",
        "scorer": "COL. GUILLERMO B. TORRES (WORLD ATHLETICS / PATAFA TECHNICAL DELEGATE #044)"
    }
)
