require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pdfToPrinter = require('pdf-to-printer');
const { exec } = require('child_process'); 
const snmp = require('net-snmp'); // 🚀 SNMP IS THE KING

const app = express();
app.use(cors());
app.use(express.json());

// 📁 FOLDERS & FILES SETUP
const tempFolder = path.join(__dirname, 'temp_prints');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder);

const stateFile = path.join(__dirname, 'kiosk_state.json');
if (!fs.existsSync(stateFile)) {
    fs.writeFileSync(stateFile, JSON.stringify({ paper: 500, ink: 6000 }));
}

const getKioskState = () => JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const saveKioskState = (state) => fs.writeFileSync(stateFile, JSON.stringify(state));

// ==========================================
// 🔌 CHECK 1: TRUE OFFLINE CHECKER (PING)
// ==========================================
const checkPrinterPing = (ip) => {
    return new Promise((resolve) => {
        console.log(`📡 [PING] Check kar rahe hain ki sach me taar judi hai ya nahi (${ip})...`);
        exec(`ping -n 1 -w 2000 ${ip}`, { windowsHide: true }, (err, stdout) => {
            if (err || stdout.includes('Destination net unreachable') || stdout.includes('Request timed out')) {
                console.log(`❌ [PING FAILED] Printer SACH MEIN OFFLINE hai (Power off / Cable out)!`);
                resolve(false); 
            } else {
                console.log(`✅ [PING SUCCESS] Printer network par zinda hai!`);
                resolve(true);  
            }
        });
    });
};

// ==========================================
// 🚀 CHECK 2: SNMP HARDWARE CHECKER (JAM / TRAY OPEN)
// ==========================================
const checkPrinterSNMP = (ip) => {
    return new Promise((resolve) => {
        console.log("🔍 [SNMP] Hardware status check kar rahe hain...");
        const session = snmp.createSession(ip, "public", { timeouts: [2000], retries: 1 });
        const oids = ["1.3.6.1.2.1.25.3.2.1.5.1"]; 

        session.get(oids, (error, varbinds) => {
            if (error) {
                session.close();
                // 🔥 KUMBHKARAN FIX: Ping pass hua par ye fail hua? Matlab so raha hai.
                console.log("💤 [SNMP] Timeout. Printer Deep Sleep mein hai. Isko READY maan kar aage badhenge.");
                return resolve({ isOnline: true, status: "SLEEP_MODE", code: 0 }); 
            }
            if (snmp.isVarbindError(varbinds[0])) {
                session.close();
                return resolve({ isOnline: true, status: "UNKNOWN", code: 2 });
            }

            const statusCode = varbinds[0].value;
            session.close();

            if (statusCode === 5) {
                console.log("🚨 [SNMP] Hardware Error! Tray khuli hai ya Paper Jam hai!");
                return resolve({ isOnline: true, status: "ERROR_OR_JAMMED", code: 5 });
            }
            
            console.log("✅ [SNMP] Hardware ekdum theek aur Ready hai.");
            return resolve({ isOnline: true, status: "READY", code: statusCode });
        });
    });
};

// ==========================================
// 🔄 OTP SAVER (Bache ka paisa aur OTP bachane ke liye)
// ==========================================
const revertOtpOnEC2 = async (printJobs) => {
    try {
        console.log("🔄 EC2 ko bol rahe hain OTP wapas PENDING karne...");
        for (const job of printJobs) {
            await axios.post(`${process.env.VITE_EC2_IP}/api/kiosk/revert`, { db_id: job.db_id });
        }
        console.log("✅ OTP Successfully Reverted! Bacha theek hone par wapas try kar sakta hai.");
    } catch (e) {
        console.error("❌ EC2 pe OTP revert fail ho gaya.");
    }
};

// ==========================================
// 🔥 PRIMARY PRINT ENGINE 
// ==========================================
app.post('/print', async (req, res) => {
    const printJobs = req.body; 

    if (!Array.isArray(printJobs) || printJobs.length === 0) return res.status(400).json({ success: false, message: "Invalid request." });

    const otp = printJobs[0].otp;
    console.log("\n" + "=".repeat(50));
    console.log(`📥 INCOMING REQUEST | OTP: ${otp} | Files: ${printJobs.length}`);
    console.log("=".repeat(50));

    let requiredPages = 0;
    printJobs.forEach(job => requiredPages += (parseInt(job.totalPages) || 1) * (parseInt(job.copies) || 1));

    const currentState = getKioskState();
    
    // 👉 TEST 1: PAPER & INK
    if (currentState.paper < requiredPages || currentState.ink < requiredPages) {
        const issue = currentState.paper < requiredPages ? "OUT_OF_PAPER" : "OUT_OF_INK";
        console.error(`❌ CHECK FAILED: KIOSK IS ${issue}`);
        await revertOtpOnEC2(printJobs); 
        return res.status(400).json({ success: false, message: issue });
    }

    try {
        const PRINTER_IP = process.env.PRINTER_IP || "192.168.1.58"; 

        // 👉 TEST 2: SACH MEIN OFFLINE TOH NAHI HAI?
        const isOnline = await checkPrinterPing(PRINTER_IP);
        if (!isOnline) {
            await revertOtpOnEC2(printJobs); 
            return res.status(400).json({ success: false, message: "MACHINE_OFFLINE" });
        }

        // 👉 TEST 3: HARDWARE JAM/TRAY OPEN TOH NAHI HAI?
        const printerStatus = await checkPrinterSNMP(PRINTER_IP);
        if (printerStatus.code === 5) {
            await revertOtpOnEC2(printJobs); 
            return res.status(400).json({ success: false, message: "MACHINE_JAMMED" });
        }

        console.log("🚀 Saare checks pass! Print chalu kar rahe hain...");
        
        for (let i = 0; i < printJobs.length; i++) {
            const job = printJobs[i];
            const localFilePath = path.join(tempFolder, `print_${job.db_id || Date.now()}.pdf`);

            const response = await axios.get(job.downloadUrl, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } });
            fs.writeFileSync(localFilePath, response.data);

            let targetPrinter = job.mode === 'bw' ? "HP Officejet BW" : "HP Officejet Color";        
            if (job.isTwoSided) targetPrinter += " Duplex"; 

            const printerOptions = { printer: targetPrinter, copies: parseInt(job.copies) || 1, scale: "fit", paperSize: "A4" };
            if (job.printRange && job.printRange.toLowerCase() !== 'all' && job.printRange.toLowerCase() !== 'all pages') {
                 const cleanRange = job.printRange.replace(/[a-zA-Z\s]/g, ''); 
                 if (cleanRange) printerOptions.pages = cleanRange; 
            } else {
                 printerOptions.pages = `1-${job.totalPages || 100}`;
            }

            console.log(`📄 Windows ko Print Command bhej di: ${targetPrinter}`);
            await pdfToPrinter.print(localFilePath, printerOptions).catch(err => {});
            
            try { await fs.promises.unlink(localFilePath); } catch (e) {}
            
            // 👇 PRINT COMPLETE HONA PAR CLOUD UPDATE 👇
            try { 
                await axios.post(`${process.env.VITE_EC2_IP}/api/kiosk/complete`, { 
                    db_id: job.db_id,
                    kiosk_id: process.env.VITE_KIOSK_ID,
                    kiosk_token: process.env.VITE_KIOSK_TOKEN,
                    current_paper: currentState.paper - requiredPages,
                    current_ink: currentState.ink - requiredPages,
                    machine_status: "NORMAL"
                }); 
                console.log(`☁️ EC2 Cloud Dashboard Update (Completed)`);
            } catch (e) { }        
        }

        currentState.paper -= requiredPages;
        currentState.ink -= requiredPages;
        saveKioskState(currentState);

        console.log(`✅ PRINT SUCCESS! OTP: ${otp} ka kaam khatam.`);
        res.status(200).json({ success: true, message: "Print job completed successfully." });

    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error.message);
        await revertOtpOnEC2(printJobs);
        res.status(500).json({ success: false, message: "MACHINE_ERROR" });
    }
});

// ==========================================
// 🕵️‍♂️ ENGINE 2: BACKGROUND WATCHMAN (3 Sec Loop)
// ==========================================
let globalPrinterStatus = "NORMAL"; 
let isAlertSent = false; 

setInterval(async () => {
    try {
        const PRINTER_IP = process.env.PRINTER_IP || "192.168.1.58"; 
        let isHardwareJammed = false;

        const snmpStatus = await checkPrinterSNMP(PRINTER_IP);
        if (snmpStatus.code === 5) {
            isHardwareJammed = true;
        }

        const cmd = `powershell -Command "$jobs = Get-PrintJob -PrinterName '*HP*' -ErrorAction SilentlyContinue; if($jobs) { foreach($j in $jobs) { if($j.JobStatus -match 'Error|Jam|Blocked|Paused|Retained|User_Intervention') { echo 'JAMMED'; exit } } }; echo 'NORMAL'"`;

        exec(cmd, { windowsHide: true, timeout: 2000 }, (err, stdout) => {
            const queueStatus = stdout ? stdout.trim() : "NORMAL";
            
            if (isHardwareJammed || queueStatus === 'JAMMED') {
                globalPrinterStatus = "JAMMED";
            } else {
                globalPrinterStatus = "NORMAL";
            }
        });
    } catch (e) {}
}, 3000); 

app.get('/api/printer-status', (req, res) => res.json({ status: globalPrinterStatus }));

app.get('/admin/reset-jam', (req, res) => {
    globalPrinterStatus = "NORMAL";
    res.json({ success: true, message: "Status reset to NORMAL" });
});

// 🛠️ ADMIN ROUTES
app.post('/admin/reset', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ success: false });
    
    const currentState = getKioskState();
    if (req.body.paper) currentState.paper = 500; 
    if (req.body.ink) currentState.ink = 6000;    
    saveKioskState(currentState);

    try {
        await axios.post(`${process.env.VITE_EC2_IP}/api/kiosk/update-stats`, {
            kiosk_id: process.env.VITE_KIOSK_ID,
            kiosk_token: process.env.VITE_KIOSK_TOKEN,
            current_paper: currentState.paper,
            current_ink: currentState.ink,
            machine_status: globalPrinterStatus
        });
    } catch (e) {}

    res.json({ success: true, state: currentState });
});

app.post('/admin/shutdown', (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ success: false });
    res.json({ success: true, message: "Shutting down..." });
    exec('shutdown /s /t 0'); 
});

app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(5000, () => {
    console.log("\n" + "=".repeat(50));
    console.log(`🚀 PRINT KRO ULTIMATE ENGINE ONLINE`);
    console.log(`✅ Deep-Sleep Fixed | ✅ OTP Saver Active`);
    console.log(`Listening on: http://localhost:5000`);
    console.log("=".repeat(50));
});