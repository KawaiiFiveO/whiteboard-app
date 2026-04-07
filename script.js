// Getting references to DOM elements
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const drawBtn = document.getElementById('drawBtn');
const eraseBtn = document.getElementById('eraseBtn');
const clearBtn = document.getElementById('clearBtn');
const themeToggle = document.getElementById('themeToggle');
const strokeSizeSlider = document.getElementById('strokeSize');
const strokeSizeValue = document.getElementById('strokeSizeValue');
const stabilizerCheckbox = document.getElementById('stabilizerCheckbox');

// Configuration
const SMOOTHING = 0.2; // 0.1 is very slow/smooth, 0.8 is sharp/fast

// Set canvas size
function setCanvasSize() {
    // Save current drawing before resizing
    const tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 50;

    // Restore drawing (best effort)
    ctx.putImageData(tempImage, 0, 0);
}
setCanvasSize();

// Default settings
let isErasing = false;
let baseDrawLineWidth = parseInt(strokeSizeSlider.value);
let baseEraseLineWidth = 100;
let strokeStyle = '#000000';

// Keep track of active pointers (for multi-touch support)
const activePointers = {}; 

// Update stroke size text display
strokeSizeValue.textContent = baseDrawLineWidth;

// Event listeners for pointer
canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointercancel', stopDrawing);
canvas.addEventListener('pointerout', stopDrawing);

// Event listener for stroke size slider
strokeSizeSlider.addEventListener('input', function () {
    baseDrawLineWidth = parseInt(this.value);
    strokeSizeValue.textContent = this.value;
});

function startDrawing(e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId); // Keeps tracking even if finger leaves canvas slightly

    const { x, y } = getCanvasCoordinates(e);
    const pressure = e.pressure || 0.5;

    activePointers[e.pointerId] = {
        drawing: true,
        lastX: x,
        lastY: y,
        // Smooth values start at current position
        smoothX: x,
        smoothY: y,
        smoothPressure: pressure
    };
}

function draw(e) {
    const state = activePointers[e.pointerId];
    if (!state || !state.drawing) return;

    const { x: targetX, y: targetY } = getCanvasCoordinates(e);
    const targetPressure = e.pressure || 0.5;

    let drawX, drawY, drawPressure;

    if (stabilizerCheckbox.checked) {
        // --- THE STABILIZER (Weighted Smoothing) ---
        // We move the "smooth" coordinates only a percentage toward the real cursor
        state.smoothX += (targetX - state.smoothX) * SMOOTHING;
        state.smoothY += (targetY - state.smoothY) * SMOOTHING;
        state.smoothPressure += (targetPressure - state.smoothPressure) * SMOOTHING;
        
        drawX = state.smoothX;
        drawY = state.smoothY;
        drawPressure = state.smoothPressure;
    } else {
        // Stabilizer OFF: Move directly to pointer
        drawX = targetX;
        drawY = targetY;
        drawPressure = targetPressure;
    }

    const lineWidth = isErasing ? baseEraseLineWidth : baseDrawLineWidth * drawPressure;
    const color = isErasing ? '#ffffff' : strokeStyle;

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round'; // Makes corners less jagged
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(lineWidth, 0.5); // Ensure line never fully disappears
    
    ctx.moveTo(state.lastX, state.lastY);
    ctx.lineTo(drawX, drawY);
    ctx.stroke();
    ctx.closePath();

    // Update last position for the next frame
    state.lastX = drawX;
    state.lastY = drawY;
}

function stopDrawing(e) {
    if (activePointers[e.pointerId]) {
        delete activePointers[e.pointerId];
    }
}

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

// Toolbar Logic
drawBtn.addEventListener('click', () => {
    isErasing = false;
    canvas.style.cursor = "crosshair";
});

eraseBtn.addEventListener('click', () => {
    isErasing = true;
    canvas.style.cursor = "cell";
});

clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// --- DARK MODE LOGIC (No Local Storage) ---
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
        themeToggle.textContent = 'Light Mode';
    } else {
        themeToggle.textContent = 'Dark Mode';
    }
});

// Handle window resize
window.addEventListener('resize', setCanvasSize);