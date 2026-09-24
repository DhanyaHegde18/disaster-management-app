const axios = require('axios');

async function getRainfall(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation`;
  const response = await axios.get(url, { timeout: 10000 });
  return response.data.current.precipitation; // mm of rain right now
}

module.exports = { getRainfall };
