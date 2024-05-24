# Document site

The document site uses Docsify to render the markdown files deployed to GitHub Pages.

See:

* https://docsify.js.org/#/
* https://pages.github.com

## Run local server

The docsify command can be used to preview the dev site. The port is set because NR Broker uses port 3000 for the UI.

```bash
npx docsify serve -p 4000 docs 
```

The site will then be available at localhost:4000.
