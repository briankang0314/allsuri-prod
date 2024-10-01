const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './app.js', // Your main JS file
  output: {
    filename: 'bundle.js', // Output file
    path: path.resolve(__dirname, 'dist'), // Output directory
    publicPath: '/',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'assets', to: 'assets' },
        { from: 'styles', to: 'styles' },
        { from: 'favicon.ico', to: 'favicon.ico' },
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'firebase-messaging-sw.js', to: 'firebase-messaging-sw.js' },
        { from: 'index.html', to: 'index.html' },
      ],
    }),
  ],
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