const stateDistrictData = {};
let map;
let markers = [];

// Load CSV data
async function loadCSV() {
  const csvPath = '37231365-78ba-44d5-ac22-3deec40b9197.csv'; // static uploaded CSV path
  try {
    const res = await fetch(csvPath);
    const csvText = await res.text();
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        results.data.forEach(row => {
          const state = row.state_name_english;
          const district = row.district_name_english;
          if (!stateDistrictData[state]) stateDistrictData[state] = [];
          if (!stateDistrictData[state].includes(district)) {
            stateDistrictData[state].push(district);
          }
        });

        populateStates('state');
        
        // Show popular warehouses on load
        fetchPopularWarehouses();
      }
    });
  } catch (error) {
    console.error("Error loading CSV:", error);
    document.getElementById('popularWarehouses').innerHTML = `
      <div class="alert alert-warning">
        Unable to load location data. Please try again later.
      </div>
    `;
  }
}

// Populate state dropdown
function populateStates(id) {
  const stateSelect = document.getElementById(id);
  const states = Object.keys(stateDistrictData).sort();
  stateSelect.innerHTML = '<option value="">Select State</option>';
  states.forEach(state => {
    const opt = document.createElement('option');
    opt.value = state;
    opt.text = state;
    stateSelect.appendChild(opt);
  });
}

// Populate district dropdown
function populateDistricts(id, state) {
  const districtSelect = document.getElementById(id);
  districtSelect.innerHTML = '<option value="">Select District</option>';
  if (!stateDistrictData[state]) return;
  stateDistrictData[state].sort().forEach(dist => {
    const opt = document.createElement('option');
    opt.value = dist;
    opt.text = dist;
    districtSelect.appendChild(opt);
  });
}

// Fetch warehouses based on search criteria
async function fetchWarehouses() {
  const state = document.getElementById('state').value;
  const district = document.getElementById('district').value;
  const resultDiv = document.getElementById('warehouseList');
  const loading = document.getElementById('loadingSpinner');
  const mapContainer = document.getElementById('mapContainer');

  resultDiv.innerHTML = '';
  loading.classList.remove('d-none');
  mapContainer.classList.add('d-none');

  if (!state && !district) {
    showAlert('Please select a state or district', 'warning');
    loading.classList.add('d-none');
    return;
  }

  const query = new URLSearchParams();
  if (state) query.append('state', state);
  if (district) query.append('district', district);

  try {
    const url = `https://api.easyfarms.in/warehouses?${query.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      resultDiv.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i> No warehouses found for the selected location.
            <p class="mt-2 mb-0">Try selecting a different state or district.</p>
          </div>
        </div>
      `;
      loading.classList.add('d-none');
      return;
    }

    // Clear previous markers
    clearMarkers();

    // Display results and update map
    displayWarehouseResults(data);
    initializeMap(data);
    mapContainer.classList.remove('d-none');
    
    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error(err);
    showAlert('Failed to fetch data. Please try again.', 'danger');
  } finally {
    loading.classList.add('d-none');
  }
}

// Display warehouse results in cards
function displayWarehouseResults(data) {
  const resultDiv = document.getElementById('warehouseList');
  resultDiv.innerHTML = '';

  data.forEach(item => {
    const mapURL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item["WH Name"] + " " + item["Address"])}`;
    const callURL = `tel:${item["Contact No."]}`;
    
    // Determine status class
    let statusClass = 'bg-success';
    if (item["Status"] === 'Inactive' || item["Status"] === 'Closed') {
      statusClass = 'bg-danger';
    } else if (item["Status"] === 'Under Maintenance') {
      statusClass = 'bg-warning';
    }

    const card = `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="warehouse-card">
          <div class="warehouse-header">
            <h3 class="h5 mb-0">${item["WH Name"]}</h3>
          </div>
          <div class="warehouse-body">
            <p class="warehouse-info"><strong>Manager:</strong> ${item["WHM Name"]}</p>
            <p class="warehouse-info"><strong>Address:</strong> ${item["Address"]}</p>
            <p class="warehouse-info"><strong>Capacity:</strong> ${item["Capacity(in MT)"]} MT</p>
            <p class="warehouse-info"><strong>Contact:</strong> ${item["Contact No."]}</p>
            <p class="warehouse-info">
              <strong>Status:</strong> 
              <span class="badge ${statusClass}">${item["Status"]}</span>
            </p>
            <p class="warehouse-info"><strong>Valid Until:</strong> ${item["Registration Valid Upto"]}</p>
          </div>
          <div class="warehouse-footer">
            <a href="${callURL}" class="btn btn-call btn-primary flex-grow-1">
              <i class="bi bi-telephone-fill me-2"></i> Call
            </a>
            <a href="${mapURL}" target="_blank" class="btn btn-map flex-grow-1">
              <i class="bi bi-geo-alt-fill me-2"></i> Map
            </a>
          </div>
        </div>
      </div>
    `;
    resultDiv.innerHTML += card;
  });

  // Update results count
  document.getElementById('resultsCount').textContent = data.length;
  document.getElementById('resultsSection').classList.remove('d-none');
}

// Fetch popular warehouses
async function fetchPopularWarehouses() {
  const popularDiv = document.getElementById('popularWarehouses');
  
  try {
    // In a real app, this would be a different endpoint for popular/featured warehouses
    // For demo, we'll use the same endpoint with a hardcoded state
    const url = 'https://api.easyfarms.in/warehouses?state=Karnataka';
    const response = await fetch(url);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    // Display only first 3 warehouses
    const topWarehouses = data.slice(0, 3);
    popularDiv.innerHTML = '';

    topWarehouses.forEach(item => {
      const mapURL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item["WH Name"] + " " + item["Address"])}`;
      
      const card = `
        <div class="col-md-4 mb-4">
          <div class="warehouse-card">
            <div class="warehouse-header">
              <h3 class="h5 mb-0">${item["WH Name"]}</h3>
            </div>
            <div class="warehouse-body">
              <p class="warehouse-info"><strong>Location:</strong> ${item["Address"]}</p>
              <p class="warehouse-info"><strong>Capacity:</strong> ${item["Capacity(in MT)"]} MT</p>
            </div>
            <div class="warehouse-footer">
              <a href="${mapURL}" target="_blank" class="btn btn-map w-100">
                <i class="bi bi-info-circle me-2"></i> View Details
              </a>
            </div>
          </div>
        </div>
      `;
      popularDiv.innerHTML += card;
    });
  } catch (err) {
    console.error("Error fetching popular warehouses:", err);
  }
}

// Initialize Google Map
function initializeMap(warehouses) {
  const mapDiv = document.getElementById('map');
  
  // For demo purposes - in reality would use real Google Maps API
  // This is a placeholder implementation
  mapDiv.innerHTML = `
    <div class="p-4 bg-light h-100 d-flex flex-column justify-content-center align-items-center">
      <i class="bi bi-map text-primary" style="font-size: 3rem;"></i>
      <h4 class="mt-3">Map View</h4>
      <p class="text-center">
        ${warehouses.length} warehouses would be displayed here on an interactive map.<br>
        <small class="text-muted">Google Maps API integration required for full functionality.</small>
      </p>
    </div>
  `;
}

// Clear map markers
function clearMarkers() {
  // Placeholder for map marker clearing
  // Would be implemented with actual Google Maps API
}

// Show alert message
function showAlert(message, type = 'info') {
  const alertDiv = document.getElementById('alertContainer');
  alertDiv.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  alertDiv.classList.remove('d-none');
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    const alert = document.querySelector('.alert');
    if (alert) {
      alert.classList.remove('show');
      setTimeout(() => alertDiv.classList.add('d-none'), 150);
    }
  }, 5000);
}

// Init
window.onload = function() {
  loadCSV();
};