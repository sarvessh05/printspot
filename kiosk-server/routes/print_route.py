from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
from models.print_job import PrintJob
from utils.state import get_kiosk_state, update_counters
from utils.printer_status import printer_tracker
from utils.print_engine import print_pdf
from utils.cloud_client import cloud
from utils.file_downloader import download_file
from utils.logger import get_logger
from utils.notifications import notifier
from config import settings
import os
from pathlib import Path

logger = get_logger("print_route")
router = APIRouter()

@router.post("/print")
async def print_jobs_endpoint(jobs: List[PrintJob]):
    """
    Main entry point for fulfilling print jobs. 
    Implements the same logic as server.js with enhanced reliability.
    """
    if not jobs:
        raise HTTPException(status_code=400, detail="Invalid request. No jobs provided.")

    otp = jobs[0].otp
    logger.info(f"[INCOMING] REQUEST | OTP: {otp} | Files: {len(jobs)}")

    # 1. PRE-FLIGHT CHECKS: PAPER & INK
    required_pages = sum((int(j.totalPages) or 1) * (int(j.copies) or 1) for j in jobs)
    state = await get_kiosk_state()
    
    if state.get("paper", 0) < required_pages or state.get("ink", 0) < required_pages:
        issue = "OUT_OF_PAPER" if state.get("paper", 0) < required_pages else "OUT_OF_INK"
        logger.error(f"[FAILED] CHECK FAILED: KIOSK IS {issue}")
        await notifier.send_alert(f"⚠️ {issue} — OTP: {otp}")
        for job in jobs:
            await cloud.revert_job(job.db_id)
        raise HTTPException(status_code=400, detail=issue)

    # 2. HARDWARE CHECK: CONNECTIVITY & JAM
    status_info = await printer_tracker.get_comprehensive_status()
    if not status_info["is_online"]:
        logger.error("[FAILED] MACHINE OFFLINE. Reverting OTPs...")
        await notifier.send_alert(f"🖨️ MACHINE OFFLINE — OTP: {otp} reverted.")
        for job in jobs:
            await cloud.revert_job(job.db_id)
        raise HTTPException(status_code=400, detail="MACHINE_OFFLINE")
        
    if status_info["status"] == "JAMMED":
        logger.error("[JAMMED] MACHINE JAMMED. Reverting OTPs...")
        await notifier.send_alert(f"🖨️ PAPER JAM DETECTED — OTP: {otp} reverted.")
        for job in jobs:
            await cloud.revert_job(job.db_id)
        raise HTTPException(status_code=400, detail="MACHINE_JAMMED")

    # 3. EXECUTION: DOWNLOAD AND PRINT
    logger.info(f"[STARTING] All checks passed. Starting print series for OTP {otp}...")
    
    try:
        temp_dir = settings.TEMP_PRINTS_DIR
        temp_dir.mkdir(exist_ok=True)

        for job in jobs:
            filename = f"print_{job.db_id}.pdf"
            
            # Download — returns absolute Path or None on failure
            logger.info(f"[HTTP] Downloading file for job {job.db_id}...")
            local_path = await download_file(job.downloadUrl, filename)
            if not local_path:
                logger.error(f"[FAILED] Download failed for {job.db_id}")
                await cloud.revert_job(job.db_id)
                continue

            # Map settings correctly to what print_engine expects
            options = {
                "copies": int(job.copies) or 1,
                "mode": job.mode,          # 'bw' or 'color'
                "isTwoSided": job.isTwoSided,
            }
            
            # Page range handling
            if job.printRange and job.printRange.lower() not in ["all", "all pages"]:
                options["pages"] = job.printRange
            elif job.totalPages:
                options["pages"] = f"1-{job.totalPages}"

            # PRINT COMMAND
            success = await print_pdf(local_path, options)
            
            if success:
                logger.info(f"[PRINT] Successfully sent {job.db_id} to printer.")
                # Report completion
                await cloud.complete_job_stats(job.db_id, paper_used=(int(job.totalPages) or 1) * (int(job.copies) or 1))
            else:
                logger.error(f"[FAILED] Printer Dispatch FAILED for {job.db_id}")
                await notifier.send_alert(f"❌ Print FAILED for Job {job.db_id} — OTP: {otp}")
                await cloud.revert_job(job.db_id)

            # Cleanup temp file
            if local_path.exists():
                local_path.unlink()

        # Finalize stats
        await update_counters(required_pages)
        return {"success": True, "message": "All print tasks dispatched."}

    except Exception as e:
        logger.critical(f"[CRITICAL] CRITICAL ERROR in print lifecycle: {e}")
        await notifier.send_alert(f"💥 CRITICAL ERROR in Print Lifecycle!\nOTP: {otp}\nError: {str(e)}")
        # One last attempt to revert if something broke midway
        for job in jobs:
            await cloud.revert_job(job.db_id)
        raise HTTPException(status_code=500, detail="MACHINE_ERROR")
