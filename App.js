/*
 * INDIA LAND REGISTRY - FRONTEND (React)
 * Single-file React application
 * 
 * HOW TO USE:
 * 1. Create React app: npx create-react-app land-registry-frontend
 * 2. Replace src/App.js with this file
 * 3. Install dependencies: npm install @mui/material @emotion/react @emotion/styled axios react-router-dom
 * 4. Create .env file with: REACT_APP_API_URL=https://your-app.onrender.com/api
 *                           REACT_APP_ADMIN_PASSWORD=YourPassword
 * 5. Run: npm start
 * 6. Deploy to Vercel
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AppBar, Toolbar, Typography, Container, Button, TextField,
  Grid, Card, CardContent, Paper, Stepper, Step, StepLabel,
  Alert, CircularProgress, Chip, Box, Select, MenuItem,
  FormControl, InputLabel
} from '@mui/material';
import { Home, AddCircle, Search as SearchIcon, Dashboard } from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || 'admin123';

// Helper function for API calls with admin password
const apiCall = (url, options = {}) => {
  return axios({
    url: `${API_URL}${url}`,
    ...options,
    headers: {
      'X-Admin-Password': ADMIN_PASSWORD,
      ...options.headers
    }
  });
};

// ============ HOME PAGE ============
function HomePage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/../info`)
      .then(res => setStats(res.data))
      .catch(err => setError('Unable to connect to blockchain'));
  }, []);

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 4, mb: 4, bgcolor: '#FF9933', color: 'white' }}>
        <Typography variant="h3" align="center" gutterBottom>
          🇮🇳 India Land Registry Blockchain
        </Typography>
        <Typography variant="h6" align="center">
          Secure, Transparent, Immutable Property Records
        </Typography>
      </Paper>

      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary" align="center">
                  {stats.totalProperties || 0}
                </Typography>
                <Typography align="center">Total Properties</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary" align="center">
                  {stats.totalTransactions || 0}
                </Typography>
                <Typography align="center">Transactions</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary" align="center">
                  {stats.totalMutations || 0}
                </Typography>
                <Typography align="center">Mutations</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {error && <Alert severity="warning">{error}</Alert>}

      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Key Features</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography>✅ Immutable blockchain records</Typography>
            <Typography>✅ 3-level verification (Patwari/Tehsildar/DM)</Typography>
            <Typography>✅ AI-powered fraud detection</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography>✅ Historical transaction tracking</Typography>
            <Typography>✅ Mutation & inheritance records</Typography>
            <Typography>✅ Real-time property search</Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

// ============ REGISTER PROPERTY PAGE ============
function RegisterProperty() {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    ownerName: '',
    ownerPhone: '',
    state: '',
    district: '',
    village: '',
    propertyType: '',
    totalArea: '',
    latitude: '',
    longitude: ''
  });

  const steps = ['Owner Details', 'Location', 'Property Details'];

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall('/properties/register', {
        method: 'POST',
        data: {
          propertyData: JSON.stringify(formData)
        }
      });

      setSuccess(true);
      alert(`Property registered! ULPIN: ${response.data.ulpin}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Full Name"
                value={formData.ownerName}
                onChange={handleChange('ownerName')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Phone Number"
                value={formData.ownerPhone}
                onChange={handleChange('ownerPhone')}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>State</InputLabel>
                <Select value={formData.state} onChange={handleChange('state')}>
                  <MenuItem value="Karnataka">Karnataka</MenuItem>
                  <MenuItem value="Maharashtra">Maharashtra</MenuItem>
                  <MenuItem value="Tamil Nadu">Tamil Nadu</MenuItem>
                  <MenuItem value="Kerala">Kerala</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="District"
                value={formData.district}
                onChange={handleChange('district')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Village"
                value={formData.village}
                onChange={handleChange('village')}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Property Type</InputLabel>
                <Select value={formData.propertyType} onChange={handleChange('propertyType')}>
                  <MenuItem value="Residential">Residential</MenuItem>
                  <MenuItem value="Commercial">Commercial</MenuItem>
                  <MenuItem value="Agricultural">Agricultural</MenuItem>
                  <MenuItem value="Industrial">Industrial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Total Area (sq m)"
                type="number"
                value={formData.totalArea}
                onChange={handleChange('totalArea')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Latitude"
                value={formData.latitude}
                onChange={handleChange('latitude')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Longitude"
                value={formData.longitude}
                onChange={handleChange('longitude')}
              />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>Register New Property</Typography>

      <Stepper activeStep={activeStep} sx={{ mt: 4, mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>Property registered successfully!</Alert>}

      <Box sx={{ mt: 3 }}>{renderStepContent(activeStep)}</Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          disabled={activeStep === 0}
          onClick={() => setActiveStep(activeStep - 1)}
        >
          Back
        </Button>
        <Box>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit Registration'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => setActiveStep(activeStep + 1)}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

// ============ SEARCH PROPERTIES PAGE ============
function SearchProperties() {
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    district: '',
    state: ''
  });
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await apiCall('/properties/search', {
        method: 'POST',
        data: searchParams
      });
      setResults(response.data.properties || []);
    } catch (err) {
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Search Properties</Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="State"
              value={searchParams.state}
              onChange={(e) => setSearchParams({ ...searchParams, state: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="District"
              value={searchParams.district}
              onChange={(e) => setSearchParams({ ...searchParams, district: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSearch}
              disabled={loading}
              startIcon={<SearchIcon />}
            >
              {loading ? <CircularProgress size={24} /> : 'Search'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {results.length > 0 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Results ({results.length})
          </Typography>
          <Grid container spacing={3}>
            {results.map((property, idx) => (
              <Grid item xs={12} md={6} key={idx}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">ULPIN: {property.ulpin}</Typography>
                    <Typography><strong>Owner:</strong> {property.owner_name}</Typography>
                    <Typography>{property.village}, {property.district}, {property.state}</Typography>
                    <Typography>Type: {property.property_type}</Typography>
                    <Chip label={property.status || 'Pending'} color="primary" size="small" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}

// ============ DASHBOARD PAGE ============
function DashboardPage() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    apiCall('/properties')
      .then(res => setProperties(res.data.properties || []))
      .catch(err => console.error(err));
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">{properties.length}</Typography>
              <Typography>Recent Properties</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mt: 4, p: 2 }}>
        <Typography variant="h6" gutterBottom>Recent Registrations</Typography>
        {properties.slice(0, 10).map((prop, idx) => (
          <Box key={idx} sx={{ p: 1, borderBottom: '1px solid #eee' }}>
            <Typography><strong>{prop.ulpin}</strong> - {prop.owner_name}</Typography>
            <Typography variant="caption">{prop.district}, {prop.state}</Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'register': return <RegisterProperty />;
      case 'search': return <SearchProperties />;
      case 'dashboard': return <DashboardPage />;
      default: return <HomePage />;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            India Land Registry
          </Typography>
          <Button color="inherit" onClick={() => setCurrentPage('home')} startIcon={<Home />}>
            Home
          </Button>
          <Button color="inherit" onClick={() => setCurrentPage('register')} startIcon={<AddCircle />}>
            Register
          </Button>
          <Button color="inherit" onClick={() => setCurrentPage('search')} startIcon={<SearchIcon />}>
            Search
          </Button>
          <Button color="inherit" onClick={() => setCurrentPage('dashboard')} startIcon={<Dashboard />}>
            Dashboard
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {renderPage()}
      </Container>

      <Box sx={{ p: 3, bgcolor: '#f5f5f5', mt: 4, textAlign: 'center' }}>
        <Typography variant="body2">
          © 2024 India Land Registry Blockchain - Prototype
        </Typography>
      </Box>
    </Box>
  );
}
