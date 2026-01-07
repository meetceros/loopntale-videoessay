// Global State
let currentCols = 0;
let introPlayed = false; // Track if intro animation has finished
const layoutContainer = document.getElementById('layout-container');
const contentTemplate = document.getElementById('content-template');
const lenisInstances = []; // Store Lenis instances to destroy on layout change
const bugSystems = [];     // Store BugSystem instances

// Asset Config
const MAX_BUGS_PER_COLUMN = 4;
const BUG_SIZE = 1500;
const bugImages = [
    'https://res.cloudinary.com/dr3aiznca/image/upload/v1762499047/04_tyoytr.png',
    'https://res.cloudinary.com/dr3aiznca/image/upload/v1762499047/03_ng1apb.png',
    'https://res.cloudinary.com/dr3aiznca/image/upload/v1762499047/01_m2xd17.png',
    'https://res.cloudinary.com/dr3aiznca/image/upload/v1762499047/02_ptdm3f.png',
    'https://res.cloudinary.com/dr3aiznca/image/upload/v1762692555/05_hlssum.png',
    'https://res.cloudinary.com/dr3aiznca/image/upload/v1762692555/06_ksollv.png',
    'https://res.cloudinary.com/dr3aiznca/image/upload/v1762692555/07_mqeab9.png',
    'https://res.cloudinary.com/dr3aiznca/image/upload/v1762692555/08_b6n80z.png'
];

const videoIds = [
    'd709c950a9b58f6b0a065a1995662577', '60291ca35b322f66a625180eaf11b1e6', 'e5f265a28eb15678ccec7967923c1623',
    '96639d279d98222dcebd4e832d414a4e', '70472c95606b10a34839295eaafe2683', 'ee8595d135aa3db769d049eafc72f742',
    '03c5bd626f71c9bd97257147ca53e088', '603ed6d137eaabcf3185d3c7fa99e3ad', '6a13917804524ed0c0cd7f77f0f5ea59',
    'e9f058581b4b02fb50d279d63afed7ed', '3c9d9b9b7e2e57074be03ff11383a33f', '307feb8db095799a226746d520cb7f21',
    '40ec2ec820ade0b52de17004f7f73223', 'ad9e96ebf13b7b35535281769a808b4a', '7c99b09f27643d4a2da42a08927c112a',
    'd379acc5a3596b0fef3a23e46f70c06b', 'ad61193f23fe9552a2514aceb539228d', 'ddf167129caae45541768e3d37c46dba',
    '181779150be66261e9d49dda2b6433a0', '1eb57a1e91195f6447f0b7266700eff9', 'a35659988391572534ebbe698df620f5',
    'dbf6d80905ba51173b2d4b8f1a7d1526'
];

// PRELOAD BUG IMAGES (Immediate)
console.log('Preloading Bug Images...');
bugImages.forEach(src => {
    const img = new Image();
    img.src = src;
});

// --- Bug System Class (One per column) ---
class BugSystem {
    constructor(container, colIndex) {
        this.container = container;
        this.colIndex = colIndex;
        this.activeBugs = [];
        this.running = true;
        this.timer = null;
        this.lastUpdate = 0; // For throttling frames

        // Bind methods
        this.update = this.update.bind(this);
        this.scheduleIdleBug = this.scheduleIdleBug.bind(this);

        // Start loop
        requestAnimationFrame(this.update);

        // Start generation
        this.scheduleIdleBug();

        // Initial burst - IMMEDIATE (No delay)
        // Pass true for isInitial to spawn closer to edge
        // [MODIFIED] If Column 1 (Index 0), Force FIRST bug to be heavily visible
        if (this.activeBugs.length < MAX_BUGS_PER_COLUMN && this.running) {
            const forceVisible = (this.colIndex === 0 && this.activeBugs.length === 0);
            this.createBug(true, forceVisible);
        }

        // Add a second one quickly for density (Standard initial)
        setTimeout(() => {
            if (this.activeBugs.length < MAX_BUGS_PER_COLUMN && this.running) this.createBug(true, false);
        }, 500);

        // [MOBILE EXCLUSIVE] Force an EXTRA visible bug immediately to succeed "must appear" request
        if (window.innerWidth <= 768 && this.running && this.activeBugs.length < MAX_BUGS_PER_COLUMN) {
            this.createBug(true, true);
        }
    }

    destroy() {
        this.running = false;
        if (this.timer) clearTimeout(this.timer);
        this.activeBugs.forEach(b => b.element.remove());
        this.activeBugs = [];
    }

    scheduleIdleBug() {
        if (!this.running) return;
        const delay = 10000 + Math.random() * 10000;
        this.timer = setTimeout(() => {
            if (this.activeBugs.length < MAX_BUGS_PER_COLUMN) {
                this.createBug(false);
            }
            this.scheduleIdleBug();
        }, delay);
    }

    getEdgePos(side, width, height, margin) {
        switch (side) {
            case 0: return { x: Math.random() * width, y: -margin }; // Top
            case 1: return { x: width + margin, y: Math.random() * height }; // Right
            case 2: return { x: Math.random() * width, y: height + margin }; // Bottom
            case 3: return { x: -margin, y: Math.random() * height }; // Left
            default: return { x: 0, y: 0 };
        }
    }

    createBug(isInitial = false, forceVisible = false) {
        if (!this.running || this.activeBugs.length >= MAX_BUGS_PER_COLUMN) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        const bug = document.createElement('div');
        bug.className = 'bug';
        // Note: BUG_SIZE is handled in CSS, but collision logic needs it

        const randomImage = bugImages[Math.floor(Math.random() * bugImages.length)];
        const img = document.createElement('img');
        img.src = randomImage;

        // --- Timing Configuration (Refactored) ---
        const SLOWDOWN_FACTOR = 1.25; // 20% slowdown applied recently

        // Rotation: Random base between 50s and 80s (approx) when all multipliers applied
        // Previous: (14 + rand*6) * 3 * 1.3 * 1.25 ~= 68s to 97s
        const rotBase = 55 + Math.random() * 30;
        const rotationDuration = rotBase * SLOWDOWN_FACTOR;

        const rotationDirection = Math.random() > 0.5 ? 'rotate360' : 'rotate360Reverse';
        img.style.animation = `${rotationDirection} ${rotationDuration}s linear infinite`;
        bug.appendChild(img);

        // Movement: Random base between 30s and 80s (approx)
        // Previous: (3 + rand*4) * 2 * 1.95 * 3.0 * 1.25 ~= 43s to 100s
        const moveBase = 35 + Math.random() * 45;
        const duration = moveBase * SLOWDOWN_FACTOR;

        // Logic relative to this container
        let startSide = Math.floor(Math.random() * 4);
        let margin = isInitial ? 1100 : 1600;

        // [MODIFIED] Force Visible Logic for Col 1 Initial
        if (forceVisible) {
            // Pick Top or Left (Sides 0 or 3) to ensure visibility with negative values
            startSide = Math.random() > 0.5 ? 0 : 3;
            // Use small margin (500) -> -500px -> 1000px overlap (Very visible)
            margin = 200;
        }

        const startPos = this.getEdgePos(startSide, width, height, margin);
        // End position always uses full margin to clear the screen completely
        const endPos = this.getEdgePos((startSide + 2) % 4, width, height, 1600);

        const midPoint = {
            x: (startPos.x + endPos.x) / 2 + (Math.random() - 0.5) * width * 0.5,
            y: (startPos.y + endPos.y) / 2 + (Math.random() - 0.5) * height * 0.5
        };

        const bugData = {
            element: bug,
            startX: startPos.x, startY: startPos.y,
            targetX: endPos.x, targetY: endPos.y,
            midX: midPoint.x, midY: midPoint.y,
            x: startPos.x, y: startPos.y,
            duration: duration,
            startTime: Date.now()
        };

        bug.style.left = '0px';
        bug.style.top = '0px';
        bug.style.transform = `translate3d(${startPos.x}px, ${startPos.y}px, 0)`;
        this.container.appendChild(bug);
        this.activeBugs.push(bugData);
    }

    update() {
        if (!this.running) return;

        const now = Date.now();
        // Throttle to ~30FPS (33ms) for "stutter" effect
        if (now - this.lastUpdate < 33) {
            requestAnimationFrame(this.update);
            return;
        }
        this.lastUpdate = now;

        this.activeBugs.forEach(bug => {
            const elapsed = (now - bug.startTime) / 1000;
            const t = Math.min(elapsed / bug.duration, 1);

            const oneMinusT = 1 - t;
            const bx = oneMinusT * oneMinusT * bug.startX + 2 * oneMinusT * t * bug.midX + t * t * bug.targetX;
            const by = oneMinusT * oneMinusT * bug.startY + 2 * oneMinusT * t * bug.midY + t * t * bug.targetY;

            bug.x = bx;
            bug.y = by;

            bug.element.style.transform = `translate3d(${bug.x}px, ${bug.y}px, 0)`;
        });

        // Remove finished bugs
        this.activeBugs = this.activeBugs.filter(bug => {
            const elapsed = (now - bug.startTime) / 1000;
            if (elapsed > bug.duration) {
                bug.element.remove();
                return false;
            }
            return true;
        });

        requestAnimationFrame(this.update);
    }
}

// --- Layout Management ---
function updateLayout() {
    const width = window.innerWidth;
    let targetCols = 1;

    if (width >= 1024) {
        targetCols = 3;
    } else if (width >= 768) {
        targetCols = 2;
    } else {
        targetCols = 1;
    }

    // Always update on load, even if 0 -> 1. 0 init state.
    // Check if actual layout change
    if (currentCols === targetCols && layoutContainer.children.length > 0) return;
    currentCols = targetCols;
    console.log(`Updating layout to ${targetCols} columns`);

    // Cleanup
    lenisInstances.forEach(l => l.destroy());
    lenisInstances.length = 0;
    bugSystems.forEach(sys => sys.destroy());
    bugSystems.length = 0;
    layoutContainer.innerHTML = '';

    // Build Columns
    for (let i = 0; i < targetCols; i++) {
        const col = document.createElement('div');
        col.className = 'layout-column';

        // 1. Create Bug Overlay (Sticky)
        const bugOverlay = document.createElement('div');
        bugOverlay.className = 'bug-overlay';
        col.appendChild(bugOverlay);

        // 2. Create Texture Overlay (Sticky, Per Column)
        const textureOverlay = document.createElement('div');
        textureOverlay.className = 'col-texture';
        // Col 1, 2, 3: All use Grid + Dot (Unifed)
        textureOverlay.classList.add('texture-all');

        // EXTENDED INTRO LOGIC (Step 2: Texture)
        if (!introPlayed) {
            textureOverlay.classList.add('intro-hidden-texture');
        }

        col.appendChild(textureOverlay);

        // 3. Clone and Reorder Content
        const contentFragment = contentTemplate.content.cloneNode(true);
        const wrapper = contentFragment.querySelector('.content-wrapper');

        // EXTENDED INTRO LOGIC (Step 3: Videos)
        // If intro hasn't played, start hidden (opacity: 0)
        if (!introPlayed) {
            wrapper.classList.add('intro-hidden');
        }

        const videos = Array.from(wrapper.children);

        // Col 1 (Index 1): Random Order
        if (i === 1) {
            videos.sort(() => Math.random() - 0.5);
        }
        // Col 2 (Index 2): Random Order (Requested) + Force No Loop for Infinite Logic
        if (i === 2) {
            videos.sort(() => Math.random() - 0.5);
            // Force loop=false in the SRC for all videos in this column
            videos.forEach(videoDiv => {
                const iframe = videoDiv.querySelector('iframe');
                if (iframe) {
                    iframe.src = iframe.src.replace(/loop=true/g, 'loop=false');
                }
            });
        }

        // Re-append in new order
        wrapper.innerHTML = '';
        videos.forEach(video => wrapper.appendChild(video));

        col.appendChild(contentFragment);
        layoutContainer.appendChild(col);

        // 3. Init Features
        initColumnFeatures(col, bugOverlay, i);
    }

    // TRIGGER INTRO FADE-IN SEQUENCE
    if (!introPlayed) {
        console.log('Starting Intro Sequence: Step 1 (Bugs Only)');

        // 0. Init Cursor Spotlight System (Mask + Highlight)
        const spotlight = document.createElement('div');
        spotlight.classList.add('cursor-spotlight');
        document.body.appendChild(spotlight);

        const highlight = document.createElement('div');
        highlight.classList.add('grid-highlight');
        document.body.appendChild(highlight);

        // Hide real cursor initially
        document.body.classList.add('intro-cursor-hidden');

        // Mouse State
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let trailX = mouseX;
        let trailY = mouseY;
        const lerpFactor = 0.12;

        // Track Mouse
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Animation Loop for Smooth Trail
        let rafId;
        function animateSpotlight() {
            // Update CSS vars GLOBALLY on Body so both Spotlight & Highlight can use them
            document.body.style.setProperty('--mouse-x', `${mouseX}px`);
            document.body.style.setProperty('--mouse-y', `${mouseY}px`);

            // Trail follows with Lerp
            trailX += (mouseX - trailX) * lerpFactor;
            trailY += (mouseY - trailY) * lerpFactor;
            document.body.style.setProperty('--trail-x', `${trailX}px`);
            document.body.style.setProperty('--trail-y', `${trailY}px`);

            rafId = requestAnimationFrame(animateSpotlight);
        }
        animateSpotlight();

        // Step 2: Texture Intro (Immediate - Sequence 1)
        console.log('Intro Step 2 (Merged to 1): Showing Textures & Lifting Background...');
        const allTextures = document.querySelectorAll('.col-texture');
        allTextures.forEach(t => t.classList.remove('intro-hidden-texture'));

        // Lift background to #080808 so Overlay texture becomes visible immediately
        const allCols = document.querySelectorAll('.layout-column');
        allCols.forEach(c => c.classList.add('intro-bg-reveal'));

        // Step 3: Video Fade In (Starts at 2.0s to overlap/connect with Step 2)
        setTimeout(() => {
            console.log('Intro Step 3: Fading in Videos & Setting Background to Transparent...');
            const allWrappers = document.querySelectorAll('.content-wrapper');
            allWrappers.forEach(w => w.classList.remove('intro-hidden'));

            // Fade out cursor spotlight (Delayed by 5s)
            setTimeout(() => {
                spotlight.classList.add('fade-out');
                highlight.classList.add('fade-out');

                setTimeout(() => {
                    cancelAnimationFrame(rafId);
                    spotlight.remove();
                    highlight.remove();

                    // Show real cursor (2.5s later, slightly faster reveal)
                    document.body.classList.remove('intro-cursor-hidden');
                }, 2500);
            }, 5000);

            introPlayed = true;

            // Revert background to transparent after videos are fully visible
            setTimeout(() => {
                const allCols = document.querySelectorAll('.layout-column');
                allCols.forEach(c => {
                    c.classList.remove('intro-bg-reveal');
                    c.classList.add('final-transparent');
                });
            }, 8000); // Wait for video fade (8s) to complete
        }, 2000);
    }
}

function initColumnFeatures(columnElement, bugOverlay, colIndex) {
    const wrapper = columnElement.querySelector('.content-wrapper');

    // 1. Lenis Smooth Scroll per Column
    const lenis = new Lenis({
        wrapper: columnElement,
        content: wrapper,
        duration: 2.0,
        wheelMultiplier: 0.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        smooth: true,
        smoothTouch: false
    });
    lenisInstances.push(lenis);

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 1.1 Scrollbar Visibility Logic (Auto-hide)
    // Delayed attachment to prevent initial flash during setup scroll
    setTimeout(() => {
        let scrollbarTimer;
        columnElement.addEventListener('scroll', () => {
            columnElement.classList.add('show-scrollbar');
            clearTimeout(scrollbarTimer);
            scrollbarTimer = setTimeout(() => {
                columnElement.classList.remove('show-scrollbar');
            }, 1000); // Hide after 1s of inactivity
        });
    }, 1000);

    // Set initial scroll position based on column index
    if (colIndex === 1) {
        setTimeout(() => {
            lenis.resize();
            const maxScroll = lenis.limit;
            const target = Math.random() * maxScroll;
            lenis.scrollTo(target, { immediate: true });
        }, 200);
    }
    if (colIndex === 2) {
        setTimeout(() => {
            lenis.resize();
            const maxScroll = lenis.limit;
            const target = Math.random() * maxScroll;
            lenis.scrollTo(target, { immediate: true });
        }, 200);
    }


    // 2. Init Bug System for this column
    const sys = new BugSystem(bugOverlay);
    bugSystems.push(sys);

    // 3. Scroll Blur Effect (Per Column)
    // DISABLED FOR COLUMN 1 (per user request)
    // 3. Scroll Blur Effect (Per Column)
    let scrollTimer;
    let isScrolling = false;

    columnElement.addEventListener('scroll', () => {
        if (!isScrolling) {
            isScrolling = true;
            bugOverlay.classList.remove('scrolling-removing');
            bugOverlay.classList.add('scrolling');
        }
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            isScrolling = false;
            bugOverlay.classList.remove('scrolling');
            bugOverlay.classList.add('scrolling-removing');
            setTimeout(() => {
                bugOverlay.classList.remove('scrolling-removing');
            }, 4000);
        }, 100);

        // Trigger random spawn in this column on scroll
        sys.scheduleIdleBug();
    });

    // 4. Initialize Cloudflare Stream Videos
    // 4. Initialize Cloudflare Stream Videos (Smart Lazy Loading)
    const iframes = columnElement.querySelectorAll('iframe');

    // Create functionality to only play videos when they are visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const iframe = entry.target;
            const stream = iframe.stream;
            if (!stream) return;

            if (entry.isIntersecting) {
                // Video entered viewport: Play
                stream.play().catch(e => { /* Ignore auto-play strictness errors */ });
                const overlay = iframe.parentElement.querySelector('.stream-overlay');
                if (overlay) overlay.classList.add('playing');
            } else {
                // Video left viewport: Pause to save resources
                stream.pause().catch(e => { });
                const overlay = iframe.parentElement.querySelector('.stream-overlay');
                if (overlay) overlay.classList.remove('playing');
            }
        });
    }, {
        threshold: 0.1 // Trigger when 10% of the video is visible
    });

    iframes.forEach(iframe => {
        const overlay = iframe.parentElement.querySelector('.stream-overlay');
        let isPlaying = true; // Local tracking state

        // One-time Overlay Click Listener (delegated to current iframe.stream)
        if (overlay) {
            overlay.classList.add('playing');
            overlay.addEventListener('click', (e) => {
                e.stopPropagation();
                // Always use the current stream instance
                if (iframe.stream) {
                    if (isPlaying) {
                        iframe.stream.pause().catch(e => console.error('Pause failed:', e));
                    } else {
                        iframe.stream.play().catch(e => console.error('Play failed:', e));
                    }
                }
            });
        }

        // Function to set up stream and listeners (re-usable for reloads)
        const setupStream = () => {
            // Init Stream
            const stream = Stream(iframe);
            iframe.stream = stream;

            // Sync overlay state
            stream.addEventListener('play', () => {
                isPlaying = true;
                if (overlay) overlay.classList.add('playing');
            });
            stream.addEventListener('pause', () => {
                isPlaying = false;
                if (overlay) overlay.classList.remove('playing');
            });

            // Col 3 Special Logic: Infinite Random Playback
            if (colIndex === 2) {
                // Ensure loop is false when metadata loads (Fix for race condition)
                stream.addEventListener('loadedmetadata', () => {
                    stream.loop = false;
                    console.log('Enforced loop=false for Col 3 video');
                });

                stream.loop = false; // Set immediately as well

                stream.addEventListener('ended', () => {
                    // Pick random different video
                    let newId;
                    do {
                        newId = videoIds[Math.floor(Math.random() * videoIds.length)];
                    } while (iframe.src.includes(newId));

                    console.log('Video ended in Col 3. Switching to:', newId);

                    // Update SRC
                    iframe.src = `https://customer-vippiceawjzmumxa.cloudflarestream.com/${newId}/iframe?muted=true&preload=true&loop=false&autoplay=true&controls=false`;

                    // When new iframe loads, re-setup stream
                    iframe.onload = () => {
                        setupStream(); // Recursive setup for new content
                        // Force play just in case autoplay is blocked or deferred
                        setTimeout(() => {
                            if (iframe.stream) iframe.stream.play().catch(() => { });
                        }, 100);
                    };
                });
            }
        };

        // Initial Setup
        setupStream();

        // Start observing
        observer.observe(iframe);
    });
}

// Initialize Layout
document.addEventListener('DOMContentLoaded', updateLayout);

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateLayout, 100);
});
