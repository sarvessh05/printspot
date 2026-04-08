import os
from pathlib import Path
from typing import List, Set, Tuple, Optional
from pypdf import PdfReader, PdfWriter
from .logger import get_logger

logger = get_logger("pdf_processor")

def parse_page_range(range_str: str, max_pages: int) -> Set[int]:
    """
    Parses strings like '1,3,5-7' into a set of 0-indexed page numbers.
    """
    if not range_str or range_str.lower() in ["all", "all pages"]:
        return set(range(max_pages))

    pages = set()
    parts = range_str.replace(" ", "").split(",")
    for part in parts:
        try:
            if "-" in part:
                start, end = map(int, part.split("-"))
                # Clamp to max pages and convert to 0-indexed
                start = max(1, start)
                end = min(max_pages, end)
                pages.update(range(start - 1, end))
            else:
                p = int(part)
                if 1 <= p <= max_pages:
                    pages.add(p - 1)
        except ValueError:
            logger.warning(f"⚠️ Invalid page range part skipping: {part}")
            continue
    return pages

async def split_pdf_by_color(file_path: Path, color_pages_str: str, temp_dir: Path) -> Tuple[Optional[Path], Optional[Path]]:
    """
    Splits a PDF into two: one with color pages and one with B&W pages.
    Returns (bw_path, color_path)
    """
    try:
        reader = PdfReader(file_path)
        total_pages = len(reader.pages)
        color_indices = parse_page_range(color_pages_str, total_pages)
        
        if not color_indices:
            return file_path, None # All BW (or no color specified)
        
        if len(color_indices) == total_pages:
            return None, file_path # All Color
            
        bw_writer = PdfWriter()
        color_writer = PdfWriter()
        
        for i in range(total_pages):
            if i in color_indices:
                color_writer.add_page(reader.pages[i])
            else:
                bw_writer.add_page(reader.pages[i])
        
        bw_path = temp_dir / f"bw_{file_path.name}"
        color_path = temp_dir / f"color_{file_path.name}"
        
        with open(bw_path, "wb") as f:
            bw_writer.write(f)
        
        with open(color_path, "wb") as f:
            color_writer.write(f)
            
        logger.info(f"✅ Split PDF into BW ({len(bw_writer.pages)} pages) and Color ({len(color_writer.pages)} pages)")
        return bw_path, color_path

    except Exception as e:
        logger.error(f"❌ Failed to split PDF: {e}")
        return file_path, None # Fallback to original as BW
