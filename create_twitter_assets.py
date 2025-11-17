#!/usr/bin/env python3
"""
Create Twitter profile photo and cover photo for Prediction Dex
"""
from PIL import Image, ImageDraw, ImageFont
import os

# Color palette from globals.css
COLORS = {
    'bg_main': '#0F1419',
    'bsc_yellow': '#FFC107',
    'bsc_gold': '#F7B600',
    'market_rise': '#10B981',
    'market_neutral': '#8B5CF6',
    'text_primary': '#FFFFFF',
    'text_secondary': '#E5E7EB',
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_twitter_profile_photo(input_path, output_path):
    """Resize logo to Twitter profile photo size (400x400px)"""
    print(f"Creating Twitter profile photo from {input_path}...")
    
    # Open and resize logo
    img = Image.open(input_path)
    
    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Resize to 400x400 with high-quality resampling
    img_resized = img.resize((400, 400), Image.Resampling.LANCZOS)
    
    # Save
    img_resized.save(output_path, 'PNG', optimize=True)
    print(f"✓ Twitter profile photo saved to {output_path}")

def create_twitter_cover_photo(logo_path, output_path):
    """Create Twitter cover photo (1500x500px) with dark black background and corner shapes"""
    print(f"Creating Twitter cover photo...")
    
    # Twitter cover photo dimensions (official size)
    width, height = 1500, 500
    
    # Create base image with pure black background
    img = Image.new('RGB', (width, height), (0, 0, 0))
    img = img.convert('RGBA')
    draw = ImageDraw.Draw(img)
    
    # Color definitions
    yellow_rgb = hex_to_rgb(COLORS['bsc_yellow'])
    green_rgb = hex_to_rgb(COLORS['market_rise'])
    
    # Draw yellow and green shapes at corners
    corner_size = 300
    
    # Top-left corner - yellow shape
    yellow_shape = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    yellow_draw = ImageDraw.Draw(yellow_shape)
    yellow_draw.polygon(
        [(0, 0), (corner_size, 0), (0, corner_size)],
        fill=(*yellow_rgb, 180)
    )
    img = Image.alpha_composite(img, yellow_shape)
    
    # Top-right corner - green shape
    green_shape = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    green_draw = ImageDraw.Draw(green_shape)
    green_draw.polygon(
        [(width, 0), (width - corner_size, 0), (width, corner_size)],
        fill=(*green_rgb, 180)
    )
    img = Image.alpha_composite(img, green_shape)
    
    # Bottom-left corner - green shape
    green_shape2 = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    green_draw2 = ImageDraw.Draw(green_shape2)
    green_draw2.polygon(
        [(0, height), (corner_size, height), (0, height - corner_size)],
        fill=(*green_rgb, 180)
    )
    img = Image.alpha_composite(img, green_shape2)
    
    # Bottom-right corner - yellow shape
    yellow_shape2 = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    yellow_draw2 = ImageDraw.Draw(yellow_shape2)
    yellow_draw2.polygon(
        [(width, height), (width - corner_size, height), (width, height - corner_size)],
        fill=(*yellow_rgb, 180)
    )
    img = Image.alpha_composite(img, yellow_shape2)
    
    # Add ">" shapes to represent "next" - scattered around
    draw = ImageDraw.Draw(img)
    arrow_size = 40
    arrow_thickness = 8
    
    # Function to draw a ">" arrow
    def draw_arrow(x, y, size, color, thickness):
        # Draw the arrow as a polygon
        points = [
            (x, y - size // 2),  # Top point
            (x + size // 2, y),  # Right point
            (x, y + size // 2),  # Bottom point
            (x - size // 3, y),  # Left point (inner)
        ]
        draw.polygon(points, fill=color)
    
    # Draw multiple ">" arrows in yellow and green
    arrows = [
        # Yellow arrows
        (200, 100, yellow_rgb),
        (1300, 150, yellow_rgb),
        (250, 400, yellow_rgb),
        (1200, 350, yellow_rgb),
        # Green arrows
        (150, 300, green_rgb),
        (1350, 100, green_rgb),
        (100, 450, green_rgb),
        (1400, 400, green_rgb),
    ]
    
    for x, y, color in arrows:
        draw_arrow(x, y, arrow_size, (*color, 200), arrow_thickness)
    
    # Load and resize logo
    logo = Image.open(logo_path)
    if logo.mode != 'RGBA':
        logo = logo.convert('RGBA')
    
    # Resize logo to appropriate size for cover (about 200px height)
    logo_height = 200
    logo_aspect = logo.width / logo.height
    logo_width = int(logo_height * logo_aspect)
    logo_resized = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
    
    # Center logo horizontally, position in upper third
    logo_x = (width - logo_width) // 2
    logo_y = 80
    
    # Paste logo onto cover
    img = img.convert('RGBA')
    img.paste(logo_resized, (logo_x, logo_y), logo_resized)
    
    # Add slogan text
    # Try to use a nice font, fallback to default if not available
    font_size = 42
    try:
        # Try common font paths
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        ]
        font_large = None
        for font_path in font_paths:
            try:
                font_large = ImageFont.truetype(font_path, font_size)
                break
            except:
                continue
        if font_large is None:
            font_large = ImageFont.load_default()
    except:
        font_large = ImageFont.load_default()
    
    slogan = "Prediction Dex, Predict the Next."
    
    # Convert to RGBA for text rendering with shadow
    img = img.convert('RGBA')
    draw = ImageDraw.Draw(img)
    
    # Get text dimensions
    bbox = draw.textbbox((0, 0), slogan, font=font_large)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Position text below logo, centered
    text_x = (width - text_width) // 2
    text_y = logo_y + logo_height + 50
    
    # Draw text with shadow for better visibility
    shadow_offset = 3
    # Shadow (semi-transparent black)
    draw.text(
        (text_x + shadow_offset, text_y + shadow_offset),
        slogan,
        font=font_large,
        fill=(0, 0, 0, 200)
    )
    # Main text (white)
    draw.text(
        (text_x, text_y),
        slogan,
        font=font_large,
        fill=(255, 255, 255, 255)
    )
    
    # Convert back to RGB and save
    img = img.convert('RGB')
    img.save(output_path, 'PNG', optimize=True)
    print(f"✓ Twitter cover photo saved to {output_path}")

if __name__ == '__main__':
    # Paths
    logo_path = '/home/leon/predinex-front/public/logo.png'
    profile_output = '/home/leon/predinex-front/public/twitter-profile.png'
    cover_output = '/home/leon/predinex-front/public/twitter-cover.png'
    
    # Create profile photo (DO NOT modify original logo.png)
    if os.path.exists(logo_path):
        create_twitter_profile_photo(logo_path, profile_output)
    else:
        print(f"Error: Logo not found at {logo_path}")
    
    # Create cover photo
    if os.path.exists(logo_path):
        create_twitter_cover_photo(logo_path, cover_output)
    else:
        print(f"Error: Logo not found at {logo_path}")

