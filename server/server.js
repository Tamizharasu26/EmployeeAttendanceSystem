const app = require('./app');
const mongoose = require('mongoose');
const config = require('./config/config');

// Connect to MongoDB Atlas
mongoose.connect(config.mongoURI)
  .then(() => {
    console.log('MongoDB Atlas Connected...');
    const PORT = config.port;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB Atlas connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB Atlas disconnected');
});

// Handle application termination
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB Atlas connection closed due to app termination');
    process.exit(0);
  });
});