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
        
        // Hide the sign-in page if it's visible
        document.getElementById('sign-in-page').style.display = 'none';

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
    showSignInPage();
});

// Sign-Out Button
document.getElementById('sign-out-btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        alert('Signed out successfully.');
    }).catch(error => {
        console.error('Sign out error:', error);
    });
});

// Show the custom sign-in page
function showSignInPage() {
    document.getElementById('sign-in-page').style.display = 'block';
}

// Handle Google Sign-In
document.getElementById('google-sign-in').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(result => {
        alert('Signed in with Google!');
        document.getElementById('sign-in-page').style.display = 'none';  // Hide sign-in page on success
    }).catch(error => {
        console.error('Google sign-in error:', error);
    });
});

// Handle Email/Password Sign-In
document.getElementById('email-sign-in-form').addEventListener('submit', (e) => {
    e.preventDefault();  // Prevent form submission from reloading the page
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password).then(result => {
        alert('Signed in with Email/Password!');
        document.getElementById('sign-in-page').style.display = 'none';  // Hide sign-in page on success
    }).catch(error => {
        console.error('Email/Password sign-in error:', error);
        alert('Error: ' + error.message);
    });
});

// Toggle to Sign-Up Form (for users who don't have an account)
document.getElementById('sign-up-link').addEventListener('click', () => {
    document.getElementById('sign-in-page').innerHTML = `
        <h2>Sign Up</h2>
        <form id="email-sign-up-form">
            <input type="email" id="sign-up-email" placeholder="Email" required>
            <input type="password" id="sign-up-password" placeholder="Password" required>
            <button type="submit">Sign up with Email/Password</button>
        </form>
        <br>
        <a href="#" id="back-to-sign-in-link">Already have an account? Sign in</a>
    `;

    // Handle Email/Password Sign-Up
    document.getElementById('email-sign-up-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('sign-up-email').value;
        const password = document.getElementById('sign-up-password').value;

        auth.createUserWithEmailAndPassword(email, password).then(result => {
            alert('Account created and signed in!');
            document.getElementById('sign-in-page').style.display = 'none';  // Hide sign-up page on success
        }).catch(error => {
            console.error('Sign-up error:', error);
            alert('Error: ' + error.message);
        });
    });

    // Handle back to sign-in link
    document.getElementById('back-to-sign-in-link').addEventListener('click', (e) => {
        e.preventDefault();
        showSignInPage();  // Show the original sign-in form
    });
});


// Initialize the map
var map = L.map('map').setView([39, -98], 3);  // Default view

// Load OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let currentMode = '';  // To track the current action mode


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
   
    const url = `https://us-central1-catchntrack.cloudfunctions.net/getWeather?lat=${lat}&lon=${lon}`;


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
