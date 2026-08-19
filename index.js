const express = require('express');
const axios = require('axios');
const _ = require('lodash');
const serialize = require('serialize-javascript');
const minimist = require('minimist');

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  const data = { message: 'Hello from vulnerable-app', lodashVersion: _.VERSION };
  res.json(data);
});

app.post('/serialize', (req, res) => {
  const output = serialize(req.body);
  res.send(output);
});

app.get('/fetch', async (req, res) => {
  const { url } = req.query;
  try {
    const response = await axios.get(url);
    res.json({ status: response.status, data: response.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const args = minimist(process.argv.slice(2));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
