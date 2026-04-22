export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    'src/assets': 'assets',
    'src/favicon.svg': 'favicon.svg',
    'src/icon-192.png': 'icon-192.png',
    'src/icon-512.png': 'icon-512.png',
    'src/icon-maskable-192.png': 'icon-maskable-192.png',
    'src/icon-maskable-512.png': 'icon-maskable-512.png',
    'src/site.webmanifest': 'site.webmanifest'
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
