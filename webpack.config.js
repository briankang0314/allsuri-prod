const path = require('path');

module.exports = {
  entry: './app.js', // Your main JS file
  output: {
    filename: 'bundle.js', // Output file
    path: path.resolve(__dirname, 'dist'), // Output directory
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: 'babel-loader', // Transpile JS files using Babel
      },
    ],
  },
  mode: 'production', // or 'development' for unminified code
};