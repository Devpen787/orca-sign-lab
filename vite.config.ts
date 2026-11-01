import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'three-vendor',
              test: /node_modules[\\/](?:@react-three|@monogrid|camera-controls|maath|meshline|stats-gl|three|three-stdlib|troika-three|urdf-loader)/,
              priority: 30,
            },
            {
              name: 'schema-vendor',
              test: /node_modules[\\/](?:ajv|ajv-formats|fast-deep-equal|fast-uri|json-schema-traverse)/,
              priority: 20,
            },
            {
              name: 'react-vendor',
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
