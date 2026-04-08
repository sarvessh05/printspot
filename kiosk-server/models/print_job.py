from pydantic import BaseModel, Field
from typing import Optional

class PrintJob(BaseModel):
    """
    Pydantic model representing a single job in a print request.
    This matches the payload sent from the frontend KioskPage.jsx.
    """
    db_id: str = Field(..., description="Supabase UUID for the print_orders record")
    otp: str = Field(..., description="The 6-digit OTP entered by the user")
    downloadUrl: str = Field(..., description="Direct HTTPS link to the file in Supabase Storage")
    copies: int = Field(default=1, ge=1)
    mode: str = Field(default="bw", description="One of 'bw' or 'color'")
    paperSize: str = Field(default="A4", description="A4, A3, or Letter")
    isTwoSided: bool = Field(default=False)
    printRange: str = Field(default="All Pages")
    colorPages: Optional[str] = Field(default=None, description="Comma separated page numbers for mixed color, e.g. '1,3,5-7'")
    totalPages: int = Field(default=1, ge=1)
    
    # Optional metadata that might be provided from older integrations
    uniqueName: Optional[str] = None
    fileName: Optional[str] = None
    paymentId: Optional[str] = None
