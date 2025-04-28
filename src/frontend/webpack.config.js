const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

// Load environment variables
require('dotenv').config();

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/ts/main.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader', // Injects styles into the DOM
          'css-loader', // Resolves CSS imports
          'postcss-loader', // Processes Tailwind CSS
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'js/main.js',
    path: path.resolve(__dirname, 'public'),
    clean: true, // Clean the output directory before emit
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: './src/index.html', 
          to: 'index.html' 
        },
        // Add any other static assets like images, favicon, etc.
      ],
    }),
    new webpack.DefinePlugin({ // Inject necessary environment variables
      'process.env.BASE_API_URL': JSON.stringify(process.env.BASE_API_URL),
      'process.env.BASE_WSS_URL': JSON.stringify(process.env.BASE_WSS_URL),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID),
    })
  ],
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    minimizer: [new TerserPlugin()],
  },
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'inline-source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    historyApiFallback: true,
    port: 8080,
    open: true
  }
};