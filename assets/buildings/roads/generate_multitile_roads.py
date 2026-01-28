from PIL import Image, ImageDraw
import os

# Configuration
TILE_SIZE = 32
ASPHALT = (50, 50, 50, 255)
LANE_WHITE = (220, 220, 220, 255)
LANE_YELLOW = (240, 200, 50, 255)
SIDEWALK = (180, 180, 190, 255)

def create_image(filename):
    img = Image.new('RGBA', (TILE_SIZE, TILE_SIZE), ASPHALT)
    draw = ImageDraw.Draw(img)
    return img, draw

def save_image(img, filename):
    # Save in the same directory as this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(script_dir, filename)
    img.save(path)
    print(f"Saved {path}")

# --- Vertical Roads (2 tiles wide) ---

# Left Lane (Vertical)
# White line on left side, Yellow partial line on right side
img, draw = create_image('road_v_left.png')
# White line (lane marker)
draw.line([(6, 0), (6, 31)], fill=LANE_WHITE, width=2)
# Right edge yellow line (1 of the double yellow lines)
draw.line([(29, 0), (29, 31)], fill=LANE_YELLOW, width=1)
save_image(img, 'road_v_left.png')

# Right Lane (Vertical)
# Yellow partial line on left side, White line on right side
img, draw = create_image('road_v_right.png')
# Left edge yellow line (2nd of double yellow lines)
draw.line([(2, 0), (2, 31)], fill=LANE_YELLOW, width=1)
# White line
draw.line([(25, 0), (25, 31)], fill=LANE_WHITE, width=2)
save_image(img, 'road_v_right.png')


# --- Horizontal Roads (2 tiles high) ---

# Top Lane (Horizontal) (Traffic usually goes LEFT in top lane of RHT... wait, RHT: Right lane goes forward.
# Top lane is going LEFT. Bottom lane is going RIGHT.)
# White line on Top, Yellow on Bottom edge
img, draw = create_image('road_h_top.png')
# White line
draw.line([(0, 6), (31, 6)], fill=LANE_WHITE, width=2)
# Bottom edge yellow
draw.line([(0, 29), (31, 29)], fill=LANE_YELLOW, width=1)
save_image(img, 'road_h_top.png')

# Bottom Lane (Horizontal)
# Yellow on Top edge, White on Bottom
img, draw = create_image('road_h_bottom.png')
# Top edge yellow
draw.line([(0, 2), (31, 2)], fill=LANE_YELLOW, width=1)
# White line
draw.line([(0, 25), (31, 25)], fill=LANE_WHITE, width=2)
save_image(img, 'road_h_bottom.png')


# --- Intersection (2x2) ---
# Assuming 4-way intersection without crosswalks for simplicity first, or with?
# Let's add crosswalks or stop lines.
# Actually, let's keep it simple: just the lane markers ending.

# NW Corner (Bottom-Right corner is center of intersection)
img, draw = create_image('road_x_nw.png')
# Vertical white line (Left side) -> Ends before intersection? Or continues?
# Usually lane markers stop at intersection.
# Let's stop the white line 4px from bottom.
draw.line([(6, 0), (6, 26)], fill=LANE_WHITE, width=2)
# Horizontal white line (Top side) -> Stop 4px from right
draw.line([(0, 6), (26, 6)], fill=LANE_WHITE, width=2)
# No yellow lines inside the intersection box
# But wait, incoming roads have yellow lines.
# The yellow lines should stop BEFORE the intersection box (inner part).
# Let's just make the intersection purely asphalt for the inner center, 
# but the outer edges have the white lines turning?
# Or just simple cross shape:
# Corner = Asphalt
# To make it look like a junction, we remove the yellow lines near the center.
save_image(img, 'road_x_nw.png')

# NE Corner
img, draw = create_image('road_x_ne.png')
draw.line([(25, 0), (25, 26)], fill=LANE_WHITE, width=2) # Vertical Right line
draw.line([(0, 6), (5, 6)], fill=LANE_WHITE, width=2) # Horizontal Top line continuing? No, this is NE.
# Horizontal top line comes from left... 
draw.line([(5, 6), (31, 6)], fill=LANE_WHITE, width=2) # Horizontal Top line
save_image(img, 'road_x_ne.png')

# SW Corner
img, draw = create_image('road_x_sw.png')
draw.line([(6, 5), (6, 31)], fill=LANE_WHITE, width=2) # Vertical Left line
draw.line([(0, 25), (26, 25)], fill=LANE_WHITE, width=2) # Horizontal Bottom line
save_image(img, 'road_x_sw.png')

# SE Corner
img, draw = create_image('road_x_se.png')
draw.line([(25, 5), (25, 31)], fill=LANE_WHITE, width=2) # Vertical Right line
draw.line([(5, 25), (31, 25)], fill=LANE_WHITE, width=2) # Horizontal Bottom line
save_image(img, 'road_x_se.png')

# --- Sidewalk ---
# Same as before, maybe simpler
img, draw = create_image('sidewalk.png')
draw.rectangle([(0,0), (31,31)], fill=SIDEWALK)
# Add paver details
for i in range(0, 32, 8):
    draw.line([(i, 0), (i, 31)], fill=(160, 160, 170, 255), width=1)
    draw.line([(0, i), (31, i)], fill=(160, 160, 170, 255), width=1)
save_image(img, 'sidewalk.png')

