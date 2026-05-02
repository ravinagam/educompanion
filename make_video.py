"""
EaseStudy feature video — 2-3 minutes.
Slides: Hero, Upload+Dashboard, Quiz+Flashcards, Summary+Ask AI, Study Planner, CTA
Voice: Microsoft AriaNeural (+10% rate)
"""

import os, asyncio, subprocess, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import edge_tts
import imageio_ffmpeg

FFMPEG  = imageio_ffmpeg.get_ffmpeg_exe()
VOICE   = "en-US-AriaNeural"
RATE    = "+10%"
OUT_DIR = Path("video_out")
OUT_DIR.mkdir(exist_ok=True)
W, H    = 1280, 720

# ── Colours ───────────────────────────────────────────────────────────────────
BLUE    = (37,  99, 235)
INDIGO  = (79,  70, 229)
VIOLET  = (124, 58, 237)
EMERALD = (16, 185, 129)
AMBER   = (245,158,  11)
TEAL    = (20, 184, 166)
DARK    = (15,  23,  42)
WHITE   = (255,255,255)
PINK    = (236,  72, 153)

# ── Font helpers ──────────────────────────────────────────────────────────────
def font(size, bold=False):
    candidates = (
        ["C:/Windows/Fonts/arialbd.ttf","C:/Windows/Fonts/calibrib.ttf"]
        if bold else
        ["C:/Windows/Fonts/arial.ttf","C:/Windows/Fonts/calibri.ttf"]
    )
    for p in candidates:
        try: return ImageFont.truetype(p, size)
        except: pass
    return ImageFont.load_default()

def tw(draw, text, f):
    b = draw.textbbox((0,0), text, font=f)
    return b[2]-b[0], b[3]-b[1]

def cx(draw, text, y, f, color=WHITE, wrap=0):
    if wrap:
        lines = textwrap.wrap(text, wrap)
        _, lh = tw(draw, "A", f)
        for i, ln in enumerate(lines):
            w,_ = tw(draw, ln, f)
            draw.text(((W-w)//2, y+i*(lh+7)), ln, font=f, fill=color)
        return y + len(lines)*(lh+7)
    w, h = tw(draw, text, f)
    draw.text(((W-w)//2, y), text, font=f, fill=color)
    return y+h

def grad(img, top, bot):
    d = ImageDraw.Draw(img)
    for y in range(H):
        t=y/H; r=int(top[0]*(1-t)+bot[0]*t); g=int(top[1]*(1-t)+bot[1]*t); b=int(top[2]*(1-t)+bot[2]*t)
        d.line([(0,y),(W,y)], fill=(r,g,b))
    return ImageDraw.Draw(img)

def rr(draw, xy, r, fill=None, outline=None, ow=2):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=ow)

def pill(draw, x, y, text, bg, fg=WHITE, fnt=None):
    fnt = fnt or font(17)
    w,h = tw(draw,text,fnt)
    rr(draw,[x,y,x+w+28,y+h+10],20,fill=bg)
    draw.text((x+14,y+5),text,font=fnt,fill=fg)
    return w+28

def nav_bar(draw, active=""):
    items=["Dashboard","Chapters","Upload","Profile"]
    rr(draw,[30,H-66,W-30,H-14],16,fill=(18,28,60),outline=(45,65,115),ow=1)
    sw=(W-60)//4
    for i,item in enumerate(items):
        x=30+i*sw+sw//2; col=WHITE if item==active else (110,130,170)
        f=font(15,bold=(item==active)); iw,_=tw(draw,item,f)
        draw.text((x-iw//2,H-53),item,font=f,fill=col)
        if item==active: draw.ellipse([x-3,H-20,x+3,H-14],fill=BLUE)

def stat_box(draw, x, y, value, label, col, bw=188):
    rr(draw,[x,y,x+bw,y+90],16,fill=(col[0],col[1],col[2],35))
    rr(draw,[x,y,x+bw,y+90],16,outline=col,ow=2)
    vf,lf=font(30,True),font(14)
    vw,_=tw(draw,value,vf); lw,_=tw(draw,label,lf)
    draw.text((x+(bw-vw)//2,y+12),value,font=vf,fill=WHITE)
    draw.text((x+(bw-lw)//2,y+52),label,font=lf,fill=(188,202,224))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 1 — HERO
# ══════════════════════════════════════════════════════════════════════════════
def draw_hero(img):
    d = grad(img,(8,16,54),(26,8,74))
    draw2=ImageDraw.Draw(img)

    # Logo pill — white background with dark navy text (fix: was white-on-white)
    lf = font(30,True)
    lw,lh = tw(draw2,"EaseStudy",lf)
    pill_w = lw+64
    px0 = (W-pill_w)//2
    rr(draw2,[px0,128,px0+pill_w,192],32,fill=WHITE)
    draw2.text((px0+32,138),"EaseStudy",font=lf,fill=(15,23,42))

    cx(draw2,"AI-Powered Study Assistant",218,font(42,True))
    cx(draw2,"for Every Student",278,font(38,True),(172,184,255))
    cx(draw2,"Upload any chapter. Get quizzes, flashcards,",358,font(20),(148,162,212))
    cx(draw2,"summaries and an AI tutor — in seconds.",390,font(20),(148,162,212))

    tags=[("Students",INDIGO),("Parents",VIOLET),("Teachers",TEAL)]
    widths=[pill(draw2,-9000,0,t,c,fnt=font(18)) for t,c in tags]
    total=sum(widths)+20*2
    tx=(W-total)//2
    for (lbl,col),pw in zip(tags,widths):
        pill(draw2,tx,455,lbl,col,fnt=font(18)); tx+=pw+20

    nav_bar(draw2,"Dashboard")

slides=[("hero",
    "Welcome to EaseStudy — the AI-powered study assistant built for every student. "
    "Whether you're preparing for exams, revising concepts, or mastering a new chapter, "
    "EaseStudy transforms any textbook material into a complete, interactive learning toolkit. "
    "Quizzes, flashcards, AI summaries, a personal tutor, and a smart study planner — "
    "all ready within seconds of uploading your chapter.",
    draw_hero)]

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 2 — UPLOAD + DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
def draw_upload_dashboard(img):
    d = grad(img,(8,15,50),(16,24,68))
    rr(d,[36,18,W-36,88],18,fill=BLUE)
    draw2=ImageDraw.Draw(img)
    draw2.text((68,28),"Step 1 — Upload Your Chapter",font=font(22,True),fill=WHITE)
    draw2.text((68,62),"PDF, DOCX, TXT or Image — up to 50 MB",font=font(15),fill=(180,212,255))

    LEFT_X, LEFT_W = 36, 564
    LEFT_R = LEFT_X + LEFT_W
    INNER_L, INNER_R = LEFT_X+26, LEFT_R-26

    rr(draw2,[LEFT_X,104,LEFT_R,448],16,fill=(16,26,66),outline=(48,74,136),ow=1)

    draw2.text((INNER_L,118),"Subject",font=font(14,True),fill=(152,172,216))
    rr(draw2,[INNER_L,140,INNER_R,180],10,fill=(22,34,86),outline=(62,92,152),ow=1)
    draw2.text((INNER_L+18,150),"History — Class 9",font=font(14),fill=WHITE)

    draw2.text((INNER_L,196),"Chapter Name",font=font(14,True),fill=(152,172,216))
    rr(draw2,[INNER_L,218,INNER_R,258],10,fill=(22,34,86),outline=(62,92,152),ow=1)
    draw2.text((INNER_L+18,228),"The French Revolution",font=font(14),fill=WHITE)

    draw2.text((INNER_L,274),"File",font=font(14,True),fill=(152,172,216))

    ZONE_L, ZONE_R, ZONE_T, ZONE_B = INNER_L, INNER_R, 298, 400
    ZONE_W = ZONE_R - ZONE_L
    ZONE_CX = ZONE_L + ZONE_W//2

    rr(draw2,[ZONE_L,ZONE_T,ZONE_R,ZONE_B],14,fill=(18,28,76),outline=(52,92,194),ow=2)
    for dash_x in range(ZONE_L, ZONE_R, 18):
        draw2.rectangle([dash_x,ZONE_T,min(dash_x+10,ZONE_R),ZONE_T+2],fill=(52,92,194))

    line1_f = font(16,True); line1_text = "Drop file here or click to browse"
    line2_f = font(13);      line2_text = "PDF, DOCX, TXT, Images — up to 50 MB"
    l1w,_ = tw(draw2,line1_text,line1_f); l2w,_ = tw(draw2,line2_text,line2_f)
    draw2.text((ZONE_CX-l1w//2, ZONE_T+28), line1_text, font=line1_f, fill=(122,152,212))
    draw2.text((ZONE_CX-l2w//2, ZONE_T+60), line2_text, font=line2_f, fill=(92,122,174))

    rr(draw2,[INNER_L,414,INNER_R,446],12,fill=BLUE)
    btn_f=font(18,True); btn_text="Upload Chapter"
    btn_w,_=tw(draw2,btn_text,btn_f)
    draw2.text((INNER_L+(ZONE_W-btn_w)//2,421),btn_text,font=btn_f,fill=WHITE)

    RIGHT_X, RIGHT_R = 624, W-36
    RIGHT_W = RIGHT_R - RIGHT_X
    rr(draw2,[RIGHT_X,104,RIGHT_R,448],16,fill=(16,26,66),outline=(48,74,136),ow=1)
    draw2.text((RIGHT_X+22,118),"Dashboard",font=font(17,True),fill=WHITE)
    for i,(v,l) in enumerate([("12","Chapters"),("48","Quizzes"),("85%","Score")]):
        stat_box(draw2,RIGHT_X+22+i*208,148,v,l,[BLUE,VIOLET,EMERALD][i],bw=196)
    draw2.text((RIGHT_X+22,256),"Recent Chapters",font=font(14,True),fill=WHITE)
    for j,(nm,sub) in enumerate([("French Revolution","History"),("Chemical Reactions","Chemistry"),("Photosynthesis","Biology")]):
        cy2=282+j*48
        rr(draw2,[RIGHT_X+22,cy2,RIGHT_R-22,cy2+38],10,fill=(22,32,70),outline=(48,72,128),ow=1)
        draw2.text((RIGHT_X+38,cy2+8),nm,font=font(14,True),fill=WHITE)
        sw,_=tw(draw2,sub,font(12))
        draw2.text((RIGHT_R-38-sw,cy2+10),sub,font=font(12),fill=TEAL)

    rr(draw2,[36,460,W-36,534],14,fill=(22,32,74),outline=(45,70,130),ow=1)
    draw2.text((60,470),"After upload, AI processes your chapter in ~30 seconds:",font=font(14),fill=(150,170,214))
    step_colors=[BLUE,VIOLET,EMERALD,AMBER]
    step_labels=["1. Extract Text","2. Score Complexity","3. Build Embeddings","4. Ready!"]
    for k,(lbl,col) in enumerate(zip(step_labels,step_colors)):
        sx=54+k*300
        rr(draw2,[sx,490,sx+278,522],10,fill=(col[0],col[1],col[2],45),outline=col,ow=1)
        fw,_=tw(draw2,lbl,font(13,True))
        draw2.text((sx+(278-fw)//2,497),lbl,font=font(13,True),fill=WHITE)

    nav_bar(draw2,"Upload")

slides.append(("upload",
    "Getting started is effortless. Choose your subject, name the chapter, and upload any file — "
    "a PDF textbook, a Word document, scanned images, or plain text — up to 50 megabytes. "
    "EaseStudy's AI processes the content in under 30 seconds, extracting key information "
    "and making every study tool available instantly. "
    "Your dashboard tracks all uploaded chapters, quiz scores, and study progress in one place.",
    draw_upload_dashboard))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 3 — QUIZ + FLASHCARDS
# ══════════════════════════════════════════════════════════════════════════════
def draw_quiz_flash(img):
    d = grad(img,(16,14,66),(8,12,56))
    draw2=ImageDraw.Draw(img)

    QUIZ_R  = 624
    FLASH_L = 640

    rr(d,[36,18,QUIZ_R,82],18,fill=INDIGO)
    draw2.text((64,28),"Quiz — 12 AI Questions",font=font(21,True),fill=WHITE)
    draw2.text((64,58),"MCQ, True / False, Fill-in-the-blank",font=font(14),fill=(198,194,255))
    rr(draw2,[FLASH_L,18,W-36,82],18,fill=EMERALD)
    draw2.text((FLASH_L+24,28),"Flashcards — 20 Cards",font=font(21,True),fill=WHITE)
    draw2.text((FLASH_L+24,58),"Flip and swipe to memorise key terms",font=font(14),fill=(198,255,238))

    rr(draw2,[36,98,QUIZ_R,320],16,fill=(18,22,66),outline=(52,74,156),ow=1)
    draw2.text((58,110),"Question 3 of 12   |   Medium",font=font(13),fill=(112,126,176))
    draw2.text((58,136),"Which estate did the common people belong to?",font=font(17,True),fill=WHITE)
    oy=178
    for k,t,ok,bad in [("A","First Estate",False,False),("B","Second Estate",False,False),
                        ("C","Third Estate",True,False),("D","Royal Court",False,True)]:
        bg=(16,70,34) if ok else (62,16,16) if bad else (20,26,70)
        bc=EMERALD if ok else (208,46,46) if bad else (50,70,146)
        rr(draw2,[52,oy,608,oy+44],10,fill=bg,outline=bc,ow=2)
        rr(draw2,[64,oy+9,90,oy+33],7,fill=bc)
        draw2.text((68,oy+11),k,font=font(14,True),fill=WHITE)
        draw2.text((96,oy+11),t,font=font(15),fill=WHITE)
        if ok: draw2.text((572,oy+9),"OK",font=font(13,True),fill=EMERALD)
        oy+=50
    rr(draw2,[52,oy+2,608,oy+44],10,fill=(12,36,20),outline=EMERALD,ow=1)
    draw2.text((68,oy+12),"The Third Estate — 97% of France's population",font=font(13),fill=(110,212,150))

    rr(draw2,[36,482,QUIZ_R,540],14,fill=(22,30,72),outline=(52,75,152),ow=1)
    draw2.text((58,494),"Difficulty: Easy / Medium / Hard",font=font(14),fill=(150,164,210))
    draw2.text((58,516),"Instant AI explanation after every answer",font=font(13),fill=(118,136,186))

    FP_L  = FLASH_L
    FP_R  = W - 36
    FP_W  = FP_R - FP_L
    FP_CX = FP_L + FP_W//2

    rr(draw2,[FP_L,98,FP_R,560],22,fill=(8,46,38),outline=EMERALD,ow=2)

    front_f=font(12,True); front_text="FRONT"
    fw,_=tw(draw2,front_text,front_f)
    draw2.text((FP_CX-fw//2,114),front_text,font=front_f,fill=(72,192,152))

    term_f=font(26,True); term_text="Exothermic Reaction"
    termw,_=tw(draw2,term_text,term_f)
    draw2.text((FP_CX-termw//2,148),term_text,font=term_f,fill=WHITE)

    draw2.line([(FP_L+30,202),(FP_R-30,202)],fill=(34,112,92),width=2)

    def_lines=textwrap.wrap("A chemical reaction that releases energy in the form of heat or light to the surroundings.",32)
    def_f=font(16)
    _, dlh = tw(draw2,"A",def_f)
    def_start_y=218
    for i,ln in enumerate(def_lines):
        lw,_=tw(draw2,ln,def_f)
        draw2.text((FP_CX-lw//2, def_start_y+i*(dlh+6)),ln,font=def_f,fill=(172,232,212))
    after_def = def_start_y + len(def_lines)*(dlh+6) + 12

    ex_f=font(14); ex_text="Example: Burning of coal or wood"
    ew,_=tw(draw2,ex_text,ex_f)
    draw2.text((FP_CX-ew//2,after_def),ex_text,font=ex_f,fill=(120,190,170))
    after_ex=after_def+28

    BTN_W=160; BTN_H=36
    btn_x=FP_CX-BTN_W//2
    rr(draw2,[btn_x,after_ex,btn_x+BTN_W,after_ex+BTN_H],18,fill=(EMERALD[0],EMERALD[1],EMERALD[2],55))
    flip_f=font(15); flip_text="Flip Card"
    fwt,_=tw(draw2,flip_text,flip_f)
    draw2.text((FP_CX-fwt//2,after_ex+8),flip_text,font=flip_f,fill=WHITE)
    after_btn=after_ex+BTN_H+18

    dot_count=5; dot_spacing=26; dot_start=FP_CX-(dot_count*dot_spacing)//2
    for i in range(dot_count):
        col=WHITE if i==1 else (55,135,105)
        dw=20 if i==1 else 8
        rr(draw2,[dot_start+i*dot_spacing,after_btn,dot_start+i*dot_spacing+dw,after_btn+10],5,fill=col)

    rr(draw2,[FP_L+20,510,FP_L+180,548],14,fill=(12,64,52),outline=EMERALD,ow=1)
    draw2.text((FP_L+52,520),"Prev",font=font(17),fill=WHITE)
    rr(draw2,[FP_R-180,510,FP_R-20,548],14,fill=EMERALD)
    draw2.text((FP_R-145,520),"Next",font=font(17,True),fill=WHITE)

    nav_bar(draw2,"Chapters")

slides.append(("quiz_flash",
    "EaseStudy automatically generates 12 quiz questions from every chapter — "
    "multiple choice, true or false, and fill in the blank — across three difficulty levels. "
    "After each answer, the AI provides a clear explanation so students truly understand, not just guess. "
    "Alongside quizzes, 20 tailored flashcards help reinforce key terms through spaced repetition. "
    "Just flip and swipe until every definition is locked in memory.",
    draw_quiz_flash))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 4 — SUMMARY + ASK AI
# ══════════════════════════════════════════════════════════════════════════════
def draw_summary_chat(img):
    d = grad(img,(40,26,4),(56,36,7))
    draw2=ImageDraw.Draw(img)

    SUM_R  = 620
    CHAT_L = 638

    rr(d,[36,18,SUM_R,82],18,fill=AMBER)
    draw2.text((64,24),"Chapter Summary",font=font(22,True),fill=DARK)
    draw2.text((64,58),"Quick recap, key points, exam tips",font=font(14),fill=(72,54,8))
    rr(draw2,[CHAT_L,18,W-36,82],18,fill=TEAL)
    draw2.text((CHAT_L+24,24),"Ask AI",font=font(22,True),fill=WHITE)
    draw2.text((CHAT_L+24,58),"Chat with the chapter — any question",font=font(14),fill=(196,250,245))

    rr(draw2,[36,98,SUM_R,550],16,fill=(44,34,4),outline=AMBER,ow=1)
    draw2.text((58,112),"Quick Recap",font=font(15,True),fill=AMBER)
    draw2.text((58,138),"Photosynthesis converts sunlight, CO2 and water",font=font(14),fill=(213,192,143))
    draw2.text((58,158),"into glucose and oxygen — the foundation of life.",font=font(14),fill=(213,192,143))
    draw2.text((58,186),"Key Points",font=font(15,True),fill=WHITE)
    for i,pt in enumerate(["Occurs in chloroplasts of plant cells",
                            "Inputs: sunlight, carbon dioxide, and water",
                            "Output: glucose for energy, releases oxygen",
                            "Two stages: Light Reactions and Calvin Cycle"]):
        py=212+i*44
        draw2.ellipse([68,py+4,82,py+18],fill=AMBER)
        draw2.text((90,py+2),pt,font=font(14),fill=(212,200,172))
    draw2.text((58,400),"Exam Tips",font=font(15,True),fill=WHITE)
    draw2.text((72,424),"Write: 6CO2 + 6H2O + light -> C6H12O6 + 6O2",font=font(13),fill=(170,212,172))
    draw2.text((72,446),"Name both stages in the correct order",font=font(13),fill=(170,212,172))
    draw2.text((58,474),"Key Concepts",font=font(14,True),fill=WHITE)
    for i,(t,dfn) in enumerate([("Chlorophyll","Pigment that absorbs sunlight"),("Stomata","Pores for gas exchange")]):
        cx2=58+i*272
        rr(draw2,[cx2,498,cx2+258,532],10,fill=(54,42,8),outline=AMBER,ow=1)
        draw2.text((cx2+12,504),t,font=font(13,True),fill=AMBER)
        draw2.text((cx2+12,519),dfn,font=font(12),fill=(190,176,133))

    rr(draw2,[CHAT_L,98,W-36,550],16,fill=(14,36,44),outline=TEAL,ow=1)
    msgs=[("You","Why did the French Revolution happen?"),
          ("AI","Economic crisis, inequality between estates, and weak governance. The Third Estate paid all taxes while the nobility lived lavishly."),
          ("You","What was the Tennis Court Oath?"),
          ("AI","Members pledged on a tennis court to write a new constitution for France — a turning point in the Revolution.")]
    my=114
    for role,text in msgs:
        lines=textwrap.wrap(text,30)
        bh=len(lines)*20+16
        if role=="You":
            bw=min(len(text)*9,280)
            bx=W-52-bw-14
            rr(draw2,[bx,my,bx+bw+14,my+bh],12,fill=INDIGO)
            for j,ln in enumerate(lines): draw2.text((bx+8,my+8+j*20),ln,font=font(13),fill=WHITE)
        else:
            bw2=min(len(text)*8,310)
            rr(draw2,[CHAT_L+16,my,CHAT_L+16+bw2+14,my+bh],12,fill=(18,38,46),outline=TEAL,ow=1)
            for j,ln in enumerate(lines): draw2.text((CHAT_L+24,my+8+j*20),ln,font=font(13),fill=(202,238,235))
        my+=bh+10
        if my>500: break
    rr(draw2,[CHAT_L+16,516,W-52,544],10,fill=(18,28,42),outline=(42,94,104),ow=1)
    draw2.text((CHAT_L+28,526),"Ask a question...",font=font(13),fill=(92,132,142))

    nav_bar(draw2,"Chapters")

slides.append(("summary_chat",
    "The AI Summary gives you everything you need to revise efficiently — "
    "a clear chapter recap, important bullet points, concept definitions, and targeted exam tips. "
    "But what makes EaseStudy truly powerful is the Ask AI feature. "
    "Students can type any question — in plain English — and receive an accurate, "
    "context-aware answer drawn directly from the chapter. "
    "It's like having a personal tutor available any time of day or night.",
    draw_summary_chat))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 5 — STUDY PLANNER
# ══════════════════════════════════════════════════════════════════════════════
def draw_study_planner(img):
    d = grad(img,(6,18,52),(18,6,66))
    draw2=ImageDraw.Draw(img)

    PLAN_R  = 624
    SCHED_L = 640

    # Headers
    rr(d,[36,18,PLAN_R,82],18,fill=VIOLET)
    draw2.text((64,28),"Study Planner",font=font(22,True),fill=WHITE)
    draw2.text((64,58),"Set your test — AI builds your schedule",font=font(14),fill=(218,210,255))

    rr(draw2,[SCHED_L,18,W-36,82],18,fill=BLUE)
    draw2.text((SCHED_L+24,28),"Your AI Schedule",font=font(22,True),fill=WHITE)
    draw2.text((SCHED_L+24,58),"Personalised day-by-day plan",font=font(14),fill=(196,220,255))

    # ── Left: Test Configuration ───────────────────────────────────────────────
    rr(draw2,[36,98,PLAN_R,548],16,fill=(16,12,52),outline=(80,60,190),ow=1)

    draw2.text((58,112),"Test Configuration",font=font(15,True),fill=(180,168,255))

    draw2.text((58,140),"Subject",font=font(13,True),fill=(140,128,215))
    rr(draw2,[58,158,590,194],10,fill=(24,18,68),outline=(70,58,155),ow=1)
    draw2.text((76,166),"Science — Class 10",font=font(14),fill=WHITE)

    draw2.text((58,204),"Test Date",font=font(13,True),fill=(140,128,215))
    rr(draw2,[58,222,590,258],10,fill=(24,18,68),outline=(70,58,155),ow=1)
    draw2.text((76,230),"15 May 2025",font=font(14),fill=AMBER)
    dw,_ = tw(draw2,"15 May 2025",font(14))
    draw2.text((76+dw+16,232),"14 days left",font=font(12),fill=(100,200,120))

    draw2.text((58,268),"Chapters Selected",font=font(13,True),fill=(140,128,215))
    for i,(ch,col) in enumerate([("Chemical Reactions",EMERALD),("Carbon Compounds",BLUE),
                                  ("Life Processes",VIOLET),("Electricity",AMBER)]):
        cy = 288 + i*40
        rr(draw2,[58,cy,590,cy+30],8,fill=(18,14,58),outline=(62,50,145),ow=1)
        draw2.ellipse([70,cy+7,86,cy+23],fill=col)
        draw2.text((94,cy+6),ch,font=font(13),fill=WHITE)

    # Stats strip
    for i,(v,l,col) in enumerate([("14","Days left",VIOLET),("4","Chapters",BLUE),("2 hrs","Per day",EMERALD)]):
        sx = 58 + i*174
        rr(draw2,[sx,456,sx+160,516],12,fill=(col[0],col[1],col[2],40),outline=col,ow=1)
        vf=font(22,True); lf2=font(12)
        vw,_=tw(draw2,v,vf); lw,_=tw(draw2,l,lf2)
        draw2.text((sx+(160-vw)//2,464),v,font=vf,fill=col)
        draw2.text((sx+(160-lw)//2,494),l,font=lf2,fill=(175,165,230))

    rr(draw2,[58,524,590,556],12,fill=VIOLET)
    btf=font(17,True); btt="Generate My Study Plan"
    bw,_=tw(draw2,btt,btf)
    draw2.text((58+(532-bw)//2,531),btt,font=btf,fill=WHITE)

    # ── Right: AI-generated schedule ───────────────────────────────────────────
    rr(draw2,[SCHED_L,98,W-36,548],16,fill=(12,20,48),outline=BLUE,ow=1)
    draw2.text((SCHED_L+22,110),"14-Day Study Plan",font=font(15,True),fill=WHITE)

    schedule=[
        ("Day 1-2",  "Chemical Reactions", "Equations, types, balancing",  BLUE),
        ("Day 3-4",  "Carbon Compounds",   "Bonds, homologous series",      VIOLET),
        ("Day 5-6",  "Life Processes",     "Respiration & photosynthesis",  EMERALD),
        ("Day 7-8",  "Electricity",        "Ohm's law, circuits & power",   AMBER),
        ("Day 9-11", "Revision",           "Flashcards + past questions",   TEAL),
        ("Day 12-14","Mock Tests",         "Timed AI quizzes per chapter",  PINK),
    ]
    for i,(day,topic,detail,col) in enumerate(schedule):
        dy = 136 + i*68
        rr(draw2,[SCHED_L+16,dy,W-52,dy+58],10,
           fill=(col[0],col[1],col[2],30), outline=col, ow=1)
        badge_w=92
        rr(draw2,[SCHED_L+24,dy+11,SCHED_L+24+badge_w,dy+47],8,fill=col)
        df=font(11,True); dw2,_=tw(draw2,day,df)
        draw2.text((SCHED_L+24+(badge_w-dw2)//2, dy+20), day, font=df, fill=WHITE)
        draw2.text((SCHED_L+128,dy+10), topic,  font=font(13,True), fill=WHITE)
        draw2.text((SCHED_L+128,dy+30), detail, font=font(12),      fill=(155,175,210))

    nav_bar(draw2,"Dashboard")

slides.append(("study_planner",
    "EaseStudy's Study Planner takes the stress out of exam preparation. "
    "Simply set your test date, choose the chapters you need to cover, "
    "and the AI generates a personalised day-by-day study schedule. "
    "It intelligently balances your workload across the remaining days — "
    "telling you exactly which topics to study each session, "
    "when to revise, and when to take practice tests. "
    "No more last-minute cramming. Just a clear, structured path to exam success.",
    draw_study_planner))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 6 — WHO IT'S FOR + CTA
# ══════════════════════════════════════════════════════════════════════════════
def draw_cta(img):
    d = grad(img,(8,16,56),(26,6,86))
    draw2=ImageDraw.Draw(img)

    cx(draw2,"Built for Everyone",30,font(32,True))
    cx(draw2,"One platform. Three audiences.",76,font(20),(138,152,218))

    panels=[
        (BLUE,  "Students",  ["Upload any chapter","Practice with quizzes","Review flashcards","Get AI summaries","Ask any question","Smart study planner"]),
        (VIOLET,"Parents",   ["Track chapters studied","Monitor quiz scores","Understand content depth","Encourage study habits","Test-date reminders","Safe and educational"]),
        (EMERALD,"Teachers", ["Share chapters easily","AI saves prep time","Better-prepared students","Identify weak topics","Hindi and English support","Study plans for every student"]),
    ]
    pW=(W-80)//3; px=28
    for col,title,pts in panels:
        rr(draw2,[px,118,px+pW,544],20,fill=(col[0],col[1],col[2],26),outline=col,ow=2)
        draw2.text((px+16,134),title,font=font(17,True),fill=WHITE)
        for i,pt in enumerate(pts):
            py=174+i*60
            draw2.ellipse([px+16,py+2,px+30,py+16],fill=col)
            draw2.text((px+38,py),pt,font=font(14),fill=(194,206,226))
        px+=pW+18

    rr(draw2,[W//2-195,556,W//2+195,620],20,fill=BLUE)
    cta_f=font(22,True); cta_text="Get Started Free"
    cw,_=tw(draw2,cta_text,cta_f)
    draw2.text(((W-cw)//2,570),cta_text,font=cta_f,fill=WHITE)

    nav_bar(draw2,"Dashboard")

slides.append(("cta",
    "EaseStudy works for everyone. "
    "Students study smarter, feel confident, and walk into exams prepared. "
    "Parents stay informed, track progress, and support their child's learning journey. "
    "Teachers save hours of preparation time while their students arrive better equipped. "
    "With full support for both Hindi and English, EaseStudy is built for every classroom in India. "
    "Get started free today — upload your first chapter and see the difference in minutes.",
    draw_cta))

# ══════════════════════════════════════════════════════════════════════════════
# RENDER FRAMES
# ══════════════════════════════════════════════════════════════════════════════
print("\n-- Rendering frames --")
frame_paths = []
for i,(name,narration,draw_fn) in enumerate(slides):
    img=Image.new("RGB",(W,H),DARK)
    draw_fn(img)
    fp=OUT_DIR/f"{i:02d}_{name}.png"
    img.save(str(fp))
    frame_paths.append(str(fp))
    print(f"  [{i+1}/{len(slides)}] {name}.png")

# ══════════════════════════════════════════════════════════════════════════════
# NARRATION — Microsoft AriaNeural
# ══════════════════════════════════════════════════════════════════════════════
print("\n-- Generating narration (AriaNeural) --")
audio_paths = []

async def gen_audio(text, path):
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE, pitch="+2Hz")
    await communicate.save(path)

async def gen_all():
    for i,(name,narration,_) in enumerate(slides):
        ap = str(OUT_DIR/f"{i:02d}_{name}.mp3")
        await gen_audio(narration, ap)
        audio_paths.append(ap)
        print(f"  [{i+1}/{len(slides)}] {name}.mp3")

asyncio.run(gen_all())

# ══════════════════════════════════════════════════════════════════════════════
# GET AUDIO DURATIONS
# ══════════════════════════════════════════════════════════════════════════════
def get_duration(ap):
    r=subprocess.run([FFMPEG,"-i",ap,"-f","null","-"],capture_output=True,text=True)
    for line in (r.stdout+r.stderr).split("\n"):
        if "Duration:" in line:
            p=line.strip().split("Duration:")[1].split(",")[0].strip()
            h,m,s=p.split(":"); return float(h)*3600+float(m)*60+float(s)
    return 8.0

# ══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE WITH FFMPEG
# ══════════════════════════════════════════════════════════════════════════════
print("\n-- Building clips --")
clip_paths=[]
total_dur=0
for i,(fp,ap) in enumerate(zip(frame_paths,audio_paths)):
    dur=get_duration(ap)+0.6
    dur=max(dur,8.0)
    total_dur+=dur
    cp=str(OUT_DIR/f"{i:02d}_clip.mp4")
    subprocess.run([
        FFMPEG,"-y","-loop","1","-i",fp,"-i",ap,
        "-c:v","libx264","-tune","stillimage",
        "-c:a","aac","-b:a","128k",
        "-pix_fmt","yuv420p","-t",str(dur),
        "-vf","scale=1280:720",cp
    ],check=True,capture_output=True)
    clip_paths.append(cp)
    print(f"  [{i+1}/{len(slides)}] {Path(cp).name} ({dur:.1f}s)")
print(f"  Total: {total_dur:.0f}s (~{total_dur/60:.1f} min)")

concat_file=str(OUT_DIR/"concat.txt")
with open(concat_file,"w") as f:
    for cp in clip_paths:
        f.write(f"file '{os.path.abspath(cp).replace(chr(92),'/')}'\n")

out="easestudy_features.mp4"
print(f"\n-- Concatenating -> {out} --")
subprocess.run([
    FFMPEG,"-y","-f","concat","-safe","0","-i",concat_file,"-c","copy",out
],check=True,capture_output=True)

sz=os.path.getsize(out)/1024/1024
r2=subprocess.run([FFMPEG,"-i",out,"-f","null","-"],capture_output=True,text=True)
for line in (r2.stdout+r2.stderr).split("\n"):
    if "Duration:" in line:
        dur_str=line.strip().split("Duration:")[1].split(",")[0].strip()
        print(f"\nDone!  {out}  |  Duration: {dur_str}  |  Size: {sz:.1f} MB")
        break
