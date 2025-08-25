const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware if needed
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Konfigurasi Bird.com
const BIRD_ACCESS_KEY = process.env.BIRD_ACCESS_KEY;
const BIRD_API_BASE = 'https://api.bird.com';

// Route untuk mengambil media dari Bird.com
app.post('/bird-media', async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Bird media request received`);
    console.log('Request body:', req.body);

    const { workspaceId, messageId, fileId } = req.body;

    // Validasi parameter required
    if (!workspaceId || !messageId || !fileId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        required: ['workspaceId', 'messageId', 'fileId'],
        received: { workspaceId, messageId, fileId }
      });
    }

    // Validasi Access Key
    if (!BIRD_ACCESS_KEY) {
      return res.status(500).json({
        success: false,
        error: 'BIRD_ACCESS_KEY not configured on server'
      });
    }

    // Setup request ke Bird.com API
    const url = `${BIRD_API_BASE}/workspaces/${workspaceId}/messages/${messageId}/media/${fileId}`;
    const config = {
      method: 'GET',
      url: url,
      params: {
        redirect: 'false'
      },
      headers: {
        'Authorization': `AccessKey ${BIRD_ACCESS_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 detik timeout
    };

    console.log(`Requesting Bird.com API: ${url}?redirect=false`);

    // Request ke Bird.com API
    const response = await axios(config);
    
    console.log(`Bird.com response status: ${response.status}`);
    console.log('Bird.com response data:', response.data);

    // Ambil media URL dari response
    const mediaUrl = response.data?.Location;
    
    if (mediaUrl) {
      return res.json({
        success: true,
        mediaUrl: mediaUrl,
        expiresIn: '15 minutes',
        timestamp: new Date().toISOString(),
        metadata: {
          workspaceId,
          messageId,
          fileId
        },
        originalResponse: response.data
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Media URL not found in Bird.com response',
        response: response.data
      });
    }

  } catch (error) {
    console.error('Error in /bird-media:', error);

    // Handle Axios errors
    if (error.response) {
      // Bird.com API returned error
      return res.status(error.response.status).json({
        success: false,
        error: 'Bird.com API error',
        status: error.response.status,
        message: error.response.data || error.message,
        details: error.response.statusText
      });
    } else if (error.request) {
      // Request timeout or network error
      return res.status(500).json({
        success: false,
        error: 'Network error when contacting Bird.com',
        message: error.message
      });
    } else {
      // Other errors
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
});

// Download media endpoint (optional - untuk langsung download file)
app.post('/download-media', async (req, res) => {
  try {
    const { mediaUrl, filename } = req.body;
    
    if (!mediaUrl) {
      return res.status(400).json({
        success: false,
        error: 'mediaUrl is required'
      });
    }

    console.log(`Downloading media from: ${mediaUrl}`);

    const response = await axios({
      method: 'GET',
      url: mediaUrl,
      responseType: 'stream',
      timeout: 60000 // 60 detik untuk download
    });

    // Set headers untuk download
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'media-file'}"`);
    
    // Pipe response stream ke client
    response.data.pipe(res);

  } catch (error) {
    console.error('Error downloading media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download media',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Bird.com Media Webhook',
    version: '1.0.0'
  });
});

// Root endpoint - dokumentasi API
app.get('/', (req, res) => {
  res.json({
    service: 'Bird.com Media Retrieval Webhook',
    version: '1.0.0',
    endpoints: {
      'POST /bird-media': 'Retrieve media URL from Bird.com',
      'POST /download-media': 'Download media file directly',
      'GET /health': 'Health check',
      'GET /': 'API documentation'
    },
    usage: {
      '/bird-media': {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          workspaceId: 'your_workspace_id',
          messageId: 'your_message_id',
          fileId: 'your_file_id'
        },
        response: {
          success: true,
          mediaUrl: 'https://presigned-url-to-media',
          expiresIn: '15 minutes'
        }
      }
    },
    environment: {
      BIRD_ACCESS_KEY: BIRD_ACCESS_KEY ? '***configured***' : '❌ NOT SET'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bird.com Media Webhook running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/`);
  console.log(`🔑 Bird Access Key: ${BIRD_ACCESS_KEY ? '✅ Configured' : '❌ Not set'}`);
});

module.exports = app;
