const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });  // CORS middleware
const axios = require('axios');

// Store your OpenWeather API key securely
const OPENWEATHER_API_KEY = 'e178ea07cb3554e3e318810f2a9c92da';

// Define a Cloud Function to fetch weather data
exports.getWeather = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {  // Wrap the function in CORS middleware
        const lat = req.query.lat;
        const lon = req.query.lon;

        if (!lat || !lon) {
            res.status(400).send('Latitude and longitude are required.');
            return;
        }

        try {
            // Make a request to the OpenWeather API
            const response = await axios.get('https://api.openweathermap.org/data/3.0/onecall', {
                params: {
                    lat: lat,
                    lon: lon,
                    units: 'imperial',
                    appid: OPENWEATHER_API_KEY
                }
            });

            // Send the weather data back to the client
            res.json(response.data);
        } catch (error) {
            console.error('Error fetching weather data:', error);
            res.status(500).send('Error fetching weather data');
        }
    });
});
