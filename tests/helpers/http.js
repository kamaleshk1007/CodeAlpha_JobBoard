async function postJson(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function uploadResume(baseUrl, candidateId, { filename, contentType, content }) {
  const form = new FormData();
  form.append('resume', new Blob([content], { type: contentType }), filename);
  return fetch(`${baseUrl}/api/candidates/${candidateId}/resumes`, {
    method: 'POST',
    body: form,
  });
}

module.exports = { postJson, uploadResume };
