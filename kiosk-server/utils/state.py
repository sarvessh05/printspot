import json
import asyncio
from pathlib import Path
from config import settings

# Path to the state file
STATE_FILE = settings.STATE_FILE

# Global lock for thread-safe/async-safe file access
_lock = asyncio.Lock()

def _sync_save(state: dict):
    """Blocking write to be used internally or in thread."""
    content = json.dumps(state, indent=2)
    STATE_FILE.write_text(content)

async def get_kiosk_state() -> dict:
    """Reads the current state from the JSON file."""
    async with _lock:
        if not STATE_FILE.exists():
            # Default state if file is missing
            state = {"paper": 500, "ink": 6000}
            _sync_save(state)
            return state
            
        try:
            content = STATE_FILE.read_text()
            return json.loads(content)
        except (json.JSONDecodeError, Exception):
            return {"paper": 500, "ink": 6000}

async def save_kiosk_state(state: dict):
    """Writes the given state to the JSON file."""
    async with _lock:
        try:
            _sync_save(state)
        except Exception as e:
            print(f"Error saving state: {e}")

async def update_counters(pages: int):
    """Convenience method to deduct paper and ink."""
    state = await get_kiosk_state()
    state["paper"] = max(0, state.get("paper", 0) - pages)
    state["ink"] = max(0, state.get("ink", 0) - pages) # Simplified assumption 1 page = 1 ink unit
    await save_kiosk_state(state)
    return state
