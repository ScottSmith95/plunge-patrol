export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    'src/assets': 'assets'
  });

  eleventyConfig.addWatchTarget('src/assets/styles/main.css');
  eleventyConfig.addWatchTarget('src/assets/data/beaches.json');
  eleventyConfig.addWatchTarget('src/assets/scripts');

  return {
    dir: {
      input: 'src',
      output: '_site'
    }
  };
}
