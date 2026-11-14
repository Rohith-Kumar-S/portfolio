// =========================================================
// --- PROJECTS ---
// Each project lives in projects/<slug>.html: a JSON block with the card
// details, followed by the overview HTML shown in the popup.
// projects/projects.json lists the slugs in display order.
// Cards with "featured": true also appear on the homepage.
// =========================================================
var projectsCache = null;

function loadProjects() {
    if (projectsCache) return projectsCache;
    projectsCache = fetch("projects/projects.json")
        .then(function (r) {
            if (!r.ok) throw new Error("projects.json: " + r.status);
            return r.json();
        })
        .then(function (slugs) {
            return Promise.all(slugs.map(function (slug) {
                return fetch("projects/" + slug + ".html")
                    .then(function (r) {
                        if (!r.ok) throw new Error(slug + ".html: " + r.status);
                        return r.text();
                    })
                    .then(function (html) {
                        // DOMParser doesn't download the images inside the overview.
                        var doc = new DOMParser().parseFromString(html, "text/html");
                        var metaEl = doc.querySelector("script.project-meta");
                        var meta = JSON.parse(metaEl.textContent);
                        metaEl.remove();
                        meta.slug = slug;
                        meta.overview = doc.body.innerHTML.replace(/^\s*<!--[\s\S]*?-->/, "");
                        return meta;
                    });
            }));
        });
    projectsCache.catch(function () { projectsCache = null; }); // allow retry
    return projectsCache;
}

function renderProjectCard(p) {
    var card = document.createElement("article");
    card.className = "project-card";
    card.onclick = function () { openModal(card); };

    // openModal() reads the popup content from these attributes.
    var attrs = {
        "data-title": p.title, "data-start": p.start, "data-end": p.end,
        "data-github": p.github, "data-tools": p.tools, "data-desc": p.desc,
        "data-overview": p.overview, "data-image": p.image, "data-video": p.video
    };
    Object.keys(attrs).forEach(function (k) {
        if (attrs[k] !== null && attrs[k] !== undefined) card.setAttribute(k, attrs[k]);
    });

    var media = document.createElement("div");
    media.className = "card-media";
    var span = document.createElement("span");
    var img = document.createElement("img");
    img.src = p.thumbnail;
    img.alt = p.title;
    span.appendChild(img);
    media.appendChild(span);

    var body = document.createElement("div");
    body.className = "card-body";

    var title = document.createElement("div");
    title.className = "card-title";
    var a = document.createElement("a");
    a.href = "javascript:void(0)";
    a.textContent = p.title;
    title.appendChild(a);

    var badges = document.createElement("div");
    badges.className = "card-badges";
    (p.badges || []).forEach(function (b) {
        var s = document.createElement("span");
        s.className = "badge";
        s.textContent = b;
        badges.appendChild(s);
    });

    var excerpt = document.createElement("div");
    excerpt.className = "card-excerpt";
    excerpt.textContent = p.excerpt || p.desc;

    var meta = document.createElement("div");
    meta.className = "card-meta";
    var strong = document.createElement("strong");
    strong.textContent = "Topics:";
    meta.appendChild(strong);
    meta.appendChild(document.createTextNode(" " + (p.topics || "")));

    body.appendChild(title);
    body.appendChild(badges);
    body.appendChild(excerpt);
    body.appendChild(meta);
    card.appendChild(media);
    card.appendChild(body);
    return card;
}

function renderProjects() {
    return loadProjects().then(function (projects) {
        var featuredGrid = document.getElementById("featured-projects");
        var allGrid = document.getElementById("all-proj");
        featuredGrid.innerHTML = "";
        allGrid.innerHTML = "";
        projects.forEach(function (p) {
            if (p.featured) featuredGrid.appendChild(renderProjectCard(p));
            allGrid.appendChild(renderProjectCard(p));
        });

        // Deep link: ?project=<slug> opens that project's popup.
        var projectSlug = new URLSearchParams(window.location.search).get("project");
        if (projectSlug) {
            var cards = allGrid.querySelectorAll(".project-card");
            for (var i = 0; i < cards.length; i++) {
                var t = cards[i].getAttribute("data-title");
                if (t && createSlug(t) === projectSlug) {
                    openModal(cards[i], false);
                    break;
                }
            }
        }
    }).catch(function (err) {
        console.error(err);
        document.getElementById("featured-projects").textContent = "Couldn't load projects right now. Please refresh the page.";
    });
}

renderProjects();

function createSlug(title) {
    return title.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '');
}
// --- ALL PROJECTS MODAL LOGIC ---
function openAllProjectsModal() {
    var allModal = document.getElementById("allProjectsModal");
    allModal.style.display = "block";
    document.body.style.overflow = "hidden"; 
}

function closeAllProjectsModal() {
    var allModal = document.getElementById("allProjectsModal");
    allModal.style.display = "none";
    
    var projectModal = document.getElementById("projectModal");
    if (projectModal.style.display !== "block") {
        document.body.style.overflow = "auto";
    }
}

// --- EXISTING PROJECT DETAILS MODAL LOGIC ---
function openModal(element, pushToHistory = true) {
    var modal = document.getElementById("projectModal");
    
    var title = element.getAttribute("data-title") || "Project Title";
    var start = element.getAttribute("data-start") || "";
    var end = element.getAttribute("data-end") || "";
    var tools = element.getAttribute("data-tools");
    var desc = element.getAttribute("data-desc") || "";
    var overview = element.getAttribute("data-overview") || "";
    var image = element.getAttribute("data-image");
    var video = element.getAttribute("data-video");
    var github = element.getAttribute("data-github");
    
    document.getElementById("m-title").innerText = title;
    document.getElementById("m-dates").innerText = start + (end ? " - " + end : "");
    document.getElementById("m-tools-header").innerText = tools || "";
    document.getElementById("m-desc").innerText = desc;
    document.getElementById("m-overview").innerHTML = overview;
    
    var imgContainer = document.getElementById("m-image");
    if (image) {
        if (image.includes("Placeholder")) {
            imgContainer.innerText = image;
            imgContainer.style.backgroundImage = "none";
        } else {
            imgContainer.innerHTML = `<img src="${image}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
        }
    } else if (video) {
        imgContainer.innerHTML = `<video controls muted style="width:100%; height:100%; border-radius:8px;"><source src="${video}" type="video/mp4">Your browser does not support the video tag.</video>`;
    } else {
        imgContainer.innerHTML = ""; // Clear if neither exist
    }

    var githubBtn = document.getElementById("m-github-link");
    if (github) {
        githubBtn.href = github;
        githubBtn.style.display = "inline-flex";
    } else {
        githubBtn.style.display = "none";
    }

    var skillsContainer = document.getElementById("m-skills-list");
    skillsContainer.innerHTML = ""; 
    
    // Safety check in case a card is missing data-tools
    if (tools) {
        var toolsArray = tools.split(",");
        toolsArray.forEach(function(tool) {
            if(tool.trim() !== "") {
                var span = document.createElement("span");
                span.className = "skill-tag";
                span.innerText = tool.trim();
                skillsContainer.appendChild(span);
            }
        });
    }

    modal.style.display = "block";
    document.body.style.overflow = "hidden"; 

    // Try-Catch block prevents local file:// crashes
    if (pushToHistory) {
        try {
            const slug = createSlug(title);
            const newUrl = window.location.pathname + '?project=' + slug + window.location.hash;
            history.pushState({ modalOpen: true }, '', newUrl);
        } catch (e) {
            console.log("Local file URL routing disabled.");
        }
    }
}

function closeModal() {
    var modal = document.getElementById("projectModal");
    modal.style.display = "none";
    
    var allModal = document.getElementById("allProjectsModal");
    if (allModal && allModal.style.display === "block") {
        document.body.style.overflow = "hidden"; 
    } else {
        document.body.style.overflow = "auto";
    }
    
    // Try-Catch block prevents local file:// crashes
    try {
        const cleanUrl = window.location.pathname + window.location.hash;
        history.pushState(null, '', cleanUrl);
    } catch (e) {}
}
