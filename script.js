// Your Firebase configuration (replace with your own)
const firebaseConfig = {
    apiKey: "AIzaSyAujgImUCpvIHN65kREcXKC0eefrxUu5vk",
    authDomain: "catchntrack.firebaseapp.com",
    projectId: "catchntrack",
    storageBucket: "catchntrack.appspot.com",
    messagingSenderId: "157328293827",
    appId: "1:157328293827:web:22b0b2d60c6f166bbb4776",
    measurementId: "G-L19CX6D22Q"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// Initialize Firebase Authentication
const auth = firebase.auth();

// Listen for authentication state changes
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('sign-in-btn').style.display = 'none';
        document.getElementById('sign-out-btn').style.display = 'block';
        
        // Show user location and load their fishing spots
        showUserLocationAndData(user.uid);
    } else {
        document.getElementById('sign-in-btn').style.display = 'block';
        document.getElementById('sign-out-btn').style.display = 'none';
        clearMap();
    }
});

// Sign-In Button
document.getElementById('sign-in-btn').addEventListener('click', () => {
    showSignInPage();  // Implement this function to show the sign-in options
});

// Sign-Out Button
document.getElementById('sign-out-btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        alert('Signed out successfully.');
    }).catch(error => {
        console.error('Sign out error:', error);
    });
});

// Sign-In Functionality
function showSignInPage() {
    // Implement a sign-in page with options for Google and email/password sign-in
    // For Google Sign-In:
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(result => {
        alert('Signed in with Google!');
    }).catch(error => {
        console.error('Google sign-in error:', error);
    });

    // For Email/Password Sign-In, use FirebaseUI or custom UI elements
}

// Initialize the map
var map = L.map('map').setView([0, 0], 13);  // Default view

// Load OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let currentMode = '';  // To track the current action mode

// Fetch and display weather information
function fetchWeather(lat, lon) {
    const apiKey = 'e178ea07cb3554e3e318810f2a9c92da'; // Replace with your OpenWeatherMap API key
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const weatherInfo = `${data.weather[0].description}, ${data.main.temp}°F`;
            document.getElementById('weather-info').innerText = weatherInfo;
        })
        .catch(error => console.error('Error fetching weather data:', error));
}

// Add event listeners for the sidebar buttons
document.getElementById('add-btn').addEventListener('click', () => {
    currentMode = 'add';
    showDoneButton();
    alert("Add mode enabled. Click on the map to add a new fishing spot.");
});

document.getElementById('edit-btn').addEventListener('click', () => {
    currentMode = 'edit';
    showDoneButton();
    alert("Edit mode enabled. Click on a marker to edit its details.");
});

document.getElementById('delete-btn').addEventListener('click', () => {
    currentMode = 'delete';
    showDoneButton();
    alert("Delete mode enabled. Click on a marker to delete it.");
});

document.getElementById('done-btn').addEventListener('click', () => {
    currentMode = '';
    hideDoneButton();
    alert("Mode exited. You can now interact with the map freely.");
});

function showDoneButton() {
    document.getElementById('done-btn').style.display = 'block';
}

function hideDoneButton() {
    document.getElementById('done-btn').style.display = 'none';
}

// Get user location and update the map view
function showUserLocationAndData(userId) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var lat = position.coords.latitude;
            var lng = position.coords.longitude;

            // Set map view to user's location
            map.setView([lat, lng], 13);

            // Add a marker at the user's location
            L.marker([lat, lng]).addTo(map)
                .bindPopup('You are here!')
                .openPopup();

            // Fetch and display weather and astronomy information
            fetchWeatherAndAstronomy(lat, lng);

            // Load fishing spots for the logged-in user
            loadUserData(userId);
        }, function () {
            alert('Geolocation failed or was denied.');
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

// Clear the map of markers
function clearMap() {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // Optionally clear the weather and astronomy information if logged out
    document.getElementById('weather-info').innerText = '';
}

// Add a marker on click when in 'add' mode
map.on('click', function (e) {
    if (currentMode === 'add') {
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;

        // Prompt user for details about the fishing spot
        var fishType = prompt("Enter the type of fish caught:");
        var baitUsed = prompt("Enter the bait used:");
        var notes = prompt("Enter any additional notes:");

        // Capture the current timestamp
        var timestamp = new Date().toLocaleString();

        // Add marker to the map
        var marker = L.marker([lat, lng]).addTo(map)
            .bindPopup(`
                <b>Fish:</b> ${fishType}<br>
                <b>Bait:</b> ${baitUsed}<br>
                <b>Notes:</b> ${notes}<br>
                <b>Time:</b> ${timestamp}
            `).openPopup();

        // Save the fishing spot to Firestore with the user's UID
        db.collection("fishingSpots").add({
            userId: auth.currentUser.uid, // Save the user's UID
            latitude: lat,
            longitude: lng,
            fishType: fishType,
            baitUsed: baitUsed,
            notes: notes,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert("Fishing spot added successfully!");
        }).catch((error) => {
            alert("Error adding fishing spot: " + error.message);
        });
    }
});

// Load existing fishing spots from Firestore
function loadUserData(userId) {
    db.collection("fishingSpots").where("userId", "==", userId).get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const lat = data.latitude;
            const lng = data.longitude;
            const fishType = data.fishType;
            const baitUsed = data.baitUsed;
            const notes = data.notes;
            const timestamp = data.timestamp.toDate().toLocaleString(); // Convert Firestore timestamp to readable format

            // Add marker to the map for each fishing spot
            const marker = L.marker([lat, lng]).addTo(map)
                .bindPopup(`
                    <b>Fish:</b> ${fishType}<br>
                    <b>Bait:</b> ${baitUsed}<br>
                    <b>Notes:</b> ${notes}<br>
                    <b>Time:</b> ${timestamp}
                `);

            // Handle marker click based on the current mode (edit/delete)
            marker.on('click', () => {
                if (currentMode === 'edit') {
                    const newFishType = prompt("Enter the new type of fish:", fishType);
                    const newBaitUsed = prompt("Enter the new bait used:", baitUsed);
                    const newNotes = prompt("Enter any new notes:", notes);

                    // Update Firestore
                    db.collection("fishingSpots").doc(doc.id).update({
                        fishType: newFishType,
                        baitUsed: newBaitUsed,
                        notes: newNotes,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()  // Update timestamp to current time
                    }).then(() => {
                        marker.setPopupContent(`
                            <b>Fish:</b> ${newFishType}<br>
                            <b>Bait:</b> ${newBaitUsed}<br>
                            <b>Notes:</b> ${newNotes}<br>
                            <b>Time:</b> ${new Date().toLocaleString()}
                        `);
                        alert("Fishing spot updated successfully!");
                    }).catch(error => {
                        alert("Error updating fishing spot: " + error.message);
                    });

                } else if (currentMode === 'delete') {
                    if (confirm("Are you sure you want to delete this fishing spot?")) {
                        // Delete from Firestore
                        db.collection("fishingSpots").doc(doc.id).delete().then(() => {
                            map.removeLayer(marker);
                            alert("Fishing spot deleted successfully!");
                        }).catch(error => {
                            alert("Error deleting fishing spot: " + error.message);
                        });
                    }
                }
            });
        });
    }).catch(error => {
        console.error("Error loading fishing spots: ", error);
    });
}

function fetchWeatherAndAstronomy(lat, lon) {
    const apiKey = 'e178ea07cb3554e3e318810f2a9c92da'; // Replace with your OpenWeatherMap API key
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const weatherInfo = `${data.current.weather[0].description}, ${data.current.temp}°F`;
            const sunrise = new Date(data.current.sunrise * 1000).toLocaleTimeString();
            const sunset = new Date(data.current.sunset * 1000).toLocaleTimeString();
            const moonrise = new Date(data.daily[0].moonrise * 1000).toLocaleTimeString();
            const moonset = new Date(data.daily[0].moonset * 1000).toLocaleTimeString();
            const moonPhase = getMoonPhase(data.daily[0].moon_phase);

            document.getElementById('weather-info').innerText = `${weatherInfo} | Sunrise: ${sunrise} | Sunset: ${sunset} | Moonrise: ${moonrise} | Moonset: ${moonset} | Moon Phase: ${moonPhase}`;
        })
        .catch(error => console.error('Error fetching weather data:', error));
}

function getMoonPhase(phaseValue) {
    if (phaseValue === 0 || phaseValue === 1) return 'New Moon';
    if (phaseValue > 0 && phaseValue < 0.25) return 'Waxing Crescent';
    if (phaseValue === 0.25) return 'First Quarter';
    if (phaseValue > 0.25 && phaseValue < 0.5) return 'Waxing Gibbous';
    if (phaseValue === 0.5) return 'Full Moon';
    if (phaseValue > 0.5 && phaseValue < 0.75) return 'Waning Gibbous';
    if (phaseValue === 0.75) return 'Last Quarter';
    if (phaseValue > 0.75 && phaseValue < 1) return 'Waning Crescent';
}
