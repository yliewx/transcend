const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/client/ts/main.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
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
          from: './src/client/index.html', 
          to: 'index.html' 
        },
        // Add any other static assets like images, favicon, etc.
      ],
    }),
  ],
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    minimizer: [new TerserPlugin()],
  },
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'inline-source-map',
};