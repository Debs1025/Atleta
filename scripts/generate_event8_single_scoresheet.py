import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR1 = "/home/gerard/Desktop/School/Atleta-dev_test_branch/sample_scoresheets"
OUT_DIR2 = "/home/gerard/Desktop/School/Atleta-dev_test_branch/sample_scoresheets/standardized"
ARTIFACT_DIR = "/home/gerard/.gemini/antigravity/brain/383f7655-9e28-4251-b5dd-c53b45f09f9e"

os.makedirs(OUT_DIR1, exist_ok=True)
os.makedirs(OUT_DIR2, exist_ok=True)
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

title_font = get_bold_font(30)
header_font = get_bold_font(20)
col_font = get_bold_font(16)
cell_font = get_font(16)
bold_cell_font = get_bold_font(16)
small_font = get_font(13)

def generate_single_event_sheet(filename):
    w, h = 1600, 1050
    img = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Outer border
    draw.rectangle([25, 25, w - 25, h - 25], outline=(15, 23, 42), width=3)

    # Header container
    draw.rectangle([40, 40, w - 40, 170], fill=(248, 250, 252), outline=(30, 41, 59), width=2)
    draw.text((60, 52), "OFFICIAL SWIMMING EVENT RESULTS — EVENT #8 FINALS", fill=(15, 23, 42), font=title_font)
    draw.text((60, 98), "EVENT: GIRLS 11-12 100M FREESTYLE ABC FINALS", fill=(30, 41, 59), font=header_font)
    draw.text((880, 98), "6th JESSE M. ROBREDO NATIONAL SWIM CUP", fill=(15, 23, 42), font=header_font)
    draw.text((60, 134), "DATE: AUGUST 21–22, 2026 | VENUE: NAGA CITY AQUATICS CENTER | SANCTIONED: COPA", fill=(71, 85, 105), font=small_font)
    draw.text((880, 134), "WINNER: JENNELLE VIEN QUINTO (01:05.38) | 25 PTS", fill=(5, 150, 105), font=bold_cell_font)

    # Certified stamp on top right
    draw.rectangle([w - 410, 48, w - 50, 90], fill=(240, 253, 244), outline=(22, 163, 74), width=2)
    draw.text((w - 395, 58), "CERTIFIED OFFICIAL EVENT RESULTS", fill=(22, 163, 74), font=bold_cell_font)

    # Columns configuration optimized for high OCR precision
    cols = [
        ("RANK", 45, 120),
        ("LANE", 120, 195),
        ("ATHLETE NAME", 195, 550),
        ("TEAM / AFFILIATION", 550, 890),
        ("FINISH TIME", 890, 1050),
        ("SEED TIME", 1050, 1190),
        ("POINTS", 1190, 1300),
        ("REMARKS / MEDAL", 1300, 1555),
    ]

    # Real data rows extracted directly from Meet Summary PDF Event #8
    rows = [
        ("#1", "4", "QUINTO, JENNELLE VIEN", "LEGASPI HYDRO HAWKS", "01:05.38", "01:03.00", "25", "GOLD MEDAL (CLASS A)"),
        ("#2", "5", "ALINDOGAN, RILEY MADDELEIGN", "LEGASPI HYDRO HAWKS", "01:06.61", "01:05.00", "21", "SILVER MEDAL (CLASS A)"),
        ("#3", "3", "ARANA, JETTE MARGARET HERA", "AQUA TIGER SWIM TEAM", "01:11.07", "01:10.99", "18", "BRONZE MEDAL (CLASS A)"),
        ("#4", "6", "MORENA, TIFFANY LEIGHNA", "UNC GREYHOUNDS", "01:12.84", "01:10.00", "15", "4TH PLACE (CLASS A)"),
        ("#5", "2", "VELASCO, THALIA PEARL", "NCF VELOCI TIGERS", "01:13.25", "01:15.37", "12", "5TH PLACE (CLASS A)"),
        ("#6", "7", "BADUYA, HYMNRIEL SCARLET SKY", "UNC GREYHOUNDS", "01:13.26", "01:08.00", "9", "6TH PLACE (CLASS A)"),
        ("#7", "1", "BAUSA, KIELE ANGELIQUE", "LEGASPI HYDRO HAWKS", "01:13.61", "01:13.00", "6", "7TH PLACE (CLASS A)"),
        ("#8", "8", "BORJA, PAULSTINE JULIA D", "MAYON SWIM CLUB", "01:13.65", "01:13.25", "3", "8TH PLACE (CLASS A)"),
        ("#9", "9", "INZON, MAUIE KRISTENKATE M", "MAYON SWIM CLUB", "01:13.84", "01:19.00", "0", "9TH PLACE (FINALIST)"),
        ("#10", "10", "SARSALE, HELENA SKYE S", "SUNNYSIDE SWIM SCHOOL", "01:15.13", "01:12.97", "0", "10TH PLACE (FINALIST)"),
        ("#11", "11", "NAVIA, THEA IRISH L", "MAYON SWIM CLUB", "01:15.87", "01:16.00", "0", "11TH PLACE (FINALIST)"),
        ("#12", "12", "ESTVEZ, YSABELLE RICH", "ZENITH AQUA DRAGONS", "01:16.22", "NT", "0", "12TH PLACE (FINALIST)"),
    ]

    start_x = 45
    table_w = w - 90
    y = 195

    # Table Header Row
    draw.rectangle([start_x, y, start_x + table_w, y + 44], fill=(226, 232, 240), outline=(30, 41, 59), width=2)
    for name, x1, x2 in cols:
        draw.line([(x1, y), (x1, y + 44)], fill=(30, 41, 59), width=1)
        draw.text((x1 + 8, y + 12), name, fill=(15, 23, 42), font=col_font)
    draw.line([(start_x + table_w, y), (start_x + table_w, y + 44)], fill=(30, 41, 59), width=1)
    y += 44

    # Table Data Rows
    for r_idx, row in enumerate(rows):
        row_bg = (255, 255, 255) if r_idx % 2 == 0 else (248, 250, 252)
        if row[0] == "#1":
            row_bg = (254, 252, 232)  # Gold tint
        elif row[0] == "#2":
            row_bg = (241, 245, 249)  # Silver tint
        elif row[0] == "#3":
            row_bg = (255, 247, 237)  # Bronze tint

        draw.rectangle([start_x, y, start_x + table_w, y + 42], fill=row_bg, outline=(203, 213, 225), width=1)
        for c_idx, (_, x1, x2) in enumerate(cols):
            draw.line([(x1, y), (x1, y + 42)], fill=(203, 213, 225), width=1)
            val = str(row[c_idx]) if c_idx < len(row) else ""
            f = bold_cell_font if c_idx in [0, 1, 2, 4, 6] else cell_font
            color = (15, 23, 42)
            if c_idx == 0 and row[0] == "#1":
                color = (180, 83, 9)
            elif c_idx == 4:
                color = (2, 132, 199)  # Cyan/Blue time highlight
            draw.text((x1 + 8, y + 12), val, fill=color, font=f)
        draw.line([(start_x + table_w, y), (start_x + table_w, y + 42)], fill=(203, 213, 225), width=1)
        y += 42

    # Footer verification / audit box
    y += 20
    draw.rectangle([45, y, w - 45, y + 80], fill=(248, 250, 252), outline=(148, 163, 184), width=2)
    draw.text((60, y + 14), "EVENT 8 AUDIT: 40 TOTAL SWIMMERS CONTESTED | ALL ELECTRONIC TOUCHPAD SPLITS AUDITED", fill=(15, 23, 42), font=bold_cell_font)
    draw.text((60, y + 44), "HEAD REFEREE: ENGR. EDWIN C. ROBREDO (COPA) | CHIEF RECORDER: HY-TEK MEET MANAGER 8.0", fill=(71, 85, 105), font=small_font)
    draw.text((w - 450, y + 44), "STATUS: VERIFIED & LOGGED TO ATLETA", fill=(5, 150, 105), font=bold_cell_font)

    # Save to all target paths
    p1 = os.path.join(OUT_DIR1, filename)
    p2 = os.path.join(OUT_DIR2, filename)
    p3 = os.path.join(ARTIFACT_DIR, filename)

    img.save(p1, "PNG")
    img.save(p2, "PNG")
    img.save(p3, "PNG")
    print(f"Generated successfully to:\n  1. {p1}\n  2. {p2}\n  3. {p3}")

generate_single_event_sheet("event8_girls_100m_freestyle_single.png")
