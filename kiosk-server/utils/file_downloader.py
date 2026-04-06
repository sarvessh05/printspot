import httpx
import os
from pathlib import Path
from .logger import get_logger

logger = get_logger("file_downloader")

# Ensure temp_prints folder exists
TEMP_DIR = Path(__file__).parent.parent / "temp_prints"
TEMP_DIR.mkdir(exist_ok=True)

async def download_file(url: str, filename: str) -> Optional[Path]:
    """
    Downloads a file from a URL (e.g., Supabase Storage) to the local temp_prints/ folder.
    Returns the absolute path to the local file.
    """
    local_path = TEMP_DIR / filename
    
    logger.info(f"📥 Downloading: {filename}...")
    
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=60) as client:
            # We use stream to handle larger PDFs efficiently
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    logger.error(f"❌ Download Failed! HTTP {response.status_code}")
                    return None
                
                with open(local_path, "wb") as f:
                    for chunk in response.iter_bytes():
                        f.write(chunk)
        
        if local_path.exists():
            logger.info(f"📁 File saved at: {local_path}")
            return local_path
        
        return None
    except Exception as e:
        logger.error(f"💥 Download error: {e}")
        return None

def cleanup_file(local_path: Path):
    """
    Deletes the temporary file after printing.
    """
    try:
        if local_path.exists():
            os.remove(local_path)
            logger.info(f"🧹 Cleaned up: {local_path}")
    except Exception as e:
        logger.warning(f"⚠️ Cleanup failed: {e}")
