// Shared page behavior: title bar offset, nav links, closing popups.

// --- KEEP TITLE BAR VISIBLE ABOVE POPUPS ---
// Popups start below the masthead; its height changes on mobile, so measure it.
(function () {
    var masthead = document.querySelector(".masthead");
    function setMastheadHeight() {
        document.documentElement.style.setProperty("--masthead-h", masthead.offsetHeight + "px");
    }
    setMastheadHeight();
    if (window.ResizeObserver) {
        new ResizeObserver(setMastheadHeight).observe(masthead);
    } else {
        window.addEventListener("resize", setMastheadHeight);
    }
})();

function isOpen(id) {
    return document.getElementById(id).style.display === "block";
}

function closeAllModals() {
    if (isOpen("postModal")) closePost();
    if (isOpen("postsModal")) closePostsModal();
    if (isOpen("projectModal")) closeModal();
    if (isOpen("allProjectsModal")) closeAllProjectsModal();
}

// Nav links close any open popup, then jump to their section as usual.
document.querySelectorAll(".nav-links a:not(#posts-link)").forEach(function (link) {
    link.addEventListener("click", closeAllModals);
});

document.getElementById("posts-link").addEventListener("click", function (e) {
    e.preventDefault();
    closeAllModals();
    openPostsModal();
});

// Esc closes the top-most popup.
document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (isOpen("postModal")) closePost();
    else if (isOpen("projectModal")) closeModal();
    else if (isOpen("postsModal")) closePostsModal();
    else if (isOpen("allProjectsModal")) closeAllProjectsModal();
});

window.onclick = function(event) {
    var projectModal = document.getElementById("projectModal");
    var allProjectsModal = document.getElementById("allProjectsModal");

    if (event.target == projectModal) {
        closeModal();
    }
    if (event.target == allProjectsModal) {
        closeAllProjectsModal();
    }
    if (event.target == document.getElementById("postModal")) {
        closePost();
    }
    if (event.target == document.getElementById("postsModal")) {
        closePostsModal();
    }
}
