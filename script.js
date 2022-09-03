
const statusEl = document.querySelector('.status')
const activityEl = document.querySelector('.activity')
const progEl = document.querySelector('.progress')

const corsURL = 'https://cors.dokucraft.co.uk:2096/'
//const releasesURL = 'https://github.com/DokucraftSaga/Dokucraft-Releases/releases/download/v1.0/'
const repoURL = (name, branch = null) => `https://github.com/Dokucraft/${name}/archive/refs/heads/${branch === null ? 'master' : branch}.zip`

async function fetchProgress(url, onProgress = (current, total) => {}) {
  let response = await fetch(url)
  if (response.status >= 400) {
    return {
      httpError: true,
      status: response.status
    }
  }
  const reader = response.body.getReader()
  const contentLength = +response.headers.get('Content-Length')
  let receivedLength = 0
  let chunks = []
  while (true) {
    const {done, value} = await reader.read()
    if (done) {
      break
    }
    chunks.push(value)
    receivedLength += value.length
    onProgress(receivedLength, contentLength)
  }
  return new Blob(chunks)
}

async function downloadZip(url, onProgress = (current, total) => {}) {
  const data = await fetchProgress(url, onProgress)
  if (data.httpError) {
    return null
  }
  return JSZip.loadAsync(data)
}

async function downloadWIPPack(name, branch, ext = 'zip') {
  activityEl.textContent = 'Downloading WIP pack'
  let zip = await downloadZip(corsURL + repoURL(name, branch), (current, total) => {
    progEl.textContent = `${(current / (1024 * 1024)).toFixed(2)} MB`
  })

  if (zip === null) {
    zip = await downloadZip(corsURL + repoURL(name), (current, total) => {
      progEl.textContent = `${(current / (1024 * 1024)).toFixed(2)} MB`
    })
    if (zip === null) {
      statusEl.textContent = `'${name}' does not exist.`
      return
    }
  }

  try {
    activityEl.textContent = 'Processing pack'
    const zipContent = await zip.folder(zip.folder(/./)[0].name).generateAsync({type: 'blob'}, e => {
      progEl.textContent = `${e.percent.toFixed(2)}%`
    })
    statusEl.textContent = 'Done! Your download should start shortly.'
    saveAs(zipContent, `${name}.${ext}`)
  } catch (ex) {
    console.error(ex)
    statusEl.textContent = 'Something seems to have gone wrong while processing the zip, sorry!'
  }
}

const params = new URL(location.href).searchParams
if (params.has('latest')) {
  if (params.has('mcpack')) {
    downloadWIPPack(params.get('latest'), params.get('branch'), 'mcpack')
  } else {
    downloadWIPPack(params.get('latest'), params.get('branch'))
  }
} else {
  statusEl.textContent = 'No zips to process.'
}
