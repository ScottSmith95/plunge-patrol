export default {
  plugins: [
    (await import('postcss-preset-env')).default({
      stage: 1,
      features: {
        'nesting-rules': true
      }
    })
  ]
};
