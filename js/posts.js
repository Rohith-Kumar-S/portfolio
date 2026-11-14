// =========================================================
// --- POSTS ---
// Posts live in posts/*.md, listed in posts/posts.json.
// =========================================================
var POST_DEFAULT_AUTHOR = "Rohith Kumar.S";
var postsCache = null;   // Promise resolving to sorted post list
var libsCache = null;    // Promise for marked + KaTeX

function loadScript(src) {
    return new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = function () { reject(new Error("Failed to load " + src)); };
        document.head.appendChild(s);
    });
}

// Load the Markdown and math libraries the first time Posts is opened.
function loadPostLibs() {
    if (libsCache) return libsCache;
    var cdn = "https://cdnjs.cloudflare.com/ajax/libs/";
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = cdn + "KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(css);
    libsCache = Promise.all([
        loadScript(cdn + "marked/12.0.2/marked.min.js"),
        loadScript(cdn + "KaTeX/0.16.9/katex.min.js")
            .then(function () { return loadScript(cdn + "KaTeX/0.16.9/contrib/auto-render.min.js"); })
    ]);
    return libsCache;
}

function formatPostDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

// Turn Markdown into plain text (for word counts and excerpts).
function markdownToText(md) {
    return md
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/\$\$[\s\S]+?\$\$/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[`*_>#~|$\\]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function getExcerpt(md) {
    var paragraphs = md.replace(/```[\s\S]*?```/g, "").split(/\n\s*\n/);
    for (var i = 0; i < paragraphs.length; i++) {
        var p = paragraphs[i].trim();
        if (!p || /^(#|!\[|\$\$|\||-{3,})/.test(p)) continue;
        var text = markdownToText(p);
        if (text) return text;
    }
    return "";
}

function loadPosts() {
    if (postsCache) return postsCache;
    postsCache = fetch("posts/posts.json")
        .then(function (r) {
            if (!r.ok) throw new Error("posts.json: " + r.status);
            return r.json();
        })
        .then(function (list) {
            return Promise.all(list.map(function (post) {
                return fetch("posts/" + post.file)
                    .then(function (r) {
                        if (!r.ok) throw new Error(post.file + ": " + r.status);
                        return r.text();
                    })
                    .then(function (md) {
                        var words = markdownToText(md).split(" ").filter(Boolean).length;
                        return {
                            slug: post.slug,
                            title: post.title,
                            date: post.date,
                            author: post.author || POST_DEFAULT_AUTHOR,
                            markdown: md,
                            excerpt: getExcerpt(md),
                            minutes: Math.max(1, Math.ceil(words / 200))
                        };
                    });
            }));
        })
        .then(function (posts) {
            return posts.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
        });
    postsCache.catch(function () { postsCache = null; }); // allow retry
    return postsCache;
}

function iconText(iconClass, text) {
    var span = document.createElement("span");
    var i = document.createElement("i");
    i.className = iconClass;
    span.appendChild(i);
    span.appendChild(document.createTextNode(" " + text));
    return span;
}

function renderPostCards(posts) {
    var listEl = document.getElementById("posts-list");
    listEl.innerHTML = "";
    posts.forEach(function (post) {
        var card = document.createElement("article");
        card.className = "post-card";
        card.tabIndex = 0;
        card.onclick = function () { openPost(post.slug); };
        card.onkeydown = function (e) { if (e.key === "Enter") openPost(post.slug); };

        var title = document.createElement("h2");
        title.className = "post-card-title";
        title.textContent = post.title;

        var excerpt = document.createElement("p");
        excerpt.className = "post-card-excerpt";
        excerpt.textContent = post.excerpt;

        var meta = document.createElement("div");
        meta.className = "post-card-meta";
        meta.appendChild(iconText("far fa-calendar-alt", formatPostDate(post.date)));
        meta.appendChild(iconText("far fa-clock", post.minutes + " min read"));
        meta.appendChild(iconText("far fa-user", post.author));

        card.appendChild(title);
        card.appendChild(excerpt);
        card.appendChild(meta);
        listEl.appendChild(card);
    });
}

function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Markdown -> HTML, keeping $...$ / $$...$$ math away from the Markdown parser.
function renderMarkdown(md) {
    var math = [];
    var protectedMd = md.replace(
        /(```[\s\S]*?```|`[^`\n]*`)|\$\$([\s\S]+?)\$\$|(?<!\\)\$([^$\n]+?)\$/g,
        function (whole, code) {
            if (code) return code;
            math.push(whole);
            return "@@MATH" + (math.length - 1) + "@@";
        });
    var html = marked.parse(protectedMd);
    return html.replace(/@@MATH(\d+)@@/g, function (_, n) { return escapeHtml(math[+n]); });
}

function openPostsModal() {
    var modal = document.getElementById("postsModal");
    var status = document.getElementById("posts-status");
    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    return loadPosts().then(function (posts) {
        status.style.display = "none";
        renderPostCards(posts);
        return posts;
    }).catch(function (err) {
        console.error(err);
        status.style.display = "block";
        status.textContent = "Couldn't load posts right now. Please try again later.";
    });
}

function closePostsModal() {
    document.getElementById("postsModal").style.display = "none";
    if (!isOpen("postModal") && !isOpen("projectModal") && !isOpen("allProjectsModal")) {
        document.body.style.overflow = "auto";
    }
}

function openPost(slug, pushToHistory = true) {
    Promise.all([loadPosts(), loadPostLibs()]).then(function (results) {
        var post = results[0].find(function (p) { return p.slug === slug; });
        if (!post) return;

        document.getElementById("p-title").textContent = post.title;
        document.getElementById("p-date").textContent = formatPostDate(post.date);
        document.getElementById("p-reading").textContent = post.minutes + " min read";
        document.getElementById("p-author").textContent = post.author;

        var body = document.getElementById("p-body");
        body.innerHTML = renderMarkdown(post.markdown);

        // Relative image paths in a post are relative to the posts/ folder.
        body.querySelectorAll("img").forEach(function (img) {
            var src = img.getAttribute("src") || "";
            if (!/^([a-z]+:|\/|data:)/i.test(src)) img.setAttribute("src", "posts/" + src);
        });
        body.querySelectorAll("a[href^='http']").forEach(function (a) {
            a.target = "_blank";
            a.rel = "noopener noreferrer";
        });

        renderMathInElement(body, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false }
            ],
            throwOnError: false
        });

        var modal = document.getElementById("postModal");
        modal.style.display = "block";
        modal.scrollTop = 0;
        document.body.style.overflow = "hidden";

        if (pushToHistory) {
            try {
                history.pushState({ modalOpen: true }, "", window.location.pathname + "?post=" + slug + window.location.hash);
            } catch (e) {}
        }
    }).catch(function (err) {
        console.error(err);
        alert("Couldn't open this post right now. Please try again later.");
    });
}

function closePost() {
    document.getElementById("postModal").style.display = "none";
    if (!isOpen("postsModal") && !isOpen("projectModal") && !isOpen("allProjectsModal")) {
        document.body.style.overflow = "auto";
    }
    try {
        history.pushState(null, "", window.location.pathname + window.location.hash);
    } catch (e) {}
}

// Deep link: ?post=<slug> opens the list and then that post.
window.addEventListener("DOMContentLoaded", function () {
    var postSlug = new URLSearchParams(window.location.search).get("post");
    if (postSlug) {
        openPostsModal().then(function () { openPost(postSlug, false); });
    }
});
