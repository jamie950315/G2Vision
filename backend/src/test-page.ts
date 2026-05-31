export const TEST_PAGE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>G2Vision Test</title>
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
        display: grid;
        place-items: center;
        padding: 24px;
      }

      main {
        width: min(920px, 100%);
      }

      h1 {
        margin: 0 0 8px;
        font-size: 32px;
        line-height: 1.1;
      }

      .topbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      p {
        margin: 0 0 18px;
        color: #4b5870;
      }

      .prompt-panel {
        margin: 20px 0;
        padding: 18px;
        border-radius: 8px;
        background: #ffffff;
      }

      label {
        display: block;
        font-weight: 700;
        margin-bottom: 8px;
      }

      textarea {
        width: 100%;
        min-height: 138px;
        resize: vertical;
        border: 1px solid #b7c2d7;
        border-radius: 8px;
        padding: 12px;
        font: inherit;
        line-height: 1.45;
        background: #fbfcff;
        color: inherit;
      }

      .actions {
        position: relative;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 12px;
      }

      button {
        border: 0;
        border-radius: 8px;
        padding: 10px 14px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        background: #e8edf6;
        color: #24324a;
      }

      .history-link {
        display: inline-flex;
        align-items: center;
        border-radius: 8px;
        padding: 10px 14px;
        background: #e8edf6;
        color: #24324a;
        font: inherit;
        font-weight: 700;
        text-decoration: none;
        white-space: nowrap;
      }

      button.primary {
        background: #1d6fd6;
        color: #ffffff;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      #toast {
        position: absolute;
        left: 0;
        bottom: calc(100% + 10px);
        width: min(520px, 100%);
        max-height: 160px;
        overflow: auto;
        padding: 12px;
        border-radius: 8px;
        background: #172033;
        color: #ffffff;
        box-shadow: 0 10px 30px rgba(23, 32, 51, 0.2);
        line-height: 1.45;
        white-space: pre-wrap;
        opacity: 0;
        pointer-events: none;
        transform: translateY(6px);
        transition: opacity 0.12s ease, transform 0.12s ease;
        z-index: 3;
      }

      #toast.visible {
        opacity: 1;
        transform: translateY(0);
      }

      #dropzone {
        position: relative;
        min-height: 280px;
        border: 2px dashed #8192b3;
        border-radius: 8px;
        display: grid;
        place-items: center;
        padding: 28px;
        background: #ffffff;
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;
      }

      #dropzone:focus-visible {
        outline: 3px solid #8ebcff;
        outline-offset: 3px;
      }

      #dropzone.dragover {
        border-color: #1d6fd6;
        background: #eef6ff;
      }

      #dropzone strong {
        display: block;
        font-size: 22px;
        margin-bottom: 6px;
      }

      #preview {
        display: none;
        max-width: 100%;
        max-height: 340px;
        margin-top: 18px;
        border-radius: 8px;
      }

      #fileInput {
        display: none;
      }

      #clearImage {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 40px;
        height: 40px;
        display: none;
        place-items: center;
        padding: 0;
        border-radius: 8px;
        background: #1d6fd6;
        color: #ffffff;
        line-height: 1;
      }

      #clearImage svg {
        width: 20px;
        height: 20px;
        stroke: currentColor;
      }

      #clearImage.visible {
        display: grid;
      }

      #clearImage:hover {
        background: #155eb8;
        color: #ffffff;
      }

      #status {
        margin-top: 18px;
        padding: 14px 16px;
        border-radius: 8px;
        background: #e8edf6;
        color: #24324a;
        min-height: 48px;
        white-space: pre-wrap;
      }

      #result {
        margin-top: 14px;
        padding: 18px;
        border-radius: 8px;
        background: #ffffff;
        min-height: 160px;
        white-space: pre-wrap;
        line-height: 1.55;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          background: #0f1420;
          color: #eef3ff;
        }

        p {
          color: #aebad0;
        }

        .prompt-panel,
        #dropzone,
        #result {
          background: #171f2f;
        }

        textarea {
          background: #101827;
          border-color: #33415a;
        }

        button {
          background: #26344c;
          color: #e4ecfb;
        }

        .history-link {
          background: #26344c;
          color: #e4ecfb;
        }

        #dropzone {
          border-color: #63718a;
        }

        #dropzone.dragover {
          border-color: #72a7ff;
          background: #182a44;
        }

        #status {
          background: #1d2a3f;
          color: #d9e5f8;
        }
      }

      @media (max-width: 640px) {
        .topbar {
          display: block;
        }

        .history-link {
          margin-top: 12px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="topbar">
        <div>
          <h1>G2Vision Test</h1>
          <p>Drag an image here, or click the upload area. The image is sent to the local backend, then analyzed server-side.</p>
        </div>
        <a class="history-link" href="/history">History</a>
      </div>

      <section class="prompt-panel" aria-label="Prompt settings">
        <label for="promptInput">System prompt</label>
        <textarea id="promptInput" spellcheck="true"></textarea>
        <div class="actions">
          <button id="savePrompt" class="primary" type="button">Save</button>
          <button id="revertPrompt" type="button">Revert</button>
          <button id="resetPrompt" type="button">Reset</button>
          <div id="toast" role="status"></div>
        </div>
      </section>

      <input id="fileInput" type="file" accept=".jpg,.jpeg,.png,.webp" />

      <section id="dropzone" aria-label="Image upload area" role="button" tabindex="0">
        <button id="clearImage" type="button" aria-label="Remove current image" title="Remove current image">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6h18" stroke-width="2" stroke-linecap="round" />
            <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" stroke-width="2" stroke-linecap="round" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-width="2" stroke-linejoin="round" />
            <path d="M10 11v6M14 11v6" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <div>
          <strong>Drop or choose image</strong>
          <span>JPEG, PNG, or WebP will be converted to JPEG before upload.</span>
          <img id="preview" alt="Dropped image preview" />
        </div>
      </section>

      <div id="status">Ready.</div>
      <div id="result">Response will appear here.</div>
    </main>

    <script>
      const dropzone = document.getElementById('dropzone')
      const preview = document.getElementById('preview')
      const fileInput = document.getElementById('fileInput')
      const clearImageButton = document.getElementById('clearImage')
      const statusBox = document.getElementById('status')
      const resultBox = document.getElementById('result')
      const promptInput = document.getElementById('promptInput')
      const savePromptButton = document.getElementById('savePrompt')
      const revertPromptButton = document.getElementById('revertPrompt')
      const resetPromptButton = document.getElementById('resetPrompt')
      const toast = document.getElementById('toast')
      let savedPrompt = ''
      let defaultPrompt = ''

      function setStatus(message) {
        statusBox.textContent = message
      }

      function setResult(message) {
        resultBox.textContent = message
      }

      function showToast(message) {
        toast.textContent = message || 'Empty prompt'
        toast.classList.add('visible')
      }

      function hideToast() {
        toast.classList.remove('visible')
      }

      function currentPrompt() {
        return promptInput.value.trim() || savedPrompt || defaultPrompt
      }

      function preventDefaults(event) {
        event.preventDefault()
        event.stopPropagation()
      }

      function clearCurrentImage() {
        preview.removeAttribute('src')
        preview.style.display = 'none'
        clearImageButton.classList.remove('visible')
        fileInput.value = ''
        setStatus('Image removed.')
        setResult('Response will appear here.')
      }

      async function loadPromptSettings() {
        const response = await fetch('/api/test-prompt')
        if (!response.ok) throw new Error('Could not load prompt settings.')
        const data = await response.json()
        savedPrompt = data.savedPrompt || ''
        defaultPrompt = data.defaultPrompt || ''
        promptInput.value = savedPrompt || defaultPrompt
      }

      async function savePrompt() {
        savePromptButton.disabled = true
        try {
          const response = await fetch('/api/test-prompt', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: currentPrompt() }),
          })
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || 'Could not save prompt.')
          savedPrompt = data.savedPrompt
          defaultPrompt = data.defaultPrompt || defaultPrompt
          promptInput.value = savedPrompt
          setStatus('Prompt saved.')
        } finally {
          savePromptButton.disabled = false
        }
      }

      async function fileToJpeg(file) {
        if (!file.type.startsWith('image/')) {
          throw new Error('Please drop an image file.')
        }

        const imageUrl = URL.createObjectURL(file)
        const image = new Image()
        image.decoding = 'async'

        try {
          await new Promise((resolve, reject) => {
            image.onload = resolve
            image.onerror = () => reject(new Error('Could not read the image.'))
            image.src = imageUrl
          })

          preview.src = imageUrl
          preview.style.display = 'block'
          clearImageButton.classList.add('visible')

          const maxSide = 1280
          const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
          const width = Math.max(1, Math.round(image.naturalWidth * scale))
          const height = Math.max(1, Math.round(image.naturalHeight * scale))
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const context = canvas.getContext('2d')
          if (!context) throw new Error('Could not prepare image conversion.')
          context.drawImage(image, 0, 0, width, height)

          return await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (!blob) reject(new Error('Could not convert image to JPEG.'))
              else resolve(blob)
            }, 'image/jpeg', 0.88)
          })
        } finally {
          setTimeout(() => URL.revokeObjectURL(imageUrl), 3000)
        }
      }

      async function pollResult(jobId) {
        for (let attempt = 0; attempt < 45; attempt += 1) {
          const response = await fetch('/api/result/' + encodeURIComponent(jobId))
          if (!response.ok) throw new Error('Result check failed: HTTP ' + response.status)
          const data = await response.json()

          setStatus('Status: ' + data.status)
          if (data.status === 'done') {
            setResult(data.result || 'No response text returned.')
            return
          }

          if (data.status === 'error') {
            throw new Error(data.error || 'Analysis failed.')
          }

          await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        throw new Error('Timed out waiting for analysis.')
      }

      async function uploadFile(file) {
        setStatus('Preparing image...')
        setResult('')
        const jpeg = await fileToJpeg(file)

        setStatus('Uploading image...')
        const response = await fetch('/api/test-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'X-Test-Prompt': currentPrompt(),
          },
          body: jpeg,
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error || 'Upload failed: HTTP ' + response.status)
        }

        setStatus('Analyzing image...')
        await pollResult(data.id)
      }

      savePromptButton.addEventListener('click', async () => {
        try {
          await savePrompt()
        } catch (error) {
          setStatus('Error')
          setResult(error instanceof Error ? error.message : String(error))
        }
      })

      revertPromptButton.addEventListener('click', () => {
        promptInput.value = savedPrompt || defaultPrompt
        setStatus('Prompt reverted to saved version.')
      })

      resetPromptButton.addEventListener('click', () => {
        promptInput.value = defaultPrompt
        setStatus('Prompt reset to original default.')
      })

      revertPromptButton.addEventListener('mouseenter', () => showToast(savedPrompt || defaultPrompt))
      revertPromptButton.addEventListener('mouseleave', hideToast)
      resetPromptButton.addEventListener('mouseenter', () => showToast(defaultPrompt))
      resetPromptButton.addEventListener('mouseleave', hideToast)

      dropzone.addEventListener('click', () => {
        fileInput.click()
      })

      dropzone.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          fileInput.click()
        }
      })

      clearImageButton.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        clearCurrentImage()
      })

      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0]
        if (!file) return

        try {
          await uploadFile(file)
        } catch (error) {
          setStatus('Error')
          setResult(error instanceof Error ? error.message : String(error))
        }
      })

      for (const eventName of ['dragenter', 'dragover', 'dragleave', 'drop']) {
        dropzone.addEventListener(eventName, preventDefaults)
      }

      for (const eventName of ['dragenter', 'dragover']) {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'))
      }

      for (const eventName of ['dragleave', 'drop']) {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'))
      }

      dropzone.addEventListener('drop', async (event) => {
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]
        if (!file) return

        try {
          await uploadFile(file)
        } catch (error) {
          setStatus('Error')
          setResult(error instanceof Error ? error.message : String(error))
        }
      })

      loadPromptSettings()
        .then(() => setStatus('Ready.'))
        .catch((error) => {
          setStatus('Error')
          setResult(error instanceof Error ? error.message : String(error))
        })
    </script>
  </body>
</html>`
