let currentScanner = null;
let attendanceScanner = null;
let attendanceRecords = [];
let totalScans = 0;

document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeQRGenerator();
    initializeQRScanner();
    initializeAttendanceSystem();
    setCurrentSession();
});

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            if (currentScanner) {
                currentScanner.stop();
                currentScanner = null;
                document.getElementById('start-scan').style.display = 'block';
                document.getElementById('stop-scan').style.display = 'none';
            }

            if (attendanceScanner) {
                attendanceScanner.stop();
                attendanceScanner = null;
                document.getElementById('start-attendance-scan').style.display = 'block';
                document.getElementById('stop-attendance-scan').style.display = 'none';
            }
        });
    });
}

function initializeQRGenerator() {
    const idInput = document.getElementById('student-id');
    const nameInput = document.getElementById('student-name');
    const qrDisplay = document.getElementById('qr-display');
    const qrActions = document.getElementById('qr-actions');
    const qrData = document.getElementById('qr-data');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const studentButtons = document.querySelectorAll('.student-btn');

    [idInput, nameInput].forEach(input => {
        input.addEventListener('input', generateQRCode);
    });

    studentButtons.forEach(button => {
        button.addEventListener('click', () => {
            const studentData = JSON.parse(button.getAttribute('data-student'));
            idInput.value = studentData.id;
            nameInput.value = studentData.name;
            generateQRCode();
        });
    });

    copyBtn.addEventListener('click', async () => {
        try {
            const data = JSON.stringify({ id: idInput.value, name: nameInput.value });
            await navigator.clipboard.writeText(data);
            copyBtn.innerHTML = '✅ Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = '📋 Copy Text';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    });

    downloadBtn.addEventListener('click', () => {
        const svg = qrDisplay.querySelector('svg');
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qr-code-${Date.now()}.svg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });

    function generateQRCode() {
        const id = idInput.value.trim();
        const name = nameInput.value.trim();

        if (!id || !name) {
            qrDisplay.innerHTML = '<p class="placeholder">Enter ID and name to generate QR code</p>';
            qrDisplay.classList.remove('has-qr');
            qrActions.style.display = 'none';
            qrData.style.display = 'none';
            return;
        }

        const jsonData = JSON.stringify({ id, name });

        try {
            const qr = qrcode(0, 'M');
            qr.addData(jsonData);
            qr.make();

            qrDisplay.innerHTML = qr.createSvgTag(4);
            qrDisplay.classList.add('has-qr');
            qrActions.style.display = 'flex';
            qrData.style.display = 'block';
            qrData.textContent = jsonData;
        } catch (error) {
            console.error('Error generating QR code:', error);
            qrDisplay.innerHTML = '<p class="placeholder">Error generating QR code</p>';
        }
    }
}

function initializeQRScanner() {
    const startScanBtn = document.getElementById('start-scan');
    const stopScanBtn = document.getElementById('stop-scan');
    const scanResults = document.getElementById('scan-results');

    startScanBtn.addEventListener('click', startScanning);
    stopScanBtn.addEventListener('click', stopScanning);

    function startScanning() {
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        currentScanner = new Html5QrcodeScanner('qr-reader', config, false);

        currentScanner.render(
            (decodedText) => {
                displayScanResult(decodedText);
                stopScanning();
            },
            (error) => {
                console.debug('QR scan error:', error);
            }
        );

        startScanBtn.style.display = 'none';
        stopScanBtn.style.display = 'block';
    }

    function stopScanning() {
        if (currentScanner) {
            currentScanner.clear();
            currentScanner = null;
        }
        startScanBtn.style.display = 'block';
        stopScanBtn.style.display = 'none';
    }

    function displayScanResult(result) {
        scanResults.innerHTML = `
            <div class="success-result">
                <h3>✅ Scanned Successfully!</h3>
                <div class="result-content">${result}</div>
            </div>
            <button class="btn btn-primary" onclick="clearScanResults()">Clear Results</button>
        `;
    }
}

function clearScanResults() {
    const scanResults = document.getElementById('scan-results');
    scanResults.innerHTML = `
        <div class="placeholder-result">
            <span class="icon">📷</span>
            <p>Scan results will appear here</p>
        </div>
    `;
}

function initializeAttendanceSystem() {
    const startBtn = document.getElementById('start-attendance-scan');
    const stopBtn = document.getElementById('stop-attendance-scan');
    const exportBtn = document.getElementById('export-csv');
    const clearBtn = document.getElementById('clear-attendance');

    startBtn.addEventListener('click', startAttendanceScanning);
    stopBtn.addEventListener('click', stopAttendanceScanning);
    exportBtn.addEventListener('click', exportAttendanceCSV);
    clearBtn.addEventListener('click', clearAttendance);

    function startAttendanceScanning() {
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        attendanceScanner = new Html5QrcodeScanner('attendance-reader', config, false);
        attendanceScanner.render(
            (decodedText) => {
                processAttendance(decodedText);
                stopAttendanceScanning();
            },
            (error) => {
                console.debug('Attendance scan error:', error);
            }
        );

        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
    }

    function stopAttendanceScanning() {
        if (attendanceScanner) {
            attendanceScanner.clear();
            attendanceScanner = null;
        }
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
    }

        function processAttendance(data) {
        totalScans++; 
        try {
        let attendeeInfo = JSON.parse(data);
            const existingRecord = attendanceRecords.find(r => r.id === attendeeInfo.id);

            if (existingRecord) {
                showMessage('error', `${attendeeInfo.name || attendeeInfo.id} already marked present`);
                return;
            }

            const now = new Date();
            const newRecord = {
                id: attendeeInfo.id,
                name: attendeeInfo.name || attendeeInfo.id,
                timestamp: now,
                status: 'present' // No more "late"
            };

            attendanceRecords.push(newRecord);
            updateAttendanceDisplay();
            showMessage('success', `${newRecord.name} marked present`);
        } catch (error) {
            showMessage('error', 'Invalid QR code format');
        }
    }

    function updateAttendanceDisplay() {
        const tbody = document.getElementById('attendance-tbody');
        const totalPresent = document.getElementById('total-present');
        const onTime = document.getElementById('on-time');
        const lateCount = document.getElementById('late-count');

        totalPresent.textContent = attendanceRecords.length;
        onTime.textContent = attendanceRecords.length;
        lateCount.textContent = totalScans; 
        document.getElementById('export-csv').disabled = attendanceRecords.length === 0;
        document.getElementById('clear-attendance').disabled = attendanceRecords.length === 0;

        if (attendanceRecords.length === 0) {
            tbody.innerHTML = `
                <tr class="no-records">
                    <td colspan="4">No attendance records yet. Scan a QR code to mark attendance.</td>
                </tr>
            `;
        } else {
            tbody.innerHTML = attendanceRecords.map(record => `
                <tr>
                    <td>${record.id}</td>
                    <td>👤 ${record.name}</td>
                    <td>${record.timestamp.toLocaleTimeString()}</td>
                    <td><span class="status-badge status-present">present</span></td>
                </tr>
            `).join('');
        }
    }

    function exportAttendanceCSV() {
        const csvContent = [
            ['Student ID', 'Name', 'Timestamp', 'Status'],
            ...attendanceRecords.map(r => [
                r.id, r.name, r.timestamp.toLocaleString(), r.status
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function clearAttendance() {
        attendanceRecords = [];
        updateAttendanceDisplay();
        showMessage('success', 'Attendance cleared');
    }
}

function showMessage(type, text) {
    const messageDiv = document.getElementById('attendance-message');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${text}</span>`;
    messageDiv.style.display = 'flex';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

function setCurrentSession() {
    const now = new Date();
    const sessionText = `Session ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    document.getElementById('current-session').textContent = sessionText;
}
