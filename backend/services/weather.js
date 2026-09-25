const axios = require('axios');

function round1(n) {
  return Math.round(n * 10) / 10;
}

// Rain falling right now (what we built in Part 1)
async function getRainfall(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation`;
  const response = await axios.get(url, { timeout: 10000 });
  return response.data.current.precipitation;
}

// Total rain in the past 24 hours and forecast for the next 24 hours
async function getRainfall24h(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation&past_days=1&forecast_days=2&timeformat=unixtime`;
  const response = await axios.get(url, { timeout: 10000 });

  const times = response.data.hourly.time;          // one timestamp per hour
  const rain = response.data.hourly.precipitation;  // mm of rain in each hour

  const now = Date.now() / 1000;  // current time in seconds
  const DAY = 24 * 60 * 60;       // seconds in one day

  let past24h = 0;
  let next24h = 0;
  for (let i = 0; i < times.length; i++) {
    const mm = rain[i] || 0;
    if (times[i] >= now - DAY && times[i] < now) {
      past24h += mm;
    } else if (times[i] >= now && times[i] < now + DAY) {
      next24h += mm;
    }
  }

  return { past24h: round1(past24h), next24h: round1(next24h) };
}

module.exports = { getRainfall, getRainfall24h };