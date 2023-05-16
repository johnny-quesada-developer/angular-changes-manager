const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    bundle: './src/index.ts',
  },
  externals: {
    '@angular/core': '@angular/core',
  },
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: ({ chunk: { name } }) => {
      if (name.includes('worker')) {
        return `${name}.worker.js`;
      }

      return `${name}.js`;
    },
    libraryTarget: 'umd',
    library: 'angular-changes-manager',
    globalObject: 'this',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      'angular-changes-manager': path.resolve(
        __dirname,
        'node_modules/angular-changes-manager/package.json'
      ),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-typescript'],
              plugins: [
                '@babel/plugin-transform-modules-commonjs',
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-proposal-export-namespace-from',
              ],
            },
          },
          {
            loader: 'ts-loader',
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanAfterEveryBuildPatterns: ['**/__test__/**'],
    }),
  ],
};
