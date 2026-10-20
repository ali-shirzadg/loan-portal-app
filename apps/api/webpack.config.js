const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
      // Generates OpenAPI schemas from DTO classes at compile time, so the shared
      // DTOs need no @nestjs/swagger decorators (libs/shared ships to the browser).
      transformers: [
        {
          name: '@nestjs/swagger/plugin',
          options: {
            classValidatorShim: true,
            introspectComments: true,
            controllerFileNameSuffix: '.controller.ts',
            dtoFileNameSuffix: ['.dto.ts'],
          },
        },
      ],
    }),
  ],
};
