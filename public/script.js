// file: public/script.js
document.getElementById('generateBtn').addEventListener('click', async () => {
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const apiKeyElem = document.getElementById('apiKey');
    const apiSecretElem = document.getElementById('apiSecret');

    // Tampilkan status loading
    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;
    resultDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');

    try {
        // Panggil endpoint backend kita
        const response = await fetch('/api/v1/generate-key', {
            method: 'POST',
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }

        // Tampilkan hasil
        apiKeyElem.textContent = data.apiKey;
        apiSecretElem.textContent = data.apiSecret;
        resultDiv.classList.remove('hidden');

    } catch (err) {
        errorDiv.textContent = `Error: ${err.message}`;
        errorDiv.classList.remove('hidden');
    } finally {
        generateBtn.textContent = 'Generate New Key';
        generateBtn.disabled = false;
    }
});