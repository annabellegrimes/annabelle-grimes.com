# annabelle-grimes.com

Source for [annabelle-grimes.com](https://annabelle-grimes.com), served with GitHub Pages from the `main` branch.

- `index.html`: all page content (about, research, publications, CV, contact)
- `assets/style.css`: styles, including the print layout used by the "Save as PDF" CV button
- `assets/main.js`: interactions (filters, CV tabs, BibTeX copy) and the hero animation
- `library/`: the research library, a bookcase of the sources behind my projects (`books.json` holds the books)
- `energy/`: my weekly Claude energy use, charted from the public [claude-energy-tracker](https://github.com/annabellegrimes/claude-energy-tracker) data (it updates when that repository does)

## Adding a book to the library

Add an entry to `books` in `library/books.json`. The page places it on its shelf, gives it a cloth colour, height and
thickness of its own, and works out its call number. Books sit on their shelf in the order they appear in the file.

```json
{
  "id": "suttle-2005-viruses-in-the-sea",
  "shelf": "deep",
  "title": "Viruses in the sea",
  "authors": ["Curtis A. Suttle"],
  "year": "2005",
  "venue": "Nature",
  "kind": "paper",
  "note": "Viruses' abundance and their role in recycling carbon and nutrients.",
  "links": [{ "label": "DOI", "url": "https://doi.org/10.1038/nature04160" }],
  "usedIn": [{ "title": "Anatomy of an Astrophysical Neutrino", "url": "https://annabellegrimes.github.io/anatomy-of-an-astrophysical-neutrino-public/" }]
}
```

- `id`: unique, lowercase with hyphens. It is the book's link: `library/#book=<id>` opens it.
- `shelf`: one of the `id`s in `shelves` (`sources`, `physics`, `cosmo`, `pone`, `deep`). Add a shelf there to start a new one.
- `authors`: up to eight names; for a large collaboration, add `"authorCount"` with the full number.
- `kind`: `paper`, `data` or `web`.
- `note`: one line on what the source is, or what you use it for.

Change `updated` at the top of the file to today's date.

Do not commit collaboration-internal material (P-ONE CAD, drawings, drafts). See `.gitignore`.
