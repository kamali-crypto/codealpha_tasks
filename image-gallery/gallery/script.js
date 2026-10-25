// ---------- Element references ----------
const items = Array.from(document.querySelectorAll(".gallery-item"));
const filterButtons = document.querySelectorAll(".filter-btn");
const searchInput = document.getElementById("searchInput");
const resultCount = document.getElementById("resultCount");
const noResults = document.getElementById("noResults");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxCounter = document.getElementById("lightboxCounter");
const closeBtn = document.getElementById("closeBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let activeCategory = "all";
let searchText = "";
let visibleItems = [];   // images currently shown in the gallery
let currentIndex = 0;    // position inside visibleItems


// ---------- Filter + search ----------
function applyFilters() {
    let count = 0;

    items.forEach((item) => {
        const matchesCategory =
            activeCategory === "all" || item.dataset.category === activeCategory;
        const matchesSearch = item.dataset.title.toLowerCase().includes(searchText);
        const show = matchesCategory && matchesSearch;

        item.classList.toggle("hidden", !show);
        if (show) count++;
    });

    resultCount.textContent = count + (count === 1 ? " image" : " images");
    noResults.hidden = count !== 0;
}

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        button.classList.add("active");
        activeCategory = button.dataset.filter;
        applyFilters();
    });
});

searchInput.addEventListener("input", () => {
    searchText = searchInput.value.trim().toLowerCase();
    applyFilters();
});


// ---------- Lightbox ----------
function isLightboxOpen() {
    return lightbox.classList.contains("open");
}

// Open the lightbox for one gallery item
function openLightbox(item) {
    // Only browse through images that are visible after filter/search
    visibleItems = items.filter((i) => !i.classList.contains("hidden"));
    currentIndex = visibleItems.indexOf(item);

    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    showImage(true);
}

function closeLightbox() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImage.classList.remove("show");
    document.body.classList.remove("no-scroll");
}

// Display the selected image with a small fade
function showImage(instant) {
    const img = visibleItems[currentIndex].querySelector("img");

    const update = () => {
        lightboxImage.src = img.src;
        lightboxImage.alt = img.alt;
        lightboxCaption.textContent = img.alt;
        lightboxCounter.textContent = currentIndex + 1 + " / " + visibleItems.length;
        lightboxImage.classList.add("show");
    };

    lightboxImage.classList.remove("show");

    if (instant) {
        update();
    } else {
        setTimeout(update, 150);
    }
}

function showNext() {
    currentIndex = (currentIndex + 1) % visibleItems.length;
    showImage(false);
}

function showPrev() {
    currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
    showImage(false);
}

// Click or press Enter on a card to open
items.forEach((item) => {
    item.addEventListener("click", () => openLightbox(item));

    item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLightbox(item);
        }
    });
});

closeBtn.addEventListener("click", closeLightbox);
prevBtn.addEventListener("click", showPrev);
nextBtn.addEventListener("click", showNext);

// Close when clicking the dark background
lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
        closeLightbox();
    }
});


// ---------- Keyboard support ----------
document.addEventListener("keydown", (event) => {
    if (!isLightboxOpen()) return;

    if (event.key === "ArrowRight") showNext();
    if (event.key === "ArrowLeft") showPrev();
    if (event.key === "Escape") closeLightbox();
});


// ---------- Swipe support for mobile ----------
let touchStartX = 0;

lightbox.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
}, { passive: true });

lightbox.addEventListener("touchend", (event) => {
    const distance = event.changedTouches[0].clientX - touchStartX;

    if (Math.abs(distance) > 50) {
        if (distance < 0) {
            showNext();   // swipe left
        } else {
            showPrev();   // swipe right
        }
    }
}, { passive: true });


// ---------- Start ----------
applyFilters();
