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

def extract_icon_from_logo(logo_path):
    """Extract just the icon portion from the logo (left side, removing text)"""
    logo = Image.open(logo_path)
    if logo.mode != 'RGBA':
        logo = logo.convert('RGBA')
    
    # Since logo is wide (4346x1604), assume icon is on the left
    # Crop to get approximately the left 35-40% which should be just the icon
    logo_width, logo_height = logo.size
    
    # Try to extract left portion - adjust this percentage based on your logo layout
    # If icon is square-ish, we'll take a square portion from the left
    icon_crop_width = min(int(logo_width * 0.35), logo_height)  # Take up to height (square) or 35% of width
    icon_crop_height = logo_height
    
    # Crop the left portion (icon only)
    icon = logo.crop((0, 0, icon_crop_width, icon_crop_height))
    
    return icon

def create_twitter_profile_photo(input_path, output_path):
    """Create Twitter profile photo (400x400px) with logo icon only (no text)"""
    print(f"Creating Twitter profile photo from {input_path}...")
    
    # Twitter profile photo dimensions
    width, height = 400, 400
    
    # Create base image with black background
    img = Image.new('RGB', (width, height), (0, 0, 0))
    img = img.convert('RGBA')
    
    # Extract just the icon from the logo (removing text portion)
    icon = extract_icon_from_logo(input_path)
    
    # Resize icon to fit nicely (about 80% of width/height, whichever is smaller)
    max_icon_size = int(min(width, height) * 0.8)
    icon_aspect = icon.width / icon.height
    
    if icon.width > icon.height:
        icon_width = max_icon_size
        icon_height = int(icon_width / icon_aspect)
    else:
        icon_height = max_icon_size
        icon_width = int(icon_height * icon_aspect)
    
    icon_resized = icon.resize((icon_width, icon_height), Image.Resampling.LANCZOS)
    
    # Center icon both horizontally and vertically
    icon_x = (width - icon_width) // 2
    icon_y = (height - icon_height) // 2
    
    # Paste icon
    img.paste(icon_resized, (icon_x, icon_y), icon_resized)
    
    # Convert back to RGB and save
    img = img.convert('RGB')
    img.save(output_path, 'PNG', optimize=True)
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

def create_abstract_background(width, height):
    """Create abstract background with black, yellow/green corners, and arrows"""
    # Create base image with pure black background
    img = Image.new('RGB', (width, height), (0, 0, 0))
    img = img.convert('RGBA')
    
    # Color definitions
    yellow_rgb = hex_to_rgb(COLORS['bsc_yellow'])
    green_rgb = hex_to_rgb(COLORS['market_rise'])
    
    # Scale corner size based on dimensions
    corner_size = int(min(width, height) * 0.2)
    
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
    arrow_size = int(min(width, height) * 0.03)
    
    # Function to draw a ">" arrow
    def draw_arrow(x, y, size, color):
        points = [
            (x, y - size // 2),  # Top point
            (x + size // 2, y),  # Right point
            (x, y + size // 2),  # Bottom point
            (x - size // 3, y),  # Left point (inner)
        ]
        draw.polygon(points, fill=color)
    
    # Draw multiple ">" arrows in yellow and green (scaled positions)
    arrows = [
        # Yellow arrows
        (int(width * 0.13), int(height * 0.2), yellow_rgb),
        (int(width * 0.87), int(height * 0.3), yellow_rgb),
        (int(width * 0.17), int(height * 0.8), yellow_rgb),
        (int(width * 0.8), int(height * 0.7), yellow_rgb),
        # Green arrows
        (int(width * 0.1), int(height * 0.6), green_rgb),
        (int(width * 0.9), int(height * 0.2), green_rgb),
        (int(width * 0.07), int(height * 0.9), green_rgb),
        (int(width * 0.93), int(height * 0.8), green_rgb),
    ]
    
    for x, y, color in arrows:
        draw_arrow(x, y, arrow_size, (*color, 200))
    
    return img

def create_seedify_banner(output_path):
    """Create Seedify hackathon banner with abstract background"""
    print(f"Creating Seedify hackathon banner...")
    
    # Banner dimensions (standard banner size)
    width, height = 1920, 1080
    
    # Create abstract background
    img = create_abstract_background(width, height)
    draw = ImageDraw.Draw(img)
    
    # Load predinex logo
    predinex_logo_path = '/home/leon/predinex-front/public/docs/img/predinex-logo.png'
    if not os.path.exists(predinex_logo_path):
        print(f"Error: Predinex logo not found at {predinex_logo_path}")
        return
    
    predinex_logo = Image.open(predinex_logo_path)
    if predinex_logo.mode != 'RGBA':
        predinex_logo = predinex_logo.convert('RGBA')
    
    # Resize predinex logo for top (about 15% of height)
    logo_height = int(height * 0.15)
    logo_aspect = predinex_logo.width / predinex_logo.height
    logo_width = int(logo_height * logo_aspect)
    predinex_logo_resized = predinex_logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
    
    # Center logo at top
    logo_x = (width - logo_width) // 2
    logo_y = int(height * 0.08)
    
    # Paste predinex logo
    img.paste(predinex_logo_resized, (logo_x, logo_y), predinex_logo_resized)
    
    # Add main text
    font_size_large = int(height * 0.06)
    font_size_small = int(height * 0.025)
    
    # Try to load fonts
    try:
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        ]
        font_large = None
        font_small = None
        for font_path in font_paths:
            try:
                if font_large is None:
                    font_large = ImageFont.truetype(font_path, font_size_large)
                if font_small is None:
                    font_small = ImageFont.truetype(font_path, font_size_small)
                if font_large and font_small:
                    break
            except:
                continue
        if font_large is None:
            font_large = ImageFont.load_default()
        if font_small is None:
            font_small = ImageFont.load_default()
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Add social links beneath logo
    font_size_social = int(height * 0.022)
    try:
        font_social = None
        for font_path in font_paths:
            try:
                font_social = ImageFont.truetype(font_path, font_size_social)
                break
            except:
                continue
        if font_social is None:
            font_social = ImageFont.load_default()
    except:
        font_social = ImageFont.load_default()
    
    # Social links data
    social_links = [
        ("predinex.xyz", "globe"),
        ("x.com/predinex_", "x"),
        ("t.me/predinex", "telegram"),
    ]
    
    # Icon size
    icon_size = int(height * 0.025)
    social_spacing = 80
    text_spacing = 12
    
    # Calculate total width
    social_items = []
    total_social_width = 0
    for text, icon_type in social_links:
        bbox_text = draw.textbbox((0, 0), text, font=font_social)
        text_width = bbox_text[2] - bbox_text[0]
        item_width = icon_size + text_spacing + text_width
        social_items.append((text, icon_type, item_width))
        total_social_width += item_width + social_spacing
    
    total_social_width -= social_spacing  # Remove last spacing
    
    # Load icon images
    telegram_icon_path = '/home/leon/predinex-front/public/docs/img/telegram-icon.png'
    web_icon_path = '/home/leon/predinex-front/public/docs/img/web-icon.png'
    twitter_icon_path = '/home/leon/predinex-front/public/docs/img/twitter-icon.png'
    
    telegram_icon = None
    web_icon = None
    twitter_icon = None
    
    if os.path.exists(telegram_icon_path):
        telegram_icon = Image.open(telegram_icon_path)
        if telegram_icon.mode != 'RGBA':
            telegram_icon = telegram_icon.convert('RGBA')
    
    if os.path.exists(web_icon_path):
        web_icon = Image.open(web_icon_path)
        if web_icon.mode != 'RGBA':
            web_icon = web_icon.convert('RGBA')
    
    if os.path.exists(twitter_icon_path):
        twitter_icon = Image.open(twitter_icon_path)
        if twitter_icon.mode != 'RGBA':
            twitter_icon = twitter_icon.convert('RGBA')
    
    # Position social links centered below logo
    social_start_x = (width - total_social_width) // 2
    social_y = logo_y + logo_height + int(height * 0.04)
    
    current_x = social_start_x
    for text, icon_type, item_width in social_items:
        icon_y = social_y + int(icon_size * 0.1)  # Slight vertical adjustment
        
        # Draw icon based on type
        if icon_type == "globe":
            # Use web icon image
            if web_icon:
                web_resized = web_icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
                img.paste(web_resized, (current_x, icon_y), web_resized)
            else:
                # Fallback to drawn icon if image not found
                center_x = current_x + icon_size // 2
                center_y = icon_y + icon_size // 2
                radius = icon_size // 2 - 2
                draw.ellipse(
                    [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
                    outline=(255, 255, 255, 255),
                    width=2
                )
                draw.line(
                    [(center_x - radius, center_y), (center_x + radius, center_y)],
                    fill=(255, 255, 255, 255),
                    width=1
                )
                draw.line(
                    [(center_x, center_y - radius), (center_x, center_y + radius)],
                    fill=(255, 255, 255, 255),
                    width=1
                )
        elif icon_type == "x":
            # Use Twitter icon image
            if twitter_icon:
                twitter_resized = twitter_icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
                img.paste(twitter_resized, (current_x, icon_y), twitter_resized)
            else:
                # Fallback to drawn icon if image not found
                icon_x1 = current_x
                icon_y1 = icon_y
                icon_x2 = current_x + icon_size
                icon_y2 = icon_y + icon_size
                draw.line([(icon_x1, icon_y1), (icon_x2, icon_y2)], fill=(255, 255, 255, 255), width=3)
                draw.line([(icon_x2, icon_y1), (icon_x1, icon_y2)], fill=(255, 255, 255, 255), width=3)
        elif icon_type == "telegram":
            # Use Telegram icon image
            if telegram_icon:
                telegram_resized = telegram_icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
                img.paste(telegram_resized, (current_x, icon_y), telegram_resized)
            else:
                # Fallback to drawn icon if image not found
                icon_x = current_x + icon_size // 2
                icon_y_top = icon_y
                icon_y_bottom = icon_y + icon_size
                points = [
                    (icon_x - icon_size // 3, icon_y_top),
                    (icon_x + icon_size // 3, icon_y_top + icon_size // 2),
                    (icon_x - icon_size // 3, icon_y_bottom),
                ]
                draw.polygon(points, outline=(255, 255, 255, 255), width=2)
                draw.polygon(points, fill=(255, 255, 255, 180))
        
        # Draw text next to icon
        text_x = current_x + icon_size + text_spacing
        draw.text(
            (text_x, social_y),
            text,
            font=font_social,
            fill=(255, 255, 255, 255)
        )
        
        current_x += item_width + social_spacing
    
    # Main text
    main_text = "Applied for Seedify Prediction Markets Hackathon"
    bbox = draw.textbbox((0, 0), main_text, font=font_large)
    text_width = bbox[2] - bbox[0]
    text_x = (width - text_width) // 2
    text_y = int(height * 0.5)  # Center vertically
    
    # Draw text with shadow
    shadow_offset = 4
    draw.text(
        (text_x + shadow_offset, text_y + shadow_offset),
        main_text,
        font=font_large,
        fill=(0, 0, 0, 200)
    )
    draw.text(
        (text_x, text_y),
        main_text,
        font=font_large,
        fill=(255, 255, 255, 255)
    )
    
    # Load partner logos
    seedify_logo_path = '/home/leon/predinex-front/public/docs/img/seedify-logo.png'
    bsc_logo_path = '/home/leon/predinex-front/public/docs/img/binance-smart-chain-logo.png'
    
    if os.path.exists(seedify_logo_path) and os.path.exists(bsc_logo_path):
        seedify_logo = Image.open(seedify_logo_path)
        bsc_logo = Image.open(bsc_logo_path)
        
        if seedify_logo.mode != 'RGBA':
            seedify_logo = seedify_logo.convert('RGBA')
        if bsc_logo.mode != 'RGBA':
            bsc_logo = bsc_logo.convert('RGBA')
        
        # Resize logos for bottom (bigger - about 12% of height)
        partner_logo_height = int(height * 0.12)
        
        # Process Seedify logo to make text white
        # Create a white overlay for text areas
        seedify_processed = seedify_logo.copy()
        seedify_pixels = seedify_processed.load()
        for y in range(seedify_processed.height):
            for x in range(seedify_processed.width):
                r, g, b, a = seedify_pixels[x, y]
                # If pixel is dark (likely text), make it white
                if a > 0 and (r < 100 and g < 100 and b < 100):
                    seedify_pixels[x, y] = (255, 255, 255, a)
        
        # Resize seedify logo
        seedify_aspect = seedify_processed.width / seedify_processed.height
        seedify_width = int(partner_logo_height * seedify_aspect)
        seedify_resized = seedify_processed.resize((seedify_width, partner_logo_height), Image.Resampling.LANCZOS)
        
        # Resize BSC logo
        bsc_aspect = bsc_logo.width / bsc_logo.height
        bsc_width = int(partner_logo_height * bsc_aspect)
        bsc_resized = bsc_logo.resize((bsc_width, partner_logo_height), Image.Resampling.LANCZOS)
        
        # Calculate positions for "Powered by" section
        total_logo_width = seedify_width + bsc_width + 40  # 40px spacing
        powered_by_text = "Powered by"
        bbox_powered = draw.textbbox((0, 0), powered_by_text, font=font_small)
        powered_text_width = bbox_powered[2] - bbox_powered[0]
        powered_text_height = bbox_powered[3] - bbox_powered[1]
        
        section_start_x = (width - (powered_text_width + total_logo_width + 20)) // 2
        section_y = int(height * 0.85)
        
        # Draw "Powered by" text
        draw.text(
            (section_start_x, section_y),
            powered_by_text,
            font=font_small,
            fill=(255, 255, 255, 200)
        )
        
        # Position logos next to text, vertically centered with text
        logo_start_x = section_start_x + powered_text_width + 20
        # Center logos vertically with text
        logo_y = section_y + (powered_text_height - partner_logo_height) // 2
        seedify_x = logo_start_x
        bsc_x = logo_start_x + seedify_width + 20
        
        # Paste logos
        img.paste(seedify_resized, (seedify_x, logo_y), seedify_resized)
        img.paste(bsc_resized, (bsc_x, logo_y), bsc_resized)
    
    # Convert back to RGB and save
    img = img.convert('RGB')
    img.save(output_path, 'PNG', optimize=True)
    print(f"✓ Seedify hackathon banner saved to {output_path}")

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
    
    # Create Seedify hackathon banner
    banner_output = '/home/leon/predinex-front/public/docs/img/seedify-hackathon-banner.png'
    create_seedify_banner(banner_output)

