const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    'content/content-script': './content/content-script.js',
    'popup/popup': './popup/popup.js',
    'options/options': './options/options.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: false
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        // Copy individual content scripts
        { from: 'content/page-detector.js', to: 'content/page-detector.js' },
        { from: 'content/text-extractor.js', to: 'content/text-extractor.js' },
        
        // Copy utils files
        { from: 'utils/constants.js', to: 'utils/constants.js' },
        { from: 'utils/helpers.js', to: 'utils/helpers.js' },
        
        // Copy HTML files
        { from: 'popup/popup.html', to: 'popup/popup.html' },
        { from: 'options/options.html', to: 'options/options.html' },
        
        // Copy icons and manifest
        { from: 'icons', to: 'icons' },
        { from: 'manifest.json', to: 'manifest.json' }
      ]
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  },
  devtool: 'source-map',
  optimization: {
    minimize: false // Keep readable for development
  }
};
