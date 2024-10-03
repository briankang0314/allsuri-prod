const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './app.js',
  output: {
    filename: 'bundle.js', // Output file
    path: path.resolve(__dirname, 'dist'), // Output directory
    publicPath: '/',
  },
  devtool: 'eval-cheap-module-source-map',
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
        { from: 'firebase-messaging-sw.js', to: 'firebase-messaging-sw.js' },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
	    filename: 'index.html',
      inject: 'body',
      scriptLoading: 'blocking'
    })
  ],
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: 'babel-loader', 
      },
    ],
  },
  mode: 'production',
};