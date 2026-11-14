# portfolio

## Layout
- `index.html`: page shell (title bar, sidebar, About / Timeline / Skills sections, popup shells)
- `styles.css`: all styles
- `js/main.js`: title bar offset, nav links, closing popups (Esc / backdrop)
- `js/projects.js`: loads projects and renders the homepage grid, the All Projects popup and the project popup
- `js/posts.js`: Posts list and post popup (Markdown + KaTeX)
- `projects/`: one file per project, plus `projects.json` (display order)
- `posts/`: one Markdown file per post, plus `posts.json`

## Add a project
1. Create `projects/<slug>.html`. Copy an existing one: the JSON block at the top holds the card details, and everything after it is the overview HTML shown in the popup.
   - `"featured": true` also shows the card on the homepage.
   - `excerpt` is the card text; `desc` is the line under the title in the popup.
   - Use `image` or `video` for the popup's main media, or leave both `null`.
2. Add `<slug>` to `projects/projects.json` where it should appear in the list.

The slug is used in share links (`?project=<slug>`): lowercase title, spaces turned into `-`, other symbols removed.

## Add a post
1. Write `posts/<slug>.md`.
2. Add `{ "slug", "title", "date": "YYYY-MM-DD", "file" }` to `posts/posts.json`. Posts are sorted newest first automatically.

## Preview locally
The site loads projects and posts with `fetch`, which doesn't work when you open `index.html` straight from disk. Run a local server from the repo folder:

```
python -m http.server 8000
```

Then open http://localhost:8000.
