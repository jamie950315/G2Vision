export const HISTORY_PAGE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>G2Vision History</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f5f7fb;
        color: #172033;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        padding: 24px;
      }

      main {
        width: min(1180px, 100%);
        margin: 0 auto;
      }

      header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
      }

      h1 {
        margin: 0 0 6px;
        font-size: 32px;
        line-height: 1.1;
      }

      p {
        margin: 0;
        color: #4b5870;
      }

      button {
        border: 0;
        border-radius: 8px;
        padding: 10px 14px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        background: #1d6fd6;
        color: #ffffff;
      }

      #status {
        margin-bottom: 14px;
        padding: 12px 14px;
        border-radius: 8px;
        background: #e8edf6;
        color: #24324a;
      }

      #list {
        display: grid;
        gap: 14px;
      }

      .item {
        display: grid;
        grid-template-columns: minmax(220px, 360px) 1fr;
        gap: 16px;
        padding: 16px;
        border-radius: 8px;
        background: #ffffff;
      }

      .item img {
        width: 100%;
        max-height: 360px;
        object-fit: contain;
        border-radius: 8px;
        background: #e8edf6;
      }

      .no-image {
        min-height: 180px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: #e8edf6;
        color: #4b5870;
        font-weight: 700;
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
        color: #4b5870;
        font-size: 14px;
      }

      .pill {
        padding: 3px 8px;
        border-radius: 999px;
        background: #e8edf6;
      }

      h2 {
        margin: 0 0 10px;
        font-size: 20px;
        line-height: 1.25;
      }

      .prompt,
      .response {
        margin: 0 0 12px;
        white-space: pre-wrap;
        line-height: 1.55;
      }

      .prompt {
        color: #4b5870;
        font-size: 14px;
      }

      .response.error {
        color: #b42318;
      }

      @media (max-width: 760px) {
        body {
          padding: 16px;
        }

        header,
        .item {
          display: block;
        }

        button {
          margin-top: 12px;
        }

        .item img,
        .no-image {
          margin-bottom: 14px;
        }
      }

      @media (prefers-color-scheme: dark) {
        :root {
          background: #0f1420;
          color: #eef3ff;
        }

        p,
        .meta,
        .prompt {
          color: #aebad0;
        }

        #status,
        .pill,
        .no-image,
        .item img {
          background: #1d2a3f;
          color: #d9e5f8;
        }

        .item {
          background: #171f2f;
        }

        .response.error {
          color: #ffb4ab;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>G2Vision History</h1>
          <p>Newest saved responses with the backend input image.</p>
        </div>
        <button id="refresh" type="button">Refresh</button>
      </header>
      <div id="status">Loading history...</div>
      <section id="list" aria-live="polite"></section>
    </main>

    <script>
      const list = document.getElementById('list')
      const statusBox = document.getElementById('status')
      const refreshButton = document.getElementById('refresh')

      function formatDate(value) {
        return new Date(value).toLocaleString()
      }

      function appendText(parent, tagName, className, text) {
        const element = document.createElement(tagName)
        if (className) element.className = className
        element.textContent = text
        parent.appendChild(element)
        return element
      }

      function renderItems(items, limit) {
        list.replaceChildren()
        statusBox.textContent = items.length + ' / ' + limit + ' saved responses'

        if (items.length === 0) {
          appendText(list, 'p', '', 'No history yet.')
          return
        }

        for (const item of items) {
          const article = document.createElement('article')
          article.className = 'item'

          if (item.inputImageUrl) {
            const image = document.createElement('img')
            image.src = item.inputImageUrl
            image.alt = 'Input image for ' + item.jobId
            article.appendChild(image)
          } else {
            appendText(article, 'div', 'no-image', 'No image')
          }

          const body = document.createElement('div')
          const meta = document.createElement('div')
          meta.className = 'meta'
          appendText(meta, 'span', 'pill', item.source)
          appendText(meta, 'span', 'pill', formatDate(item.createdAt))
          appendText(meta, 'span', 'pill', item.jobId)
          body.appendChild(meta)

          appendText(body, 'h2', '', item.title || 'Vision response')
          appendText(body, 'p', 'prompt', 'Prompt: ' + (item.prompt || ''))
          appendText(body, 'p', item.error ? 'response error' : 'response', item.error || item.result || 'No response text returned.')

          article.appendChild(body)
          list.appendChild(article)
        }
      }

      async function loadHistory() {
        refreshButton.disabled = true
        try {
          const response = await fetch('/api/history')
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || 'Could not load history.')
          renderItems(data.items || [], data.limit || 100)
        } catch (error) {
          statusBox.textContent = 'Error'
          list.replaceChildren()
          appendText(list, 'p', 'response error', error instanceof Error ? error.message : String(error))
        } finally {
          refreshButton.disabled = false
        }
      }

      refreshButton.addEventListener('click', loadHistory)
      loadHistory()
    </script>
  </body>
</html>`
