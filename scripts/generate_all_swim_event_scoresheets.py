import os
import re
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

# Parse meet summary data from layout text
def parse_meet_summary():
    with open('/tmp/swim_meet_layout.txt', 'r', encoding='utf-8') as f:
        text = f.read()

    lines = text.split('\n')
    current_team = 'UNKNOWN'
    current_swimmer = None
    records = []

    for line in lines:
        if line and not line.startswith(' ') and not any(k in line for k in ['Page ', 'HY-TEK', '6th Jesse', 'Meet Summary', 'Seed', 'Congress']):
            current_team = line.strip()
        
        m_swimmer = re.match(r'^\s{1,5}([0-9]+)\s+([A-Za-z\s,\.\'\-]+?)\s+-\s+(Female|Male)\s+-\s+Age:\s*([0-9]+)', line)
        if m_swimmer:
            s_id, s_name, s_gender, s_age = m_swimmer.groups()
            current_swimmer = {
                'name': s_name.strip(),
                'gender': s_gender.strip(),
                'age': int(s_age),
                'team': current_team
            }
            continue
        
        m_ev = re.match(r'^\s{4,8}#([0-9]+)\s+(.+?)\s+Finals\s+(.+)', line)
        if m_ev and current_swimmer:
            ev_num = int(m_ev.group(1))
            ev_desc = m_ev.group(2).strip()
            rest = m_ev.group(3).strip()
            
            parts = re.split(r'\s{2,}', rest)
            seed = parts[0].strip() if len(parts) > 0 else 'NT'
            result_part = parts[1].strip() if len(parts) > 1 else ''
            
            res_m = re.search(r'([0-9]+:[0-9]+\.[0-9]+|[0-9]+\.[0-9]+|NS|DQ)', result_part)
            finish_time = res_m.group(1) if res_m else ''
            
            rank_m = re.search(r'\((\d+)\)', rest)
            rank = int(rank_m.group(1)) if rank_m else 99
            
            pts_m = re.search(r'(?:[A-C]|\*)\s+([0-9]{1,2})\b', rest)
            if not pts_m:
                pts_m = re.search(r'\b([0-9]{1,2})$', rest)
            pts = int(pts_m.group(1)) if pts_m else 0
            
            clean_seed = re.sub(r'\s+[A-C]$', '', seed)
            if not finish_time or finish_time in ['NS', 'DQ']:
                continue

            records.append({
                'ev_num': ev_num,
                'ev_desc': ev_desc,
                'swimmer': current_swimmer['name'].upper(),
                'gender': current_swimmer['gender'],
                'age': current_swimmer['age'],
                'team': current_swimmer['team'].upper(),
                'seed': clean_seed,
                'finish_time': finish_time,
                'rank': rank,
                'pts': pts
            })
    return records

def to_seconds(t_str):
    if not t_str or t_str in ['NT', 'NS', 'DQ']:
        return 999999.0
    if ':' in t_str:
        parts = t_str.split(':')
        return float(parts[0]) * 60 + float(parts[1])
    try:
        return float(t_str)
    except:
        return 999999.0

def format_time_str(t):
    if not t or t == "NT":
        return t
    # Normalize 1:05.38 -> 01:05.38, 50.60 -> 00:50.60
    if ":" in t:
        parts = t.split(":")
        return f"{int(parts[0]):02d}:{parts[1]}"
    else:
        try:
            val = float(t)
            if val < 60:
                return f"00:{val:05.2f}"
            else:
                m = int(val // 60)
                s = val % 60
                return f"{m:02d}:{s:05.2f}"
        except:
            return t

def render_scoresheet(filename, event_no, event_title, meet_title, date_venue, winner_summary, rows):
    w = 1600
    row_count = len(rows)
    h = max(1050, 240 + (row_count * 46) + 70)
    
    img = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Outer border
    draw.rectangle([25, 25, w - 25, h - 25], outline=(15, 23, 42), width=3)

    # Header container
    draw.rectangle([40, 40, w - 40, 170], fill=(248, 250, 252), outline=(30, 41, 59), width=2)
    draw.text((60, 52), f"OFFICIAL SWIMMING EVENT RESULTS — EVENT #{event_no} FINALS", fill=(15, 23, 42), font=title_font)
    draw.text((60, 98), f"EVENT: {event_title.upper()}", fill=(30, 41, 59), font=header_font)
    draw.text((880, 98), meet_title, fill=(15, 23, 42), font=header_font)
    draw.text((60, 134), date_venue, fill=(71, 85, 105), font=small_font)
    draw.text((880, 134), winner_summary, fill=(5, 150, 105), font=bold_cell_font)

    # Certified stamp on top right
    draw.rectangle([w - 410, 48, w - 50, 90], fill=(240, 253, 244), outline=(22, 163, 74), width=2)
    draw.text((w - 395, 58), "CERTIFIED OFFICIAL EVENT RESULTS", fill=(22, 163, 74), font=bold_cell_font)

    # Columns configuration
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

        draw.rectangle([start_x, y, start_x + table_w, y + 44], fill=row_bg, outline=(203, 213, 225), width=1)

        # Draw cell contents
        for c_idx, val in enumerate(row):
            x1 = cols[c_idx][1]
            draw.line([(x1, y), (x1, y + 44)], fill=(203, 213, 225), width=1)
            
            f = cell_font
            text_color = (30, 41, 59)
            if c_idx == 0:  # Rank
                f = bold_cell_font
                text_color = (15, 23, 42)
            elif c_idx == 2:  # Athlete Name
                f = bold_cell_font
                text_color = (15, 23, 42)
            elif c_idx == 4:  # Finish Time
                f = bold_cell_font
                text_color = (2, 132, 199)
            elif c_idx == 6:  # Points
                f = bold_cell_font
                text_color = (5, 150, 105) if val != "0" else (148, 163, 184)
            elif c_idx == 7:  # Remarks
                if "GOLD" in val:
                    text_color = (180, 83, 9)
                    f = bold_cell_font
                elif "SILVER" in val:
                    text_color = (71, 85, 105)
                    f = bold_cell_font
                elif "BRONZE" in val:
                    text_color = (194, 65, 12)
                    f = bold_cell_font

            draw.text((x1 + 8, y + 12), str(val), fill=text_color, font=f)
        
        draw.line([(start_x + table_w, y), (start_x + table_w, y + 44)], fill=(203, 213, 225), width=1)
        y += 44

    # Footer summary banner
    footer_y = y + 15
    draw.rectangle([start_x, footer_y, start_x + table_w, footer_y + 42], fill=(241, 245, 249), outline=(148, 163, 184), width=1)
    footer_text = f"OFFICIAL AUDIT: {row_count} CERTIFIED FINISHERS | TIMING: TOUCHPAD / OMEGA QUANTUM | SANCTIONED: PHILIPPINE AQUATICS"
    draw.text((start_x + 18, footer_y + 12), footer_text, fill=(71, 85, 105), font=small_font)

    # Save to OUT_DIR1, OUT_DIR2, and ARTIFACT_DIR
    p1 = os.path.join(OUT_DIR1, filename)
    p2 = os.path.join(OUT_DIR2, filename)
    p3 = os.path.join(ARTIFACT_DIR, filename)

    img.save(p1, "PNG")
    img.save(p2, "PNG")
    img.save(p3, "PNG")
    print(f"Generated: {filename} -> ({p1}, {p3})")
    return p1

def main():
    records = parse_meet_summary()
    print(f"Total parsed race records: {len(records)}")

    # Lane assignments order for top seeds
    lane_order = [4, 5, 3, 6, 2, 7, 1, 8, 9, 10, 11, 12]

    # SET 1: MEET EVENTS #1 TO #8
    events_1_to_8 = [
        (1, "Boys 100M Freestyle NOVICE Finals", "event01_boys_100m_freestyle_novice.png"),
        (2, "Girls 100M Freestyle NOVICE Finals", "event02_girls_100m_freestyle_novice.png"),
        (3, "Boys 100M Freestyle ABC Finals", "event03_boys_100m_freestyle_abc.png"),
        (4, "Girls 100M Freestyle ABC Finals", "event04_girls_100m_freestyle_abc.png"),
        (5, "Boys 11-12 100M Freestyle NOVICE Finals", "event05_boys_11-12_100m_freestyle_novice.png"),
        (6, "Girls 11-12 100M Freestyle NOVICE Finals", "event06_girls_11-12_100m_freestyle_novice.png"),
        (7, "Boys 11-12 100M Freestyle ABC Finals", "event07_boys_11-12_100m_freestyle_abc.png"),
        (8, "Girls 11-12 100M Freestyle ABC Finals", "event08_girls_11-12_100m_freestyle_abc.png"),
    ]

    for ev_id, ev_title, fname in events_1_to_8:
        matching = [r for r in records if r['ev_num'] == ev_id]
        # Sort by actual finish time in seconds
        matching.sort(key=lambda x: to_seconds(x['finish_time']))
        
        # Deduplicate same swimmer if multi-heat
        seen = set()
        unique_swimmers = []
        for m in matching:
            if m['swimmer'] not in seen:
                seen.add(m['swimmer'])
                unique_swimmers.append(m)

        selected = unique_swimmers[:12]
        if not selected:
            continue

        rows = []
        standard_pts = [25, 21, 18, 15, 12, 9, 6, 3, 0, 0, 0, 0]
        for idx, s in enumerate(selected):
            rank_display = f"#{idx + 1}"
            lane_display = str(lane_order[idx] if idx < len(lane_order) else idx + 1)
            time_display = format_time_str(s['finish_time'])
            seed_display = format_time_str(s['seed'])
            pts_val = s['pts'] if s['pts'] > 0 else (standard_pts[idx] if idx < len(standard_pts) else 0)
            pts_display = str(pts_val)
            
            if idx == 0:
                medal = "GOLD MEDAL (CLASS A)" if "ABC" in ev_title else "1ST PLACE (NOVICE)"
            elif idx == 1:
                medal = "SILVER MEDAL (CLASS A)" if "ABC" in ev_title else "2ND PLACE (NOVICE)"
            elif idx == 2:
                medal = "BRONZE MEDAL (CLASS A)" if "ABC" in ev_title else "3RD PLACE (NOVICE)"
            elif idx < 8:
                medal = f"{idx + 1}TH PLACE (FINALIST)"
            else:
                medal = f"FINALIST ({idx + 1}TH)"

            rows.append((rank_display, lane_display, s['swimmer'], s['team'], time_display, seed_display, pts_display, medal))

        first = selected[0]
        first_pts = rows[0][6]
        winner_txt = f"WINNER: {first['swimmer']} ({format_time_str(first['finish_time'])}) | {first_pts} PTS"
        render_scoresheet(
            fname,
            ev_id,
            ev_title,
            "6th JESSE M. ROBREDO NATIONAL SWIM CUP",
            "DATE: AUGUST 21–22, 2026 | VENUE: NAGA CITY AQUATICS CENTER | SANCTIONED: COPA",
            winner_txt,
            rows
        )

    # SET 2: THE 8 INDIVIDUAL CHAMPIONSHIP DISCIPLINES (GIRLS 11-12 DIVISION)
    disciplines_8 = [
        (8, "Girls 11-12 100M Freestyle ABC Finals", "event08_girls_11-12_100m_freestyle.png"),
        (16, "Girls 11-12 50M Butterfly ABC Finals", "event16_girls_11-12_50m_butterfly.png"),
        (24, "Girls 11-12 100M Backstroke ABC Finals", "event24_girls_11-12_100m_backstroke.png"),
        (32, "Girls 11-12 100M Breaststroke ABC Finals", "event32_girls_11-12_100m_breaststroke.png"),
        (46, "Girls 11-12 200M Freestyle ABC Finals", "event46_girls_11-12_200m_freestyle.png"),
        (52, "Girls 11-12 50M Backstroke ABC Finals", "event52_girls_11-12_50m_backstroke.png"),
        (60, "Girls 11-12 50M Freestyle ABC Finals", "event60_girls_11-12_50m_freestyle.png"),
        (68, "Girls 11-12 50M Breaststroke ABC Finals", "event68_girls_11-12_50m_breaststroke.png"),
    ]

    for ev_id, ev_title, fname in disciplines_8:
        matching = [r for r in records if r['ev_num'] == ev_id and ('11-12' in r['ev_desc'] or r['age'] in [11, 12])]
        if not matching:
            matching = [r for r in records if r['ev_num'] == ev_id]
            
        matching.sort(key=lambda x: to_seconds(x['finish_time']))
        
        seen = set()
        unique_swimmers = []
        for m in matching:
            if m['swimmer'] not in seen:
                seen.add(m['swimmer'])
                unique_swimmers.append(m)

        selected = unique_swimmers[:12]
        if not selected:
            continue

        rows = []
        standard_pts = [25, 21, 18, 15, 12, 9, 6, 3, 0, 0, 0, 0]
        for idx, s in enumerate(selected):
            rank_display = f"#{idx + 1}"
            lane_display = str(lane_order[idx] if idx < len(lane_order) else idx + 1)
            time_display = format_time_str(s['finish_time'])
            seed_display = format_time_str(s['seed'])
            pts_val = s['pts'] if s['pts'] > 0 else (standard_pts[idx] if idx < len(standard_pts) else 0)
            pts_display = str(pts_val)
            
            if idx == 0:
                medal = "GOLD MEDAL (CLASS A)"
            elif idx == 1:
                medal = "SILVER MEDAL (CLASS A)"
            elif idx == 2:
                medal = "BRONZE MEDAL (CLASS A)"
            elif idx < 8:
                medal = f"{idx + 1}TH PLACE (FINALIST)"
            else:
                medal = f"FINALIST ({idx + 1}TH)"

            rows.append((rank_display, lane_display, s['swimmer'], s['team'], time_display, seed_display, pts_display, medal))

        first = selected[0]
        first_pts = rows[0][6]
        winner_txt = f"WINNER: {first['swimmer']} ({format_time_str(first['finish_time'])}) | {first_pts} PTS"
        render_scoresheet(
            fname,
            ev_id,
            ev_title,
            "6th JESSE M. ROBREDO NATIONAL SWIM CUP",
            "DATE: AUGUST 21–22, 2026 | VENUE: NAGA CITY AQUATICS CENTER | SANCTIONED: COPA",
            winner_txt,
            rows
        )

if __name__ == "__main__":
    main()
