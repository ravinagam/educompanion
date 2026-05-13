"""
EaseStudy Demo Video — Step-by-step walkthrough
Slides: Upload PDF, Processing, Sections View, Quiz, Flashcards, Ask AI, Dashboard/XP, Parent Portal, CTA
Voice: Microsoft AriaNeural
Output: EaseStudy-Demo.mp4
"""

import os, asyncio, subprocess, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import edge_tts
import imageio_ffmpeg

FFMPEG  = imageio_ffmpeg.get_ffmpeg_exe()
VOICE   = "en-US-AriaNeural"
RATE    = "+5%"
OUT_DIR = Path("video_out_demo")
OUT_DIR.mkdir(exist_ok=True)
W, H    = 1280, 720

# Colours
BLUE    = (37,  99, 235)
INDIGO  = (79,  70, 229)
VIOLET  = (124, 58, 237)
EMERALD = (16, 185, 129)
AMBER   = (245,158,  11)
TEAL    = (20, 184, 166)
DARK    = (15,  23,  42)
WHITE   = (255, 255, 255)
ORANGE  = (234,  88,  12)
ROSE    = (244,  63,  94)
PURPLE  = (147,  51, 234)
SLATE   = (71,   85, 105)
GRAY    = (107, 114, 128)
LIGHT   = (240, 242, 248)
PANEL   = (20,  28,  64)
BORDER  = (48,  68, 148)

# ── helpers ──────────────────────────────────────────────────────────────────
def font(size, bold=False):
    candidates = (
        ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/calibrib.ttf"] if bold
        else ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/calibri.ttf"]
    )
    for p in candidates:
        try: return ImageFont.truetype(p, size)
        except: pass
    return ImageFont.load_default()

def tw(draw, text, f):
    b = draw.textbbox((0, 0), text, font=f)
    return b[2]-b[0], b[3]-b[1]

def cx(draw, text, y, f, color=WHITE, wrap=0):
    if wrap:
        lines = textwrap.wrap(text, wrap)
        _, lh = tw(draw, "A", f)
        for i, ln in enumerate(lines):
            w, _ = tw(draw, ln, f)
            draw.text(((W-w)//2, y+i*(lh+8)), ln, font=f, fill=color)
        return y + len(lines)*(lh+8)
    w, h = tw(draw, text, f)
    draw.text(((W-w)//2, y), text, font=f, fill=color)
    return y + h

def grad(img, top, bot):
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y/H
        r = int(top[0]*(1-t)+bot[0]*t)
        g = int(top[1]*(1-t)+bot[1]*t)
        b = int(top[2]*(1-t)+bot[2]*t)
        d.line([(0, y), (W, y)], fill=(r, g, b))
    return ImageDraw.Draw(img)

def rr(draw, xy, r, fill=None, outline=None, ow=2):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=ow)

def pill(draw, x, y, text, bg, fg=WHITE, fsize=15):
    f = font(fsize)
    w, h = tw(draw, text, f)
    rr(draw, [x, y, x+w+24, y+h+10], 20, fill=bg)
    draw.text((x+12, y+5), text, font=f, fill=fg)
    return w + 24

def app_chrome(draw, active_tab="Upload"):
    """Sidebar + top bar chrome to make it look like the real app."""
    # Sidebar
    rr(draw, [0, 0, 220, H], 0, fill=(15, 21, 54))
    draw.line([(220, 0), (220, H)], fill=(36, 50, 110), width=1)
    # Logo
    lf = font(18, bold=True)
    draw.text((20, 18), "EaseStudy", font=lf, fill=WHITE)
    draw.text((20, 42), "by Bodhly", font=font(11), fill=(100, 120, 180))
    draw.line([(12, 62), (208, 62)], fill=(36, 50, 110), width=1)
    # Student badge
    draw.text((20, 72), "STUDENT", font=font(10), fill=(90, 110, 170))
    draw.text((20, 88), "Arjun", font=font(15, bold=True), fill=WHITE)
    draw.text((20, 108), "Class 10 · CBSE", font=font(11), fill=(120, 140, 190))
    draw.line([(12, 128), (208, 128)], fill=(36, 50, 110), width=1)
    # Nav items
    nav_items = [
        ("Dashboard", "/dashboard"),
        ("Upload Chapter", "/upload"),
        ("Study Planner", "/tests"),
        ("My Chapters", "/chapters"),
    ]
    for i, (label, _) in enumerate(nav_items):
        ny = 140 + i * 42
        is_active = label.startswith(active_tab.split()[0])
        if is_active:
            rr(draw, [8, ny-2, 212, ny+30], 10, fill=(30, 60, 140))
        col = WHITE if is_active else (150, 170, 220)
        draw.text((28, ny+4), label, font=font(13, bold=is_active), fill=col)
    # Top bar
    rr(draw, [220, 0, W, 56], 0, fill=(18, 24, 58))
    draw.line([(220, 56), (W, 56)], fill=(36, 50, 110), width=1)
    # Breadcrumb
    draw.text((238, 18), active_tab, font=font(14, bold=True), fill=WHITE)
    # XP bar area (top right)
    xp_text = "Level 3  ·  1,240 XP"
    xf = font(12)
    xw, _ = tw(draw, xp_text, xf)
    draw.text((W - xw - 80, 20), xp_text, font=xf, fill=(160, 180, 230))
    # Avatar
    rr(draw, [W-60, 12, W-12, 44], 16, fill=(37, 99, 235))
    draw.text((W-46, 18), "AR", font=font(13, bold=True), fill=WHITE)

def step_badge(draw, x, y, num, label, done=False, active=False):
    col = EMERALD if done else (BLUE if active else (50, 70, 130))
    rr(draw, [x, y, x+32, y+32], 16, fill=col)
    draw.text((x+9 if num < 10 else x+5, y+7), str(num), font=font(14, bold=True), fill=WHITE)
    draw.text((x+40, y+8), label, font=font(13, bold=active), fill=WHITE if active else (160, 180, 230))

slides = []

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 1 — UPLOAD PAGE: FILL IN THE FORM
# ══════════════════════════════════════════════════════════════════════════════
def draw_upload_form(img):
    d = grad(img, (10, 16, 52), (16, 24, 68))
    app_chrome(d, "Upload Chapter")

    # Main content area
    CX = 236  # content x start

    # Page title
    d.text((CX+16, 74), "Upload a Chapter", font=font(22, bold=True), fill=WHITE)
    d.text((CX+16, 102), "Upload a PDF, Word doc, or photos of your textbook to create your study toolkit.", font=font(13), fill=(160, 180, 230))

    # Mode toggle
    rr(d, [CX+16, 120, CX+300, 148], 12, fill=(20, 30, 80), outline=BORDER, ow=1)
    rr(d, [CX+18, 122, CX+160, 146], 10, fill=BLUE)
    d.text((CX+38, 128), "Upload File", font=font(12, bold=True), fill=WHITE)
    d.text((CX+172, 128), "Upload Screenshots", font=font(12), fill=(120, 140, 190))

    # Form card
    rr(d, [CX+16, 158, W-24, 680], 16, fill=PANEL, outline=BORDER, ow=1)

    # Subject selector
    d.text((CX+36, 174), "Subject", font=font(13, bold=True), fill=(180, 200, 240))
    rr(d, [CX+36, 194, W-44, 228], 10, fill=(14, 22, 62), outline=BORDER, ow=1)
    d.text((CX+52, 202), "Science", font=font(14), fill=WHITE)
    # dropdown arrow
    d.polygon([(W-72, 210), (W-52, 210), (W-62, 222)], fill=(100, 130, 200))

    # Chapter name
    d.text((CX+36, 244), "Chapter Name", font=font(13, bold=True), fill=(180, 200, 240))
    rr(d, [CX+36, 264, W-44, 298], 10, fill=(14, 22, 62), outline=BLUE, ow=2)
    d.text((CX+52, 272), "Chemical Reactions and Equations", font=font(14), fill=WHITE)
    # Cursor blink
    tw_txt, _ = tw(d, "Chemical Reactions and Equations", font(14))
    d.line([(CX+52+tw_txt+3, 272), (CX+52+tw_txt+3, 292)], fill=BLUE, width=2)

    # Drop zone
    rr(d, [CX+36, 314, W-44, 478], 14, fill=(14, 20, 58), outline=BORDER, ow=2)
    # dashed border effect
    for i in range(0, (W-44)-(CX+36), 20):
        x0 = CX+36+i
        if x0+12 < W-44:
            d.line([(x0, 314), (x0+10, 314)], fill=BORDER, width=2)
            d.line([(x0, 478), (x0+10, 478)], fill=BORDER, width=2)
    for i in range(0, 478-314, 20):
        y0 = 314+i
        if y0+12 < 478:
            d.line([(CX+36, y0), (CX+36, y0+10)], fill=BORDER, width=2)
            d.line([(W-44, y0), (W-44, y0+10)], fill=BORDER, width=2)

    # File icon in drop zone
    file_cx = (CX+36 + W-44)//2
    rr(d, [file_cx-36, 340, file_cx+36, 408], 10, fill=(24, 50, 120), outline=BLUE, ow=2)
    d.text((file_cx-22, 358), "PDF", font=font(18, bold=True), fill=BLUE)
    d.polygon([(file_cx+12, 340), (file_cx+36, 340), (file_cx+36, 356), (file_cx+12, 356)], fill=(14, 36, 90))
    d.polygon([(file_cx+12, 340), (file_cx+36, 356), (file_cx+12, 356)], fill=BLUE)

    drop_f = font(16, bold=True)
    drop_txt = "Drop your PDF or image here"
    dw, _ = tw(d, drop_txt, drop_f)
    d.text((file_cx - dw//2, 420), drop_txt, font=drop_f, fill=(140, 170, 220))
    sub_txt = "or click to browse  ·  PDF, DOCX, JPG, PNG accepted"
    sw, _ = tw(d, sub_txt, font(12))
    d.text((file_cx - sw//2, 448), sub_txt, font=font(12), fill=(90, 120, 180))

    # Upload button
    rr(d, [CX+36, 492, W-44, 534], 14, fill=BLUE)
    btn_f = font(18, bold=True)
    btn_txt = "Upload & Create Study Tools"
    bw, _ = tw(d, btn_txt, btn_f)
    d.text(((CX+36+W-44)//2 - bw//2, 502), btn_txt, font=btn_f, fill=WHITE)

    # Tip
    rr(d, [CX+36, 548, W-44, 578], 10, fill=(8, 48, 24), outline=EMERALD, ow=1)
    tip_f = font(13)
    tip_txt = "Tip: For a physical textbook, switch to 'Upload Screenshots' and snap each page with your phone camera."
    tiw, _ = tw(d, tip_txt, tip_f)
    d.text(((CX+36+W-44)//2 - tiw//2, 557), tip_txt, font=tip_f, fill=(130, 220, 160))

    # Step indicators
    steps = [("1","Fill the form", True, True), ("2","Upload file", False, False),
             ("3","Wait ~30s", False, False), ("4","Start studying", False, False)]
    sx = CX + 36
    for num, label, done, active in steps:
        rr(d, [sx, 598, sx+120, 632], 12, fill=(30, 60, 140) if active else (18, 26, 60), outline=BLUE if active else BORDER, ow=1)
        col = BLUE if active else (50, 70, 130)
        rr(d, [sx+8, 606, sx+26, 624], 10, fill=col)
        d.text((sx+12, 608), num, font=font(12, bold=True), fill=WHITE)
        d.text((sx+32, 609), label, font=font(11, bold=active), fill=WHITE if active else (130, 155, 210))
        sx += 132

slides.append(("upload_form",
    "Let's walk through exactly how EaseStudy works — step by step. "
    "First, click on 'Upload Chapter' in the left sidebar. "
    "You'll see this upload page. "
    "Start by selecting your subject from the dropdown — here we're choosing Science. "
    "Then type your chapter name — we'll use 'Chemical Reactions and Equations'. "
    "Now all you need to do is drag and drop your file into the drop zone. "
    "EaseStudy accepts PDF files, Word documents, and even photos of textbook pages. "
    "Once your file is added, hit the 'Upload and Create Study Tools' button. "
    "That's it — the AI takes over from here.",
    draw_upload_form))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 2 — PROCESSING SCREEN
# ══════════════════════════════════════════════════════════════════════════════
def draw_processing(img):
    d = grad(img, (10, 16, 52), (16, 24, 68))
    app_chrome(d, "Upload Chapter")

    CX = 236
    cx_mid = (CX + W) // 2

    # Card
    rr(d, [CX+40, 76, W-40, 660], 20, fill=PANEL, outline=BORDER, ow=2)

    # Chapter name header
    rr(d, [CX+40, 76, W-40, 126], 14, fill=BLUE)
    d.text((CX+64, 86), "Chemical Reactions and Equations", font=font(18, bold=True), fill=WHITE)
    d.text((CX+64, 110), "Science  ·  Class 10 CBSE  ·  Processing...", font=font(12), fill=(190, 220, 255))

    # Spinner / progress ring (simulated)
    d.ellipse([cx_mid-48, 144, cx_mid+48, 240], outline=BLUE, width=6)
    d.ellipse([cx_mid-48, 144, cx_mid+48, 240], outline=INDIGO, width=6)
    pct_f = font(28, bold=True)
    pct_txt = "68%"
    pw, _ = tw(d, pct_txt, pct_f)
    d.text((cx_mid - pw//2, 174), pct_txt, font=pct_f, fill=WHITE)
    d.text((cx_mid - 18, 210), "done", font=font(11), fill=(140, 160, 210))

    d.text((cx_mid - 120, 256), "Reading your document and building tools...", font=font(13), fill=(160, 180, 230))

    # Tool progress rows
    tools = [
        ("Summary",          True,  True,  EMERALD,  "Done",        "Chapter recap ready"),
        ("Flashcards",        True,  True,  EMERALD,  "Done",        "22 key terms extracted"),
        ("Quiz",              True,  False, BLUE,     "Building...", "Generating questions"),
        ("Video Lesson",      False, False, AMBER,    "Queued",      "Starts after quiz"),
        ("AI Tutor",          False, False, SLATE,    "Queued",      "Always available"),
    ]
    ty = 294
    for name, done, active, col, status, note in tools:
        bg = (col[0]//6, col[1]//6, col[2]//6) if done or active else (16, 22, 52)
        rr(d, [CX+60, ty, W-60, ty+52], 12, fill=bg, outline=col if (done or active) else BORDER, ow=2)
        # Status dot
        dot_col = EMERALD if done else (BLUE if active else SLATE)
        d.ellipse([CX+76, ty+16, CX+92, ty+32], fill=dot_col)
        # Name
        nf = font(15, bold=True)
        d.text((CX+104, ty+10), name, font=nf, fill=WHITE)
        # Note
        d.text((CX+104, ty+30), note, font=font(11), fill=(160, 185, 230))
        # Status badge
        stf = font(12, bold=True)
        stw, _ = tw(d, status, stf)
        rr(d, [W-stw-84, ty+14, W-stw-58, ty+36], 10, fill=dot_col)
        # Animated dots for active
        if active:
            for di in range(3):
                d.ellipse([W-80+di*16, ty+22, W-68+di*16, ty+34], fill=BLUE)
        elif done:
            d.text((W-76, ty+16), "✓ Done", font=stf, fill=EMERALD)
        else:
            d.text((W-78, ty+16), status, font=stf, fill=SLATE)
        ty += 62

    # ETA
    eta_txt = "Estimated time remaining: ~12 seconds"
    ew, _ = tw(d, eta_txt, font(13))
    d.text((cx_mid - ew//2, 620), eta_txt, font=font(13), fill=(140, 165, 220))

slides.append(("processing",
    "After you hit upload, EaseStudy gets to work immediately. "
    "It reads every word of your document — every paragraph, every definition, every concept. "
    "Watch as each study tool gets created one by one. "
    "The chapter summary is done first, then the flashcards, then the quiz. "
    "The video lesson is built last. "
    "The whole process takes about 30 seconds for a typical chapter. "
    "You don't need to do anything — just wait. "
    "As soon as everything is ready, you'll land directly on your chapter page.",
    draw_processing))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 3 — CHAPTER SECTIONS VIEW
# ══════════════════════════════════════════════════════════════════════════════
def draw_sections(img):
    d = grad(img, (10, 16, 52), (16, 24, 68))
    app_chrome(d, "My Chapters")

    CX = 236

    # Chapter header card
    rr(d, [CX+12, 68, W-12, 136], 14, fill=PANEL, outline=BORDER, ow=1)
    rr(d, [CX+12, 68, CX+12+8, 136], 4, fill=BLUE)
    d.text((CX+32, 78), "Chemical Reactions and Equations", font=font(18, bold=True), fill=WHITE)
    d.text((CX+32, 104), "Science  ·  Class 10 CBSE  ·  5 sections", font=font(12), fill=(160, 185, 230))
    # Progress bar
    rr(d, [CX+32, 118, W-32, 128], 5, fill=(24, 34, 80))
    rr(d, [CX+32, 118, CX+32+int((W-32-CX-32)*0.4), 128], 5, fill=BLUE)
    d.text((W-80, 114), "2 / 5 done", font=font(11), fill=(100, 160, 230))

    # Tool pills at top
    tools2 = [("Quiz", INDIGO), ("Flashcards", EMERALD), ("Video", VIOLET), ("Summary", AMBER), ("Ask AI", TEAL)]
    px2 = CX + 32
    for label, col in tools2:
        pw = pill(d, px2, 144, label, col, fsize=12)
        px2 += pw + 10

    # Sections list (left 55%)
    sec_right = CX + int((W - CX) * 0.56)
    sections = [
        ("1", "What is a Chemical Reaction?",     True,  True,  "Read · Quiz done  ·  +80 XP"),
        ("2", "Types of Chemical Reactions",       True,  True,  "Read · Flashcards done  ·  +35 XP"),
        ("3", "Oxidation and Reduction",           True,  False, "Reading in progress — 60%"),
        ("4", "Corrosion and Rancidity",           False, False, "Not started"),
        ("5", "Effects of Chemical Reactions",     False, False, "Not started"),
    ]
    sy = 178
    for num, title, done, done2, note in sections:
        is_active = num == "3"
        bg = (14, 52, 22) if done and done2 else ((16, 30, 72) if is_active else (14, 20, 56))
        border_col = EMERALD if (done and done2) else (BLUE if is_active else BORDER)
        rr(d, [CX+12, sy, sec_right-8, sy+72], 12, fill=bg, outline=border_col, ow=2)
        # Circle
        c_col = EMERALD if (done and done2) else (BLUE if is_active else SLATE)
        d.ellipse([CX+24, sy+20, CX+48, sy+44], fill=c_col)
        mark = "✓" if (done and done2) else num
        mf = font(14, bold=True)
        mw, _ = tw(d, mark, mf)
        d.text((CX+36-mw//2, sy+22), mark, font=mf, fill=WHITE)
        # Title
        d.text((CX+60, sy+12), title, font=font(14, bold=is_active), fill=WHITE)
        d.text((CX+60, sy+34), note, font=font(11), fill=(130, 200, 150) if (done and done2) else (140, 165, 215))
        # Continue button for active
        if is_active:
            rr(d, [sec_right-110, sy+20, sec_right-16, sy+50], 10, fill=BLUE)
            d.text((sec_right-102, sy+28), "Continue →", font=font(11, bold=True), fill=WHITE)
        sy += 82

    # Right panel — section preview
    rr(d, [sec_right+4, 178, W-12, 660], 14, fill=PANEL, outline=BORDER, ow=1)
    rr(d, [sec_right+4, 178, W-12, 214], 10, fill=INDIGO)
    d.text((sec_right+20, 186), "Section 3 — Reading View", font=font(13, bold=True), fill=WHITE)

    # Preview text lines
    preview_lines = [
        "Oxidation and Reduction",
        "",
        "Oxidation: A reaction where a substance",
        "gains oxygen or loses hydrogen.",
        "",
        "Reduction: A reaction where a substance",
        "loses oxygen or gains hydrogen.",
        "",
        "These two always occur together —",
        "called a REDOX reaction.",
    ]
    py = 224
    for line in preview_lines:
        if not line:
            py += 8
            continue
        is_heading = line == "Oxidation and Reduction"
        d.text((sec_right+18, py), line, font=font(13, bold=is_heading), fill=WHITE if is_heading else (190, 210, 245))
        py += 22

    # Reading progress bar
    rr(d, [sec_right+18, 494, W-28, 504], 5, fill=(24, 34, 80))
    rr(d, [sec_right+18, 494, sec_right+18+int((W-28-sec_right-18)*0.6), 504], 5, fill=BLUE)
    d.text((sec_right+18, 510), "60% read", font=font(11), fill=(100, 160, 230))

    # Mark complete button
    rr(d, [sec_right+18, 530, W-28, 562], 12, fill=EMERALD)
    mf2 = font(14, bold=True)
    mt = "✓ Mark Section Complete"
    mw2, _ = tw(d, mt, mf2)
    d.text(((sec_right+18+W-28)//2 - mw2//2, 539), mt, font=mf2, fill=WHITE)

slides.append(("sections",
    "Once processing is done, your chapter is open and ready. "
    "EaseStudy automatically splits it into sections — smaller, manageable pieces. "
    "Here you can see the five sections of the chapter on the left. "
    "The green tick means that section is fully done — read and tested. "
    "The blue section is the one currently being read. "
    "On the right is the reading view — clean, easy to follow text. "
    "Read through the section at your own pace. "
    "When you're done, hit 'Mark Section Complete' and move to the next one. "
    "Your progress is saved automatically — you can come back at any time and pick up exactly where you left off. "
    "The buttons at the top — Quiz, Flashcards, Video, Summary, Ask AI — are always one tap away.",
    draw_sections))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 4 — QUIZ
# ══════════════════════════════════════════════════════════════════════════════
def draw_quiz(img):
    d = grad(img, (12, 10, 52), (10, 8, 46))
    app_chrome(d, "My Chapters")

    CX = 236

    # Quiz header
    rr(d, [CX+12, 68, W-12, 116], 14, fill=INDIGO)
    d.text((CX+32, 76), "Quiz — Chemical Reactions and Equations", font=font(16, bold=True), fill=WHITE)
    # Progress
    for i in range(12):
        qx = CX+32 + i*52
        col = EMERALD if i < 4 else (BLUE if i == 4 else (30, 40, 90))
        rr(d, [qx, 100, qx+44, 110], 5, fill=col)

    # Score badge
    rr(d, [W-170, 72, W-20, 110], 14, fill=(14, 50, 24), outline=EMERALD, ow=2)
    d.text((W-158, 78), "Score: 3 / 4", font=font(13, bold=True), fill=EMERALD)
    d.text((W-154, 96), "75%  +60 XP so far", font=font(11), fill=(130, 210, 150))

    # Question card
    rr(d, [CX+12, 126, W-12, 240], 14, fill=PANEL, outline=BORDER, ow=1)
    d.text((CX+28, 136), "Question 5 of 12   ·   Medium", font=font(12), fill=(110, 134, 190))
    d.text((CX+28, 158), "What happens when iron is exposed to", font=font(17, bold=True), fill=WHITE)
    d.text((CX+28, 182), "moist air over a long period of time?", font=font(17, bold=True), fill=WHITE)
    d.text((CX+28, 210), "Choose the correct answer:", font=font(12), fill=(110, 134, 190))

    # Answer options (one correct, one wrong selected)
    options = [
        ("A", "It becomes lighter in weight",       False, False),
        ("B", "It forms rust — a reddish-brown oxide", True, False),
        ("C", "It dissolves into water",             False, True),
        ("D", "It turns into carbon dioxide",        False, False),
    ]
    oy = 252
    for k, text, correct, wrong in options:
        if correct:
            bg, bc, tc = (12, 60, 30), EMERALD, WHITE
        elif wrong:
            bg, bc, tc = (56, 14, 14), ROSE, WHITE
        else:
            bg, bc, tc = (16, 22, 64), BORDER, (190, 210, 245)
        rr(d, [CX+12, oy, W-12, oy+46], 12, fill=bg, outline=bc, ow=2)
        rr(d, [CX+24, oy+10, CX+46, oy+32], 8, fill=bc)
        d.text((CX+30, oy+12), k, font=font(13, bold=True), fill=WHITE)
        d.text((CX+58, oy+12), text, font=font(14), fill=tc)
        if correct:
            d.text((W-46, oy+12), "✓", font=font(18, bold=True), fill=EMERALD)
        elif wrong:
            d.text((W-44, oy+12), "✗", font=font(18, bold=True), fill=ROSE)
        oy += 54

    # XP earned
    rr(d, [CX+12, oy+12, CX+240, oy+42], 12, fill=INDIGO)
    d.text((CX+28, oy+20), "+80 XP on completion", font=font(13, bold=True), fill=WHITE)

    # Next button
    rr(d, [W-220, oy+12, W-12, oy+42], 12, fill=BLUE)
    d.text((W-208, oy+20), "Next Question →", font=font(13, bold=True), fill=WHITE)

slides.append(("quiz",
    "Let's take the quiz. Hit the Quiz button on your chapter and 12 questions appear — "
    "automatically created from exactly what you uploaded. "
    "The questions come in three levels: easy, medium, and hard. "
    "This question asks about what happens when iron is exposed to moist air. "
    "When you pick an answer, the result is shown immediately. "
    "Green means correct. Red means wrong. "
    "These are multiple choice questions built from your exact chapter content — "
    "not generic questions from the internet. "
    "Every quiz earns you 80 experience points, with a bonus for scoring above 80 percent. "
    "You can take the quiz as many times as you like — new questions are generated each time.",
    draw_quiz))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 5 — FLASHCARDS
# ══════════════════════════════════════════════════════════════════════════════
def draw_flashcards(img):
    d = grad(img, (10, 18, 50), (8, 28, 56))
    app_chrome(d, "My Chapters")

    CX = 236
    cx_mid = (CX + W) // 2

    # Header
    rr(d, [CX+12, 68, W-12, 112], 14, fill=EMERALD)
    d.text((CX+32, 76), "Flashcards — Chemical Reactions", font=font(16, bold=True), fill=WHITE)
    d.text((CX+32, 98), "22 cards  ·  8 known  ·  14 to review", font=font(12), fill=(200, 245, 225))

    # Progress bar
    rr(d, [CX+12, 118, W-12, 130], 6, fill=(16, 40, 26))
    rr(d, [CX+12, 118, CX+12+int((W-12-CX-12)*(8/22)), 130], 6, fill=EMERALD)
    d.text((W-96, 118), "8 / 22 known", font=font(10), fill=(100, 200, 140))

    # Main flashcard
    card_l, card_r = CX+40, W-40
    card_cx = (card_l + card_r)//2
    # Back of card (question side)
    rr(d, [card_l, 148, card_r, 400], 20, fill=(14, 22, 68), outline=EMERALD, ow=3)
    # FRONT label
    d.text((card_l+20, 162), "TERM", font=font(11, bold=True), fill=(100, 200, 150))
    # Term text
    term_f = font(28, bold=True)
    term = "Oxidation"
    tw2, _ = tw(d, term, term_f)
    d.text((card_cx - tw2//2, 220), term, font=term_f, fill=WHITE)
    # Flip hint
    flip_f = font(13)
    flip_txt = "Tap to reveal definition →"
    fw, _ = tw(d, flip_txt, flip_f)
    d.text((card_cx - fw//2, 370), flip_txt, font=flip_f, fill=(100, 170, 140))

    # Card "shadow" (second card behind)
    rr(d, [card_l+8, 156, card_r+8, 408], 20, fill=(10, 16, 50), outline=(30, 50, 100), ow=1)
    rr(d, [card_l, 148, card_r, 400], 20, fill=(14, 22, 68), outline=EMERALD, ow=3)

    # Re-draw term
    d.text((card_l+20, 162), "TERM", font=font(11, bold=True), fill=(100, 200, 150))
    d.text((card_cx - tw2//2, 220), term, font=term_f, fill=WHITE)
    # Small definition preview (revealed state — showing reverse)
    def_f = font(15)
    def_lines = [
        "A reaction where a substance",
        "gains oxygen or loses hydrogen.",
        "",
        "Example: Rusting of iron, burning of coal",
    ]
    dy = 280
    for line in def_lines:
        if line:
            lw3, _ = tw(d, line, def_f)
            d.text((card_cx - lw3//2, dy), line, font=def_f, fill=(190, 230, 210))
        dy += 28
    d.text((card_cx - fw//2, 370), flip_txt, font=flip_f, fill=(100, 170, 140))

    # Response buttons
    btn_y = 416
    rr(d, [card_l, btn_y, card_l+230, btn_y+46], 14, fill=(46, 16, 16), outline=ROSE, ow=2)
    rr(d, [card_l, btn_y, card_l+230, btn_y+46], 14, fill=(46, 16, 16), outline=ROSE, ow=2)
    still_txt = "✗  Still learning"
    stw3, _ = tw(d, still_txt, font(15, bold=True))
    d.text(((card_l + card_l+230)//2 - stw3//2, btn_y+12), still_txt, font=font(15, bold=True), fill=ROSE)

    rr(d, [card_r-230, btn_y, card_r, btn_y+46], 14, fill=(12, 48, 24), outline=EMERALD, ow=2)
    know_txt = "✓  I know this!"
    kw2, _ = tw(d, know_txt, font(15, bold=True))
    d.text(((card_r-230+card_r)//2 - kw2//2, btn_y+12), know_txt, font=font(15, bold=True), fill=EMERALD)

    # Stats row
    stats_y = 478
    for i, (val, label, col) in enumerate([
        ("8",  "Known",    EMERALD),
        ("14", "To Review", AMBER),
        ("22", "Total",    BLUE),
    ]):
        sx3 = card_l + i*(card_r-card_l)//3
        rr(d, [sx3+8, stats_y, sx3+(card_r-card_l)//3-8, stats_y+60], 12, fill=(16, 24, 60), outline=col, ow=1)
        vf2 = font(22, bold=True)
        vw2, _ = tw(d, val, vf2)
        d.text(((sx3+8+sx3+(card_r-card_l)//3-8)//2 - vw2//2, stats_y+8), val, font=vf2, fill=WHITE)
        lw4, _ = tw(d, label, font(11))
        d.text(((sx3+8+sx3+(card_r-card_l)//3-8)//2 - lw4//2, stats_y+36), label, font=font(11), fill=col)

    # XP tip
    rr(d, [CX+12, 552, W-12, 582], 10, fill=(16, 40, 16), outline=EMERALD, ow=1)
    xp_tip = "Marking a card 'Known' earns +5 XP  ·  Complete all 22 cards for a bonus +50 XP"
    xtw, _ = tw(d, xp_tip, font(12))
    d.text(((CX+12+W-12)//2 - xtw//2, 561), xp_tip, font=font(12), fill=(130, 210, 150))

slides.append(("flashcards",
    "Flashcards are perfect for remembering key terms and definitions. "
    "EaseStudy extracts every important term from your chapter and creates a card for each one. "
    "The front shows the term — here it's 'Oxidation'. "
    "Tap the card to flip it and see the definition. "
    "If you already know it, press 'I know this' and it moves to the known pile. "
    "If you're still learning it, press 'Still learning' and it comes back around. "
    "EaseStudy uses spaced repetition — the cards you find hard appear more often "
    "until you've truly mastered them. "
    "Every card you mark as known earns five experience points. "
    "Completing the full deck gives you a bonus. "
    "This takes just ten minutes and dramatically improves what you remember on exam day.",
    draw_flashcards))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 6 — ASK AI (TUTOR)
# ══════════════════════════════════════════════════════════════════════════════
def draw_ask_ai(img):
    d = grad(img, (8, 20, 52), (10, 28, 62))
    app_chrome(d, "My Chapters")

    CX = 236

    # Header
    rr(d, [CX+12, 68, W-12, 112], 14, fill=TEAL)
    d.text((CX+32, 76), "Ask AI — Your Chapter Tutor", font=font(16, bold=True), fill=WHITE)
    d.text((CX+32, 98), "Only knows this chapter  ·  Always available  ·  +5 XP per question", font=font(12), fill=(200, 245, 240))

    # Chat window
    rr(d, [CX+12, 118, W-12, 560], 14, fill=PANEL, outline=BORDER, ow=1)

    # Message bubbles
    msgs = [
        ("student", "What exactly is a redox reaction? Explain simply."),
        ("ai",      "A redox reaction always has two parts happening at the same time:\n"
                    "• Oxidation — one substance loses electrons (or gains oxygen)\n"
                    "• Reduction — another substance gains those electrons (or loses oxygen)\n\n"
                    "Simple example: When copper oxide (CuO) is heated with hydrogen gas (H₂),\n"
                    "hydrogen gets oxidised → H₂O is formed\n"
                    "copper oxide gets reduced → pure copper (Cu) is left\n\n"
                    "They always occur together — you can't have one without the other."),
        ("student", "Can this come in the board exam?"),
        ("ai",      "Yes — very likely. CBSE board papers regularly ask:\n"
                    "• Define oxidation and reduction with an example\n"
                    "• Identify the oxidising and reducing agents in a given reaction\n"
                    "• Give one example of a redox reaction from daily life\n\n"
                    "Tip: Remember 'OIL RIG' — Oxidation Is Loss, Reduction Is Gain of electrons."),
    ]

    my = 130
    for sender, text in msgs:
        is_student = sender == "student"
        lines3 = text.split('\n')
        max_w = int((W-12-CX-12) * 0.72)
        f3 = font(13)
        lh3 = 20
        total_h = len(lines3) * lh3 + 20
        if is_student:
            bx = W-12-max_w-12
            rr(d, [bx, my, W-24, my+total_h], 12, fill=BLUE)
            for li, line in enumerate(lines3):
                d.text((bx+12, my+8+li*lh3), line, font=f3, fill=WHITE)
        else:
            bx = CX+24
            rr(d, [bx, my, bx+max_w, my+total_h], 12, fill=(18, 32, 72), outline=TEAL, ow=1)
            # AI dot
            d.ellipse([bx-18, my+8, bx-4, my+22], fill=TEAL)
            for li, line in enumerate(lines3):
                col3 = (130, 220, 210) if line.startswith("•") else (190, 215, 245)
                d.text((bx+12, my+8+li*lh3), line, font=f3, fill=col3)
        my += total_h + 12

    # Input bar
    rr(d, [CX+12, 568, W-12, 612], 14, fill=(16, 26, 68), outline=TEAL, ow=2)
    d.text((CX+30, 582), "Ask anything about this chapter...", font=font(13), fill=(80, 120, 180))
    rr(d, [W-80, 574, W-20, 606], 12, fill=TEAL)
    af = font(13, bold=True)
    aw, _ = tw(d, "Ask", af)
    d.text(((W-80+W-20)//2 - aw//2, 583), "Ask", font=af, fill=WHITE)

    # Starter chips
    chips = ["Explain with example", "What might come in exam?", "Simplify this concept"]
    cx4 = CX + 24
    for chip in chips:
        rr(d, [cx4, 622, cx4+len(chip)*8+24, 646], 12, fill=(16, 36, 72), outline=TEAL, ow=1)
        d.text((cx4+12, 628), chip, font=font(11), fill=(120, 200, 200))
        cx4 += len(chip)*8 + 36

slides.append(("ask_ai",
    "The Ask AI tutor is one of the most powerful features. "
    "It's a personal AI that has read your exact chapter — and only your chapter. "
    "You can ask it anything. "
    "Here a student asks what a redox reaction is. "
    "The AI gives a clear, simple explanation with a real example from the chapter. "
    "Then the student asks if it could come in the board exam — "
    "and the AI lists the exact types of questions CBSE asks, and gives a memory trick. "
    "You can ask it to explain a concept, give an example, compare two terms, "
    "predict exam questions, or simplify something that confused you. "
    "It never gives answers from outside your chapter — "
    "so every answer is relevant and based on what you are studying. "
    "Asking a question earns five experience points.",
    draw_ask_ai))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 7 — DASHBOARD / PROGRESS
# ══════════════════════════════════════════════════════════════════════════════
def draw_dashboard(img):
    d = grad(img, (10, 16, 52), (14, 22, 60))
    app_chrome(d, "Dashboard")

    CX = 236

    # Welcome
    d.text((CX+16, 72), "Good evening, Arjun!", font=font(20, bold=True), fill=WHITE)
    d.text((CX+16, 100), "You've studied for 3 days in a row — keep it up for a 2× XP boost!", font=font(13), fill=(160, 185, 230))

    # KPI row
    kpis2 = [
        ("Level 3",    "Current Level",    "1,240 XP total",     BLUE),
        ("🔥 7 days",  "Study Streak",     "Best: 12 days",      ORANGE),
        ("78%",        "Quiz Average",     "Across all chapters",INDIGO),
        ("22",         "Flashcards Known", "This chapter",       EMERALD),
    ]
    kw2 = (W - CX - 40 - 3*12) // 4
    for i, (val, label, sub, col) in enumerate(kpis2):
        kx = CX + 16 + i*(kw2+12)
        rr(d, [kx, 124, kx+kw2, 190], 14, fill=(col[0]//6, col[1]//6, col[2]//6), outline=col, ow=2)
        vf3 = font(22, bold=True)
        vw3, _ = tw(d, val, vf3)
        d.text((kx+(kw2-vw3)//2, 133), val, font=vf3, fill=WHITE)
        lw5, _ = tw(d, label, font(11))
        d.text((kx+(kw2-lw5)//2, 160), label, font=font(11), fill=col)

    # XP progress card
    rr(d, [CX+16, 202, CX+16+int((W-CX-40)*0.55), 350], 14, fill=PANEL, outline=BORDER, ow=1)
    d.text((CX+32, 214), "XP Progress to Level 4", font=font(14, bold=True), fill=WHITE)
    # XP bar
    total_xp, next_xp = 1240, 1500
    prog = (total_xp-1000)/(next_xp-1000)
    rr(d, [CX+32, 244, CX+32+int((W-CX-40)*0.55)-32, 264], 8, fill=(20, 30, 80))
    rr(d, [CX+32, 244, CX+32+int((W-CX-40)*0.55*prog), 264], 8, fill=BLUE)
    d.text((CX+32, 272), f"{total_xp} XP  /  {next_xp} XP needed", font=font(12), fill=(140, 170, 230))
    d.text((CX+32, 294), f"{next_xp-total_xp} XP to Level 4", font=font(12), fill=(100, 140, 200))
    # Streak multiplier
    rr(d, [CX+32, 316, CX+180, 342], 10, fill=ORANGE)
    d.text((CX+44, 322), "7-day streak = 2× XP!", font=font(13, bold=True), fill=WHITE)

    # Reward milestone card
    rr(d, [CX+16+int((W-CX-40)*0.55)+12, 202, W-12, 350], 14, fill=PANEL, outline=AMBER, ow=2)
    d.text((CX+16+int((W-CX-40)*0.55)+28, 214), "Next Reward Milestone", font=font(14, bold=True), fill=WHITE)
    rr(d, [CX+16+int((W-CX-40)*0.55)+28, 244, W-28, 280], 10, fill=(36, 26, 6), outline=AMBER, ow=1)
    d.text((CX+16+int((W-CX-40)*0.55)+40, 252), "2,500 XP → ₹100 Amazon Voucher", font=font(13, bold=True), fill=AMBER)
    # Progress
    rew_prog = total_xp/2500
    rr(d, [CX+16+int((W-CX-40)*0.55)+28, 290, W-28, 302], 5, fill=(20, 30, 60))
    rr(d, [CX+16+int((W-CX-40)*0.55)+28, 290, CX+16+int((W-CX-40)*0.55)+28+int((W-28-CX-16-int((W-CX-40)*0.55)-28)*rew_prog), 302], 5, fill=AMBER)
    d.text((CX+16+int((W-CX-40)*0.55)+28, 308), f"{total_xp} / 2500 XP  ·  {2500-total_xp} XP to go", font=font(11), fill=(180, 150, 80))

    # Chapter progress
    rr(d, [CX+16, 362, W-12, 520], 14, fill=PANEL, outline=BORDER, ow=1)
    d.text((CX+32, 374), "Chapter Progress", font=font(14, bold=True), fill=WHITE)
    chaps = [
        ("Chemical Reactions",  2, 5, BLUE),
        ("Electricity",         5, 5, EMERALD),
        ("Light — Reflection",  1, 4, VIOLET),
    ]
    cy2 = 400
    for chap, done2, total2, col2 in chaps:
        d.text((CX+32, cy2), chap, font=font(13), fill=WHITE)
        prog2 = done2/total2
        rr(d, [CX+32, cy2+22, W-32, cy2+34], 6, fill=(20, 30, 80))
        rr(d, [CX+32, cy2+22, CX+32+int((W-32-CX-32)*prog2), cy2+34], 6, fill=col2)
        d.text((W-70, cy2+18), f"{done2}/{total2}", font=font(11), fill=col2)
        cy2 += 48

    # Today's plan
    rr(d, [CX+16, 532, W-12, 640], 14, fill=(14, 34, 18), outline=EMERALD, ow=1)
    d.text((CX+32, 542), "Today's Study Nudge", font=font(14, bold=True), fill=EMERALD)
    d.text((CX+32, 566), "Continue Section 3 of Chemical Reactions  ·  Take the quiz to unlock bonus XP", font=font(13), fill=(170, 230, 185))
    rr(d, [CX+32, 596, CX+200, 624], 10, fill=EMERALD)
    d.text((CX+44, 602), "Continue Now →", font=font(13, bold=True), fill=WHITE)

slides.append(("dashboard",
    "The Dashboard is your study home screen. "
    "It shows everything that matters at a glance. "
    "Your current level, streak, quiz average, and how many flashcards you've mastered. "
    "The XP progress bar shows exactly how far you are from the next level. "
    "And in the top right — your next Amazon voucher milestone. "
    "Right now Arjun has 1,240 XP and needs just 1,260 more for a 100 rupee Amazon voucher. "
    "Below that, chapter-by-chapter progress shows which chapters are fully done "
    "and which still need work. "
    "At the bottom, EaseStudy gives a study nudge — "
    "one specific thing to do today to keep your progress moving. "
    "The more you use EaseStudy, the more clearly you can see yourself improving. "
    "Every chapter you complete, every quiz you ace, every flashcard you master — "
    "it all builds towards real rewards and real exam readiness.",
    draw_dashboard))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 8 — PARENT PORTAL
# ══════════════════════════════════════════════════════════════════════════════
def draw_parent_portal(img):
    d = grad(img, (245, 247, 255), (235, 240, 255))

    # Sidebar (light theme)
    rr(d, [0, 0, 220, H], 0, fill=(255, 255, 255))
    d.line([(220, 0), (220, H)], fill=(220, 225, 240), width=1)
    # Logo
    lf = font(17, bold=True)
    d.text((20, 18), "EaseStudy", font=lf, fill=(30, 40, 100))
    d.text((20, 40), "Parent Portal", font=font(11), fill=(100, 120, 180))
    d.line([(12, 60), (208, 60)], fill=(220, 225, 240), width=1)
    # Parent info
    d.text((20, 72), "PARENT", font=font(10), fill=(140, 155, 190))
    d.text((20, 88), "Priya Sharma", font=font(14, bold=True), fill=(30, 40, 100))
    d.text((20, 108), "Arjun's Parent", font=font(11), fill=(130, 145, 185))
    d.line([(12, 126), (208, 126)], fill=(220, 225, 240), width=1)
    # Nav
    nav_p = [("My Children", True), ("Activity Log", False), ("Reports", False)]
    for i, (label, active) in enumerate(nav_p):
        ny = 138 + i * 40
        if active:
            rr(d, [8, ny, 212, ny+30], 10, fill=(237, 241, 255))
        col_n = (37, 99, 235) if active else (80, 95, 140)
        d.text((28, ny+7), label, font=font(13, bold=active), fill=col_n)
    # Logout
    d.text((28, H-36), "Sign Out", font=font(12), fill=(180, 60, 60))

    CX = 236
    # Top bar
    rr(d, [CX, 0, W, 52], 0, fill=(255, 255, 255))
    d.line([(CX, 52), (W, 52)], fill=(220, 225, 240), width=1)
    d.text((CX+16, 14), "Arjun's Study Dashboard", font=font(16, bold=True), fill=(20, 30, 90))
    # Last active badge
    rr(d, [W-220, 12, W-16, 38], 10, fill=(236, 253, 245), outline=(52, 211, 153), ow=1)
    d.text((W-208, 17), "Last active: Today  ✓", font=font(12), fill=(6, 120, 80))

    # Student card
    rr(d, [CX+12, 62, W-12, 108], 12, fill=(255, 255, 255), outline=(220, 225, 240), ow=1)
    rr(d, [CX+12, 62, CX+20, 108], 4, fill=(37, 99, 235))
    d.text((CX+30, 70), "Arjun Sharma", font=font(15, bold=True), fill=(20, 30, 90))
    d.text((CX+30, 90), "Class 10 · CBSE  ·  Level 3  ·  517 XP total  ·  3-day streak 🔥", font=font(11), fill=(100, 115, 160))

    # KPI grid — 5 cards, 2 rows
    kpis_p = [
        ("78%",   "Performance Score",   "Avg quiz score",       (37,  99, 235), "Good",        (219,234,254), (37, 99,235)),
        ("+5%",   "Weekly Improvement",  "vs last week",         (16, 185,129), "Excellent",    (209,250,229), (16,185,129)),
        ("70%",   "Study Consistency",   "21 of 30 days active", (245,158, 11), "Good",         (254,243,199), (245,158,11)),
        ("65%",   "Exam Readiness",      "3 of 5 chapters",      (124, 58,237), "Moderate",     (237,233,254), (124,58,237)),
        ("3d",    "Study Streak",        "consecutive days",     (239, 68, 68), "Good",         (254,226,226), (239,68, 68)),
    ]
    kcard_w = (W - CX - 24 - 4*8) // 5
    kx_p = CX + 12
    for val, label, sub, col, status, badge_bg, badge_fg in kpis_p:
        rr(d, [kx_p, 116, kx_p+kcard_w, 210], 12, fill=(255,255,255), outline=(220,225,240), ow=1)
        # Status badge
        rr(d, [kx_p+8, 124, kx_p+kcard_w-8, 142], 8, fill=badge_bg)
        sw, _ = tw(d, status, font(10, bold=True))
        d.text(((kx_p+8+kx_p+kcard_w-8)//2 - sw//2, 128), status, font=font(10, bold=True), fill=badge_fg)
        # Value
        vf_p = font(20, bold=True)
        vw_p, _ = tw(d, val, vf_p)
        d.text((kx_p + (kcard_w-vw_p)//2, 148), val, font=vf_p, fill=col)
        # Label
        lw_p, _ = tw(d, label, font(10))
        d.text((kx_p + (kcard_w-lw_p)//2, 175), label, font=font(10), fill=(80, 95, 140))
        # Sub
        sw2, _ = tw(d, sub, font(9))
        d.text((kx_p + (kcard_w-sw2)//2, 192), sub, font=font(9), fill=(140, 155, 190))
        kx_p += kcard_w + 8

    # Main content: 2 columns
    col1_r = CX + int((W - CX) * 0.55)

    # ── Left: Recent Activity ──
    rr(d, [CX+12, 218, col1_r-4, 500], 12, fill=(255,255,255), outline=(220,225,240), ow=1)
    rr(d, [CX+12, 218, col1_r-4, 248], 10, fill=(37, 99, 235))
    d.text((CX+24, 226), "What Arjun Studied This Week", font=font(13, bold=True), fill=WHITE)

    activities = [
        ("Today",      "Chemical Reactions · Section 3", "Quiz: 8/10 · 80%", EMERALD, True),
        ("Yesterday",  "Electricity · Section 5",        "Flashcards: 18/22 known", BLUE,  True),
        ("Mon",        "Light — Reflection · Section 2", "Quiz: 6/10 · 60%", AMBER, False),
        ("Sun",        "Chemical Reactions · Section 2", "Section completed ✓",    VIOLET,False),
    ]
    ay = 256
    for day, chapter, result, col_a, good in activities:
        rr(d, [CX+20, ay, col1_r-12, ay+46], 8,
           fill=(236,253,245) if good else (255,251,235),
           outline=(209,250,229) if good else (254,243,199), ow=1)
        # Day pill
        rr(d, [CX+28, ay+8, CX+70, ay+28], 8, fill=col_a)
        dw, _ = tw(d, day, font(10, bold=True))
        d.text(((CX+28+CX+70)//2-dw//2, ay+11), day, font=font(10, bold=True), fill=WHITE)
        d.text((CX+80, ay+6), chapter, font=font(12, bold=True), fill=(25,35,90))
        d.text((CX+80, ay+24), result, font=font(11), fill=(80,95,140))
        ay += 54

    # ── Right: AI Insights ──
    rr(d, [col1_r+4, 218, W-12, 500], 12, fill=(255,255,255), outline=(220,225,240), ow=1)
    rr(d, [col1_r+4, 218, W-12, 248], 10, fill=(124, 58, 237))
    d.text((col1_r+16, 226), "AI Insights for Parents", font=font(13, bold=True), fill=WHITE)

    insights = [
        ("Strong", "Consistent daily study — 3-day streak active"),
        ("Watch",  "Quiz score dropped 15% on Electricity chapter"),
        ("Tip",    "Flashcard retention at 70% — review before exam"),
        ("Good",   "On track for Chemical Reactions exam next week"),
    ]
    tag_colors = {
        "Strong": ((16,185,129), (209,250,229)),
        "Watch":  ((239, 68, 68), (254,226,226)),
        "Tip":    ((245,158, 11), (254,243,199)),
        "Good":   ((37,  99,235), (219,234,254)),
    }
    iy = 256
    for tag, text in insights:
        col_t, bg_t = tag_colors[tag]
        rr(d, [col1_r+12, iy, W-20, iy+44], 8, fill=bg_t, outline=col_t, ow=1)
        rr(d, [col1_r+18, iy+8, col1_r+62, iy+28], 8, fill=col_t)
        tw3, _ = tw(d, tag, font(9, bold=True))
        d.text(((col1_r+18+col1_r+62)//2-tw3//2, iy+12), tag, font=font(9, bold=True), fill=WHITE)
        wrapped = textwrap.wrap(text, 28)
        for wi, wl in enumerate(wrapped):
            d.text((col1_r+70, iy+8+wi*18), wl, font=font(11), fill=(25,35,90))
        iy += 52

    # Refresh insights button
    rr(d, [col1_r+12, iy+8, W-20, iy+36], 8, fill=(237,233,254), outline=(124,58,237), ow=1)
    bt, _ = tw(d, "✦ Refresh AI Insights", font(11, bold=True))
    d.text(((col1_r+12+W-20)//2-bt//2, iy+16), "✦ Refresh AI Insights", font=font(11, bold=True), fill=(124,58,237))

    # Bottom: Exam alert
    rr(d, [CX+12, 508, W-12, 560], 12, fill=(255,251,235), outline=(245,158,11), ow=2)
    d.text((CX+28, 516), "Upcoming Exam Alert", font=font(13, bold=True), fill=(180, 100, 0))
    d.text((CX+28, 538), "Science exam in 5 days  ·  Arjun has completed 2 of 5 chapters  ·  Recommend: study tonight!", font=font(12), fill=(120, 70, 0))

    # Register nudge
    rr(d, [CX+12, 568, W-12, 620], 12, fill=(249,250,255), outline=(79,70,229), ow=1)
    d.text((CX+28, 576), "Not a parent yet?", font=font(13, bold=True), fill=(79,70,229))
    d.text((CX+28, 598), "Visit easestudy.in/parent-login → Sign Up Free → Enter your child's phone number. Done in 30 seconds.", font=font(11), fill=(80, 90, 160))

slides.append(("parent_portal",
    "EaseStudy isn't just for students — parents have their own dedicated portal. "
    "Once you register with your child's phone number, you can see everything they're doing. "
    "This is the parent dashboard for Arjun's account. "
    "At the top you can see five key metrics: "
    "Arjun's quiz average is 78 percent, he improved 5 percent this week, "
    "he's been studying 70 percent of days, his exam readiness is 65 percent, "
    "and he has a 3-day study streak. "
    "On the left, the activity log shows exactly what he studied each day — "
    "which chapter, which section, and his quiz score. "
    "Today he scored 8 out of 10 on Chemical Reactions. "
    "On the right, the AI generates personalised insights for parents — "
    "what's going well, what needs attention, and specific tips for exam preparation. "
    "There's also an exam alert showing that the Science exam is in 5 days "
    "and Arjun has only covered 2 of 5 chapters — so parents know when to step in. "
    "To register, go to easestudy dot in slash parent dash login and sign up free. "
    "Register with your own phone number and link your child's account — it takes 30 seconds.",
    draw_parent_portal))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 9 — CTA: START NOW
# ══════════════════════════════════════════════════════════════════════════════
def draw_cta(img):
    d = grad(img, (8, 12, 48), (20, 10, 64))

    # Logo
    lf = font(34, bold=True)
    lw3, _ = tw(d, "easestudy", lf)
    px3 = (W - lw3 - 56)//2
    rr(d, [px3, 52, px3+lw3+56, 114], 28, fill=WHITE)
    d.text((px3+28, 62), "easestudy", font=lf, fill=DARK)

    cx(d, "You've seen how it works.", 138, font(38, bold=True))
    cx(d, "Now try it — upload your first chapter free.", 190, font(20), (172, 184, 255))

    # Steps recap row
    step_items = [
        ("1", "Open Upload Chapter", BLUE),
        ("2", "Fill in subject + chapter name", INDIGO),
        ("3", "Drop in your PDF or photo", VIOLET),
        ("4", "Hit Upload — done in 30s", EMERALD),
    ]
    sx4 = 60
    for num, label, col in step_items:
        box_r = sx4 + (W-120)//4 - 8
        rr(d, [sx4, 236, box_r, 304], 14, fill=(col[0]//5, col[1]//5, col[2]//5), outline=col, ow=2)
        rr(d, [sx4+12, 248, sx4+36, 272], 12, fill=col)
        d.text((sx4+17, 250), num, font=font(14, bold=True), fill=WHITE)
        wrap_l = textwrap.wrap(label, 18)
        for wi, wl in enumerate(wrap_l):
            d.text((sx4+48, 248+wi*22), wl, font=font(13), fill=WHITE)
        sx4 += (W-120)//4 + 4

    # Big CTA button
    rr(d, [(W-420)//2, 324, (W+420)//2, 384], 20, fill=BLUE)
    cta_f = font(22, bold=True)
    cta_txt = "Go to easestudy.in →"
    ctw, _ = tw(d, cta_txt, cta_f)
    d.text(((W-ctw)//2, 340), cta_txt, font=cta_f, fill=WHITE)

    # What you get
    cx(d, "Your quiz, flashcards, video, summary and AI tutor — ready in 30 seconds.", 404, font(15), (160, 185, 230))

    # Trust badges
    badges = [("Free — No Credit Card", EMERALD), ("Class 7–12 · All Boards", INDIGO),
              ("Works on Mobile", TEAL), ("Hindi in Hindi", AMBER)]
    bx2 = (W - sum(pill(d, -9999, 0, t, c, fsize=14) for t, c in badges) - 12*3)//2
    for label, col in badges:
        pw2 = pill(d, bx2, 444, label, col, fsize=14)
        bx2 += pw2 + 12

    # Parent reminder
    rr(d, [80, 484, W-80, 540], 14, fill=(20, 10, 54), outline=VIOLET, ow=2)
    d.text((100, 494), "Parents:", font=font(15, bold=True), fill=VIOLET)
    d.text((180, 497), "Visit  easestudy.in/parent-login  to track your child's progress.", font=font(14), fill=(200, 190, 255))
    d.text((180, 518), "Register with your phone number and link your child's account — takes 30 seconds.", font=font(13), fill=(160, 150, 220))

    # Bottom tagline
    cx(d, "Start with one chapter. See the difference.", 568, font(18, bold=True), (190, 200, 255))
    cx(d, "easestudy.in", 602, font(24, bold=True), BLUE)

slides.append(("cta",
    "That's the complete EaseStudy experience — from upload to exam-ready. "
    "Upload your chapter, wait 30 seconds, and you have a quiz, flashcards, video lesson, "
    "chapter summary, and personal AI tutor — all built from your exact content. "
    "Study at your own pace, track your progress on the dashboard, "
    "and earn real Amazon gift vouchers just for studying consistently. "
    "To get started, go to easestudy dot in, create a free account, "
    "and upload your first chapter today. "
    "If you're a parent, visit easestudy dot in slash parent dash login, "
    "register with your own phone number, and link your child's account. "
    "It's free. It works on any phone or computer. No app download needed. "
    "Start with just one chapter and see the difference for yourself.",
    draw_cta))

# ══════════════════════════════════════════════════════════════════════════════
# RENDER FRAMES
# ══════════════════════════════════════════════════════════════════════════════
print(f"\n{'='*60}")
print(f"  EaseStudy Demo Video — {len(slides)} slides")
print(f"{'='*60}")
print("\n-- Rendering frames --")
frame_paths = []
for i, (name, narration, draw_fn) in enumerate(slides):
    img = Image.new("RGB", (W, H), DARK)
    draw_fn(img)
    fp = OUT_DIR / f"{i:02d}_{name}.png"
    img.save(str(fp))
    frame_paths.append(str(fp))
    print(f"  [{i+1}/{len(slides)}] {name}.png")

# ══════════════════════════════════════════════════════════════════════════════
# NARRATION
# ══════════════════════════════════════════════════════════════════════════════
print("\n-- Generating narration audio --")
audio_paths = []

async def gen_audio(text, path):
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE, pitch="+2Hz")
    await communicate.save(path)

async def gen_all():
    for i, (name, narration, _) in enumerate(slides):
        ap = str(OUT_DIR / f"{i:02d}_{name}.mp3")
        await gen_audio(narration, ap)
        audio_paths.append(ap)
        print(f"  [{i+1}/{len(slides)}] {name}.mp3")

asyncio.run(gen_all())

# ══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE
# ══════════════════════════════════════════════════════════════════════════════
def get_duration(ap):
    r = subprocess.run([FFMPEG, "-i", ap, "-f", "null", "-"], capture_output=True, text=True)
    for line in (r.stdout+r.stderr).split("\n"):
        if "Duration:" in line:
            p = line.strip().split("Duration:")[1].split(",")[0].strip()
            h, m, s = p.split(":"); return float(h)*3600 + float(m)*60 + float(s)
    return 8.0

print("\n-- Building video clips --")
clip_paths = []
total_dur = 0
for i, (fp, ap) in enumerate(zip(frame_paths, audio_paths)):
    dur = get_duration(ap) + 1.0
    dur = max(dur, 8.0)
    total_dur += dur
    cp = str(OUT_DIR / f"{i:02d}_clip.mp4")
    subprocess.run([
        FFMPEG, "-y", "-loop", "1", "-i", fp, "-i", ap,
        "-c:v", "libx264", "-tune", "stillimage",
        "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p", "-t", str(dur),
        "-vf", "scale=1280:720", cp
    ], check=True, capture_output=True)
    clip_paths.append(cp)
    print(f"  [{i+1}/{len(slides)}] {Path(cp).name}  ({dur:.1f}s)")

print(f"\n  Total: {total_dur:.0f}s (~{total_dur/60:.1f} min)")

concat_file = str(OUT_DIR / "concat.txt")
with open(concat_file, "w") as f:
    for cp in clip_paths:
        f.write(f"file '{os.path.abspath(cp).replace(chr(92), '/')}'\n")

out = "EaseStudy-Demo-v3.mp4"
print(f"\n-- Concatenating -> {out} --")
subprocess.run([
    FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", concat_file, "-c", "copy", out
], check=True, capture_output=True)

sz = os.path.getsize(out)/1024/1024
r2 = subprocess.run([FFMPEG, "-i", out, "-f", "null", "-"], capture_output=True, text=True)
for line in (r2.stdout+r2.stderr).split("\n"):
    if "Duration:" in line:
        dur_str = line.strip().split("Duration:")[1].split(",")[0].strip()
        print(f"\n{'='*60}")
        print(f"  Done!  {out}")
        print(f"  Duration: {dur_str}  |  Size: {sz:.1f} MB")
        print(f"{'='*60}\n")
        break
