import React, { useState } from 'react';
import { 
  Container, 
  TextField, 
  Button, 
  Grid, 
  Box, 
  Paper,
  Typography
} from '@mui/material';

function App() {
  const [prompt, setPrompt] = useState('');
  
  // Placeholder images array (2x2 grid = 4 images)
  const placeholderImages = Array(4).fill('https://via.placeholder.com/300?text=AI+Image');

  const handleSubmit = (e) => {
    e.preventDefault();
    // This will be implemented later with AI functionality
    console.log('Generating images for prompt:', prompt);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h2" component="h1" gutterBottom>
          AI Image Generator
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
          <TextField
            fullWidth
            label="Enter your prompt"
            variant="outlined"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button 
            variant="contained" 
            size="large" 
            type="submit"
            sx={{ 
              backgroundColor: '#2E3B55',
              '&:hover': {
                backgroundColor: '#1A2238'
              }
            }}
          >
            Generate Images
          </Button>
        </Box>

        <Grid container spacing={3} justifyContent="center">
          {placeholderImages.map((image, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Paper 
                elevation={3}
                sx={{
                  p: 1,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)'
                  }
                }}
              >
                <img
                  src={image}
                  alt={`Generated ${index + 1}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '4px'
                  }}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}

export default App; 