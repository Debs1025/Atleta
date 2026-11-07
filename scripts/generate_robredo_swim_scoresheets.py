import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "/home/gerard/Desktop/School/Atleta-dev_test_branch/sample_scoresheets"
ARTIFACT_DIR = "/home/gerard/.gemini/antigravity/brain/383f7655-9e28-4251-b5dd-c53b45f09f9e"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

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
    draw.text((w - 395, 86), "CONGRESS OF PHILIPPINE AQUATICS (COPA)", fill=(21, 128, 61), font=small_font)
    draw.text((w - 395, 104), "HY-TEK MEET MANAGER 8.0 AUDITED", fill=(71, 85, 105), font=small_font)

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
                f = bold_cell_font if (is_total or c_idx in [0, 1, 6, 9]) else cell_font
                color = (15, 23, 42) if not is_total else (30, 58, 138)
                draw.text((x1 + 4, y_pos + 7), val, fill=color, font=f)
            draw.line([(w - 35, y_pos), (w - 35, y_pos + 30)], fill=(203, 213, 225), width=1)
            y_pos += 30

        return y_pos + 20

    # Draw Event 1
    current_y = draw_team_table(team1_info, team1_cols, team1_rows, current_y)

    # Draw Event 2
    current_y = draw_team_table(team2_info, team2_cols, team2_rows, current_y)

    # Bottom Summary Box
    if summary_box:
        draw.rectangle([35, current_y, w - 35, current_y + 115], fill=(248, 250, 252), outline=(30, 41, 59), width=2)
        draw.text((55, current_y + 14), summary_box.get("title", "MATCH SUMMARY"), fill=(15, 23, 42), font=header_font)
        draw.text((55, current_y + 42), summary_box.get("score_breakdown", ""), fill=(30, 41, 59), font=bold_cell_font)
        draw.text((55, current_y + 72), summary_box.get("final_score", ""), fill=(180, 83, 9), font=section_font)

        # Scorer Signature Line
        draw.text((w - 550, current_y + 18), "OFFICIAL MEET REFEREE / RECORDER:", fill=(71, 85, 105), font=small_font)
        draw.text((w - 550, current_y + 40), summary_box.get("scorer", "CONGRESS OF PHILIPPINE AQUATICS (COPA)"), fill=(15, 23, 42), font=bold_cell_font)
        draw.line([(w - 550, current_y + 68), (w - 60, current_y + 68)], fill=(15, 23, 42), width=2)
        draw.text((w - 550, current_y + 76), "CERTIFIED ACCREDITED STATS • LOGGED TO ATLETA CENTRAL REGISTRY", fill=(100, 116, 139), font=small_font)

    out_file = os.path.join(OUT_DIR, filename)
    img.save(out_file, "PNG")
    artifact_copy = os.path.join(ARTIFACT_DIR, filename)
    img.save(artifact_copy, "PNG")
    print(f"Generated: {out_file} and copied to {artifact_copy}")

# Columns layout for Swimming Results
swimming_cols = [
    ("LANE", 35, 95),
    ("ATHLETE NAME", 95, 380),
    ("AFFILIATION / TEAM", 380, 680),
    ("EVENT", 680, 860),
    ("AGE", 860, 930),
    ("SEED TIME", 930, 1050),
    ("FINISH TIME", 1050, 1190),
    ("CLASS", 1190, 1280),
    ("POINTS", 1280, 1380),
    ("RANK", 1380, 1470),
    ("REMARKS", 1470, 1685),
]

# PAGE 1: EVENT 8 (GIRLS 11-12 100M FREESTYLE) & EVENT 7 (BOYS 11-12 100M FREESTYLE)
swim_p1_ev8_rows = [
    ["L4", "QUINTO, JENNELLE VIEN", "LEGASPI HYDRO HAWKS", "100M FREESTYLE ABC", "11", "1:03.00", "1:05.38", "CLASS A", "25", "1ST", "GOLD MEDAL (MEET LEADER)"],
    ["L5", "ALINDOGAN, RILEY MADDELEIGN", "LEGASPI HYDRO HAWKS", "100M FREESTYLE ABC", "12", "1:05.00", "1:06.61", "CLASS A", "21", "2ND", "SILVER MEDAL"],
    ["L3", "KENNIKER, CHLOE YANNA", "RED FIN SWIM CLUB", "100M FREESTYLE ABC", "12", "1:19.00", "1:19.69", "CLASS B", "18", "1ST (B)", "GOLD - CLASS B"],
    ["L6", "CHEN, YJASANDRA MARY OLGA", "LEGASPI STINGRAY SWIM TEAM", "100M FREESTYLE ABC", "11", "1:15.00", "1:19.79", "CLASS B", "15", "2ND (B)", "SILVER - CLASS B"],
    ["L2", "SOTO, JOHANN AURORA", "NASA SUPERSHARK SWIM TEAM", "100M FREESTYLE ABC", "12", "1:28.00", "1:44.57", "CLASS C", "10", "1ST (C)", "GOLD - CLASS C"],
    ["L7", "VILLAR, KAIRI YALIXA", "IRIGA FLIPPERS SWIM TEAM", "100M FREESTYLE ABC", "11", "NT", "1:50.97", "CLASS C", "7", "2ND (C)", "SILVER - CLASS C"],
    ["L1", "BARISO, JOSANE", "ALBAY BLUE MARLINS", "100M FREESTYLE ABC", "13", "1:30.00", "1:25.76", "CLASS B", "6", "FINAL", "PB TIME IMPROVED"],
]

swim_p1_ev7_rows = [
    ["L4", "VILLAR, KYLE HUNTER B", "TABAK YELLOWFINS SWIM CLUB", "100M FREESTYLE ABC", "12", "1:41.00", "1:05.69", "CLASS A", "25", "1ST", "GOLD MEDAL (BEST SPLIT)"],
    ["L5", "SERRANO, MIGUEL ALFREDO", "LEGASPI HYDRO HAWKS", "100M FREESTYLE ABC", "12", "1:10.00", "1:06.93", "CLASS A", "21", "2ND", "SILVER MEDAL"],
    ["L3", "NABORA, KIEL JUANCHO", "LEGIONS OF NORTH OLYMPIANS", "100M FREESTYLE ABC", "11", "NT", "1:17.81", "CLASS B", "18", "1ST (B)", "GOLD - CLASS B"],
    ["L6", "SOTTO, JOSHUA JOAQUIN", "IRIGA FLIPPERS SWIM TEAM", "100M FREESTYLE ABC", "12", "NT", "1:18.77", "CLASS B", "15", "2ND (B)", "SILVER - CLASS B"],
    ["L2", "BALUTE, MICHAEL ANGELO", "MAYON SWIM CLUB", "100M FREESTYLE ABC", "12", "NT", "1:33.22", "CLASS C", "10", "1ST (C)", "GOLD - CLASS C"],
    ["L7", "CALUB, KURT AMIEL", "BLUEWHALES SWIM CLUB", "100M FREESTYLE ABC", "11", "1:25.00", "1:35.79", "CLASS C", "7", "2ND (C)", "SILVER - CLASS C"],
    ["L1", "BALASTA, GIAN JOSEPH", "ALBAY BLUE MARLINS", "100M FREESTYLE ABC", "11", "1:25.00", "1:24.48", "CLASS B", "6", "FINAL", "OFFICIAL TIME"],
]

create_scoresheet(
    "jesse_robredo_swim_cup_scoresheet_page1.png",
    "6th JESSE M. ROBREDO NATIONAL SWIM CUP — OFFICIAL RESULTS",
    "CONGRESS OF PHILIPPINE AQUATICS (COPA) | HY-TEK MEET MANAGER 8.0 AUDIT SHEET",
    "DATES: AUGUST 21–22, 2026 | VENUE: NAGA CITY AQUATICS CENTER (CAMARINES SUR) | ELEC TIMING: OMEGA QUANTUM",
    "EVENT 8: GIRLS 11-12 100M FREESTYLE ABC FINALS",
    swimming_cols,
    swim_p1_ev8_rows,
    "EVENT 7: BOYS 11-12 100M FREESTYLE ABC FINALS",
    swimming_cols,
    swim_p1_ev7_rows,
    {
        "title": "MEET AUDIT & FREESTYLE DIVISION STANDINGS",
        "score_breakdown": "DIVISION TEAM POINTS:  LEGASPI HYDRO HAWKS: 67 PTS  |  TABAK YELLOWFINS: 25 PTS  |  LEGIONS OF NORTH: 18 PTS  |  IRIGA FLIPPERS: 22 PTS",
        "final_score": "SESSION HIGHLIGHT: J. QUINTO (1:05.38) & K. VILLAR (1:05.69) SECURE INDIVIDUAL GOLD",
        "scorer": "CONGRESS OF PHILIPPINE AQUATICS (COPA CHIEF RECORDER #042)"
    }
)

# PAGE 2: EVENT 16 (GIRLS 11-12 50M BUTTERFLY) & EVENT 15 (BOYS 11-12 50M BUTTERFLY)
swim_p2_ev16_rows = [
    ["L4", "QUINTO, JENNELLE VIEN", "LEGASPI HYDRO HAWKS", "50M BUTTERFLY ABC", "11", "33.00", "32.94", "CLASS A", "25", "1ST", "GOLD MEDAL (RECORD TIME)"],
    ["L5", "ALINDOGAN, RILEY MADDELEIGN", "LEGASPI HYDRO HAWKS", "50M BUTTERFLY ABC", "12", "33.00", "33.27", "CLASS A", "21", "2ND", "SILVER MEDAL"],
    ["L3", "INZON, MAUIE KRISTENKATE M", "MAYON SWIM CLUB", "50M BUTTERFLY ABC", "11", "46.33", "38.67", "CLASS B", "18", "1ST (B)", "GOLD - CLASS B"],
    ["L6", "BORJA, PAULSTINE JULIA D", "MAYON SWIM CLUB", "50M BUTTERFLY ABC", "12", "35.67", "38.72", "CLASS B", "15", "2ND (B)", "SILVER - CLASS B"],
    ["L2", "VILLAR, KAIRI YALIXA", "IRIGA FLIPPERS SWIM TEAM", "50M BUTTERFLY ABC", "11", "NT", "51.45", "CLASS C", "10", "1ST (C)", "GOLD - CLASS C"],
    ["L7", "BOTALON, SHAINA NATHALIE T", "TABAK YELLOWFINS SWIM CLUB", "50M BUTTERFLY ABC", "11", "1:23.35", "51.58", "CLASS C", "7", "2ND (C)", "SILVER - CLASS C"],
    ["L1", "BICALIG, ANGEL JACQUELINE", "ZENITH AQUA DRAGONS", "50M BUTTERFLY NOVICE", "11", "NT", "46.32", "NOVICE", "10", "1ST (NOV)", "NOVICE CHAMPION"],
]

swim_p2_ev15_rows = [
    ["L4", "ALVAREZ, DRAECO XAVIER", "METRO SWIM", "50M BUTTERFLY ABC", "12", "30.60", "30.89", "CLASS A", "25", "1ST", "GOLD MEDAL (MEET BEST)"],
    ["L5", "BRAGA, FRANCIS ANTON D", "MAYON SWIM CLUB", "50M BUTTERFLY ABC", "12", "33.00", "32.36", "CLASS A", "21", "2ND", "SILVER MEDAL"],
    ["L3", "BARZAGA, NOEL LUIS", "NAGA CITY SWIMMING DRAGON'S", "50M BUTTERFLY ABC", "12", "36.33", "40.28", "CLASS B", "18", "1ST (B)", "GOLD - CLASS B"],
    ["L6", "MOLINA, FRANCIS APOLLO B", "MAYON SWIM CLUB", "50M BUTTERFLY ABC", "11", "41.74", "40.94", "CLASS B", "15", "2ND (B)", "SILVER - CLASS B"],
    ["L2", "SEVILLON, MARCIAN ANDREI", "IRIGA FLIPPERS SWIM TEAM", "50M BUTTERFLY ABC", "12", "NT", "50.62", "CLASS C", "10", "1ST (C)", "GOLD - CLASS C"],
    ["L7", "BALUTE, MICHAEL ANGELO", "MAYON SWIM CLUB", "50M BUTTERFLY ABC", "12", "NT", "50.97", "CLASS C", "7", "2ND (C)", "SILVER - CLASS C"],
    ["L1", "BALASTA, GIAN JOSEPH", "ALBAY BLUE MARLINS", "50M BUTTERFLY ABC", "11", "40.00", "45.50", "CLASS B", "4", "FINAL", "TOP 10 FINISHER"],
]

create_scoresheet(
    "jesse_robredo_swim_cup_scoresheet_page2.png",
    "6th JESSE M. ROBREDO NATIONAL SWIM CUP — BUTTERFLY & OVERALL AUDIT",
    "CONGRESS OF PHILIPPINE AQUATICS (COPA) | HY-TEK MEET MANAGER 8.0 AUDIT SHEET",
    "DATES: AUGUST 21–22, 2026 | VENUE: NAGA CITY AQUATICS CENTER (CAMARINES SUR) | ELEC TIMING: OMEGA QUANTUM",
    "EVENT 16: GIRLS 11-12 50M BUTTERFLY ABC FINALS",
    swimming_cols,
    swim_p2_ev16_rows,
    "EVENT 15: BOYS 11-12 50M BUTTERFLY ABC FINALS",
    swimming_cols,
    swim_p2_ev15_rows,
    {
        "title": "FINAL CHAMPIONSHIP AUDIT & TEAM STANDINGS (28 CLUBS)",
        "score_breakdown": "OVERALL TEAM TOTALS:  1ST: METRO SWIM (1,950 PTS) | 2ND: LEGASPI HYDRO HAWKS (1,927 PTS) | 3RD: MAYON SWIM (1,887 PTS)",
        "final_score": "OVERALL MEET CHAMPION: METRO SWIM (+23 PTS MARGIN) • TOTAL ATHLETES: 368 • ENTRIES: 3,154",
        "scorer": "ENGR. EDWIN C. ROBREDO (COPA / PHILIPPINE AQUATICS CHIEF REFEREE)"
    }
)
