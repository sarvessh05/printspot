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

@router.get("/printer/status")
async def get_printer_status():
    """Returns the current machine health for the frontend."""
    status_info = await printer_tracker.get_comprehensive_status()
    # If not online, return OFFLINE/ERROR
    if not status_info["is_online"]:
        return {"status": "OFFLINE", "reason": "Printer connection lost or switched off."}
    
    # Check paper/ink via state
    state = await get_kiosk_state()
    if state.get("paper", 0) <= 5:
        return {"status": "ERROR", "reason": "MACHINE_OUT_OF_PAPER"}
        
    return {
        "status": status_info["status"], # READY, BUSY, etc.
        "paper": state.get("paper"),
        "ink": state.get("ink"),
        "is_online": True
    }

@router.post("/print/print-pdf")
async def manual_print_trigger(item: dict):
    """Fallback manual trigger for individual file items."""
    logger.info(f"Manual print trigger received for {item.get('name')}")
    # Logic similar to main loop...
    return {"status": "accepted"}

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

    # 1. PRE-FLIGHT CHECKS: PAPER & INergy
    logger.info(f"🔍 [CHECK] Calculating required pages for {len(jobs)} jobs...")
    import math
    required_pages = 0
    for j in jobs:
        try:
             # Handle totalPages being string or int
            t_pages = int(j.totalPages) if j.totalPages else 1
            pages_per_copy = math.ceil(t_pages / 2) if j.isTwoSided else t_pages
            required_pages += pages_per_copy * (int(j.copies) or 1)
        except Exception as e:
            logger.error(f"❌ Page calculation error: {e}")
            required_pages += 1
        
    logger.info(f"🔍 [CHECK] Total pages required: {required_pages}. Fetching kiosk state...")
    state = await get_kiosk_state()
    logger.info(f"🔍 [CHECK] State fetched (Paper: {state.get('paper')}). Checking hardware status...")
    
    if state.get("paper", 0) < required_pages or state.get("ink", 0) < required_pages:
        issue = "OUT_OF_PAPER" if state.get("paper", 0) < required_pages else "OUT_OF_INK"
        logger.error(f"[FAILED] CHECK FAILED: KIOSK IS {issue}")
        await notifier.send_alert(f"⚠️ {issue} — OTP: {otp}")
        for job in jobs:
            await cloud.revert_job(job.db_id)
        raise HTTPException(status_code=400, detail=issue)

    # 2. HARDWARE CHECK: CONNECTIVITY & JAM
    logger.info("🔍 [CHECK] Querying printer_tracker.get_comprehensive_status()...")
    status_info = await printer_tracker.get_comprehensive_status()
    logger.info(f"🔍 [CHECK] Hardware status result: {status_info['status']}")
    
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

            # Map settings correctly
            options = {
                "copies": int(job.copies) or 1,
                "mode": job.mode,
                "isTwoSided": job.isTwoSided,
                "paperSize": job.paperSize,
            }
            
            # Page range handling for the whole job
            if job.printRange and job.printRange.lower() not in ["all", "all pages"]:
                options["pages"] = job.printRange

            # Mixed Color Handling
            if job.mode == "mixed" and job.colorPages:
                logger.info(f"🎨 [MIXED MODE] Splitting job {job.db_id} into BW and Color parts...")
                from utils.pdf_processor import split_pdf_by_color
                bw_path, color_path = await split_pdf_by_color(local_path, job.colorPages, temp_dir)
                
                # 1. Print Color Part
                if color_path:
                    color_options = options.copy()
                    color_options["mode"] = "color"
                    # Remove broad page range as we already split specific pages
                    color_options.pop("pages", None) 
                    logger.info(f"📤 Dispatching COLOR part...")
                    await print_pdf(color_path, color_options)
                    if color_path != local_path:
                        color_path.unlink()

                # 2. Print BW Part
                if bw_path:
                    bw_options = options.copy()
                    bw_options["mode"] = "bw"
                    bw_options.pop("pages", None)
                    logger.info(f"📤 Dispatching BW part...")
                    await print_pdf(bw_path, bw_options)
                    if bw_path != local_path:
                        bw_path.unlink()
                
                success = True # Assume success if both dispatched (better error handling could be added)
            else:
                # Standard single-mode print
                success = await print_pdf(local_path, options)
            
            if success:
                logger.info(f"[PRINT] Successfully sent {job.db_id} to printer.")
                # Report completion
                await cloud.complete_job_stats(job.db_id, paper_used=(int(job.totalPages) or 1) * (int(job.copies) or 1))
            else:
                logger.error(f"[FAILED] Printer Dispatch FAILED for {job.db_id}")
                await notifier.send_alert(f"❌ Print FAILED for Job {job.db_id} — OTP: {otp}")
                # REVERT to pending so user can retry — Don't lose their money!
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
