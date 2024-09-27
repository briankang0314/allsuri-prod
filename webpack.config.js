const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './app.js', // Your main JS file
  output: {
    filename: 'bundle.js', // Output file
    path: path.resolve(__dirname, 'dist'), // Output directory
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'assets', to: 'assets' },
        { from: 'styles', to: 'styles' },
        { from: 'favicon.ico', to: 'favicon.ico' },
		{ from: 'manifest.json', to: 'manifest.json' },
		{ from: 'contents', to: 'contents' },
		{ from: 'api', to: 'api' },
		{ from: 'auth', to: 'auth' },
		{ from: 'pages', to: 'pages' },
		{ from: 'utils', to: 'utils' },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
	    filename: 'index.html',
      inject: 'body',
      scriptLoading: 'blocking'
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